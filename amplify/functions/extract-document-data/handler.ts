/**
 * Resumo do arquivo:
 * Orquestra a extracao inteira. NUNCA LANCA: o corpo todo fica em try/catch e
 * qualquer falha vira markFailed. A repeticao do invoke assincrono esta
 * zerada (backend.ts), entao uma excecao aqui nao seria repetida -- ela
 * deixaria o documento preso em PROCESSING para sempre, e o app mostraria
 * "lendo" ate o teto de 6 minutos sem nunca dizer o que houve.
 *
 * A validade da receita NAO aparece em lugar nenhum deste arquivo, e isso e
 * deliberado: `expirationDate` e do formulario e a extracao nao a toca. A
 * forma mais segura de garantir isso e a funcao nunca escrever esse campo, e
 * nao escrever com cuidado.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { candidatesForPrompt } from './analyteCatalog';
import { CONFIDENCE_THRESHOLD, normalizeLabResult } from './analyteNormalizer';
import {
  requestExtraction,
  type ExtractionSource,
  type RequestExtractionResult,
} from './bedrockClient';
import { lerArquivoDoDono } from './arquivoDoDono';
import { labResultId, prescriptionItemId, somaDasFolhas } from './checksum';
import { chavesDasFolhas, subDoOwner } from './documentKey';
import { contarEscolhasDeFaixa } from './escolhaDeFaixa';
import { dividirPdf } from './divisaoDoPdf';
import { TETO_PDF_BYTES, avaliarArquivo, pdfDivisivel } from './formatoDoArquivo';
import { juntarPartes } from './juntarPartes';
import { copyDaFalha } from './motivoDeFalha';
import { normalizePrescriptionItem } from './prescriptionNormalizer';
import { planejarRegravacao } from './regravacao';
import {
  apagarLinhas,
  listarLinhasDoDocumento,
  markFailed,
  markNoResults,
  markProcessing,
  markSucceeded,
  putLabResults,
  putPrescriptionItems,
  readDocumentRow,
  separarLinhasGravaveis,
} from './resultRepository';
import { rebaixarLidasDeGrafico } from './valorDeGrafico';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

type InvokeEvent = { documentId?: string };

/** A lista curta de candidatos que vai no prompt. Montada uma vez por
 *  execucao: sao 154 analitos desde o Bloco 10, e a maior parte do prompt. */
function montarCandidatos(): string {
  return candidatesForPrompt()
    .map((c) => `${c.code} | ${c.projectLabel} | ${c.canonicalUnit} | ${c.synonyms.join('; ')}`)
    .join('\n');
}

export async function handler(event: InvokeEvent): Promise<void> {
  const documentTable = process.env.MEDICAL_DOCUMENT_TABLE_NAME;
  const labResultTable = process.env.LAB_RESULT_TABLE_NAME;
  const prescriptionTable = process.env.PRESCRIPTION_ITEM_TABLE_NAME;
  const bucketName = process.env.HEALTH_BUCKET_NAME;
  const modelId = process.env.BEDROCK_MODEL_ID;
  const guardrailId = process.env.BEDROCK_GUARDRAIL_ID;
  const guardrailVersion = process.env.BEDROCK_GUARDRAIL_VERSION;
  const documentId = event.documentId;

  if (!documentId) {
    console.error('Evento invalido: documentId ausente.', event);
    return;
  }
  if (
    !documentTable ||
    !labResultTable ||
    !prescriptionTable ||
    !bucketName ||
    !modelId ||
    !guardrailId ||
    !guardrailVersion
  ) {
    console.error('Variaveis de ambiente ausentes.');
    return;
  }

  try {
    // 1. Ler o documento. O `owner` sai daqui, e sem ele nao ha linha legivel
    //    pelo cliente do Amplify.
    const doc = await readDocumentRow(ddb, documentTable, documentId);
    if (!doc || !doc.owner || !doc.s3FileName) {
      console.error(`Documento ${documentId} nao encontrado ou incompleto.`);
      return;
    }
    const owner = doc.owner;

    await markProcessing(ddb, documentTable, documentId);

    // 2. Baixar e somar. A soma entra no id deterministico de cada linha, e e
    //    o que faz reenviar o mesmo arquivo atualizar em vez de duplicar.
    //    Um documento pode ter varias folhas (Bloco 11): a folha 1 e `s3Key`, e
    //    as outras, `extraPageKeys`, na mesma pasta. Qualquer folha que nao
    //    passe invalida o documento -- nada e lido pela metade.
    const chaves = chavesDasFolhas({
      owner,
      s3FileName: doc.s3FileName,
      s3Key: doc.s3Key,
      extraPageKeys: doc.extraPageKeys,
    });
    if (!chaves) {
      // Linha antiga, de antes de o upload registrar a chave. Nao da para
      // descobrir a pasta a partir do `owner` -- foi tentar isso que produziu
      // o defeito que `documentKey.ts` narra.
      await markFailed(ddb, documentTable, documentId, copyDaFalha('arquivo-sem-chave'));
      return;
    }
    // 2b. A POSSE (D46), conferida EM CADA FOLHA. A chave tem a forma certa,
    //     mas quem a escreveu foi o cliente, e esta funcao alcanca a pasta de
    //     todo mundo. So segue o arquivo cujo metadado de envio e do dono
    //     DESTA linha -- antes de os bytes irem ao modelo e antes de qualquer
    //     gravacao ou substituicao de linha (D47). Uma folha recusada recusa
    //     o documento: nada e lido pela metade. O log leva o motivo e o
    //     documento; nunca sub, chave ou nome de arquivo.
    const donoDaLinha = subDoOwner(owner);
    const folhas: Uint8Array[] = [];
    for (const chave of chaves) {
      const lido = await lerArquivoDoDono(bucketName, chave, donoDaLinha);
      if (!lido.ok) {
        console.warn(
          JSON.stringify({ evento: 'arquivo-recusado-pelo-dono', motivo: lido.motivo, documentId }),
        );
        await markFailed(ddb, documentTable, documentId, copyDaFalha('arquivo-sem-dono'));
        return;
      }
      folhas.push(lido.bytes);
    }
    const bytes = folhas[0];
    // Uma folha e a soma do arquivo, como sempre (ids de documento antigo nao
    // mudam); varias, a soma das somas, em ordem.
    const checksum = somaDasFolhas(folhas);

    // 3. A rota sai dos BYTES, e nao do tipo declarado (G1, Bloco 10). O tipo
    //    declarado vem da extensao do nome, e o nome e da pessoa. PDF vai no
    //    bloco de documento (D19); foto, no bloco de imagem. O que nao for
    //    nenhum dos dois, ou nao couber, falha AQUI -- sem gastar um token.
    //    O PDF que nao cabe num bloco, e cabe dividido, segue (Bloco 11).
    const arquivo = avaliarArquivo(bytes);
    const dividir = !arquivo.ok && arquivo.motivo === 'grande-demais' && pdfDivisivel(bytes);
    if (!arquivo.ok && !dividir) {
      await markFailed(ddb, documentTable, documentId, copyDaFalha(arquivo.motivo));
      return;
    }

    // 3b. Varias folhas (E6): toda folha e FOTO, e toda folha cabe no bloco de
    //     imagem. PDF ja tem paginas, e misturar os dois nao e oferecido.
    let folhasDeImagem: Extract<ExtractionSource, { kind: 'folhas' }>['folhas'] | null = null;
    if (folhas.length > 1) {
      folhasDeImagem = [];
      for (const folha of folhas) {
        const avaliada = avaliarArquivo(folha);
        if (!avaliada.ok || avaliada.formato.tipo !== 'imagem') {
          const motivo = avaliada.ok ? 'formato-nao-suportado' : avaliada.motivo;
          await markFailed(ddb, documentTable, documentId, copyDaFalha(motivo));
          return;
        }
        folhasDeImagem.push({ formato: avaliada.formato.formato, bytes: folha });
      }
    }

    // 4. Modelo.
    const kind = doc.documentType === 'prescription' ? 'prescription' : 'exam';
    const opcoes = { modelId, guardrailId, guardrailVersion, candidatos: montarCandidatos() };
    let saida: RequestExtractionResult;
    if (folhasDeImagem) {
      saida = await requestExtraction({ kind: 'folhas', folhas: folhasDeImagem }, kind, opcoes);
    } else if (arquivo.ok) {
      const source: ExtractionSource =
        arquivo.formato.tipo === 'pdf'
          ? { kind: 'pdf', bytes }
          : { kind: 'imagem', formato: arquivo.formato.formato, bytes };
      saida = await requestExtraction(source, kind, opcoes);
    } else {
      // 4b. O PDF grande (E5, Decisao N1): partes de paginas contiguas que
      //     cabem no bloco, cada uma lida por uma chamada identica a de um PDF
      //     pequeno, EM SEQUENCIA -- os 600 s da Lambda comportam, e o laudo de
      //     20 paginas levou 111 s inteiro. Uma parte que falha nao derruba as
      //     outras; o aviso diz quais paginas ficaram de fora.
      const divisao = await dividirPdf(bytes, TETO_PDF_BYTES);
      if (!divisao.ok) {
        await markFailed(ddb, documentTable, documentId, copyDaFalha(divisao.motivo));
        return;
      }
      const leituras = [];
      for (const parte of divisao.partes) {
        leituras.push({
          primeiraPagina: parte.primeiraPagina,
          ultimaPagina: parte.ultimaPagina,
          saida: await requestExtraction({ kind: 'pdf', bytes: parte.bytes }, kind, opcoes),
        });
      }
      saida = juntarPartes(leituras);
      console.info(
        JSON.stringify({
          evento: 'pdf-dividido',
          partes: leituras.length,
          partesQueFalharam: leituras.filter((l) => !l.saida.ok).length,
        }),
      );
    }
    if (!saida.ok) {
      await markFailed(ddb, documentTable, documentId, copyDaFalha(saida.motivo));
      return;
    }

    const avisos = [...saida.result.warnings];

    // F4 -- a fronteira entre transcrever e interpretar, MEDIDA. O prompt
    // proibe escolher uma linha da tabela de referencia; esta linha diz se a
    // proibicao foi obedecida. Ela CONTA e nao reprova: descartar uma extracao
    // boa por uma palavra seria o erro da R2 outra vez. Sem conteudo nenhum no
    // log -- o aviso nomeia analito, que e dado de saude.
    const escolhasDeFaixa = contarEscolhasDeFaixa(avisos);
    if (escolhasDeFaixa > 0) {
      console.info(
        JSON.stringify({ evento: 'faixa-escolhida-pelo-modelo', quantidade: escolhasDeFaixa }),
      );
    }

    // 6. Normalizar. A data do formulario e a RESERVA da data de coleta, e
    //    quando ela e usada isso vira aviso -- nunca uma data inventada (D24).
    const normalizadas = saida.result.labResults.map((bruta) => {
      const linha = normalizeLabResult(bruta, CONFIDENCE_THRESHOLD);
      if (linha.collectedAt === null && doc.documentDate) {
        avisos.push(
          `A data de coleta de "${linha.projectLabel}" não estava legível no documento; usamos a data informada no formulário.`,
        );
        return { ...linha, collectedAt: doc.documentDate };
      }
      return linha;
    });

    // 6b. G10 -- o numero lido de grafico. O modelo declara em `warnings`
    //     quando tirou um valor do grafico de historico em vez do numero
    //     impresso (medido: 80 no lugar de 62, com confianca 0,95). A linha
    //     perde o valor e vai para revisao, qualquer que seja a confianca. O
    //     log leva so a quantidade: o aviso nomeia analito, que e dado de saude.
    const grafico = rebaixarLidasDeGrafico(
      normalizadas,
      saida.result.labResults.map((bruta) => [bruta.analyteLabel]),
      saida.result.warnings,
    );
    avisos.push(...grafico.avisos);
    if (grafico.quantidade > 0) {
      console.info(JSON.stringify({ evento: 'valor-de-grafico', quantidade: grafico.quantidade }));
    }

    // 7. O porteiro: tira o que colidiria em silencio e diz o que tirou.
    const comId = grafico.linhas.map((linha) => ({
      ...linha,
      documentId,
      owner,
      id: labResultId(documentId, checksum, linha.analyteCode, linha.collectionMoment),
    }));
    // O rotulo como estava no papel, por id: a linha de catalogo o perde
    // (analyteLabel vira o nome do LOINC), e a regravacao precisa dele para
    // achar a linha de codigo local que a leitura anterior derivou dele.
    const rotuloDoPapel = new Map<string, string>();
    comId.forEach((linha, i) => {
      if (!rotuloDoPapel.has(linha.id)) {
        rotuloDoPapel.set(linha.id, saida.result.labResults[i]?.analyteLabel ?? linha.projectLabel);
      }
    });
    const { gravaveis, avisos: avisosDaGravacao } = separarLinhasGravaveis(comId);
    avisos.push(...avisosDaGravacao);

    // A receita passa pelo seu proprio normalizador -- um ramo deliberadamente
    // burro, que nao converte dose e nao interpreta posologia.
    const itensReceita = saida.result.prescriptionItems.map((bruto) => {
      const item = normalizePrescriptionItem(bruto);
      return {
        ...item,
        documentId,
        owner,
        id: prescriptionItemId(documentId, checksum, item.medicationLabel, item.dose),
      };
    });

    // 8. Nenhuma linha NAO e falha: laudo em prosa, cultura e sorologia nao
    //    rendem analito, e a copy da tela nao pode tratar isso como erro.
    if (gravaveis.length === 0 && itensReceita.length === 0) {
      await markNoResults(ddb, documentTable, documentId, {
        checksum,
        textKey: null,
        warnings: avisos,
        laboratorio: saida.result.laboratorio ?? null,
      });
      return;
    }

    // 9. O que a leitura anterior deixou (Bloco 11): o que a pessoa conferiu
    //    fica, e a linha de codigo local que esta leitura substitui sai. As
    //    novas sao gravadas ANTES de a antiga ser apagada -- uma falha no meio
    //    deixa um ponto duplicado, nunca um resultado sumido.
    const plano = planejarRegravacao(
      await listarLinhasDoDocumento(ddb, labResultTable, documentId),
      gravaveis.map((linha) => ({
        linha,
        rotuloDoPapel: rotuloDoPapel.get(linha.id) ?? linha.projectLabel,
      })),
    );
    avisos.push(...plano.avisos);
    if (plano.preservadas > 0 || plano.substituidas > 0) {
      console.info(
        JSON.stringify({
          evento: 'regravacao',
          preservadas: plano.preservadas,
          substituidas: plano.substituidas,
        }),
      );
    }

    await putLabResults(ddb, labResultTable, plano.gravar);
    await apagarLinhas(ddb, labResultTable, plano.apagar);
    await putPrescriptionItems(ddb, prescriptionTable, itensReceita);

    await markSucceeded(ddb, documentTable, documentId, {
      checksum,
      textKey: null,
      warnings: avisos,
      modelId,
      inputTokens: saida.usage.input,
      outputTokens: saida.usage.output,
      laboratorio: saida.result.laboratorio ?? null,
    });
  } catch (erro) {
    // O detalhe tecnico fica no log; o campo que a tela le recebe copy da
    // lista fechada (G4). Antes, `erro.message` ia cru para a pessoa.
    console.error(`Falha ao extrair o documento ${documentId}:`, erro);
    try {
      await markFailed(ddb, documentTable, documentId, copyDaFalha('leitura-falhou'));
    } catch (erroAoMarcar) {
      console.error(`Falha ao marcar o documento ${documentId} como FAILED:`, erroAoMarcar);
    }
  }
}

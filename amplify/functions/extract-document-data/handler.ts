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
import { requestExtraction, type ExtractionSource } from './bedrockClient';
import { fileChecksum, labResultId, prescriptionItemId } from './checksum';
import { lerArquivoDoDono } from './arquivoDoDono';
import { chaveDoDocumento, subDoOwner } from './documentKey';
import { contarEscolhasDeFaixa } from './escolhaDeFaixa';
import { avaliarArquivo } from './formatoDoArquivo';
import { copyDaFalha } from './motivoDeFalha';
import { normalizePrescriptionItem } from './prescriptionNormalizer';
import {
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
 *  execucao: sao 79 analitos e cerca de 10 mil caracteres. */
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
    const fileKey = chaveDoDocumento({ owner, s3FileName: doc.s3FileName, s3Key: doc.s3Key });
    if (!fileKey) {
      // Linha antiga, de antes de o upload registrar a chave. Nao da para
      // descobrir a pasta a partir do `owner` -- foi tentar isso que produziu
      // o defeito que `documentKey.ts` narra.
      await markFailed(ddb, documentTable, documentId, copyDaFalha('arquivo-sem-chave'));
      return;
    }
    // 2b. A POSSE (D46). A chave tem a forma certa, mas quem a escreveu foi o
    //     cliente, e esta funcao alcanca a pasta de todo mundo. So segue o
    //     arquivo cujo metadado de envio e do dono DESTA linha -- antes de os
    //     bytes irem ao modelo e antes de qualquer gravacao. O log leva o
    //     motivo e o documento; nunca sub, chave ou nome de arquivo.
    const lido = await lerArquivoDoDono(bucketName, fileKey, subDoOwner(owner));
    if (!lido.ok) {
      console.warn(
        JSON.stringify({ evento: 'arquivo-recusado-pelo-dono', motivo: lido.motivo, documentId }),
      );
      await markFailed(ddb, documentTable, documentId, copyDaFalha('arquivo-sem-dono'));
      return;
    }
    const { bytes } = lido;
    const checksum = fileChecksum(bytes);

    // 3. A rota sai dos BYTES, e nao do tipo declarado (G1, Bloco 10). O tipo
    //    declarado vem da extensao do nome, e o nome e da pessoa. PDF vai no
    //    bloco de documento (D19); foto, no bloco de imagem. O que nao for
    //    nenhum dos dois, ou nao couber, falha AQUI -- sem gastar um token.
    const arquivo = avaliarArquivo(bytes);
    if (!arquivo.ok) {
      await markFailed(ddb, documentTable, documentId, copyDaFalha(arquivo.motivo));
      return;
    }
    const source: ExtractionSource =
      arquivo.formato.tipo === 'pdf'
        ? { kind: 'pdf', bytes }
        : { kind: 'imagem', formato: arquivo.formato.formato, bytes };

    // 4. Modelo.
    const kind = doc.documentType === 'prescription' ? 'prescription' : 'exam';
    const saida = await requestExtraction(source, kind, {
      modelId,
      guardrailId,
      guardrailVersion,
      candidatos: montarCandidatos(),
    });
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
    const { gravaveis, avisos: avisosDaGravacao } = separarLinhasGravaveis(
      grafico.linhas.map((linha) => ({
        ...linha,
        documentId,
        owner,
        id: labResultId(documentId, checksum, linha.analyteCode, linha.collectionMoment),
      })),
    );
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

    await putLabResults(ddb, labResultTable, gravaveis);
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

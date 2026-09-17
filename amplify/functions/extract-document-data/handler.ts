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
import { chooseReadingPath } from './documentText';
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
import { readDocument, writeTextArtifact } from './s3Reader';
import { extractText } from './textractClient';

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
    const identityId = owner.split('::')[0];
    const fileKey = `medical-documents/${identityId}/${doc.s3FileName}`;
    const { bytes, contentType } = await readDocument(bucketName, fileKey);
    const checksum = fileChecksum(bytes);

    // 3. Escolher a rota de leitura (D19). PDF vai direto ao modelo; o resto
    //    passa pelo Textract.
    let source: ExtractionSource;
    let textKeyGravada: string | null = null;

    if (chooseReadingPath(contentType) === 'modelo-direto') {
      // Nao ha texto de OCR para guardar neste caminho, porque nao houve OCR.
      // A rastreabilidade passa a ser rawValue e rawUnit por linha.
      source = { kind: 'pdf', bytes };
    } else {
      const ocr = await extractText(bucketName, fileKey, contentType, bytes);
      if (ocr.pages.length === 0 || ocr.pages.every((p) => p.text.trim() === '')) {
        await markFailed(
          ddb,
          documentTable,
          documentId,
          'Não conseguimos ler o texto deste arquivo. Se ele for uma foto, uma imagem mais nítida costuma resolver.',
        );
        return;
      }
      source = { kind: 'texto', text: ocr };

      // 4. Guardar o texto bruto. E o que permite reprocessar sem refazer o
      //    OCR se a tabela de conversao tiver erro (spec secao 6).
      const textKey = `medical-documents/${identityId}/${documentId}/ocr.txt`;
      try {
        await writeTextArtifact(
          bucketName,
          textKey,
          ocr.pages.map((p) => `--- pagina ${p.page} ---\n${p.text}`).join('\n\n'),
        );
        textKeyGravada = textKey;
      } catch (erro) {
        // Nao fatal: o texto e rastreabilidade, nao resultado.
        console.error('Falha ao gravar o texto do OCR (nao fatal):', erro);
      }
    }

    // 5. Modelo.
    const kind = doc.documentType === 'prescription' ? 'prescription' : 'exam';
    const saida = await requestExtraction(source, kind, {
      modelId,
      guardrailId,
      guardrailVersion,
      candidatos: montarCandidatos(),
    });
    if (!saida.ok) {
      await markFailed(ddb, documentTable, documentId, saida.message);
      return;
    }

    const avisos = [...saida.result.warnings];

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

    // 7. O porteiro: tira o que colidiria em silencio e diz o que tirou.
    const { gravaveis, avisos: avisosDaGravacao } = separarLinhasGravaveis(
      normalizadas.map((linha) => ({
        ...linha,
        documentId,
        owner,
        id: labResultId(documentId, checksum, linha.analyteCode, linha.collectionMoment),
      })),
    );
    avisos.push(...avisosDaGravacao);

    const itensReceita = saida.result.prescriptionItems.map((item) => ({
      ...item,
      documentId,
      owner,
      id: prescriptionItemId(documentId, checksum, item.medicationLabel, item.dose),
      reviewStatus:
        item.confidence < CONFIDENCE_THRESHOLD
          ? ('PENDENTE_DE_REVISAO' as const)
          : ('AUTO' as const),
    }));

    // 8. Nenhuma linha NAO e falha: laudo em prosa, cultura e sorologia nao
    //    rendem analito, e a copy da tela nao pode tratar isso como erro.
    if (gravaveis.length === 0 && itensReceita.length === 0) {
      await markNoResults(ddb, documentTable, documentId, {
        checksum,
        textKey: textKeyGravada,
        warnings: avisos,
      });
      return;
    }

    await putLabResults(ddb, labResultTable, gravaveis);
    await putPrescriptionItems(ddb, prescriptionTable, itensReceita);

    await markSucceeded(ddb, documentTable, documentId, {
      checksum,
      textKey: textKeyGravada,
      warnings: avisos,
      modelId,
      inputTokens: saida.usage.input,
      outputTokens: saida.usage.output,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido ao ler o documento.';
    console.error(`Falha ao extrair o documento ${documentId}:`, erro);
    try {
      await markFailed(ddb, documentTable, documentId, mensagem);
    } catch (erroAoMarcar) {
      console.error(`Falha ao marcar o documento ${documentId} como FAILED:`, erroAoMarcar);
    }
  }
}

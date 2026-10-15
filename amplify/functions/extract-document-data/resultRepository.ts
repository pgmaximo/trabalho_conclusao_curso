/**
 * Resumo do arquivo:
 * A parte da gravacao que fala com a AWS. A montagem do comando e a decisao
 * do que pode ser gravado vivem em resultWriteBuilder.ts, sem AWS, para
 * poderem ser testadas.
 */
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  type UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

import { EXTRACTION_STATUS, type ReviewStatus } from '../../data/schemas/extractionEnums';
// Modulo puro, sem AWS e sem estado, apesar do nome da pasta. Este e o
// terceiro consumidor. Nao foi movido para uma pasta neutra de proposito: a
// feature de wearable esta mergeada e testada, e mover o arquivo dela para
// arrumar o NOME de uma pasta e risco sem beneficio (regra 5).
import { buildUpdateExpression } from '../health-import-shared/updateExpressionBuilder';

import { comoLinhaExistente, type LinhaExistente } from './regravacao';
import { buildLabResultUpdate, type LabResultRow } from './resultWriteBuilder';

export type { LabResultRow } from './resultWriteBuilder';
export { buildLabResultUpdate, separarLinhasGravaveis } from './resultWriteBuilder';

const [, PROCESSING, SUCCEEDED, NO_RESULTS, FAILED] = EXTRACTION_STATUS;

export type PrescriptionItemRow = {
  id: string;
  owner: string;
  documentId: string;
  medicationLabel: string;
  dose: string | null;
  unit: string | null;
  frequency: string | null;
  duration: string | null;
  rawText: string;
  confidence: number;
  reviewStatus: ReviewStatus;
};

export async function putLabResults(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  rows: LabResultRow[],
): Promise<void> {
  // Sequencial de proposito. Um laudo tem dezenas de linhas, nao milhares, e
  // BatchWrite nao aceita UpdateExpression -- so Put, que e exatamente o que
  // esta feature nao pode usar.
  for (const row of rows) {
    await ddb.send(new UpdateCommand(buildLabResultUpdate(row, tableName)));
  }
}

/** O indice que o Amplify cria para `index('documentId')` no LabResult. Nome
 *  conferido na tabela do sandbox em 2026-09-24. */
const INDICE_POR_DOCUMENTO = 'labResultsByDocumentId';

/**
 * O que a leitura anterior deste documento deixou gravado (Bloco 11). E a
 * leitura que permite a regravacao preservar o que a pessoa conferiu e trocar
 * a linha de codigo local pela de catalogo. Paginada: um laudo tem dezenas de
 * linhas, mas o limite de 1 MB por pagina nao e do laudo, e do DynamoDB.
 */
export async function listarLinhasDoDocumento(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  documentId: string,
): Promise<LinhaExistente[]> {
  const linhas: LinhaExistente[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const saida = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: INDICE_POR_DOCUMENTO,
        KeyConditionExpression: '#documentId = :documentId',
        ExpressionAttributeNames: { '#documentId': 'documentId' },
        ExpressionAttributeValues: { ':documentId': documentId },
        ExclusiveStartKey: cursor,
      }),
    );
    for (const item of saida.Items ?? []) {
      const linha = comoLinhaExistente(item);
      if (linha) linhas.push(linha);
    }
    cursor = saida.LastEvaluatedKey;
  } while (cursor);
  return linhas;
}

/** Apaga as linhas de codigo local que a leitura nova substituiu. Chamado
 *  DEPOIS de gravar as novas: uma falha no meio deixa duplicado, nunca perdido. */
export async function apagarLinhas(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  ids: string[],
): Promise<void> {
  for (const id of ids) {
    await ddb.send(new DeleteCommand({ TableName: tableName, Key: { id } }));
  }
}

function buildPrescriptionUpdate(row: PrescriptionItemRow, tableName: string): UpdateCommandInput {
  const agora = new Date().toISOString();
  const base = buildUpdateExpression({
    __typename: 'PrescriptionItem',
    owner: row.owner,
    documentId: row.documentId,
    medicationLabel: row.medicationLabel,
    dose: row.dose,
    unit: row.unit,
    frequency: row.frequency,
    duration: row.duration,
    rawText: row.rawText,
    confidence: row.confidence,
    reviewStatus: row.reviewStatus,
    updatedAt: agora,
  });
  const trecho = '#createdAt = if_not_exists(#createdAt, :createdAt)';
  const expressao = base.UpdateExpression.startsWith('SET ')
    ? base.UpdateExpression.replace('SET ', `SET ${trecho}, `)
    : `SET ${trecho} ${base.UpdateExpression}`;
  return {
    TableName: tableName,
    Key: { id: row.id },
    UpdateExpression: expressao,
    ExpressionAttributeNames: { ...base.ExpressionAttributeNames, '#createdAt': 'createdAt' },
    ExpressionAttributeValues: { ...base.ExpressionAttributeValues, ':createdAt': agora },
  };
}

export async function putPrescriptionItems(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  rows: PrescriptionItemRow[],
): Promise<void> {
  for (const row of rows) {
    await ddb.send(new UpdateCommand(buildPrescriptionUpdate(row, tableName)));
  }
}

export type DocumentRow = {
  id: string;
  owner?: string;
  documentType?: string | null;
  s3FileName?: string;
  /**
   * A chave completa que o upload gravou. Ausente nas linhas criadas antes de
   * 2026-09-18 -- e a ausencia precisa ser tratada, nunca suprida por conta:
   * ver `documentKey.ts`, que existe por causa disso.
   */
  s3Key?: string | null;
  /** As folhas 2 a N (Bloco 11). Ausente em documento de uma folha. */
  extraPageKeys?: (string | null)[] | null;
  documentDate?: string;
  // A validade da receita NAO entra aqui de proposito. Ela e do formulario, e
  // o jeito seguro de a extracao nunca a tocar e ela nem existir no tipo com
  // que esta funcao enxerga o documento -- mais forte do que um comentario
  // pedindo cuidado. Ha teste varrendo os arquivos desta pasta.
};

export async function readDocumentRow(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  documentId: string,
): Promise<DocumentRow | null> {
  // ConsistentRead: esta Lambda pode rodar milissegundos depois de a
  // start-document-extraction ter marcado PROCESSING.
  const out = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { id: documentId }, ConsistentRead: true }),
  );
  return (out.Item as DocumentRow | undefined) ?? null;
}

async function marcar(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  documentId: string,
  campos: Parameters<typeof buildUpdateExpression>[0],
): Promise<void> {
  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
    buildUpdateExpression({ ...campos, updatedAt: new Date().toISOString() });

  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: documentId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    }),
  );
}

export const markProcessing = (ddb: DynamoDBDocumentClient, t: string, id: string) =>
  marcar(ddb, t, id, {
    extractionStatus: PROCESSING,
    extractionStartedAt: new Date().toISOString(),
    extractionError: null,
  });

export const markSucceeded = (
  ddb: DynamoDBDocumentClient,
  t: string,
  id: string,
  f: {
    checksum: string;
    textKey: string | null;
    warnings: string[];
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    /** Como esta escrito no papel. Ausente quando o laudo nao deixa claro. */
    laboratorio?: string | null;
  },
) =>
  marcar(ddb, t, id, {
    extractionStatus: SUCCEEDED,
    laboratorio: f.laboratorio ?? null,
    extractedAt: new Date().toISOString(),
    sourceChecksum: f.checksum,
    extractedTextKey: f.textKey,
    extractionWarnings: f.warnings,
    modelId: f.modelId,
    inputTokens: f.inputTokens,
    outputTokens: f.outputTokens,
    extractionError: null,
  });

/** Documento em prosa, sorologia, cultura. NAO e falha, e a copy da tela nao
 *  pode trata-lo como tal (spec secao 2). */
export const markNoResults = (
  ddb: DynamoDBDocumentClient,
  t: string,
  id: string,
  f: { checksum: string; textKey: string | null; warnings: string[]; laboratorio?: string | null },
) =>
  marcar(ddb, t, id, {
    extractionStatus: NO_RESULTS,
    // Laudo em prosa tambem tem emissor, e saber de quem ele e continua util.
    laboratorio: f.laboratorio ?? null,
    extractedAt: new Date().toISOString(),
    sourceChecksum: f.checksum,
    extractedTextKey: f.textKey,
    extractionWarnings: f.warnings,
    extractionError: null,
  });

export const markFailed = (
  ddb: DynamoDBDocumentClient,
  t: string,
  id: string,
  mensagem: string,
) => marcar(ddb, t, id, { extractionStatus: FAILED, extractionError: mensagem });

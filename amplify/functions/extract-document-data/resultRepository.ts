/**
 * Resumo do arquivo:
 * A parte da gravacao que fala com a AWS. A montagem do comando e a decisao
 * do que pode ser gravado vivem em resultWriteBuilder.ts, sem AWS, para
 * poderem ser testadas.
 */
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  type UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

import { EXTRACTION_STATUS, type ReviewStatus } from '../../data/schemas/extractionEnums';
// Modulo puro, sem AWS e sem estado, apesar do nome da pasta. Este e o
// terceiro consumidor. Nao foi movido para uma pasta neutra de proposito: a
// feature de wearable esta mergeada e testada, e mover o arquivo dela para
// arrumar o NOME de uma pasta e risco sem beneficio (regra 5).
import { buildUpdateExpression } from '../health-import-shared/updateExpressionBuilder';

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
  documentDate?: string;
  expirationDate?: string | null;
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
  },
) =>
  marcar(ddb, t, id, {
    extractionStatus: SUCCEEDED,
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
  f: { checksum: string; textKey: string | null; warnings: string[] },
) =>
  marcar(ddb, t, id, {
    extractionStatus: NO_RESULTS,
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

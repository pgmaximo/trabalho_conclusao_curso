import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { HEALTH_IMPORT_STATUS } from '../../data/schemas/healthImportEnums';
import { buildUpdateExpression } from '../health-import-shared/updateExpressionBuilder';

const [, , READY, FAILED] = HEALTH_IMPORT_STATUS;

export type HealthImportRow = {
  id: string;
  owner?: string;
  status?: string | null;
  sourceHint?: string | null;
  fileKeys?: string[];
  fileNames?: string[];
};

/**
 * ConsistentRead: true -- a Lambda B pode rodar poucos milissegundos depois
 * da start-health-analysis ter marcado PROCESSING; uma leitura eventualmente
 * consistente poderia devolver a versao PENDING ainda nao propagada.
 */
export async function readImport(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  importId: string,
): Promise<HealthImportRow | null> {
  const result = await ddbClient.send(
    new GetCommand({ TableName: tableName, Key: { id: importId }, ConsistentRead: true }),
  );
  return (result.Item as HealthImportRow | undefined) ?? null;
}

export type AnalysisResultFields = {
  periodStart: string | null;
  periodEnd: string | null;
  dayCount: number;
  metricsJson: string;
  insightsJson: string;
  resultArtifactKey: string;
  warnings: string[];
  modelId: string;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Escreve o resultado da analise via UpdateCommand -- NUNCA PutCommand, para
 * nao apagar owner/id/__typename/createdAt (ver comentario em
 * amplify/data/schemas/health-import.ts). periodStart/periodEnd usam `null`
 * (via buildUpdateExpression) em vez de omitir quando nao apuraveis, para o
 * campo ficar de fato ausente no item em vez de reter um valor de uma
 * tentativa anterior.
 */
export async function markReady(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  importId: string,
  fields: AnalysisResultFields,
): Promise<void> {
  const analyzedAt = new Date().toISOString();

  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = buildUpdateExpression({
    status: READY,
    periodStart: fields.periodStart,
    periodEnd: fields.periodEnd,
    dayCount: fields.dayCount,
    metricsJson: fields.metricsJson,
    insightsJson: fields.insightsJson,
    resultArtifactKey: fields.resultArtifactKey,
    warnings: fields.warnings,
    analyzedAt,
    modelId: fields.modelId,
    inputTokens: fields.inputTokens,
    outputTokens: fields.outputTokens,
    updatedAt: analyzedAt,
    errorMessage: null,
  });

  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: importId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    }),
  );
}

/**
 * Marca a importacao como FAILED com uma mensagem em pt-BR. Chamada dentro do
 * catch de nivel superior do handler -- a Lambda B nunca deve lancar, senao o
 * retry automatico do invoke assincrono repetiria (e pagaria) a chamada ao
 * Bedrock ate 2x a mais (ver configureAsyncInvoke em amplify/backend.ts).
 */
export async function markFailed(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  importId: string,
  errorMessage: string,
): Promise<void> {
  const updatedAt = new Date().toISOString();

  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = buildUpdateExpression({
    status: FAILED,
    errorMessage,
    updatedAt,
  });

  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: importId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    }),
  );
}

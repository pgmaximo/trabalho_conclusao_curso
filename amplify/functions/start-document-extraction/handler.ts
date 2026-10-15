/**
 * Resumo do arquivo:
 * Resolver da mutation `startDocumentExtraction`. Valida o dono, marca
 * PROCESSING e dispara a extract-document-data de forma assincrona. NUNCA
 * espera o resultado: o resolver do AppSync corta em 30 segundos e a extracao
 * leva de 30s a alguns minutos (medido na tarefa 1).
 *
 * Copia o desenho de start-health-analysis/handler.ts, que ja esta em
 * producao neste repositorio.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { EXTRACTION_STATUS } from '../../data/schemas/extractionEnums';
import { buildUpdateExpression } from '../health-import-shared/updateExpressionBuilder';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const lambdaClient = new LambdaClient();

const [, PROCESSING] = EXTRACTION_STATUS;

type AppSyncEvent = {
  arguments?: { documentId?: string | null };
  identity?: { sub?: string; username?: string };
};

type MedicalDocumentRow = {
  id: string;
  owner?: string;
  s3FileName?: string;
  extractionStatus?: string | null;
  extractionStartedAt?: string | null;
};

type HandlerResult = { documentId: string; status: string };

/**
 * Um documento ja em PROCESSING ha muito tempo esta travado, nao rodando: a
 * Lambda tem teto de 10 minutos, entao qualquer coisa alem disso e resto de
 * uma execucao que morreu sem marcar FAILED. Sem esta janela, um travamento
 * deixaria o documento impossivel de reprocessar para sempre.
 */
const JANELA_DE_TRAVAMENTO_MS = 11 * 60 * 1000;

function jaEstaRodando(row: MedicalDocumentRow): boolean {
  if (row.extractionStatus !== PROCESSING) return false;
  if (!row.extractionStartedAt) return true;
  const inicio = Date.parse(row.extractionStartedAt);
  if (Number.isNaN(inicio)) return true;
  return Date.now() - inicio < JANELA_DE_TRAVAMENTO_MS;
}

export async function handler(event: AppSyncEvent): Promise<HandlerResult> {
  const sub = event.identity?.sub;
  const username = event.identity?.username;
  if (!sub || !username) throw new Error('Usuario nao autenticado.');

  // owner = `${sub}::${username}`, mesmo formato de start-health-analysis. O
  // valor GRAVADO na tabela e o composto; a resposta do GraphQL ecoa so a
  // metade "sub" para exibicao, e isso ja induziu engano neste repositorio.
  const owner = `${sub}::${username}`;
  const documentId = event.arguments?.documentId;
  if (!documentId) throw new Error('documentId e obrigatorio.');

  const tableName = process.env.MEDICAL_DOCUMENT_TABLE_NAME;
  if (!tableName) throw new Error('MEDICAL_DOCUMENT_TABLE_NAME nao configurada.');

  // ConsistentRead: o app chama esta mutation poucos ms depois de gravar o
  // documento, e a leitura eventual devolveria o item ainda nao propagado --
  // a validacao falharia por corrida, nao por falta de permissao real.
  const getResult = await ddbClient.send(
    new GetCommand({ TableName: tableName, Key: { id: documentId }, ConsistentRead: true }),
  );
  const row = getResult.Item as MedicalDocumentRow | undefined;

  // Mesma mensagem para "nao existe" e "existe mas nao e seu" -- nao vazar
  // para o chamador se um documentId de outro usuario existe.
  if (!row || row.owner !== owner) throw new Error('Documento nao encontrado.');
  if (!row.s3FileName) throw new Error('Este documento nao tem arquivo associado.');
  if (jaEstaRodando(row)) throw new Error('A extracao deste documento ja esta em andamento.');

  const startedAt = new Date().toISOString();

  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
    buildUpdateExpression({
      extractionStatus: PROCESSING,
      extractionStartedAt: startedAt,
      updatedAt: startedAt,
      // Reprocessar limpa o resultado anterior: erro e avisos da passagem
      // passada nao podem sobreviver a uma passagem nova.
      extractionError: null,
      extractionWarnings: null,
    });

  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: documentId },
      UpdateExpression,
      // Segunda checagem de dono na propria escrita: fecha a janela de corrida
      // entre o GetCommand acima e esta gravacao.
      ConditionExpression: '#owner = :ownerCheck',
      ExpressionAttributeNames: { ...ExpressionAttributeNames, '#owner': 'owner' },
      ExpressionAttributeValues: { ...ExpressionAttributeValues, ':ownerCheck': owner },
    }),
  );

  const functionName = process.env.EXTRACT_FUNCTION_NAME;
  if (!functionName) throw new Error('EXTRACT_FUNCTION_NAME nao configurada.');

  // Invocacao assincrona: o cliente acompanha por
  // MedicalDocument.extractionStatus (tarefa 11).
  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event',
      // O owner vai no payload porque a role da Lambda nao carrega o claim do
      // usuario final, e a extract-document-data precisa dele para gravar
      // LabResult com o mesmo dono (tarefa 10).
      Payload: Buffer.from(JSON.stringify({ documentId, owner })),
    }),
  );

  return { documentId, status: PROCESSING };
}

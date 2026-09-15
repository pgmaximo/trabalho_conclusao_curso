import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { HEALTH_IMPORT_STATUS } from '../../data/schemas/healthImportEnums';
import { isFileKeyValid } from '../health-import-shared/fileKeyValidation';
import { buildUpdateExpression } from '../health-import-shared/updateExpressionBuilder';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const lambdaClient = new LambdaClient();

const [PENDING, PROCESSING] = HEALTH_IMPORT_STATUS;

type AppSyncIdentity = {
  sub?: string;
  username?: string;
};

type Args = {
  importId?: string | null;
};

type AppSyncEvent = {
  arguments?: Args;
  identity?: AppSyncIdentity;
};

type HealthImportRow = {
  id: string;
  owner?: string;
  status?: string | null;
  fileKeys?: string[];
};

type HandlerResult = {
  importId: string;
  status: string;
};

/**
 * Nao usamos Schema['startHealthAnalysis']['functionHandler'] pelo mesmo
 * motivo documentado em get-prevention-recommendations/handler.ts.
 */
export async function handler(event: AppSyncEvent): Promise<HandlerResult> {
  const identity = event.identity;
  const sub = identity?.sub;
  const username = identity?.username;

  if (!sub || !username) {
    throw new Error('Usuario nao autenticado.');
  }

  // owner = `${sub}::${username}`, mesmo formato usado por
  // get-prevention-recommendations/handler.ts para UserProfile. Verificado
  // direto no item bruto do DynamoDB (nao na resposta do GraphQL, que so
  // ecoa a metade "sub" do valor para exibicao e induziu um engano aqui
  // durante o desenvolvimento -- o valor de fato GRAVADO na tabela e sempre
  // o composto `sub::username`, confirmado lendo o item via GetItem direto).
  const owner = `${sub}::${username}`;
  const importId = event.arguments?.importId;

  if (!importId) {
    throw new Error('importId e obrigatorio.');
  }

  const tableName = process.env.HEALTH_IMPORT_TABLE_NAME;
  if (!tableName) {
    throw new Error('HEALTH_IMPORT_TABLE_NAME nao configurada.');
  }

  // ConsistentRead: true -- senao esta leitura pode correr com o
  // client.models.HealthImport.create() que acabou de rodar (poucos ms antes,
  // no mesmo fluxo do app) e devolver o item ainda nao propagado, fazendo
  // esta validacao falhar por uma corrida de consistencia eventual, nao por
  // falta de permissao real do usuario.
  const getResult = await ddbClient.send(
    new GetCommand({ TableName: tableName, Key: { id: importId }, ConsistentRead: true }),
  );
  const row = getResult.Item as HealthImportRow | undefined;

  // Mesma mensagem para "nao existe" e "existe mas nao e sua" -- nao vazar
  // para o chamador se uma importId de outro usuario existe ou nao.
  if (!row || row.owner !== owner) {
    throw new Error('Importacao nao encontrada.');
  }

  if (row.status !== PENDING) {
    throw new Error('Esta importacao ja foi iniciada.');
  }

  const fileKeys = row.fileKeys ?? [];
  if (fileKeys.length === 0) {
    throw new Error('Nenhum arquivo associado a esta importacao.');
  }

  // Cada chave deve estar sob health-imports/<qualquer-identityId>/<ESTE
  // importId>/<arquivo>. O segmento de identityId nao e comparado contra um
  // valor esperado porque as claims do AppSync (auth por User Pool) nao
  // expoem o identityId do Identity Pool usado pelo Storage -- a seguranca
  // vem de duas outras garantias, nao desta regex sozinha: (1) fileKeys so
  // pode ter sido definido pelo dono da linha (allow.owner() no create) e (2)
  // importId e um uuid de alta entropia gerado de forma independente a cada
  // importacao, entao nenhum objeto real de outro usuario jamais vai
  // coincidir com esse segmento por acaso. Ver fileKeyValidation.ts.
  const invalidKey = fileKeys.find((key) => !isFileKeyValid(key, importId));
  if (invalidKey) {
    throw new Error('Um dos arquivos desta importacao tem um caminho invalido.');
  }

  const startedAt = new Date().toISOString();

  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = buildUpdateExpression({
    status: PROCESSING,
    startedAt,
    updatedAt: startedAt,
    errorMessage: null,
  });

  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: importId },
      UpdateExpression,
      // Segunda checagem de dono no proprio UpdateCommand: fecha a janela de
      // corrida entre o GetCommand acima e esta escrita (ex.: se a linha
      // fosse de alguma forma apagada/recriada nesse intervalo).
      ConditionExpression: '#owner = :ownerCheck',
      ExpressionAttributeNames: { ...ExpressionAttributeNames, '#owner': 'owner' },
      ExpressionAttributeValues: { ...ExpressionAttributeValues, ':ownerCheck': owner },
    }),
  );

  const functionName = process.env.ANALYZE_FUNCTION_NAME;
  if (!functionName) {
    throw new Error('ANALYZE_FUNCTION_NAME nao configurada.');
  }

  // Invocacao assincrona (fire-and-forget): o resolver do AppSync tem teto de
  // 30s e a analise leva de 30s a poucos minutos, entao nunca esperamos o
  // resultado aqui -- o cliente acompanha via polling em HealthImport.status.
  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify({ importId })),
    }),
  );

  return { importId, status: PROCESSING };
}

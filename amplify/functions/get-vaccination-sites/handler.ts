import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { fetchUbsPorMunicipio } from './cnesClient';
import { haversineDistanceKm } from './distance';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

// UBS mudam pouco — TTL mais longo que o cache de campanhas (12h).
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_RESULTS = 15;

type Args = {
  codigoMunicipio: string;
  latitude?: number | null;
  longitude?: number | null;
};

type AppSyncEvent = {
  arguments?: Args;
};

type UnidadeResultado = {
  cnes: string;
  nome: string;
  bairro: string | null;
  logradouro: string | null;
  latitude: number | null;
  longitude: number | null;
  distanciaKm: number | null;
};

type HandlerResult = {
  unidades: UnidadeResultado[];
};

async function readCache(tableName: string | undefined, codigoMunicipio: string): Promise<UnidadeResultado[] | null> {
  if (!tableName) return null;

  const result = await ddbClient.send(new GetCommand({ TableName: tableName, Key: { codigoMunicipio } }));
  const item = result.Item as { payload?: UnidadeResultado[]; expiresAt?: number } | undefined;

  if (!item?.payload || !item.expiresAt) return null;
  if (item.expiresAt < Math.floor(Date.now() / 1000)) return null;

  return item.payload;
}

async function writeCache(
  tableName: string | undefined,
  codigoMunicipio: string,
  payload: UnidadeResultado[],
): Promise<void> {
  if (!tableName) return;

  await ddbClient.send(
    new PutCommand({
      TableName: tableName,
      Item: { codigoMunicipio, payload, expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS },
    }),
  );
}

export async function handler(event: AppSyncEvent): Promise<HandlerResult> {
  const args = event.arguments;

  if (!args?.codigoMunicipio) {
    throw new Error('codigoMunicipio é obrigatório.');
  }

  const tableName = process.env.SITE_CACHE_TABLE_NAME;
  const cached = await readCache(tableName, args.codigoMunicipio);

  let unidades: UnidadeResultado[];

  if (cached) {
    unidades = cached;
  } else {
    const estabelecimentos = await fetchUbsPorMunicipio(args.codigoMunicipio);

    unidades = estabelecimentos.map((estabelecimento) => ({
      cnes: String(estabelecimento.codigo_cnes),
      nome:
        estabelecimento.nome_fantasia?.trim() ||
        estabelecimento.nome_razao_social?.trim() ||
        'Unidade de saúde',
      bairro: estabelecimento.bairro_estabelecimento ?? null,
      logradouro:
        [estabelecimento.endereco_estabelecimento, estabelecimento.numero_estabelecimento]
          .filter(Boolean)
          .join(', ') || null,
      latitude: estabelecimento.latitude_estabelecimento_decimo_grau ?? null,
      longitude: estabelecimento.longitude_estabelecimento_decimo_grau ?? null,
      distanciaKm: null,
    }));

    await writeCache(tableName, args.codigoMunicipio, unidades);
  }

  // Distância é calculada por invocação (não fica no cache — depende da
  // posição do usuário no momento, que muda a cada chamada), a partir do
  // payload cacheado ou recém-buscado.
  const comDistancia =
    args.latitude !== undefined && args.latitude !== null && args.longitude !== undefined && args.longitude !== null
      ? unidades.map((unidade) => ({
          ...unidade,
          distanciaKm:
            unidade.latitude !== null && unidade.longitude !== null
              ? haversineDistanceKm(
                  { latitude: args.latitude as number, longitude: args.longitude as number },
                  { latitude: unidade.latitude, longitude: unidade.longitude },
                )
              : null,
        }))
      : unidades;

  const ordenadas = [...comDistancia].sort((a, b) => {
    if (a.distanciaKm === null) return 1;
    if (b.distanciaKm === null) return -1;
    return a.distanciaKm - b.distanciaKm;
  });

  return { unidades: ordenadas.slice(0, MAX_RESULTS) };
}

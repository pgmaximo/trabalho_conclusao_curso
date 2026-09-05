import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getCampanhasAtivas } from './campaignCalendar';
import { fetchPniSample } from './pniClient';
import { aggregateCampanhas, computeDataAsOf } from './campaignAggregator';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

// TTL do cache: a amostragem do PNI (16 chamadas HTTP sequenciais) e a parte
// cara desta funcao — cachear por 12h garante que so o primeiro usuario do
// dia (por UF) paga esse custo, evitando repetir o problema ja registrado na
// Prevencao (dataset inteiro buscado a cada abertura de tela, sem cache —
// prevencao/tasks.md 5.2).
const CACHE_TTL_SECONDS = 12 * 60 * 60;

type Args = {
  uf?: string | null;
  codigoMunicipio?: string | null;
};

type AppSyncEvent = {
  arguments?: Args;
};

type CampanhaResultado = {
  catalogId: string;
  nome: string;
  ativa: boolean;
  janelaInicio: string;
  janelaFim: string;
  dosesNoPeriodo: number | null;
  ufReferencia: string | null;
  dataAsOf: string;
  fonteUrl: string;
};

type HandlerResult = {
  campanhas: CampanhaResultado[];
  amostragem: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Nao usamos Schema['getVaccinationCampaigns']['functionHandler'] pelo mesmo
 * motivo documentado em get-prevention-recommendations/handler.ts: o tipo
 * gerado para arrays de customType aninhados vaza o tipo do schema builder em
 * vez do tipo de dado plano nessa combinacao do Amplify Gen2. O runtime nao e
 * afetado.
 */
async function readCache(tableName: string | undefined, cacheKey: string): Promise<HandlerResult | null> {
  if (!tableName) return null;

  const result = await ddbClient.send(new GetCommand({ TableName: tableName, Key: { uf: cacheKey } }));
  const item = result.Item as { payload?: HandlerResult; expiresAt?: number } | undefined;

  if (!item?.payload || !item.expiresAt) return null;
  if (item.expiresAt < Math.floor(Date.now() / 1000)) return null; // expirado

  return item.payload;
}

async function writeCache(tableName: string | undefined, cacheKey: string, payload: HandlerResult): Promise<void> {
  if (!tableName) return;

  await ddbClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        uf: cacheKey,
        payload,
        expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS,
      },
    }),
  );
}

export async function handler(event: AppSyncEvent): Promise<HandlerResult> {
  const uf = event.arguments?.uf ?? null;
  const cacheKey = uf ?? 'NACIONAL';
  const tableName = process.env.CAMPAIGN_CACHE_TABLE_NAME;

  const cached = await readCache(tableName, cacheKey);
  if (cached) {
    return cached;
  }

  const hoje = todayIso();
  const campanhasAtivas = getCampanhasAtivas(hoje);

  if (campanhasAtivas.length === 0) {
    const result: HandlerResult = {
      campanhas: [],
      amostragem: 'Nenhuma campanha nacional de vacinação está ativa hoje.',
    };
    await writeCache(tableName, cacheKey, result);
    return result;
  }

  const ano = Number(hoje.slice(0, 4));
  const sample = await fetchPniSample(ano);
  const dataAsOf = computeDataAsOf(sample);
  const agregadas = aggregateCampanhas(campanhasAtivas, sample, uf);

  const result: HandlerResult = {
    campanhas: agregadas.map((campanha) => ({
      catalogId: campanha.id,
      nome: campanha.nome,
      ativa: campanha.ativa,
      janelaInicio: campanha.janelaInicio,
      janelaFim: campanha.janelaFim,
      dosesNoPeriodo: campanha.dosesNoPeriodo,
      ufReferencia: campanha.ufReferencia,
      dataAsOf: dataAsOf ?? '',
      fonteUrl: campanha.fonteUrl,
    })),
    amostragem: `Contagem baseada em uma amostra de ${sample.length} registros do PNI/RNDS (apidadosabertos.saude.gov.br) — não é um censo. Dado mais recente da amostra: ${dataAsOf ?? 'indisponível'}.`,
  };

  await writeCache(tableName, cacheKey, result);
  return result;
}

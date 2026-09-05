import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { fetchUspstfDataset } from './uspstfClient';
import { filterRecommendations, resolveGeneral, resolveGradeText } from './uspstfFilter';
import { translateToPortuguese } from './translateClient';
import type { ProfileForFiltering } from './uspstfFilter';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

type AppSyncIdentity = {
  sub?: string;
  username?: string;
};

type AppSyncFunctionEvent = {
  identity?: AppSyncIdentity;
};

type PreventionRecommendationResult = {
  id: number;
  grade: string;
  gradeText: string;
  gradeTextPt: string | null;
  title: string;
  titlePt: string | null;
  text: string;
  textPt: string | null;
  rationale: string | null;
  rationalePt: string | null;
  topic: string | null;
  citationYear: string | null;
  ageMin: number | null;
  ageMax: number | null;
  sex: string | null;
  bmi: string | null;
};

type HandlerResult = {
  recommendations: PreventionRecommendationResult[];
  lastUpdated: string;
  profileComplete: boolean;
};

/**
 * Nao usamos Schema['getPreventionRecommendations']['functionHandler'] aqui: o tipo
 * gerado para arrays de customType aninhados (a.ref('PreventionRecommendation').array())
 * hoje vaza o tipo do schema builder em vez do tipo de dado plano — limitacao
 * conhecida do Amplify Gen2 nessa combinacao, nao um erro deste handler. O runtime
 * (serializacao JSON conforme o schema) nao e afetado.
 */
export async function handler(event: AppSyncFunctionEvent): Promise<HandlerResult> {
  const identity = event.identity as AppSyncIdentity | undefined;
  const sub = identity?.sub;
  const username = identity?.username;

  if (!sub || !username) {
    throw new Error('Usuario nao autenticado.');
  }

  const tableName = process.env.USER_PROFILE_TABLE_NAME;

  if (!tableName) {
    throw new Error('USER_PROFILE_TABLE_NAME nao configurada.');
  }

  const owner = `${sub}::${username}`;

  // Nota: Limit nao pode ser usado aqui — no Scan, Limit restringe quantos itens
  // sao avaliados antes do FilterExpression ser aplicado, nao quantos itens
  // filtrados sao retornados. Com Limit, o item do dono podia ser descartado
  // se nao fosse o primeiro item lido pelo scan.
  const scanResult = await ddbClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#owner = :owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: { ':owner': owner },
    }),
  );

  const profile = scanResult.Items?.[0] as ProfileForFiltering | undefined;

  if (!profile) {
    return { recommendations: [], lastUpdated: '', profileComplete: false };
  }

  const apiKey = process.env.USPSTF_API_KEY;

  if (!apiKey) {
    throw new Error('USPSTF_API_KEY nao configurada.');
  }

  const dataset = await fetchUspstfDataset(apiKey);
  const matches = filterRecommendations(dataset, profile);

  // Traduz os textos de grau uma unica vez por combinacao grade+versao (sao
  // reaproveitados por muitas recomendacoes), em vez de retraduzir a cada item.
  const gradeTextCache = new Map<string, Promise<string | null>>();

  function getTranslatedGradeText(grade: string, gradeVer: number, englishGradeText: string) {
    const cacheKey = `${grade}:${gradeVer}`;
    const cached = gradeTextCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const promise = translateToPortuguese(englishGradeText);
    gradeTextCache.set(cacheKey, promise);
    return promise;
  }

  const recommendations = await Promise.all(
    matches.map(async (rec) => {
      const general = resolveGeneral(dataset, rec.general);
      const gradeText = resolveGradeText(dataset, rec.grade, rec.gradeVer);

      const [titlePt, textPt, rationalePt, gradeTextPt] = await Promise.all([
        translateToPortuguese(rec.title),
        translateToPortuguese(rec.text),
        translateToPortuguese(rec.rationale),
        getTranslatedGradeText(rec.grade, rec.gradeVer, gradeText),
      ]);

      return {
        id: rec.id,
        grade: rec.grade,
        gradeText,
        gradeTextPt,
        title: rec.title,
        titlePt,
        text: rec.text,
        textPt,
        rationale: rec.rationale ?? null,
        rationalePt,
        topic: general?.topic ?? null,
        citationYear: general?.topicYear ?? null,
        ageMin: rec.ageRange?.[0] ?? null,
        ageMax: rec.ageRange?.[1] ?? null,
        sex: rec.sex ?? null,
        bmi: rec.bmi ?? null,
      };
    }),
  );

  return {
    recommendations,
    lastUpdated: dataset.lastUpdated ?? '',
    profileComplete: true,
  };
}

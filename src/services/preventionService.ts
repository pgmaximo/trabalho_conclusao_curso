/**
 * Resumo do arquivo:
 * Servico real de prevencao. Chama a query customizada getPreventionRecommendations
 * (funcao Amplify que consulta a API do USPSTF do lado do servidor) e mapeia a
 * resposta para o formato usado pela tela de Prevencao.
 */
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { PreventionRecommendation, PreventionSnapshot, UspstfGrade } from '@/types/models';

const client = generateClient<Schema>();

/**
 * O tipo gerado pelo Amplify Data client para o campo `recommendations` (array de
 * customType aninhado) hoje vaza o tipo do schema builder em vez do tipo de dado
 * plano — mesma limitacao conhecida do Amplify Gen2 tratada no handler da funcao.
 * Fazemos o cast explicito abaixo para o formato de dado real que a API retorna.
 */
type RawRecommendation = {
  id: number;
  grade: string;
  gradeText: string;
  title: string;
  text: string;
  rationale?: string | null;
  topic?: string | null;
  citationYear?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  sex?: string | null;
  bmi?: string | null;
};

export async function getPreventionRecommendations(): Promise<PreventionSnapshot> {
  const { data, errors } = await client.queries.getPreventionRecommendations({});

  if (errors?.length) {
    const message = errors
      .map((error) => error.message)
      .filter(Boolean)
      .join('; ');
    throw new Error(message || 'Nao foi possivel carregar as recomendacoes preventivas.');
  }

  const rawRecommendations = (data?.recommendations ?? []) as unknown as (RawRecommendation | null)[];

  const recommendations: PreventionRecommendation[] = rawRecommendations
    .filter((rec): rec is RawRecommendation => rec !== null)
    .map((rec) => ({
      id: rec.id,
      grade: rec.grade as UspstfGrade,
      gradeText: rec.gradeText,
      title: rec.title,
      text: rec.text,
      rationale: rec.rationale ?? null,
      topic: rec.topic ?? null,
      citationYear: rec.citationYear ?? null,
      ageMin: rec.ageMin ?? null,
      ageMax: rec.ageMax ?? null,
      sex: rec.sex ?? null,
      bmi: rec.bmi ?? null,
    }));

  return {
    recommendations,
    lastUpdated: data?.lastUpdated ?? '',
    profileComplete: data?.profileComplete ?? false,
  };
}

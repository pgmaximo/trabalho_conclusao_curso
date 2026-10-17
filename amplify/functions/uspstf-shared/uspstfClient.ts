/**
 * Resumo do arquivo:
 * O cliente da API publica da USPSTF e os tipos do dataset. Mora em
 * `uspstf-shared/` porque a tela de Prevencao (`get-prevention-recommendations`)
 * e o chat (`consultar_prevencao`, E7) leem a MESMA fonte, e duas copias do
 * cliente divergiriam em silencio (D7.1 = A).
 *
 * O dataset e baixado INTEIRO e filtrado do nosso lado: a requisicao leva so
 * a chave, nunca idade, sexo ou IMC de quem pergunta.
 */
const USPSTF_API_URL = 'https://data.uspreventiveservicestaskforce.org/api/json';

export type UspstfSpecificRecommendation = {
  id: number;
  title: string;
  grade: string;
  gradeVer: number;
  sex?: string;
  ageRange?: [number, number];
  text: string;
  rationale?: string;
  riskName?: string;
  riskText?: string;
  general?: number | string;
  bmi?: 'UW' | 'N' | 'O' | 'OB';
};

export type UspstfGeneralRecommendation = {
  topic?: string;
  topicYear?: string;
  title?: string;
};

export type UspstfDataset = {
  specificRecommendations: UspstfSpecificRecommendation[];
  grades: Record<string, string[]>;
  generalRecommendations: Record<string, UspstfGeneralRecommendation>;
  lastUpdated?: string;
};

export type OpcoesDaConsulta = {
  /**
   * Teto de espera pela API. Opcional: a Lambda da tela nao passa e continua
   * como era. O chat passa, porque uma fonte lenta nao pode consumir o
   * orcamento do laco de ferramentas (120 s para ate 6 iteracoes).
   */
  timeoutMs?: number;
};

export async function fetchUspstfDataset(
  apiKey: string,
  opcoes: OpcoesDaConsulta = {},
): Promise<UspstfDataset> {
  const url = `${USPSTF_API_URL}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(
    url,
    opcoes.timeoutMs === undefined ? undefined : { signal: AbortSignal.timeout(opcoes.timeoutMs) },
  );

  if (!response.ok) {
    throw new Error(`Falha ao consultar a API do USPSTF (status ${response.status}).`);
  }

  const corpo = (await response.json()) as Partial<UspstfDataset> | null;

  // Uma resposta 200 que nao e o dataset (pagina de manutencao, formato novo)
  // viraria `TypeError` no `.filter` do filtro, longe da causa. Falhar AQUI
  // deixa o motivo no log e a mesma saida honesta para quem chama.
  if (!corpo || !Array.isArray(corpo.specificRecommendations)) {
    throw new Error('A API do USPSTF devolveu uma resposta inesperada.');
  }

  return corpo as UspstfDataset;
}

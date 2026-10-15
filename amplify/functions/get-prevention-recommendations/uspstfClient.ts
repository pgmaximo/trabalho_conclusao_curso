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

export async function fetchUspstfDataset(apiKey: string): Promise<UspstfDataset> {
  const response = await fetch(`${USPSTF_API_URL}?key=${encodeURIComponent(apiKey)}`);

  if (!response.ok) {
    throw new Error(`Falha ao consultar a API do USPSTF (status ${response.status}).`);
  }

  return (await response.json()) as UspstfDataset;
}

import { DRUG_ALIASES } from './aliases';

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Normaliza um nome de medicamento digitado pelo usuário para comparação:
 * minúsculas, sem acento, sem dosagem/unidade anexada ("Losartana 50mg" ->
 * "losartana"), sem pontuação, espaços colapsados.
 */
export function normalizeDrugName(raw: string): string {
  const withoutParenthetical = raw.replace(/\([^)]*\)/g, ' ');
  const withoutDosage = withoutParenthetical.replace(/\d+\s*(mg|mcg|g|ml|ui|%)\b.*$/i, ' ');
  const ascii = stripDiacritics(withoutDosage.toLowerCase());
  return ascii.replace(/[^a-z\s]/g, ' ').trim().replace(/\s+/g, ' ');
}

const ALIAS_TO_CANONICAL: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(DRUG_ALIASES)) {
    map[canonical] = canonical;
    for (const alias of aliases) {
      map[normalizeDrugName(alias)] = canonical;
    }
  }
  return map;
})();

/**
 * Resolve o texto livre digitado pelo usuário para a chave canônica do
 * princípio ativo, via a tabela de aliases. Correspondência exata apenas —
 * sem distância de edição / fuzzy matching: este é um campo relevante para
 * segurança com uma lista curta de candidatos, e é melhor não encontrar uma
 * correspondência do que encontrar a errada (mesmo princípio de "na dúvida,
 * não converta" usado em amplify/functions/extract-document-data/analyteNormalizer.ts).
 * Também tenta apenas a primeira palavra, para tolerar "Losartana 50mg"
 * digitado como texto único sem separador reconhecível pela regra de
 * dosagem de normalizeDrugName(). Retorna null quando não reconhecido.
 */
export function resolveCanonicalDrug(rawName: string): string | null {
  const normalized = normalizeDrugName(rawName);
  if (!normalized) return null;
  if (ALIAS_TO_CANONICAL[normalized]) return ALIAS_TO_CANONICAL[normalized];

  const firstWord = normalized.split(' ')[0];
  return ALIAS_TO_CANONICAL[firstWord] ?? null;
}

/**
 * Resumo do arquivo:
 * O token de unidade que o conversor usa por dentro -> a unidade que a pessoa
 * le. SO EXIBICAO: o banco guarda o token, e o conversor compara tokens (D28).
 *
 * Existe por um achado da rodada automatica da L7 (Bloco 10): o modo degradado
 * do chat dizia "0.033 10*3/uL", e as telas de serie e de detalhe mostravam o
 * mesmo "10*3/uL" e "u[IU]/mL". Nenhum laudo brasileiro escreve assim.
 *
 * E o caminho INVERSO do `UNIT_ALIASES` de `unitConverter.ts`: la o que o laudo
 * escreve vira token; aqui o token volta a ser o que o laudo escreveria.
 *
 * Modulo PURO, sem import -- e importado pelo aplicativo tambem.
 */

const EXATAS: Record<string, string> = {
  '10*3/uL': 'mil/µL',
  '10*6/uL': 'milhões/µL',
  'u[IU]/mL': 'µUI/mL',
  'm[IU]/mL': 'mUI/mL',
  'm[IU]/L': 'mUI/L',
  '[IU]/mL': 'UI/mL',
  '[IU]/L': 'UI/L',
  'mg/(24.h)': 'mg/24h',
  'g/(24.h)': 'g/24h',
  'mg/g{creat}': 'mg/g de creatinina',
  'ug/mg{creat}': 'µg/mg de creatinina',
  // INR e adimensional: o numero se basta.
  '{INR}': '',
};

/** O "u" minusculo do UCUM antes de grama, mol ou litro e o micro. O "U"
 *  maiusculo das enzimas (U/L) nao e tocado. */
const MICRO = /(^|\/)u(?=(g|mol|L)\b)/g;

export function unidadeLegivel(token: string | null | undefined): string {
  if (!token) return '';
  if (token in EXATAS) return EXATAS[token] as string;
  return token.replace(MICRO, '$1µ');
}

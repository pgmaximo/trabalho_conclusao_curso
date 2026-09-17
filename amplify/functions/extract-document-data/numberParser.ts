/**
 * Resumo do arquivo:
 * Texto do laudo -> numero. O laudo brasileiro escreve "32,5" e "1.234,56".
 * `Number('32,5')` devolve NaN e `parseFloat('32,5')` devolve 32 -- perde a
 * casa decimal sem levantar erro. Por isso todo numero vindo do documento
 * passa por aqui (D23).
 *
 * Este e o unico modulo da extracao compartilhado com o aplicativo, e a regra
 * que permite isso e estreita: ele NAO IMPORTA NADA -- nem AWS, nem `node:`.
 * A correcao de uma linha pela pessoa (tarefa 12b) le a virgula decimal com
 * exatamente a mesma funcao que leu o laudo.
 *
 * ATENCAO: ela recusa em vez de chutar. Nenhum caminho daqui produz um numero
 * que ela nao tenha entendido.
 */

export type ParsedNumber = { ok: true; value: number; qualifier: '<' | '>' | null } | { ok: false };

const FALHA: ParsedNumber = { ok: false };

export function parseDecimal(raw: string | number | null | undefined): ParsedNumber {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { ok: true, value: raw, qualifier: null } : FALHA;
  }
  if (typeof raw !== 'string') return FALHA;

  let texto = raw.trim();
  if (texto === '') return FALHA;

  // O sinal de censura sai antes de qualquer coisa (D21).
  let qualifier: '<' | '>' | null = null;
  if (texto.startsWith('<') || texto.startsWith('>')) {
    qualifier = texto[0] as '<' | '>';
    texto = texto.slice(1).trim();
  }
  // Alguns laudos escrevem "<=" ou "≤".
  texto = texto.replace(/^[=≤≥]\s*/, '');
  texto = texto.replace(/\s/g, '');
  if (texto === '') return FALHA;

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');

  if (temVirgula && temPonto) {
    // "1.234,56" — ponto e milhar, virgula e decimal. A ordem inversa
    // ("1,234.56") tambem aparece em laudo traduzido: decide pelo ultimo.
    texto =
      texto.lastIndexOf(',') > texto.lastIndexOf('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(/,/g, '');
  } else if (temVirgula) {
    if ((texto.match(/,/g) ?? []).length > 1) return FALHA;
    texto = texto.replace(',', '.');
  } else if (temPonto) {
    // Sem virgula: ponto e milhar so quando separa grupos de exatamente tres
    // digitos ("1.234"). "79.87" e decimal.
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) texto = texto.replace(/\./g, '');
    else if ((texto.match(/\./g) ?? []).length > 1) return FALHA;
  }

  if (!/^[+-]?\d*\.?\d+$/.test(texto)) return FALHA;
  const value = Number(texto);
  return Number.isFinite(value) ? { ok: true, value, qualifier } : FALHA;
}

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

/**
 * A censura escrita em PALAVRA (G5, Bloco 10). Medido no laudo real: a TFG do
 * Delboni veio como "Superior a 90" e entrou sem valor. As seis formas abaixo
 * sao ESTRITAS, e so elas viram o qualificador da D21.
 *
 * Comparadas sem acento e sem caixa: o texto e do laudo, e "INFERIOR A" e
 * "inferior a" sao a mesma coisa.
 */
const CENSURA_POR_EXTENSO: [RegExp, '<' | '>'][] = [
  [/^(superior a|maior que|acima de)\s+/, '>'],
  [/^(inferior a|menor que|abaixo de)\s+/, '<'],
];

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function parseDecimal(raw: string | number | null | undefined): ParsedNumber {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { ok: true, value: raw, qualifier: null } : FALHA;
  }
  if (typeof raw !== 'string') return FALHA;

  let texto = raw.trim();
  if (texto === '') return FALHA;

  // O sinal de censura sai antes de qualquer coisa (D21).
  const comparavel = semAcento(texto).replace(/\s+/g, ' ');
  let qualifier: '<' | '>' | null = null;
  const porExtenso = CENSURA_POR_EXTENSO.find(([padrao]) => padrao.test(comparavel));
  if (porExtenso) {
    qualifier = porExtenso[1];
    texto = comparavel.replace(porExtenso[0], '');
  } else if (texto.startsWith('<') || texto.startsWith('>')) {
    qualifier = texto[0] as '<' | '>';
    texto = texto.slice(1).trim();
  }
  // Censura NAO estrita -- "≤ 5", ">= 90", "igual ou superior a 90" -- nao
  // tem tratamento proprio, e isso e a regra: o que sobra depois do sinal nao e
  // numero, e a funcao recusa. O qualificador do projeto e ESTRITO (D21), e
  // "≤ 5" nao e "5" nem "<5". Ate o Bloco 10 uma linha aqui DESCARTAVA o "≤" e
  // o "=", e a linha entrava como 5 exato -- um numero que o papel nao disse.
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

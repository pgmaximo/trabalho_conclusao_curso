/**
 * Resumo do arquivo:
 * Conversao entre unidades de concentracao. A conversao massa <-> mol e uma
 * formula so -- mol/L = (g/L) / massa molar -- e o par de unidades contribui
 * apenas com uma potencia de dez. Por isso nao existe tabela por par de
 * unidades: existe uma massa molar por analito (ver analyteCatalog.ts) e o
 * numerador abaixo.
 *
 * ATENCAO: unidade desconhecida NUNCA e convertida no chute. A linha que
 * depende dela entra como pendente de revisao (spec secao 6).
 */

export type ConversionResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'unidade-desconhecida' | 'sem-massa-molar' | 'conversao-recusada' };

/**
 * O sinal de micro existe em tres pontos de codigo, e qual deles sai do
 * Textract depende da fonte embutida no PDF -- um mesmo laudo pode trazer mais
 * de um. Normalizar so um deixa os outros dois passarem batido e a linha vai
 * para revisao por "unidade desconhecida" sem nenhum motivo real.
 *   U+00B5 MICRO SIGN       "µ"
 *   U+03BC GREEK SMALL MU   "μ"
 *   ASCII                   "u"
 */
const MICRO = /[µμ]/g;

/**
 * O que o laboratorio escreve -> o token que este modulo usa (UCUM sempre que
 * existir um). Esta camada existe porque NENHUM laudo brasileiro escreve UCUM:
 * o papel traz "mcg/dL", "uUI/mL", "UI/L", "/mm3". Sem ela, a unidade certa e
 * recusada como desconhecida e a linha vai para revisao a toa -- o que e o
 * oposto do objetivo da revisao, que e capturar o duvidoso, nao o comum.
 *
 * Chave em minusculas e sem espaco; o valor preserva a caixa do token.
 */
const UNIT_ALIASES: Record<string, string> = {
  'mcg/dl': 'ug/dL',
  'mcg/ml': 'ug/mL',
  'mcg/l': 'ug/L',
  'uui/ml': 'u[IU]/mL',
  'uiu/ml': 'u[IU]/mL',
  'miu/l': 'm[IU]/L',
  'mui/l': 'm[IU]/L',
  'miu/ml': 'm[IU]/mL',
  'mui/ml': 'm[IU]/mL',
  'ui/l': 'U/L',
  'u/l': 'U/L',
  'ui/ml': '[IU]/mL',
  '/mm3': '/uL',
  mm3: '/uL',
  'cel/mm3': '/uL',
  'celulas/mm3': '/uL',
  '/ul': '/uL',
  '10*3/ul': '10*3/uL',
  '10*6/ul': '10*6/uL',
  'g%': 'g/dL',
  'mg%': 'mg/dL',
  // Bloco 10 -- os paineis novos, na grafia do laudo brasileiro.
  seg: 's',
  'seg.': 's',
  segundos: 's',
  inr: '{INR}',
  'mg/24h': 'mg/(24.h)',
  'mg/24hs': 'mg/(24.h)',
  'mg/24horas': 'mg/(24.h)',
  'g/24h': 'g/(24.h)',
  'mg/g': 'mg/g{creat}',
  'mg/gdecreatinina': 'mg/g{creat}',
  'mg/gcreatinina': 'mg/g{creat}',
  'ml/min': 'mL/min',
  '/ml': '/mL',
  'p/ml': '/mL',
  'u/ml': 'U/mL',
};

/**
 * Traduz o que veio do papel para o token interno. Nunca lanca e nunca
 * adivinha: unidade que nao esta na tabela sai apenas com espacos e sinal de
 * micro normalizados, e segue o caminho normal (provavelmente sera recusada
 * como desconhecida, que e o comportamento certo).
 */
export function normalizeUnitToken(raw: string | null | undefined): string {
  if (!raw) return '';
  const compacto = raw
    .replace(MICRO, 'u')
    .replace(/\s+/g, '')
    // O UCUM escreve potencia com asterisco ("10*6/uL"); o laudo brasileiro
    // escreve com acento circunflexo ("10^6/uL"). Achado da Tarefa 1 contra o
    // laudo real: sem esta linha a PRIMEIRA linha de todo hemograma --
    // eritrocitos -- vai para revisao por "unidade desconhecida", que e o
    // oposto do proposito da revisao (D28).
    .replace(/^10\^(\d+)/, '10*$1');
  return UNIT_ALIASES[compacto.toLowerCase()] ?? conhecidaSemCaixa(compacto) ?? compacto;
}

/**
 * "mg/dl" e "mg/dL" sao a mesma unidade; so a caixa difere. Sem este passo, o
 * laudo que escreve em minuscula manda a linha para revisao por "unidade
 * desconhecida" a toa -- o modo de falha da D28 (Bloco 10).
 *
 * So devolve uma unidade que o modulo JA conhece. Nao inventa grafia.
 */
function conhecidaSemCaixa(compacto: string): string | null {
  const alvo = compacto.toLowerCase();
  for (const conhecida of KNOWN_UNITS) {
    if (conhecida.toLowerCase() === alvo) return conhecida;
  }
  return null;
}

/** Unidades que sao a mesma grandeza com nomes diferentes. */
const IDENTITIES: Record<string, string> = {
  'ng/mL': 'ug/L',
  'ug/L': 'ng/mL',
  'pg/mL': 'ng/L',
  'ng/L': 'pg/mL',
  'm[IU]/L': 'u[IU]/mL',
  'u[IU]/mL': 'm[IU]/L',
  // Relacao albumina/creatinina: ug por mg e mg por g sao o mesmo numero.
  'ug/mg{creat}': 'mg/g{creat}',
  'mg/g{creat}': 'ug/mg{creat}',
};

/**
 * Numerador da formula massa -> mol, por par de unidades. O valor dividido
 * pela massa molar da o fator publicado (ex.: 10 / 180,16 = 0,0555 para
 * glicose em mg/dL -> mmol/L).
 */
const MOLAR_NUMERATOR: Record<string, number> = {
  'mg/dL->mmol/L': 10,
  'mg/dL->umol/L': 10_000,
  'ug/dL->umol/L': 10,
  'ug/dL->nmol/L': 10_000,
  'ng/dL->nmol/L': 10,
  'ng/dL->pmol/L': 10_000,
  'ng/mL->nmol/L': 1_000,
  'pg/mL->pmol/L': 1_000,
  'mg/L->umol/L': 1_000,
  'ug/L->umol/L': 1,
  'ug/L->nmol/L': 1_000,
};

/** Conversoes de escala pura, sem quimica. */
const SCALE_FACTOR: Record<string, number> = {
  'g/dL->g/L': 10,
  'g/L->g/dL': 0.1,
  'mg/dL->mg/L': 10,
  'mg/L->mg/dL': 0.1,
  // Contagem celular: 1 mm3 = 1 uL exatamente. O hemograma brasileiro reporta
  // "5.400/mm3" e o LOINC canoniza 10*3/uL -- so a potencia de mil separa as
  // duas. Sem estas duas linhas, TODO hemograma cai em revisao.
  '/uL->10*3/uL': 0.001,
  '10*3/uL->/uL': 1000,
  '/uL->10*6/uL': 0.000001,
  '10*6/uL->/uL': 1000000,
  // Bloco 10. Urina de 24 horas: o LOINC exemplifica g/24h, o laudo escreve
  // mg/24h.
  'g/(24.h)->mg/(24.h)': 1000,
  'mg/(24.h)->g/(24.h)': 0.001,
  // Contagem na urina: parte dos laboratorios reporta por mL.
  '/mL->/uL': 0.001,
  '/uL->/mL': 1000,
  // Hormonios e minerais em que o exemplo do LOINC e a grafia brasileira
  // diferem so por potencia de dez.
  'ng/dL->ng/mL': 0.01,
  'ng/mL->ng/dL': 100,
  'pg/mL->ng/dL': 0.1,
  'ng/dL->pg/mL': 10,
  'ug/mL->ug/dL': 100,
  'ug/dL->ug/mL': 0.01,
};

const KNOWN_UNITS = new Set<string>([
  ...Object.keys(IDENTITIES),
  'mg/dL',
  'mg/L',
  'mmol/L',
  'umol/L',
  'nmol/L',
  'pmol/L',
  'ug/dL',
  'ug/mL',
  'ng/dL',
  'g/dL',
  'g/L',
  '/uL',
  '10*3/uL',
  '10*6/uL',
  'U/L',
  '[IU]/mL',
  'm[IU]/mL',
  '%',
  'fL',
  'pg',
  'mm/h',
  // Bloco 10.
  's',
  '{INR}',
  'mg/(24.h)',
  'g/(24.h)',
  'mL/min',
  '/mL',
  'U/mL',
]);

function invertMolar(from: string, to: string): number | null {
  const numerator = MOLAR_NUMERATOR[`${to}->${from}`];
  return numerator === undefined ? null : numerator;
}

export function convertConcentration(
  value: number,
  rawFrom: string,
  rawTo: string,
  molarMass: number | null,
): ConversionResult {
  // As duas pontas passam pelo tradutor antes de qualquer comparacao: `from`
  // vem do papel e `to` vem do nosso catalogo, e so o segundo ja esta em
  // token interno -- normalizar os dois custa nada e evita que uma entrada
  // futura do catalogo com grafia humana quebre a conversao em silencio.
  const from = normalizeUnitToken(rawFrom);
  const to = normalizeUnitToken(rawTo);

  if (from === to) return { ok: true, value };
  if (IDENTITIES[from] === to) return { ok: true, value };

  if (!KNOWN_UNITS.has(from) || !KNOWN_UNITS.has(to)) {
    return { ok: false, reason: 'unidade-desconhecida' };
  }

  const scale = SCALE_FACTOR[`${from}->${to}`];
  if (scale !== undefined) return { ok: true, value: value * scale };

  const numerator = MOLAR_NUMERATOR[`${from}->${to}`];
  if (numerator !== undefined) {
    if (molarMass === null) return { ok: false, reason: 'sem-massa-molar' };
    return { ok: true, value: (value * numerator) / molarMass };
  }

  const inverse = invertMolar(from, to);
  if (inverse !== null) {
    if (molarMass === null) return { ok: false, reason: 'sem-massa-molar' };
    return { ok: true, value: (value * molarMass) / inverse };
  }

  return { ok: false, reason: 'conversao-recusada' };
}

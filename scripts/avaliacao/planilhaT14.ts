/**
 * Resumo do arquivo:
 * A planilha de conferencia da T14, e a conta que ela existe para fazer (G8,
 * Bloco 10).
 *
 * A T14 esta parada desde 2026-09-18 esperando laudos de laboratorios
 * diferentes. Montar a planilha a mao para cada laudo e o tipo de trabalho que
 * faz a conferencia nao acontecer -- entao ela sai pronta de um comando, e a
 * pessoa so preenche tres colunas com o papel na mao.
 *
 * O numero que importa e UM: quantas linhas passaram como AUTOMATICAS estando
 * ERRADAS. E o unico modo de falha que corrompe o historico em silencio. Uma
 * linha errada marcada como pendente e o sistema funcionando.
 *
 * Formato para o Excel brasileiro: ponto e virgula (a virgula e o decimal) e
 * BOM de UTF-8 (sem ele, o acento quebra).
 *
 * Modulo PURO.
 */

export type LinhaLida = {
  sourcePage: number | null;
  analyteLabel: string;
  projectLabel: string;
  rawValue: string;
  rawUnit: string | null;
  value: number | null;
  unit: string;
  rawReferenceText: string | null;
  reviewStatus: string;
  confidence: number;
};

const BOM = '\uFEFF';
const SEP = ';';
const FIM = '\r\n';

const COLUNAS = [
  'pagina',
  'exame',
  'nome oficial',
  'valor lido',
  'unidade lida',
  'valor gravado',
  'unidade gravada',
  'faixa em texto',
  'status',
  'confianca',
  'valor no papel',
  'unidade no papel',
  'confere (sim/nao)',
] as const;

function campo(v: string | number | null | undefined): string {
  const texto = v === null || v === undefined ? '' : String(v);
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Numero no formato que o Excel brasileiro le como numero: virgula decimal. */
const numeroBr = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export function montarPlanilha(linhas: LinhaLida[]): string {
  const ordenadas = [...linhas].sort((a, b) => (a.sourcePage ?? 9999) - (b.sourcePage ?? 9999));
  const corpo = ordenadas.map((l) =>
    [
      campo(l.sourcePage),
      campo(l.projectLabel),
      campo(l.analyteLabel),
      campo(l.rawValue),
      campo(l.rawUnit),
      campo(numeroBr(l.value)),
      campo(l.unit),
      campo(l.rawReferenceText),
      campo(l.reviewStatus),
      campo(numeroBr(l.confidence)),
      '',
      '',
      '',
    ].join(SEP),
  );
  return BOM + [COLUNAS.join(SEP), ...corpo].join(FIM);
}

function dividir(linha: string): string[] {
  const campos: string[] = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else aspas = !aspas;
    } else if (c === SEP && !aspas) {
      campos.push(atual);
      atual = '';
    } else atual += c;
  }
  campos.push(atual);
  return campos;
}

export function lerPlanilha(csv: string): Record<string, string>[] {
  const linhas = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const [cabecalho, ...resto] = linhas;
  if (!cabecalho) return [];
  const nomes = dividir(cabecalho);
  return resto.map((l) => {
    const valores = dividir(l);
    return Object.fromEntries(nomes.map((nome, i) => [nome, valores[i] ?? '']));
  });
}

const SIM = new Set(['sim', 's', 'ok', 'confere']);
const NAO = new Set(['nao', 'n', 'errado', 'errada']);

function resposta(texto: string | undefined): 'sim' | 'nao' | null {
  const t = (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (SIM.has(t)) return 'sim';
  if (NAO.has(t)) return 'nao';
  return null;
}

export type Conferencia = {
  conferidas: number;
  naoConferidas: number;
  certas: number;
  /** O numero da T14. */
  automaticasErradas: number;
  pendentesErradas: number;
};

export function contarConferencia(linhas: Record<string, string>[]): Conferencia {
  const saida: Conferencia = {
    conferidas: 0,
    naoConferidas: 0,
    certas: 0,
    automaticasErradas: 0,
    pendentesErradas: 0,
  };
  for (const l of linhas) {
    const r = resposta(l['confere (sim/nao)']);
    if (r === null) {
      saida.naoConferidas += 1;
      continue;
    }
    saida.conferidas += 1;
    if (r === 'sim') saida.certas += 1;
    else if (l.status === 'AUTO') saida.automaticasErradas += 1;
    else saida.pendentesErradas += 1;
  }
  return saida;
}

/**
 * Resumo do arquivo:
 * Decide O QUE PODE SER COMPARADO. E o produto desta EPIC, e por isso e um
 * modulo puro -- sem React, sem Amplify, sem AWS -- testado como funcao e nao
 * atraves de uma renderizacao.
 *
 * Regra que organiza o arquivo inteiro: NADA sai da serie em silencio. Toda
 * linha que existe e nao vira ponto entra em `excluded` com o motivo. Uma tela
 * que mostra dois pontos quando existem tres, sem dizer nada, mente por
 * omissao -- e esta e uma tela que a pessoa leva para uma consulta.
 */
import type { LabResultView } from './extractionService';

export type ExclusionReason =
  | 'pendente-de-revisao'
  | 'sem-valor'
  | 'sem-data'
  | 'limite-de-deteccao'
  | 'unidade-divergente';

export type SeriesPoint = {
  id: string;
  documentId: string;
  collectedAt: string;
  value: number;
  referenceLow: number | null;
  referenceHigh: number | null;
  rawValue: string;
  rawUnit: string | null;
};

export type ExcludedResult = {
  id: string;
  documentId: string;
  collectedAt: string | null;
  reason: ExclusionReason;
  result: LabResultView;
};

export type AnalyteSeries = {
  analyteCode: string;
  projectLabel: string;
  analyteLabel: string;
  /** null quando o laudo nao nomeou o momento -- o caso comum. */
  collectionMoment: string | null;
  unit: string;
  points: SeriesPoint[];
  excluded: ExcludedResult[];
};

/** Momento vazio e momento ausente sao a MESMA serie: o modelo pode devolver
 *  null ou "", e um laudo com um valor so nao pode virar duas series conforme
 *  qual dos dois veio. */
function chaveDoMomento(momento: string | null): string {
  return (momento ?? '').trim();
}

/**
 * Separador que nao pode aparecer em codigo nem em momento. Sem ele, o codigo
 * "X-AB" sem momento e o codigo "X-A" no momento "B" viram a MESMA chave --
 * duas substancias diferentes num traco so. Com os codigos locais da D32 isso
 * deixou de ser hipotese: eles sao derivados de rotulo e tem tamanho livre.
 */
const SEPARADOR = '\u0000';

/**
 * A unidade da serie e a da coleta COMPARAVEL mais ANTIGA. Duas exigencias
 * dentro disso, e as duas custaram uma correcao:
 *
 * 1. So linha comparavel decide. Se uma linha pendente pudesse fixar a
 *    unidade, uma leitura duvidosa expulsaria do traco todas as linhas boas --
 *    a serie inteira sumiria por causa da pior linha dela.
 *
 * 2. A mais ANTIGA ganha, e nao a mais recente. O plano dizia o contrario,
 *    justificando com uma migracao futura da unidade canonica; o teste do
 *    proprio plano exigia o oposto, e o teste esta certo. A unidade da serie e
 *    a lingua que ela sempre falou; uma coleta nova em outra unidade e a
 *    anomalia, e anomalia e o que sai com motivo declarado. Ao contrario, uma
 *    unica coleta nova apagaria do grafico o historico inteiro da pessoa.
 *
 *    Isso deixou de ser hipotese com a D32: analito de codigo local NAO
 *    converte, entao ele fica na unidade do papel, e dois laboratorios que
 *    escrevam zinco em ug/dL e umol/L produzem exatamente este caso.
 *
 *    A migracao de unidade canonica que o plano temia se resolve sozinha por
 *    outro caminho: ela reprocessa as linhas, e nao ha o que reconciliar.
 */
function unidadeDaSerie(linhas: LabResultView[]): string {
  const comparaveis = linhas
    .filter((l) => l.unit && l.value !== null && l.reviewStatus !== 'PENDENTE_DE_REVISAO')
    // Linha sem data vai para o fim: ela nao pode reivindicar ser a primeira.
    .sort((a, b) => (a.collectedAt ?? '9999').localeCompare(b.collectedAt ?? '9999'));
  return comparaveis[0]?.unit ?? linhas[0]?.unit ?? '';
}

/**
 * A ORDEM IMPORTA, e cada degrau dela e uma decisao:
 *
 * 1. pendente vem primeiro mesmo com valor nulo, porque pendente e o que a
 *    pessoa PODE resolver, e e isso que o aviso da tela vai oferecer;
 * 2. sem valor antes de limite, porque um valor nulo nao tem qualificador que
 *    signifique coisa alguma;
 * 3. sem data por ultimo entre os do dado: a linha tem valor, tem unidade, e o
 *    que falta e onde po-la no eixo. Dizer "sem valor" de uma linha que TEM
 *    valor seria uma explicacao falsa numa tela que existe para explicar.
 */
function motivoDaExclusao(linha: LabResultView, unidade: string): ExclusionReason | null {
  if (linha.reviewStatus === 'PENDENTE_DE_REVISAO') return 'pendente-de-revisao';
  if (linha.value === null) return 'sem-valor';
  if (linha.valueQualifier) return 'limite-de-deteccao';
  if (linha.unit !== unidade) return 'unidade-divergente';
  if (!linha.collectedAt) return 'sem-data';
  return null;
}

export function buildAnalyteSeries(results: LabResultView[]): AnalyteSeries[] {
  const grupos = new Map<string, LabResultView[]>();

  for (const linha of results) {
    // A chave e (analito, momento), nunca so o analito (D22). Glicose em jejum
    // e glicose de 120 minutos sao a mesma substancia medida em condicoes que
    // nao se comparam.
    const chave = `${linha.analyteCode}${SEPARADOR}${chaveDoMomento(linha.collectionMoment)}`;
    const atual = grupos.get(chave);
    if (atual) atual.push(linha);
    else grupos.set(chave, [linha]);
  }

  const series: AnalyteSeries[] = [];

  for (const linhas of grupos.values()) {
    const unidade = unidadeDaSerie(linhas);
    const points: SeriesPoint[] = [];
    const excluded: ExcludedResult[] = [];

    for (const linha of linhas) {
      const motivo = motivoDaExclusao(linha, unidade);
      if (motivo !== null || linha.value === null || !linha.collectedAt) {
        excluded.push({
          id: linha.id,
          documentId: linha.documentId,
          collectedAt: linha.collectedAt,
          reason: motivo ?? 'sem-valor',
          result: linha,
        });
        continue;
      }

      points.push({
        id: linha.id,
        documentId: linha.documentId,
        collectedAt: linha.collectedAt,
        value: linha.value,
        referenceLow: linha.referenceLow,
        referenceHigh: linha.referenceHigh,
        rawValue: linha.rawValue,
        rawUnit: linha.rawUnit,
      });
    }

    // Desempate por id, NUNCA por valor: ordenar por valor produziria uma
    // serie artificialmente crescente, que a pessoa leria como evolucao.
    points.sort((a, b) => a.collectedAt.localeCompare(b.collectedAt) || a.id.localeCompare(b.id));

    const referencia = linhas[0];
    series.push({
      analyteCode: referencia.analyteCode,
      projectLabel: referencia.projectLabel,
      analyteLabel: referencia.analyteLabel,
      collectionMoment: chaveDoMomento(referencia.collectionMoment) || null,
      unit: unidade,
      points,
      excluded,
    });
  }

  return series.sort(
    (a, b) =>
      b.points.length - a.points.length ||
      a.projectLabel.localeCompare(b.projectLabel, 'pt-BR') ||
      (a.collectionMoment ?? '').localeCompare(b.collectionMoment ?? '', 'pt-BR'),
  );
}

/**
 * A faixa comum da serie, ou null quando os laboratorios discordam.
 *
 * TUDO OU NADA, de proposito. Um laboratorio usa 30 a 100 para vitamina D e
 * outro usa 20 a 100; desenhar uma banda unica por cima dos dois afirma um
 * criterio que nao vale para metade dos pontos -- a forma mais convincente de
 * mentir num grafico, porque a banda parece dado e nao opiniao. Quando ha
 * divergencia, a faixa vive na lista, ao lado do ponto a que pertence.
 *
 * Faixa parcial (so limite inferior) e uma faixa legitima: e comum em analito
 * em que so o piso importa. Ela e comparada como tal, e so casa com outra
 * igualmente parcial.
 *
 * Ponto SEM faixa nenhuma nao concorda com nada: ele nao tem criterio, e
 * estender a banda do vizinho por cima dele seria inventar o criterio do
 * laboratorio dele.
 */
export function sharedReferenceRange(
  points: SeriesPoint[],
): { low: number | null; high: number | null } | null {
  if (points.length === 0) return null;

  const primeiro = points[0];
  if (primeiro.referenceLow === null && primeiro.referenceHigh === null) return null;

  const todosIguais = points.every(
    (p) => p.referenceLow === primeiro.referenceLow && p.referenceHigh === primeiro.referenceHigh,
  );

  return todosIguais ? { low: primeiro.referenceLow, high: primeiro.referenceHigh } : null;
}

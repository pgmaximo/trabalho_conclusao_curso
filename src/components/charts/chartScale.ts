/**
 * Resumo do arquivo:
 * Módulo puro (sem React) com a matemática de escala dos gráficos SVG —
 * domínio do eixo Y, construção do path da linha (com quebra em `null`,
 * nunca interpolação — interpolar seria inventar dado, regra 2 da
 * constituição), ticks "redondos" e quais índices de data rotular no eixo X.
 */

export type ChartPoint = {
  dateKey: string;
  value: number | null;
};

export type YDomain = [number, number];

/** Domínio Y a partir de uma ou mais séries, com padding e opção de sempre incluir o zero. */
export function computeYDomain(
  seriesList: ChartPoint[][],
  opts: { includeZero?: boolean; padPct?: number } = {},
): YDomain {
  const values = seriesList
    .flat()
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  if (values.length === 0) return [0, 1];

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (opts.includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  if (min === max) {
    min -= 1;
    max += 1;
  }

  const pad = (max - min) * (opts.padPct ?? 0.1);
  return [min - pad, max + pad];
}

export type ChartPadding = { top: number; bottom: number; left: number; right: number };

const DEFAULT_PADDING: ChartPadding = { top: 8, bottom: 8, left: 0, right: 0 };

/**
 * Constrói o `d` de um `<Path>` SVG a partir dos pontos, espaçados
 * uniformemente no eixo X. Um ponto com `value: null` (dia sem dado) quebra
 * o traço em vez de interpolar — o próximo ponto válido inicia um novo `M`.
 */
export function buildLinePath(
  points: ChartPoint[],
  width: number,
  height: number,
  yDomain: YDomain,
  padding: ChartPadding = DEFAULT_PADDING,
): string {
  if (points.length === 0) return '';

  const [yMin, yMax] = yDomain;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const xStep = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const segments: string[] = [];
  let penDown = false;

  points.forEach((point, index) => {
    const x = padding.left + index * xStep;

    if (point.value === null) {
      penDown = false;
      return;
    }

    const yRatio = yMax === yMin ? 0.5 : (point.value - yMin) / (yMax - yMin);
    const y = padding.top + innerHeight - yRatio * innerHeight;

    segments.push(`${penDown ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`);
    penDown = true;
  });

  return segments.join(' ');
}

/** Posição X (px) do ponto de índice `index`, para desenhar marcadores/eixos alinhados ao path. */
export function xPositionForIndex(index: number, pointCount: number, width: number, padding: ChartPadding = DEFAULT_PADDING): number {
  const innerWidth = width - padding.left - padding.right;
  const xStep = pointCount > 1 ? innerWidth / (pointCount - 1) : 0;
  return padding.left + index * xStep;
}

/** Posição Y (px) de um valor dentro do domínio, para desenhar marcadores/linhas de referência. */
export function yPositionForValue(value: number, height: number, yDomain: YDomain, padding: ChartPadding = DEFAULT_PADDING): number {
  const [yMin, yMax] = yDomain;
  const innerHeight = height - padding.top - padding.bottom;
  const yRatio = yMax === yMin ? 0.5 : (value - yMin) / (yMax - yMin);
  return padding.top + innerHeight - yRatio * innerHeight;
}

/** N valores igualmente espaçados dentro do domínio, do menor ao maior (para rótulos do eixo Y). */
export function niceTicks(domain: YDomain, count: number): number[] {
  const [min, max] = domain;
  if (count <= 1 || min === max) return [min];

  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}

/** Índices dos pontos a rotular no eixo X, limitando a `maxLabels` (sempre inclui o primeiro e o último). */
export function xLabelIndices(points: ChartPoint[], maxLabels: number): number[] {
  if (points.length === 0) return [];
  if (points.length <= maxLabels) return points.map((_, i) => i);

  const step = Math.ceil(points.length / maxLabels);
  const indices: number[] = [];
  for (let i = 0; i < points.length; i += step) indices.push(i);

  const lastIndex = points.length - 1;
  if (indices[indices.length - 1] !== lastIndex) indices.push(lastIndex);

  return indices;
}

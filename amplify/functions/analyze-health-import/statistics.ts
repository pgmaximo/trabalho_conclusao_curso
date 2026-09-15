import { mean, median, percentile, stdDev } from './mathUtils';
import type { DailyPoint } from './dailyAggregator';

export { mean, median, percentile, stdDev };

/**
 * Media movel sobre os ULTIMOS `windowDays` PONTOS DISPONIVEIS (nao dias de
 * calendario) -- a serie diaria pode ter lacunas (dias sem leitura), entao
 * isto e "a media das ultimas N leituras", nao uma media de calendario
 * estrita. Documentado deliberadamente: preencher lacunas artificialmente
 * seria inventar dado (regra 2 da constituicao).
 */
export function rollingMean(points: DailyPoint[], windowDays: number): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - windowDays + 1);
    const windowValues = points.slice(start, i + 1).map((p) => p.value);
    result.push(mean(windowValues));
  }

  return result;
}

function dateKeyToDayIndex(dateKey: string, epochDateKey: string): number {
  const epoch = Date.parse(`${epochDateKey}T00:00:00Z`);
  const current = Date.parse(`${dateKey}T00:00:00Z`);
  return Math.round((current - epoch) / 86_400_000);
}

/**
 * Regressao linear simples (minimos quadrados) da metrica ao longo do tempo,
 * em unidades por dia -- o eixo X e a distancia em DIAS DE CALENDARIO desde o
 * primeiro ponto (nao o indice no array), entao lacunas nao distorcem a
 * inclinacao.
 */
export function linearTrend(points: DailyPoint[]): { slopePerDay: number; r2: number } | null {
  if (points.length < 2) return null;

  const epochDateKey = points[0]?.dateKey;
  if (!epochDateKey) return null;

  const xs = points.map((p) => dateKeyToDayIndex(p.dateKey, epochDateKey));
  const ys = points.map((p) => p.value);

  const xMean = mean(xs) ?? 0;
  const yMean = mean(ys) ?? 0;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < xs.length; i++) {
    const dx = (xs[i] ?? 0) - xMean;
    const dy = (ys[i] ?? 0) - yMean;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0) return null; // todos os pontos no mesmo dia -- nao deveria acontecer, mas e defensivo

  return { slopePerDay: numerator / denomX, r2: denomY === 0 ? 0 : (numerator * numerator) / (denomX * denomY) };
}

/** Correlacao de Pearson entre dois arrays JA PAREADOS (mesmo indice = mesmo par). */
export function pearson(xs: number[], ys: number[]): { r: number; n: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;

  const xSlice = xs.slice(0, n);
  const ySlice = ys.slice(0, n);
  const xMean = mean(xSlice) ?? 0;
  const yMean = mean(ySlice) ?? 0;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = (xSlice[i] ?? 0) - xMean;
    const dy = (ySlice[i] ?? 0) - yMean;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) return { r: 0, n };

  return { r: numerator / Math.sqrt(denomX * denomY), n };
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Pareia duas series diarias por DATA (nao por indice) com uma defasagem em
 * dias -- para cada ponto de `a` na data D, procura o ponto de `b` na data
 * D+lagDays. So os pares onde AMBAS as datas existem entram no resultado.
 */
export function alignSeriesWithLag(
  a: DailyPoint[],
  b: DailyPoint[],
  lagDays: number,
): { xs: number[]; ys: number[] } {
  const bByDate = new Map(b.map((point) => [point.dateKey, point.value]));
  const xs: number[] = [];
  const ys: number[] = [];

  for (const pointA of a) {
    const targetDate = shiftDateKey(pointA.dateKey, lagDays);
    const valueB = bByDate.get(targetDate);
    if (valueB !== undefined) {
      xs.push(pointA.value);
      ys.push(valueB);
    }
  }

  return { xs, ys };
}

/**
 * Correlacao de Pearson entre duas series diarias com defasagem, exigindo um
 * minimo de pares (`minPairs`, default 14 -- ver plan.md secao 3.5: "so com
 * n >= 14 dias pareados"). Retorna null (nao reportavel) se nao houver dados
 * suficientes, em vez de um `r` estatisticamente vazio.
 */
export function pearsonWithLag(
  a: DailyPoint[],
  b: DailyPoint[],
  lagDays: number,
  minPairs = 14,
): { r: number; n: number } | null {
  const { xs, ys } = alignSeriesWithLag(a, b, lagDays);
  if (xs.length < minPairs) return null;
  return pearson(xs, ys);
}

/** Data-calendario (UTC) -> dia da semana: 0=domingo ... 6=sabado. */
function dayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

export function weekdayWeekendSplit(points: DailyPoint[]): { weekday: number | null; weekend: number | null } {
  const weekdayValues: number[] = [];
  const weekendValues: number[] = [];

  for (const point of points) {
    const day = dayOfWeek(point.dateKey);
    if (day === 0 || day === 6) weekendValues.push(point.value);
    else weekdayValues.push(point.value);
  }

  return { weekday: mean(weekdayValues), weekend: mean(weekendValues) };
}

/** Fracao (0-1) de dias do periodo [periodStart, periodEnd] com pelo menos uma leitura. */
export function coverage(points: DailyPoint[], periodStart: string, periodEnd: string): number {
  const start = Date.parse(`${periodStart}T00:00:00Z`);
  const end = Date.parse(`${periodEnd}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;

  const totalDays = Math.round((end - start) / 86_400_000) + 1;
  return totalDays <= 0 ? 0 : Math.min(1, points.length / totalDays);
}

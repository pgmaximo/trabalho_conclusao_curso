import { getMetric, type MetricId } from './metricCatalog';
import type { DailyPoint, DailySeries } from './dailyAggregator';
import { coverage, mean, median, pearsonWithLag, percentile, stdDev, weekdayWeekendSplit } from './statistics';

/**
 * Metricas derivadas de outra ja agregada, em vez de vir direto de uma
 * coluna do arquivo -- hoje so a FC de repouso, que o Samsung nao exporta:
 * usamos o MINIMO diario de FC (heartRateMinBpm) como estimativa por dia.
 * Roda ANTES de montar os resumos, para que a serie derivada participe das
 * estatisticas e correlacoes como qualquer outra.
 */
export function deriveComputedMetrics(series: DailySeries): DailySeries {
  const result = { ...series };
  if (!result.restingHeartRateBpm && result.heartRateMinBpm) {
    result.restingHeartRateBpm = result.heartRateMinBpm;
  }
  return result;
}

export type MonthlyPoint = {
  month: string; // YYYY-MM
  mean: number | null;
};

export function monthlyRollup(points: DailyPoint[]): MonthlyPoint[] {
  const byMonth = new Map<string, number[]>();

  for (const point of points) {
    const month = point.dateKey.slice(0, 7);
    const values = byMonth.get(month);
    if (values) values.push(point.value);
    else byMonth.set(month, [point.value]);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({ month, mean: mean(values) }));
}

export type MetricSummary = {
  metric: MetricId;
  label: string;
  unit: string;
  n: number;
  firstSeen: string;
  lastSeen: string;
  daysWithData: number;
  coveragePct: number;
  mean: number | null;
  median: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  p25: number | null;
  p75: number | null;
  weekday: number | null;
  weekend: number | null;
  trendSlopePerDay: number | null;
  monthly: MonthlyPoint[];
};

function buildMetricSummary(metricId: MetricId, points: DailyPoint[], periodStart: string, periodEnd: string): MetricSummary {
  const metric = getMetric(metricId);
  const sorted = [...points].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const values = sorted.map((p) => p.value);
  const split = weekdayWeekendSplit(sorted);

  // Regressao linear direto aqui evita reimportar linearTrend so para o slope.
  const firstSeen = sorted[0]?.dateKey ?? periodStart;
  const lastSeen = sorted[sorted.length - 1]?.dateKey ?? periodEnd;

  return {
    metric: metricId,
    label: metric.label,
    unit: metric.unit,
    n: sorted.length,
    firstSeen,
    lastSeen,
    daysWithData: sorted.length,
    coveragePct: Math.round(coverage(sorted, periodStart, periodEnd) * 100),
    mean: mean(values),
    median: median(values),
    sd: stdDev(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    p25: percentile(values, 25),
    p75: percentile(values, 75),
    weekday: split.weekday,
    weekend: split.weekend,
    trendSlopePerDay: linearTrendSlope(sorted),
    monthly: monthlyRollup(sorted),
  };
}

function linearTrendSlope(points: DailyPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const firstDate = points[0]?.dateKey;
  const lastDate = points[points.length - 1]?.dateKey;
  if (first === undefined || last === undefined || !firstDate || !lastDate) return null;

  const days = Math.round((Date.parse(`${lastDate}T00:00:00Z`) - Date.parse(`${firstDate}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return null;

  // Slope simples ponta-a-ponta (nao minimos-quadrados) -- suficiente para o
  // prompt, que so precisa de "subiu/desceu, aproximadamente quanto por dia";
  // statistics.linearTrend (minimos quadrados + r2) fica disponivel para
  // quem precisar de um ajuste mais rigoroso.
  return (last - first) / days;
}

export type CorrelationSummary = {
  metricA: MetricId;
  metricB: MetricId;
  lagDays: number;
  label: string; // pt-BR, descrevendo a relacao (ex.: "sono -> FC de repouso no dia seguinte")
  r: number;
  n: number;
};

/**
 * Pares clinicamente plausiveis para checar correlacao, com a defasagem em
 * dias -- ver plan.md secao 3.5. So entram no resumo os que tiverem
 * `n >= 14` pares E `|r| >= 0.3` (checado em buildAnalysisSummary).
 */
const CORRELATION_CANDIDATES: { a: MetricId; b: MetricId; lagDays: number; label: string }[] = [
  { a: 'sleepMinutes', b: 'restingHeartRateBpm', lagDays: 1, label: 'Duração do sono e frequência cardíaca de repouso no dia seguinte' },
  { a: 'steps', b: 'sleepMinutes', lagDays: 0, label: 'Passos e duração do sono no mesmo dia' },
  { a: 'sleepMinutes', b: 'physicalRecovery', lagDays: 0, label: 'Duração do sono e recuperação física' },
  { a: 'sleepScore', b: 'restingHeartRateBpm', lagDays: 1, label: 'Pontuação do sono e frequência cardíaca de repouso no dia seguinte' },
  { a: 'hrvSdnnMs', b: 'mentalRecovery', lagDays: 0, label: 'Variabilidade da frequência cardíaca e recuperação mental' },
  { a: 'steps', b: 'restingHeartRateBpm', lagDays: 0, label: 'Passos e frequência cardíaca de repouso' },
];

const MIN_CORRELATION_PAIRS = 14;
const MIN_REPORTABLE_R = 0.3;

function buildCorrelations(series: DailySeries): CorrelationSummary[] {
  const correlations: CorrelationSummary[] = [];

  for (const candidate of CORRELATION_CANDIDATES) {
    const seriesA = series[candidate.a];
    const seriesB = series[candidate.b];
    if (!seriesA || !seriesB) continue;

    const result = pearsonWithLag(seriesA, seriesB, candidate.lagDays, MIN_CORRELATION_PAIRS);
    if (!result || Math.abs(result.r) < MIN_REPORTABLE_R) continue;

    correlations.push({
      metricA: candidate.a,
      metricB: candidate.b,
      lagDays: candidate.lagDays,
      label: candidate.label,
      r: Math.round(result.r * 100) / 100,
      n: result.n,
    });
  }

  return correlations;
}

export type AnalysisSummary = {
  periodStart: string;
  periodEnd: string;
  dayCount: number;
  metrics: MetricSummary[];
  correlations: CorrelationSummary[];
  warnings: string[];
};

/**
 * Monta o resumo final enviado ao Bedrock e (em forma reduzida) gravado na
 * linha do DynamoDB. `warnings` ja deve vir formatado em pt-BR (juntando os
 * avisos de sanity.ts com os de parsing/arquivo do handler).
 */
export function buildAnalysisSummary(series: DailySeries, warnings: string[]): AnalysisSummary {
  const derived = deriveComputedMetrics(series);

  const allDateKeys = Object.values(derived)
    .flatMap((points) => points ?? [])
    .map((point) => point.dateKey);

  if (allDateKeys.length === 0) {
    return { periodStart: '', periodEnd: '', dayCount: 0, metrics: [], correlations: [], warnings };
  }

  const periodStart = allDateKeys.reduce((min, d) => (d < min ? d : min));
  const periodEnd = allDateKeys.reduce((max, d) => (d > max ? d : max));
  const dayCount = Math.round((Date.parse(`${periodEnd}T00:00:00Z`) - Date.parse(`${periodStart}T00:00:00Z`)) / 86_400_000) + 1;

  const metrics = (Object.entries(derived) as [MetricId, DailyPoint[] | undefined][])
    .filter(([, points]) => points && points.length > 0)
    .map(([metricId, points]) => buildMetricSummary(metricId, points ?? [], periodStart, periodEnd));

  return {
    periodStart,
    periodEnd,
    dayCount,
    metrics,
    correlations: buildCorrelations(derived),
    warnings,
  };
}

/** Estimativa grosseira de tokens (chars / 4) do bloco de dados do prompt. */
export function estimatePromptChars(summary: AnalysisSummary): number {
  return JSON.stringify(summary).length;
}

import { getMetric, type MetricId } from './metricCatalog';
import type { DailySeries, Sample } from './dailyAggregator';

export type Warning = {
  metric: MetricId | null;
  code: string;
  message: string; // pt-BR, pronta para a UI
  count: number;
};

/**
 * Descarta amostras BRUTAS fora da faixa fisiologicamente sa da sua metrica
 * -- ANTES da agregacao diaria, para uma leitura absurda isolada nao
 * contaminar um 'mean'/'sum' do dia inteiro. `applySanityRanges` (abaixo)
 * faz uma segunda passada, mais grosseira, sobre o resultado JA agregado.
 */
export function filterSamplesByRange(samples: Sample[]): { samples: Sample[]; warnings: Warning[] } {
  const discardedByMetric = new Map<MetricId, number>();
  const kept: Sample[] = [];

  for (const sample of samples) {
    const [min, max] = getMetric(sample.metric).sane;
    if (sample.value >= min && sample.value <= max) {
      kept.push(sample);
    } else {
      discardedByMetric.set(sample.metric, (discardedByMetric.get(sample.metric) ?? 0) + 1);
    }
  }

  const warnings: Warning[] = Array.from(discardedByMetric.entries()).map(([metric, count]) => ({
    metric,
    code: 'VALUE_OUT_OF_RANGE',
    message: `${count} leitura(s) de "${getMetric(metric).label}" fora da faixa esperada foram ignoradas.`,
    count,
  }));

  return { samples: kept, warnings };
}

/**
 * Segunda passada de sanidade, sobre a serie JA agregada por dia -- pega
 * casos que so ficam implausiveis no agregado (ex.: um 'sum' de varias
 * leituras individualmente plausiveis que juntas passam da faixa do dia).
 */
export function applySanityRanges(series: DailySeries): { series: DailySeries; warnings: Warning[] } {
  const result: DailySeries = {};
  const warnings: Warning[] = [];

  for (const [metricId, points] of Object.entries(series) as [MetricId, DailySeries[MetricId]][]) {
    if (!points) continue;

    const [min, max] = getMetric(metricId).sane;
    const kept = points.filter((point) => point.value >= min && point.value <= max);
    const discardedCount = points.length - kept.length;

    if (discardedCount > 0) {
      warnings.push({
        metric: metricId,
        code: 'DAILY_VALUE_OUT_OF_RANGE',
        message: `${discardedCount} dia(s) de "${getMetric(metricId).label}" com total fora da faixa esperada foram ignorados.`,
        count: discardedCount,
      });
    }

    if (kept.length > 0) result[metricId] = kept;
  }

  return { series: result, warnings };
}

const SLEEP_STAGE_METRICS: MetricId[] = [
  'sleepAwakeMinutes',
  'sleepLightMinutes',
  'sleepDeepMinutes',
  'sleepRemMinutes',
];

const MAX_MINUTES_PER_DAY = 24 * 60;

/**
 * Checagens que cruzam mais de uma metrica no mesmo dia. Hoje so uma: a soma
 * dos estagios de sono (acordado+leve+profundo+REM) de uma mesma noite nao
 * pode passar de 24h -- se passar, algo no agrupamento por `sleep_id` deu
 * errado (ex.: duas noites diferentes compartilhando um id), e o dia inteiro
 * de estagios e descartado (a serie de `sleepMinutes`, vinda de outro
 * arquivo, nao e afetada).
 */
export function checkCrossFieldConsistency(series: DailySeries): { series: DailySeries; warnings: Warning[] } {
  const totalsByDate = new Map<string, number>();

  for (const metricId of SLEEP_STAGE_METRICS) {
    for (const point of series[metricId] ?? []) {
      totalsByDate.set(point.dateKey, (totalsByDate.get(point.dateKey) ?? 0) + point.value);
    }
  }

  const badDates = new Set(
    Array.from(totalsByDate.entries())
      .filter(([, total]) => total > MAX_MINUTES_PER_DAY)
      .map(([dateKey]) => dateKey),
  );

  if (badDates.size === 0) {
    return { series, warnings: [] };
  }

  const result: DailySeries = { ...series };
  for (const metricId of SLEEP_STAGE_METRICS) {
    const points = result[metricId];
    if (points) result[metricId] = points.filter((point) => !badDates.has(point.dateKey));
  }

  return {
    series: result,
    warnings: [
      {
        metric: null,
        code: 'SLEEP_STAGE_TOTAL_EXCEEDS_24H',
        message: `${badDates.size} noite(s) com soma de estágios de sono acima de 24h foram ignoradas.`,
        count: badDates.size,
      },
    ],
  };
}

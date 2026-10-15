import type { DailySeries } from '../dailyAggregator';
import { buildAnalysisSummary, deriveComputedMetrics, estimatePromptChars, monthlyRollup } from '../summaryBuilder';
import { buildUserText } from '../insightPrompt';

function seriesFrom(values: [string, number][]) {
  return values.map(([dateKey, value]) => ({ dateKey, value, sampleCount: 1 }));
}

describe('deriveComputedMetrics', () => {
  it('derives restingHeartRateBpm from heartRateMinBpm when absent', () => {
    const series: DailySeries = { heartRateMinBpm: seriesFrom([['2026-01-01', 55]]) };
    const derived = deriveComputedMetrics(series);
    expect(derived.restingHeartRateBpm).toEqual(series.heartRateMinBpm);
  });

  it('does not overwrite an already-present restingHeartRateBpm series', () => {
    const series: DailySeries = {
      heartRateMinBpm: seriesFrom([['2026-01-01', 55]]),
      restingHeartRateBpm: seriesFrom([['2026-01-01', 50]]),
    };
    const derived = deriveComputedMetrics(series);
    expect(derived.restingHeartRateBpm?.[0]?.value).toBe(50);
  });

  it('does nothing when heartRateMinBpm is absent', () => {
    const series: DailySeries = { steps: seriesFrom([['2026-01-01', 100]]) };
    expect(deriveComputedMetrics(series).restingHeartRateBpm).toBeUndefined();
  });
});

describe('monthlyRollup', () => {
  it('groups points by month and averages them', () => {
    const points = seriesFrom([
      ['2026-01-01', 10],
      ['2026-01-15', 20],
      ['2026-02-01', 100],
    ]);
    expect(monthlyRollup(points)).toEqual([
      { month: '2026-01', mean: 15 },
      { month: '2026-02', mean: 100 },
    ]);
  });

  it('returns months in chronological order', () => {
    const points = seriesFrom([
      ['2026-03-01', 1],
      ['2026-01-01', 1],
    ]);
    expect(monthlyRollup(points).map((m) => m.month)).toEqual(['2026-01', '2026-03']);
  });
});

describe('buildAnalysisSummary', () => {
  it('returns an empty summary for an empty series', () => {
    const summary = buildAnalysisSummary({}, []);
    expect(summary.metrics).toEqual([]);
    expect(summary.dayCount).toBe(0);
  });

  it('computes the overall period as the min/max date across all metrics', () => {
    const series: DailySeries = {
      steps: seriesFrom([
        ['2026-01-01', 100],
        ['2026-01-10', 200],
      ]),
      weightKg: seriesFrom([['2026-01-05', 70]]),
    };
    const summary = buildAnalysisSummary(series, []);
    expect(summary.periodStart).toBe('2026-01-01');
    expect(summary.periodEnd).toBe('2026-01-10');
    expect(summary.dayCount).toBe(10);
  });

  it('includes a MetricSummary per metric with data', () => {
    const series: DailySeries = { steps: seriesFrom([['2026-01-01', 100]]) };
    const summary = buildAnalysisSummary(series, []);
    expect(summary.metrics).toHaveLength(1);
    expect(summary.metrics[0]?.metric).toBe('steps');
    expect(summary.metrics[0]?.label).toBe('Passos');
  });

  it('carries warnings through unchanged', () => {
    const summary = buildAnalysisSummary({}, ['Aviso de teste']);
    expect(summary.warnings).toEqual(['Aviso de teste']);
  });

  it('only reports a correlation when both metrics have enough paired data', () => {
    const days = Array.from({ length: 20 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
    const series: DailySeries = {
      sleepMinutes: seriesFrom(days.map((d, i) => [d, 300 + i * 5] as [string, number])),
      heartRateMinBpm: seriesFrom(days.map((d, i) => [d, 70 - i] as [string, number])),
    };
    const summary = buildAnalysisSummary(series, []);
    // sleepMinutes -> restingHeartRateBpm com lag=1 deve aparecer, dado n=19>=14 e r forte
    const correlation = summary.correlations.find((c) => c.metricA === 'sleepMinutes' && c.metricB === 'restingHeartRateBpm');
    expect(correlation).toBeDefined();
    expect(correlation?.n).toBeGreaterThanOrEqual(14);
  });

  it('does not report a correlation with fewer than 14 pairs', () => {
    const series: DailySeries = {
      sleepMinutes: seriesFrom([
        ['2026-01-01', 300],
        ['2026-01-02', 320],
      ]),
      heartRateMinBpm: seriesFrom([
        ['2026-01-02', 60],
        ['2026-01-03', 58],
      ]),
    };
    const summary = buildAnalysisSummary(series, []);
    expect(summary.correlations).toEqual([]);
  });
});

describe('estimatePromptChars', () => {
  it('returns a positive number proportional to content size', () => {
    const small = buildAnalysisSummary({ steps: seriesFrom([['2026-01-01', 1]]) }, []);
    const large = buildAnalysisSummary(
      { steps: seriesFrom(Array.from({ length: 100 }, (_, i) => [`2026-01-${(i % 28) + 1}`, i] as [string, number])) },
      [],
    );
    expect(estimatePromptChars(large)).toBeGreaterThan(estimatePromptChars(small));
  });
});

describe('buildUserText integration (no raw file strings leak into the prompt)', () => {
  it('only contains our own generated labels, never a raw device id or file path', () => {
    const series: DailySeries = { steps: seriesFrom([['2026-01-01', 8000]]) };
    const summary = buildAnalysisSummary(series, ['12 colunas não reconhecidas foram ignoradas.']);
    const text = buildUserText(summary);

    expect(text).toContain('Passos');
    expect(text).not.toContain('DEVICEID');
    expect(text).not.toContain('.csv');
    expect(text).not.toContain('com.samsung');
  });
});

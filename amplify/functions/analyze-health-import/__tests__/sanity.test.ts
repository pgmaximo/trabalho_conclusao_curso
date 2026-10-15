import type { DailySeries, Sample } from '../dailyAggregator';
import { applySanityRanges, checkCrossFieldConsistency, filterSamplesByRange } from '../sanity';

describe('filterSamplesByRange', () => {
  it('keeps samples within the sane range', () => {
    const samples: Sample[] = [{ metric: 'heartRateAvgBpm', dateKey: '2026-01-01', value: 70, deviceId: null }];
    const { samples: kept, warnings } = filterSamplesByRange(samples);
    expect(kept).toEqual(samples);
    expect(warnings).toEqual([]);
  });

  it('discards a value outside the sane range and reports a warning', () => {
    const samples: Sample[] = [
      { metric: 'heartRateAvgBpm', dateKey: '2026-01-01', value: 999, deviceId: null }, // acima de 230
    ];
    const { samples: kept, warnings } = filterSamplesByRange(samples);
    expect(kept).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.metric).toBe('heartRateAvgBpm');
    expect(warnings[0]?.count).toBe(1);
  });

  it('groups discard counts per metric', () => {
    const samples: Sample[] = [
      { metric: 'spo2Pct', dateKey: '2026-01-01', value: 1, deviceId: null }, // abaixo de 70
      { metric: 'spo2Pct', dateKey: '2026-01-02', value: 1, deviceId: null },
      { metric: 'steps', dateKey: '2026-01-01', value: 500, deviceId: null }, // valido
    ];
    const { kept, warnings } = (() => {
      const result = filterSamplesByRange(samples);
      return { kept: result.samples, warnings: result.warnings };
    })();
    expect(kept).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.count).toBe(2);
  });
});

describe('applySanityRanges', () => {
  it('keeps a series entirely within range untouched', () => {
    const series: DailySeries = { steps: [{ dateKey: '2026-01-01', value: 5000, sampleCount: 1 }] };
    const { series: result, warnings } = applySanityRanges(series);
    expect(result).toEqual(series);
    expect(warnings).toEqual([]);
  });

  it('removes an aggregated day outside the sane range', () => {
    const series: DailySeries = { steps: [{ dateKey: '2026-01-01', value: 500_000, sampleCount: 40 }] };
    const { series: result, warnings } = applySanityRanges(series);
    expect(result.steps).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it('drops a metric entirely from the result when all its days are out of range', () => {
    const series: DailySeries = { spo2Pct: [{ dateKey: '2026-01-01', value: 0, sampleCount: 1 }] };
    const { series: result } = applySanityRanges(series);
    expect('spo2Pct' in result).toBe(false);
  });
});

describe('checkCrossFieldConsistency', () => {
  it('leaves a normal night (stages summing under 24h) untouched', () => {
    const series: DailySeries = {
      sleepLightMinutes: [{ dateKey: '2026-01-01', value: 300, sampleCount: 1 }],
      sleepDeepMinutes: [{ dateKey: '2026-01-01', value: 60, sampleCount: 1 }],
    };
    const { series: result, warnings } = checkCrossFieldConsistency(series);
    expect(result).toEqual(series);
    expect(warnings).toEqual([]);
  });

  it('discards a night whose stage minutes sum past 24h', () => {
    const series: DailySeries = {
      sleepLightMinutes: [{ dateKey: '2026-01-01', value: 800, sampleCount: 1 }],
      sleepDeepMinutes: [{ dateKey: '2026-01-01', value: 800, sampleCount: 1 }],
    };
    const { series: result, warnings } = checkCrossFieldConsistency(series);
    expect(result.sleepLightMinutes).toEqual([]);
    expect(result.sleepDeepMinutes).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('does not affect unrelated metrics', () => {
    const series: DailySeries = {
      sleepLightMinutes: [{ dateKey: '2026-01-01', value: 800, sampleCount: 1 }],
      sleepDeepMinutes: [{ dateKey: '2026-01-01', value: 800, sampleCount: 1 }],
      steps: [{ dateKey: '2026-01-01', value: 5000, sampleCount: 1 }],
    };
    const { series: result } = checkCrossFieldConsistency(series);
    expect(result.steps).toEqual(series.steps);
  });

  it('only removes the specific bad date, keeping other nights intact', () => {
    const series: DailySeries = {
      sleepDeepMinutes: [
        { dateKey: '2026-01-01', value: 900, sampleCount: 1 },
        { dateKey: '2026-01-02', value: 60, sampleCount: 1 },
      ],
      sleepLightMinutes: [{ dateKey: '2026-01-01', value: 900, sampleCount: 1 }],
    };
    const { series: result } = checkCrossFieldConsistency(series);
    expect(result.sleepDeepMinutes).toEqual([{ dateKey: '2026-01-02', value: 60, sampleCount: 1 }]);
  });
});

import type { DailyPoint } from '../dailyAggregator';
import {
  alignSeriesWithLag,
  coverage,
  linearTrend,
  mean,
  median,
  pearson,
  pearsonWithLag,
  percentile,
  rollingMean,
  stdDev,
  weekdayWeekendSplit,
} from '../statistics';

function points(entries: [string, number][]): DailyPoint[] {
  return entries.map(([dateKey, value]) => ({ dateKey, value, sampleCount: 1 }));
}

describe('mean/median/stdDev/percentile (mathUtils re-exports)', () => {
  it('computes mean correctly', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it('computes median for even and odd length arrays', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('computes a known standard deviation', () => {
    // amostra 2,4,4,4,5,5,7,9 -> desvio padrao amostral = 2.13809...
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.1381, 3);
  });

  it('computes percentiles at the boundaries', () => {
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('returns null for empty arrays', () => {
    expect(mean([])).toBeNull();
    expect(median([])).toBeNull();
    expect(stdDev([1])).toBeNull();
    expect(percentile([], 50)).toBeNull();
  });
});

describe('rollingMean', () => {
  it('averages over the last N available points, not calendar days', () => {
    const p = points([
      ['2026-01-01', 10],
      ['2026-01-02', 20],
      ['2026-01-03', 30],
    ]);
    expect(rollingMean(p, 2)).toEqual([10, 15, 25]);
  });

  it('handles a window larger than the data', () => {
    const p = points([['2026-01-01', 10]]);
    expect(rollingMean(p, 7)).toEqual([10]);
  });
});

describe('linearTrend', () => {
  it('detects a perfect upward trend', () => {
    const p = points([
      ['2026-01-01', 0],
      ['2026-01-02', 10],
      ['2026-01-03', 20],
    ]);
    const trend = linearTrend(p);
    expect(trend?.slopePerDay).toBeCloseTo(10);
    expect(trend?.r2).toBeCloseTo(1);
  });

  it('returns null for fewer than 2 points', () => {
    expect(linearTrend(points([['2026-01-01', 1]]))).toBeNull();
  });

  it('spaces points by calendar days, not array index (handles gaps correctly)', () => {
    const p = points([
      ['2026-01-01', 0],
      ['2026-01-11', 100], // 10 dias depois, lacuna de 10 dias
    ]);
    const trend = linearTrend(p);
    expect(trend?.slopePerDay).toBeCloseTo(10); // 100/10 dias, nao 100/1 "passo do array"
  });
});

describe('pearson', () => {
  it('computes a perfect positive correlation', () => {
    const result = pearson([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(result?.r).toBeCloseTo(1);
    expect(result?.n).toBe(4);
  });

  it('computes a perfect negative correlation', () => {
    const result = pearson([1, 2, 3], [3, 2, 1]);
    expect(result?.r).toBeCloseTo(-1);
  });

  it('returns null for fewer than 2 pairs', () => {
    expect(pearson([1], [1])).toBeNull();
  });

  it('returns r=0 when one variable has no variance', () => {
    const result = pearson([1, 1, 1], [1, 2, 3]);
    expect(result?.r).toBe(0);
  });
});

describe('alignSeriesWithLag', () => {
  it('pairs values shifted by lagDays, by calendar date not array index', () => {
    const a = points([
      ['2026-01-01', 10],
      ['2026-01-02', 20],
    ]);
    const b = points([
      ['2026-01-02', 1],
      ['2026-01-03', 2],
    ]);
    const { xs, ys } = alignSeriesWithLag(a, b, 1);
    expect(xs).toEqual([10, 20]);
    expect(ys).toEqual([1, 2]);
  });

  it('drops pairs where the shifted date has no data', () => {
    const a = points([['2026-01-01', 10]]);
    const b = points([['2026-01-05', 1]]); // nao e 2026-01-02
    const { xs, ys } = alignSeriesWithLag(a, b, 1);
    expect(xs).toEqual([]);
    expect(ys).toEqual([]);
  });

  it('supports zero lag (same-day pairing)', () => {
    const a = points([['2026-01-01', 10]]);
    const b = points([['2026-01-01', 5]]);
    const { xs, ys } = alignSeriesWithLag(a, b, 0);
    expect(xs).toEqual([10]);
    expect(ys).toEqual([5]);
  });
});

describe('pearsonWithLag', () => {
  it('requires the minimum number of pairs before reporting a correlation', () => {
    const a = points(Array.from({ length: 10 }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, i] as [string, number]));
    const b = points(Array.from({ length: 10 }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, i] as [string, number]));
    expect(pearsonWithLag(a, b, 0, 14)).toBeNull(); // so 10 pares, minimo e 14
  });

  it('reports a correlation once the minimum pair count is met', () => {
    const a = points(Array.from({ length: 14 }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, i] as [string, number]));
    const b = points(Array.from({ length: 14 }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, i * 2] as [string, number]));
    const result = pearsonWithLag(a, b, 0, 14);
    expect(result?.n).toBe(14);
    expect(result?.r).toBeCloseTo(1);
  });
});

describe('weekdayWeekendSplit', () => {
  it('splits values by weekday vs weekend', () => {
    // 2026-01-03 e sabado, 2026-01-05 e segunda (verificar com Date real)
    const p = points([
      ['2026-01-03', 100], // sabado
      ['2026-01-04', 200], // domingo
      ['2026-01-05', 10], // segunda
      ['2026-01-06', 20], // terca
    ]);
    const result = weekdayWeekendSplit(p);
    expect(result.weekend).toBe(150);
    expect(result.weekday).toBe(15);
  });

  it('returns null for a side with no data', () => {
    const p = points([['2026-01-05', 10]]); // so dia util
    const result = weekdayWeekendSplit(p);
    expect(result.weekend).toBeNull();
    expect(result.weekday).toBe(10);
  });
});

describe('coverage', () => {
  it('computes full coverage', () => {
    const p = points([
      ['2026-01-01', 1],
      ['2026-01-02', 1],
      ['2026-01-03', 1],
    ]);
    expect(coverage(p, '2026-01-01', '2026-01-03')).toBe(1);
  });

  it('computes partial coverage', () => {
    const p = points([['2026-01-01', 1]]);
    expect(coverage(p, '2026-01-01', '2026-01-10')).toBeCloseTo(0.1);
  });

  it('returns 0 for an invalid period', () => {
    expect(coverage([], '2026-01-10', '2026-01-01')).toBe(0);
  });
});

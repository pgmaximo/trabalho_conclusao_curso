import {
  buildLinePath,
  computeYDomain,
  niceTicks,
  xLabelIndices,
  xPositionForIndex,
  yPositionForValue,
} from '@/components/charts/chartScale';

function points(values: (number | null)[]): { dateKey: string; value: number | null }[] {
  return values.map((value, i) => ({ dateKey: `2026-01-${String(i + 1).padStart(2, '0')}`, value }));
}

describe('computeYDomain', () => {
  it('computes min/max with default padding', () => {
    const [min, max] = computeYDomain([points([10, 20, 30])]);
    expect(min).toBeLessThan(10);
    expect(max).toBeGreaterThan(30);
  });

  it('includes zero when requested', () => {
    const [min] = computeYDomain([points([10, 20])], { includeZero: true });
    expect(min).toBeLessThanOrEqual(0);
  });

  it('ignores null values', () => {
    const [min, max] = computeYDomain([points([null, 10, null, 20])]);
    expect(min).toBeLessThan(10);
    expect(max).toBeGreaterThan(20);
  });

  it('combines multiple series into one domain', () => {
    const [min, max] = computeYDomain([points([10, 20]), points([100, 200])]);
    expect(min).toBeLessThan(10);
    expect(max).toBeGreaterThan(200);
  });

  it('returns a fallback domain for all-null input', () => {
    expect(computeYDomain([points([null, null])])).toEqual([0, 1]);
  });

  it('handles a single repeated value without a zero-width domain', () => {
    const [min, max] = computeYDomain([points([5, 5, 5])]);
    expect(min).toBeLessThan(5);
    expect(max).toBeGreaterThan(5);
  });
});

describe('buildLinePath', () => {
  it('builds a continuous path for data with no gaps', () => {
    const path = buildLinePath(points([0, 50, 100]), 100, 100, [0, 100]);
    expect(path.startsWith('M')).toBe(true);
    expect(path).not.toContain('undefined');
    // 3 pontos -> 1 M + 2 L
    expect(path.split(' ')).toHaveLength(3);
  });

  it('breaks the path (new M) at a null value instead of interpolating', () => {
    const path = buildLinePath(points([10, null, 30]), 100, 100, [0, 30]);
    const segments = path.split(' ');
    // primeiro ponto vira M, o null e pulado, o terceiro tambem vira M (novo traco)
    expect(segments.filter((s) => s.startsWith('M'))).toHaveLength(2);
  });

  it('returns an empty string for no points', () => {
    expect(buildLinePath([], 100, 100, [0, 1])).toBe('');
  });

  it('places a single point without dividing by zero', () => {
    expect(() => buildLinePath(points([50]), 100, 100, [0, 100])).not.toThrow();
  });

  it('respects padding', () => {
    const path = buildLinePath(points([0, 100]), 100, 100, [0, 100], { top: 10, bottom: 10, left: 5, right: 5 });
    expect(path).toContain('5.00');
  });
});

describe('xPositionForIndex / yPositionForValue', () => {
  it('places the first point at the left padding and the last at width minus right padding', () => {
    expect(xPositionForIndex(0, 3, 100)).toBe(0);
    expect(xPositionForIndex(2, 3, 100)).toBe(100);
  });

  it('maps the domain max to the top and min to the bottom (SVG y grows downward)', () => {
    const top = yPositionForValue(100, 100, [0, 100], { top: 0, bottom: 0, left: 0, right: 0 });
    const bottom = yPositionForValue(0, 100, [0, 100], { top: 0, bottom: 0, left: 0, right: 0 });
    expect(top).toBeLessThan(bottom);
  });
});

describe('niceTicks', () => {
  it('produces evenly spaced values including the domain edges', () => {
    expect(niceTicks([0, 100], 5)).toEqual([0, 25, 50, 75, 100]);
  });

  it('returns a single value for a zero-width domain', () => {
    expect(niceTicks([10, 10], 5)).toEqual([10]);
  });
});

describe('xLabelIndices', () => {
  it('labels every point when there are fewer than the max', () => {
    expect(xLabelIndices(points([1, 2, 3]), 5)).toEqual([0, 1, 2]);
  });

  it('subsamples evenly and always includes the last point', () => {
    const indices = xLabelIndices(points(Array.from({ length: 30 }, (_, i) => i)), 5);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(29);
    expect(indices.length).toBeLessThanOrEqual(7);
  });

  it('returns an empty array for no points', () => {
    expect(xLabelIndices([], 5)).toEqual([]);
  });
});

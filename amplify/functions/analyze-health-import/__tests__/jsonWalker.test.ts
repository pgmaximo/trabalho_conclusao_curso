import { findRecordArrays, flattenRecord } from '../jsonWalker';

describe('findRecordArrays', () => {
  it('finds an array of objects at the root', () => {
    const result = findRecordArrays([{ a: 1 }, { a: 2 }]);
    expect(result).toEqual([{ path: '$', records: [{ a: 1 }, { a: 2 }] }]);
  });

  it('finds an array nested inside an object', () => {
    const result = findRecordArrays({ data: [{ a: 1 }] });
    expect(result).toEqual([{ path: '$.data', records: [{ a: 1 }] }]);
  });

  it('returns no arrays for a plain object with no array fields', () => {
    expect(findRecordArrays({ a: 1, b: 'x' })).toEqual([]);
  });

  it('handles a real HRV binning sample (array of flat objects)', () => {
    const json = [
      { start_time: 1734505203353, end_time: 1734505502353, sdnn: 70.75644, rmssd: 44.10606 },
      { start_time: 1734505233353, end_time: 1734505534851, sdnn: 67.84348, rmssd: 39.6926 },
    ];
    const result = findRecordArrays(json);
    expect(result).toHaveLength(1);
    expect(result[0]?.records).toHaveLength(2);
  });

  it('still counts an array of empty objects as a RecordArray (real Samsung case: step_daily_trend binning)', () => {
    const result = findRecordArrays([{}, {}, {}]);
    expect(result).toEqual([{ path: '$', records: [{}, {}, {}] }]);
  });

  it('does not treat an empty array as a RecordArray', () => {
    expect(findRecordArrays([])).toEqual([]);
  });

  it('skips null values embedded in the structure without throwing', () => {
    expect(() => findRecordArrays({ a: null, b: [{ x: 1 }] })).not.toThrow();
    expect(findRecordArrays({ a: null, b: [{ x: 1 }] })).toEqual([{ path: '$.b', records: [{ x: 1 }] }]);
  });

  it('descends into an array of arrays', () => {
    const result = findRecordArrays([[{ a: 1 }], [{ b: 2 }]]);
    expect(result).toEqual([
      { path: '$[0]', records: [{ a: 1 }] },
      { path: '$[1]', records: [{ b: 2 }] },
    ]);
  });

  it('stops recursing past maxDepth (defends against pathological/deeply nested input)', () => {
    let deep: unknown = [{ leaf: true }];
    for (let i = 0; i < 20; i++) deep = { child: deep };
    expect(() => findRecordArrays(deep, 6)).not.toThrow();
    expect(findRecordArrays(deep, 6)).toEqual([]);
  });
});

describe('flattenRecord', () => {
  it('flattens a nested object with dot-joined keys', () => {
    expect(flattenRecord({ a: { b: 1, c: 2 } })).toEqual({ 'a.b': 1, 'a.c': 2 });
  });

  it('leaves an already-flat object unchanged', () => {
    expect(flattenRecord({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('does not flatten arrays (keeps them as values)', () => {
    expect(flattenRecord({ a: [1, 2, 3] })).toEqual({ a: [1, 2, 3] });
  });

  it('handles multiple levels of nesting', () => {
    expect(flattenRecord({ a: { b: { c: 1 } } })).toEqual({ 'a.b.c': 1 });
  });
});

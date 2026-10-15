import { aggregateDaily, dedupeByDevice, type Sample, type SleepStageSegment, sleepStagesFromSegments } from '../dailyAggregator';

describe('aggregateDaily', () => {
  it('sums same-day samples for a "sum" metric (steps)', () => {
    const samples: Sample[] = [
      { metric: 'steps', dateKey: '2026-01-01', value: 100, deviceId: 'a' },
      { metric: 'steps', dateKey: '2026-01-01', value: 200, deviceId: 'a' },
    ];
    const series = aggregateDaily(samples);
    expect(series.steps).toEqual([{ dateKey: '2026-01-01', value: 300, sampleCount: 2 }]);
  });

  it('averages same-day samples for a "mean" metric (heart rate)', () => {
    const samples: Sample[] = [
      { metric: 'heartRateAvgBpm', dateKey: '2026-01-01', value: 60, deviceId: null },
      { metric: 'heartRateAvgBpm', dateKey: '2026-01-01', value: 80, deviceId: null },
    ];
    const series = aggregateDaily(samples);
    expect(series.heartRateAvgBpm?.[0]?.value).toBe(70);
  });

  it('takes the last value for a "last" metric (weight)', () => {
    const samples: Sample[] = [
      { metric: 'weightKg', dateKey: '2026-01-01', value: 70, deviceId: null },
      { metric: 'weightKg', dateKey: '2026-01-01', value: 71, deviceId: null },
    ];
    expect(aggregateDaily(samples).weightKg?.[0]?.value).toBe(71);
  });

  it('sorts points chronologically by dateKey', () => {
    const samples: Sample[] = [
      { metric: 'steps', dateKey: '2026-01-03', value: 1, deviceId: null },
      { metric: 'steps', dateKey: '2026-01-01', value: 1, deviceId: null },
      { metric: 'steps', dateKey: '2026-01-02', value: 1, deviceId: null },
    ];
    expect(aggregateDaily(samples).steps?.map((p) => p.dateKey)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('keeps a day with no data absent from the series (no interpolation)', () => {
    const samples: Sample[] = [{ metric: 'steps', dateKey: '2026-01-01', value: 1, deviceId: null }];
    const series = aggregateDaily(samples);
    expect(series.steps).toHaveLength(1);
    expect(series.heartRateAvgBpm).toBeUndefined();
  });

  it('keeps separate metrics independent', () => {
    const samples: Sample[] = [
      { metric: 'steps', dateKey: '2026-01-01', value: 100, deviceId: null },
      { metric: 'sleepMinutes', dateKey: '2026-01-01', value: 400, deviceId: null },
    ];
    const series = aggregateDaily(samples);
    expect(series.steps?.[0]?.value).toBe(100);
    expect(series.sleepMinutes?.[0]?.value).toBe(400);
  });
});

describe('dedupeByDevice', () => {
  it('reproduces the real observed case: two devices, same day, same step count -- must NOT be summed', () => {
    const samples: Sample[] = [
      { metric: 'steps', dateKey: '2023-06-02', value: 979, deviceId: 'VfS0qUERdZ' },
      { metric: 'steps', dateKey: '2023-06-02', value: 979, deviceId: 'tTkJs1VJhk' },
    ];
    const deduped = dedupeByDevice(samples);
    const series = aggregateDaily(deduped);
    expect(series.steps?.[0]?.value).toBe(979); // nao 1958
  });

  it('keeps the device with more samples for that day when counts differ', () => {
    const samples: Sample[] = [
      { metric: 'heartRateAvgBpm', dateKey: '2026-01-01', value: 60, deviceId: 'phone' },
      { metric: 'heartRateAvgBpm', dateKey: '2026-01-01', value: 62, deviceId: 'watch' },
      { metric: 'heartRateAvgBpm', dateKey: '2026-01-01', value: 64, deviceId: 'watch' },
    ];
    const deduped = dedupeByDevice(samples);
    expect(deduped.every((s) => s.deviceId === 'watch')).toBe(true);
    expect(deduped).toHaveLength(2);
  });

  it('leaves single-device days untouched', () => {
    const samples: Sample[] = [{ metric: 'steps', dateKey: '2026-01-01', value: 100, deviceId: 'a' }];
    expect(dedupeByDevice(samples)).toEqual(samples);
  });

  it('treats null deviceId as its own group (no device info available)', () => {
    const samples: Sample[] = [
      { metric: 'steps', dateKey: '2026-01-01', value: 100, deviceId: null },
      { metric: 'steps', dateKey: '2026-01-01', value: 100, deviceId: null },
    ];
    expect(dedupeByDevice(samples)).toHaveLength(2); // mesmo deviceId (null) -- nao e um caso de multi-dispositivo
  });

  it('does not cross-contaminate different metrics or different days', () => {
    const samples: Sample[] = [
      { metric: 'steps', dateKey: '2026-01-01', value: 100, deviceId: 'a' },
      { metric: 'steps', dateKey: '2026-01-02', value: 100, deviceId: 'b' },
      { metric: 'distanceKm', dateKey: '2026-01-01', value: 1, deviceId: 'b' },
    ];
    expect(dedupeByDevice(samples)).toHaveLength(3);
  });
});

describe('sleepStagesFromSegments', () => {
  const baseSegment = (overrides: Partial<SleepStageSegment>): SleepStageSegment => ({
    sleepId: 'session-1',
    startTime: '2023-11-27 05:15:00.000',
    endTime: '2023-11-27 05:36:00.000',
    stageCode: '40002',
    deviceId: 'DEVICEID01',
    ...overrides,
  });

  it('converts real segment codes into minutes per stage, attributed to the wake-up day', () => {
    const segments: SleepStageSegment[] = [
      baseSegment({ stageCode: '40002', startTime: '2023-11-27 05:15:00.000', endTime: '2023-11-27 05:36:00.000' }), // light, 21min
      baseSegment({ stageCode: '40001', startTime: '2023-11-27 05:36:00.000', endTime: '2023-11-27 05:58:00.000' }), // awake, 22min
    ];

    const samples = sleepStagesFromSegments(segments);
    const light = samples.find((s) => s.metric === 'sleepLightMinutes');
    const awake = samples.find((s) => s.metric === 'sleepAwakeMinutes');

    expect(light?.value).toBe(21);
    expect(light?.dateKey).toBe('2023-11-27');
    expect(awake?.value).toBe(22);
  });

  it('attributes a session crossing midnight to the wake-up day, not the start day', () => {
    const segments: SleepStageSegment[] = [
      baseSegment({ sleepId: 's2', stageCode: '40002', startTime: '2026-01-10 23:00:00.000', endTime: '2026-01-11 02:00:00.000' }),
    ];
    const samples = sleepStagesFromSegments(segments);
    expect(samples[0]?.dateKey).toBe('2026-01-11');
    expect(samples[0]?.value).toBe(180);
  });

  it('sums multiple segments of the same stage within one session', () => {
    const segments: SleepStageSegment[] = [
      baseSegment({ sleepId: 's3', stageCode: '40003', startTime: '2026-01-10 23:00:00.000', endTime: '2026-01-10 23:30:00.000' }),
      baseSegment({ sleepId: 's3', stageCode: '40003', startTime: '2026-01-11 01:00:00.000', endTime: '2026-01-11 01:20:00.000' }),
    ];
    const samples = sleepStagesFromSegments(segments);
    const deep = samples.find((s) => s.metric === 'sleepDeepMinutes');
    expect(deep?.value).toBe(50);
  });

  it('ignores an unrecognized stage code without throwing', () => {
    const segments: SleepStageSegment[] = [baseSegment({ stageCode: '99999' })];
    expect(() => sleepStagesFromSegments(segments)).not.toThrow();
    expect(sleepStagesFromSegments(segments)).toEqual([]);
  });

  it('discards an implausible segment (end before start)', () => {
    const segments: SleepStageSegment[] = [
      baseSegment({ startTime: '2023-11-27 06:00:00.000', endTime: '2023-11-27 05:00:00.000' }),
    ];
    expect(sleepStagesFromSegments(segments)).toEqual([]);
  });

  it('keeps separate sleep sessions (different sleepId) independent', () => {
    const segments: SleepStageSegment[] = [
      baseSegment({ sleepId: 'night-1', stageCode: '40003', startTime: '2026-01-01 23:00:00.000', endTime: '2026-01-01 23:30:00.000' }),
      baseSegment({ sleepId: 'night-2', stageCode: '40003', startTime: '2026-01-02 23:00:00.000', endTime: '2026-01-02 23:45:00.000' }),
    ];
    const samples = sleepStagesFromSegments(segments);
    expect(samples).toHaveLength(2);
  });
});

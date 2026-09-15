import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseCsv } from '../csvParser';
import { extractSamples } from '../sampleExtractor';

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

describe('extractSamples (real Samsung fixtures)', () => {
  it('extracts steps/distance/calorie/activeMinutes from pedometer_day_summary.csv', () => {
    const text = loadFixture('pedometer_day_summary.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.tracker.pedometer_day_summary');

    const stepsSamples = result.samples.filter((s) => s.metric === 'steps');
    expect(stepsSamples.length).toBeGreaterThan(0);
    expect(stepsSamples[0]?.value).toBe(979);
    expect(stepsSamples[0]?.dateKey).toBe('2023-06-02');
    expect(stepsSamples[0]?.deviceId).toBe('DEVICEID01');

    const distanceSamples = result.samples.filter((s) => s.metric === 'distanceKm');
    expect(distanceSamples[0]?.value).toBeCloseTo(0.72232); // 722.32m -> km

    expect(result.rowsWithoutTimestamp).toBe(0);
  });

  it('does NOT extract workoutDistanceKm from pedometer_day_summary (per-file disambiguation)', () => {
    const text = loadFixture('pedometer_day_summary.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.tracker.pedometer_day_summary');
    expect(result.samples.some((s) => s.metric === 'workoutDistanceKm')).toBe(false);
  });

  it('extracts weight and body fat from weight.csv, using start_time (no day_time column)', () => {
    const text = loadFixture('weight.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.health.weight');

    const weightSamples = result.samples.filter((s) => s.metric === 'weightKg');
    expect(weightSamples).toHaveLength(2);
    expect(weightSamples[0]?.value).toBe(63.7);
    expect(weightSamples[0]?.dateKey).toBe('2023-11-28');

    const bodyFatSamples = result.samples.filter((s) => s.metric === 'bodyFatPct');
    expect(bodyFatSamples[0]?.value).toBeCloseTo(20.56834);
  });

  it('extracts heart rate avg/min/max from prefixed columns in tracker_heart_rate.csv', () => {
    const text = loadFixture('tracker_heart_rate.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.tracker.heart_rate');

    expect(result.samples.some((s) => s.metric === 'heartRateAvgBpm' && s.value === 77)).toBe(true);
    expect(result.samples.some((s) => s.metric === 'heartRateMinBpm')).toBe(true);
    expect(result.samples.some((s) => s.metric === 'heartRateMaxBpm')).toBe(true);
  });

  it('extracts sleep.csv metrics using end_time (wake day), not start_time', () => {
    const text = loadFixture('sleep.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.sleep');

    const durationSamples = result.samples.filter((s) => s.metric === 'sleepMinutes');
    expect(durationSamples.length).toBeGreaterThan(0);
    // primeira linha da fixture: end_time = 2023-11-27 11:13:00.000 (nao o start_time da noite anterior)
    expect(durationSamples[0]?.dateKey).toBe('2023-11-27');

    expect(result.samples.some((s) => s.metric === 'sleepScore')).toBe(true);
    expect(result.samples.some((s) => s.metric === 'physicalRecovery')).toBe(true);
    expect(result.samples.some((s) => s.metric === 'mentalRecovery')).toBe(true);
  });

  it('extracts spo2 from oxygen_saturation.csv as a percentage, not a fraction', () => {
    const text = loadFixture('oxygen_saturation.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.tracker.oxygen_saturation');

    const spo2Samples = result.samples.filter((s) => s.metric === 'spo2Pct');
    expect(spo2Samples.length).toBeGreaterThan(0);
    expect(spo2Samples[0]?.value).toBeGreaterThan(50); // percentual, nao fracao 0-1
  });

  it('extracts respiratory rate from respiratory_rate.csv', () => {
    const text = loadFixture('respiratory_rate.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.health.respiratory_rate');
    expect(result.samples.some((s) => s.metric === 'respiratoryRateBrpm')).toBe(true);
  });

  it('extracts floors climbed', () => {
    const text = loadFixture('floors_climbed.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.health.floors_climbed');
    expect(result.samples.some((s) => s.metric === 'floorsClimbed')).toBe(true);
  });

  it('extracts stress score, ignoring rows with no score', () => {
    const text = loadFixture('stress.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.stress');
    expect(result.samples.some((s) => s.metric === 'stressScore')).toBe(true);
  });

  it('extracts vitality score using create_time fallback (no day_time/start_time column)', () => {
    const text = loadFixture('vitality_score.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.vitality_score');
    expect(result.samples.some((s) => s.metric === 'vitalityScore')).toBe(true);
  });

  it('reports unmapped columns instead of silently ignoring the gap', () => {
    const text = loadFixture('pedometer_day_summary.csv');
    const parsed = parseCsv(text, { skipLeadingMetadataLine: true });
    const result = extractSamples(parsed, 'com.samsung.shealth.tracker.pedometer_day_summary');
    expect(result.unmappedColumnCount).toBeGreaterThan(0);
  });

  it('returns empty samples (not a throw) for a type with no timestamp column mapping', () => {
    const parsed = { headers: ['foo', 'bar'], rows: [['1', '2']], metadataLine: null, skippedLineCount: 0 };
    const result = extractSamples(parsed, 'com.samsung.unknown.type');
    expect(result.samples).toEqual([]);
    expect(result.rowsWithoutTimestamp).toBe(1);
  });
});

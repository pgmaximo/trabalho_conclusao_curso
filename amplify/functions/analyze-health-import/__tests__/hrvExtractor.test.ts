import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractHrvSamples } from '../hrvExtractor';

function loadFixtureJson(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8'));
}

describe('extractHrvSamples', () => {
  it('extracts sdnn and rmssd from a real HRV binning sample', () => {
    const json = loadFixtureJson('hrv_binning_sample.json');
    const samples = extractHrvSamples(json);

    const sdnnSamples = samples.filter((s) => s.metric === 'hrvSdnnMs');
    const rmssdSamples = samples.filter((s) => s.metric === 'hrvRmssdMs');

    expect(sdnnSamples.length).toBeGreaterThan(0);
    expect(rmssdSamples.length).toBeGreaterThan(0);
    expect(sdnnSamples[0]?.value).toBeCloseTo(70.75644);
    expect(rmssdSamples[0]?.value).toBeCloseTo(44.10606);
    expect(sdnnSamples[0]?.deviceId).toBeNull(); // HRV nao carrega deviceuuid no JSON
  });

  it('derives the date key from the epoch start_time using the default offset', () => {
    const json = [{ start_time: 1734505203353, end_time: 1734505502353, sdnn: 70, rmssd: 40 }];
    const samples = extractHrvSamples(json);
    expect(samples[0]?.dateKey).toBe('2024-12-18');
  });

  it('does not produce a sample for an array of empty objects (real step_daily_trend binning shape)', () => {
    const json = [{}, {}, {}];
    expect(extractHrvSamples(json)).toEqual([]);
  });

  it('handles a record missing sdnn or rmssd individually', () => {
    const json = [{ start_time: 1734505203353, sdnn: 70 }]; // sem rmssd
    const samples = extractHrvSamples(json);
    expect(samples).toHaveLength(1);
    expect(samples[0]?.metric).toBe('hrvSdnnMs');
  });

  it('skips a record with no start_time entirely', () => {
    const json = [{ sdnn: 70, rmssd: 40 }];
    expect(extractHrvSamples(json)).toEqual([]);
  });

  it('accepts a custom offset', () => {
    const json = [{ start_time: Date.parse('2024-01-01T00:30:00Z'), sdnn: 50, rmssd: 30 }];
    expect(extractHrvSamples(json, 0)[0]?.dateKey).toBe('2024-01-01');
    expect(extractHrvSamples(json, -60)[0]?.dateKey).toBe('2023-12-31');
  });

  it('never throws on malformed input', () => {
    expect(() => extractHrvSamples(null)).not.toThrow();
    expect(() => extractHrvSamples('not json')).not.toThrow();
    expect(() => extractHrvSamples(42)).not.toThrow();
  });
});

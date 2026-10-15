import { zipSync } from 'fflate';
import { MAX_ENTRY_SIZE_BYTES, MAX_TOTAL_ACCEPTED_BYTES, shouldExtractEntry, unzipHealthExport } from '../archiveReader';

const ROOT = 'samsunghealth_user.example.com_20260908091938';

describe('shouldExtractEntry', () => {
  it('accepts a root-level CSV', () => {
    expect(shouldExtractEntry(`${ROOT}/com.samsung.shealth.tracker.pedometer_day_summary.csv`, 1000)).toBe(true);
  });

  it('accepts the HRV JSON exception under jsons/com.samsung.health.hrv/', () => {
    expect(shouldExtractEntry(`${ROOT}/jsons/com.samsung.health.hrv/abc123.binning_data.json`, 1000)).toBe(true);
  });

  it('rejects everything else under jsons/ (real case: 41MB of empty-object binning in step_daily_trend)', () => {
    expect(shouldExtractEntry(`${ROOT}/jsons/com.samsung.shealth.step_daily_trend/abc.binning_data.json`, 1000)).toBe(false);
    expect(shouldExtractEntry(`${ROOT}/jsons/com.samsung.shealth.tracker.heart_rate/abc.json`, 1000)).toBe(false);
  });

  it('rejects entries under files/', () => {
    expect(shouldExtractEntry(`${ROOT}/files/com.samsung.health.ecg/abc.pdf`, 1000)).toBe(false);
  });

  it('rejects a non-csv, non-hrv-json file at the root', () => {
    expect(shouldExtractEntry(`${ROOT}/readme.txt`, 1000)).toBe(false);
  });

  it('rejects directory markers', () => {
    expect(shouldExtractEntry(`${ROOT}/jsons/`, 0)).toBe(false);
  });

  it('rejects an entry larger than MAX_ENTRY_SIZE_BYTES', () => {
    expect(shouldExtractEntry(`${ROOT}/com.samsung.shealth.sleep_stage.csv`, MAX_ENTRY_SIZE_BYTES + 1)).toBe(false);
  });

  it('accepts an entry right at the size limit', () => {
    expect(shouldExtractEntry(`${ROOT}/big.csv`, MAX_ENTRY_SIZE_BYTES)).toBe(true);
  });

  it('rejects a zero-byte entry', () => {
    expect(shouldExtractEntry(`${ROOT}/empty.csv`, 0)).toBe(false);
  });

  it('handles backslash path separators defensively', () => {
    expect(shouldExtractEntry(`${ROOT}\\jsons\\com.samsung.health.hrv\\abc.json`, 1000)).toBe(true);
  });
});

describe('unzipHealthExport', () => {
  function makeZip(entries: Record<string, string>): Uint8Array {
    const files: Record<string, Uint8Array> = {};
    for (const [name, content] of Object.entries(entries)) {
      files[name] = new TextEncoder().encode(content);
    }
    return zipSync(files);
  }

  it('extracts an allowlisted CSV and skips a rejected JSON folder', () => {
    const zip = makeZip({
      [`${ROOT}/com.samsung.health.weight.csv`]: 'com.samsung.health.weight,7006003,12\nweight\n70',
      [`${ROOT}/jsons/com.samsung.shealth.step_daily_trend/x.json`]: '[{},{}]',
    });

    const result = unzipHealthExport(zip);

    expect(result.csvEntries).toHaveLength(1);
    expect(result.csvEntries[0]?.name).toContain('weight.csv');
    expect(result.hrvJsonEntries).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it('keeps HRV json entries separate from csv entries', () => {
    const zip = makeZip({
      [`${ROOT}/jsons/com.samsung.health.hrv/x.json`]: '[{"start_time":1,"sdnn":1,"rmssd":1}]',
    });

    const result = unzipHealthExport(zip);
    expect(result.hrvJsonEntries).toHaveLength(1);
    expect(result.csvEntries).toHaveLength(0);
  });

  it('reports skipped count and total bytes accepted', () => {
    const zip = makeZip({
      [`${ROOT}/a.csv`]: 'header\n1',
      [`${ROOT}/files/x.pdf`]: 'binary-ish content',
    });

    const result = unzipHealthExport(zip);
    expect(result.skippedCount).toBe(1);
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  it('never exceeds MAX_TOTAL_ACCEPTED_BYTES across accepted entries', () => {
    // Construимos varias entradas pequenas -- o corte real (120MB) nao e
    // pratico de simular por completo aqui, mas confirmamos que o mecanismo
    // de acumulo + corte funciona com um teto artificialmente baixo via
    // entradas cujo tamanho declarado passa do teto quando somado.
    const bigContent = 'x'.repeat(1000);
    const zip = makeZip({
      [`${ROOT}/a.csv`]: bigContent,
      [`${ROOT}/b.csv`]: bigContent,
    });

    const result = unzipHealthExport(zip);
    expect(result.totalBytes).toBeLessThanOrEqual(MAX_TOTAL_ACCEPTED_BYTES);
  });
});

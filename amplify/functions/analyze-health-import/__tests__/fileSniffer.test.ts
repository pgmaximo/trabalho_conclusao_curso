import { detectFormat, detectSamsungType, isSamsungMetadataLine } from '../fileSniffer';

describe('isSamsungMetadataLine', () => {
  it('recognizes a real Samsung metadata line', () => {
    expect(isSamsungMetadataLine('com.samsung.shealth.tracker.pedometer_day_summary,7006003,7')).toBe(true);
  });

  it('rejects a header line', () => {
    expect(isSamsungMetadataLine('create_sh_ver,step_count,binning_data')).toBe(false);
  });

  it('rejects a data row', () => {
    expect(isSamsungMetadataLine(',979,uuid.binning_data.json,557658')).toBe(false);
  });
});

describe('detectSamsungType', () => {
  // Regressao real: o nome do arquivo `com.samsung.shealth.stress*.csv`
  // tambem casa com o arquivo de tipo `stress.histogram`; e
  // `exercise*.csv` casa com `exercise.periodization_training_schedule`.
  // Confirmado lendo o export real do usuario -- so a linha 1 desambigua.
  it('distinguishes com.samsung.shealth.stress from com.samsung.shealth.stress.histogram by content, not filename', () => {
    expect(detectSamsungType('com.samsung.shealth.stress,7006003,9')).toBe('com.samsung.shealth.stress');
    expect(detectSamsungType('com.samsung.shealth.stress.histogram,7006003,2')).toBe(
      'com.samsung.shealth.stress.histogram',
    );
  });

  it('distinguishes com.samsung.shealth.exercise from its periodization_training_schedule variant', () => {
    expect(detectSamsungType('com.samsung.shealth.exercise,7006003,17')).toBe('com.samsung.shealth.exercise');
    expect(
      detectSamsungType('com.samsung.shealth.exercise.periodization_training_schedule,7006003,1'),
    ).toBe('com.samsung.shealth.exercise.periodization_training_schedule');
  });

  it('returns null for a non-metadata line', () => {
    expect(detectSamsungType('create_sh_ver,step_count,binning_data')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(detectSamsungType('')).toBeNull();
  });
});

describe('detectFormat', () => {
  it('detects samsung-csv from the metadata line regardless of filename', () => {
    const head = 'com.samsung.health.hrv,7006003,1\nstart_time,end_time,sdnn';
    expect(detectFormat('anything.csv', head)).toBe('samsung-csv');
  });

  it('detects json from a leading brace', () => {
    expect(detectFormat('export.json', '{"data":[{"steps":100}]}')).toBe('json');
  });

  it('detects json from a leading bracket', () => {
    expect(detectFormat('export.json', '[{"steps":100}]')).toBe('json');
  });

  it('detects generic-csv for a non-Samsung CSV header', () => {
    expect(detectFormat('HealthAutoExport.csv', 'Date,Step Count (count)\n2026-01-01,8000')).toBe('generic-csv');
  });

  it('falls back to unknown for unrecognizable content', () => {
    expect(detectFormat('mystery.bin', '\x00\x01\x02')).toBe('unknown');
  });
});

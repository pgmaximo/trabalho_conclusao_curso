import { strToU8, zipSync } from 'fflate';
import { extractAppleHealthSamples, parseAppleRecordLine } from '../appleHealthReader';

// Linhas no formato real do export.xml do app Saúde (iOS), com os campos de
// origem trocados por valores de exemplo.
const STEPS_LINE =
  ' <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" sourceVersion="15.4" device="&lt;&lt;HKDevice&gt;&gt;" unit="count" creationDate="2022-04-11 00:12:52 -0300" startDate="2022-04-11 00:01:23 -0300" endDate="2022-04-11 00:11:12 -0300" value="57"/>';
const DEEP_SLEEP_LINE =
  ' <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" sourceVersion="9" creationDate="2022-04-21 06:10:01 -0300" startDate="2022-04-20 23:50:00 -0300" endDate="2022-04-21 00:30:00 -0300" value="HKCategoryValueSleepAnalysisAsleepDeep">';

describe('parseAppleRecordLine', () => {
  it('maps StepCount to steps on the local calendar day, using sourceName as device', () => {
    expect(parseAppleRecordLine(STEPS_LINE)).toEqual([
      { metric: 'steps', dateKey: '2022-04-11', value: 57, deviceId: 'iPhone' },
    ]);
  });

  it('turns an asleep stage into stage minutes plus total sleep minutes on the wake-up day', () => {
    expect(parseAppleRecordLine(DEEP_SLEEP_LINE)).toEqual([
      { metric: 'sleepDeepMinutes', dateKey: '2022-04-21', value: 40, deviceId: 'Watch' },
      { metric: 'sleepMinutes', dateKey: '2022-04-21', value: 40, deviceId: 'Watch' },
    ]);
  });

  it('ignores InBed, which is not sleep', () => {
    expect(parseAppleRecordLine(DEEP_SLEEP_LINE.replace('AsleepDeep', 'InBed'))).toEqual([]);
  });

  it('converts SpO2 from fraction to percent', () => {
    const line = STEPS_LINE.replace('StepCount', 'OxygenSaturation').replace('unit="count"', 'unit="%"').replace('value="57"', 'value="0.97"');
    expect(parseAppleRecordLine(line)).toEqual([{ metric: 'spo2Pct', dateKey: '2022-04-11', value: 97, deviceId: 'iPhone' }]);
  });

  it('feeds one heart rate reading into the average, min and max series', () => {
    const line = STEPS_LINE.replace('StepCount', 'HeartRate').replace('unit="count"', 'unit="count/min"').replace('value="57"', 'value="72"');
    expect(parseAppleRecordLine(line).map((s) => s.metric)).toEqual(['heartRateAvgBpm', 'heartRateMinBpm', 'heartRateMaxBpm']);
  });

  it('skips types it does not know and units it cannot convert', () => {
    expect(parseAppleRecordLine(STEPS_LINE.replace('StepCount', 'WalkingSpeed'))).toEqual([]);
    expect(parseAppleRecordLine(STEPS_LINE.replace('unit="count"', 'unit="furlong"'))).toEqual([]);
    expect(parseAppleRecordLine(' <ActivitySummary dateComponents="2022-04-11"/>')).toEqual([]);
  });
});

describe('extractAppleHealthSamples', () => {
  it('reads apple_health_export/export.xml straight from the ZIP, even across stream chunks', () => {
    // ~3000 linhas (~800KB) garantem que varias linhas caiam na fronteira
    // entre dois pedacos do stream de descompressao.
    const lines = Array.from({ length: 3000 }, () => STEPS_LINE);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="pt_BR">\n${lines.join('\n')}\n</HealthData>\n`;
    const zip = zipSync({
      'apple_health_export/export.xml': strToU8(xml),
      'apple_health_export/export_cda.xml': strToU8('<ClinicalDocument/>'),
    });

    const samples = extractAppleHealthSamples(zip);

    expect(samples).toHaveLength(3000);
    expect(samples?.every((s) => s.metric === 'steps' && s.value === 57)).toBe(true);
  });

  it('adds up the sleep segments of each night per source, so the total passes the per-reading range check', () => {
    // Cada trecho tem 40 min; sanity.filterSamplesByRange exige >= 60 min por
    // leitura de sono total, entao trechos soltos sumiriam todos.
    const rem = DEEP_SLEEP_LINE.replace('AsleepDeep', 'AsleepREM');
    const otherSource = DEEP_SLEEP_LINE.replace('sourceName="Watch"', 'sourceName="Fitbit"');
    const xml = `<HealthData>\n${DEEP_SLEEP_LINE}\n${rem}\n${otherSource}\n</HealthData>\n`;
    const samples = extractAppleHealthSamples(zipSync({ 'apple_health_export/export.xml': strToU8(xml) })) ?? [];

    expect(samples.filter((s) => s.metric === 'sleepMinutes')).toEqual([
      { metric: 'sleepMinutes', dateKey: '2022-04-21', value: 80, deviceId: 'Watch' },
      { metric: 'sleepMinutes', dateKey: '2022-04-21', value: 40, deviceId: 'Fitbit' },
    ]);
  });

  it('returns null for a ZIP that is not an Apple Health export', () => {
    const zip = zipSync({ 'samsunghealth_x/com.samsung.shealth.sleep.csv': strToU8('a,b\n1,2\n') });
    expect(extractAppleHealthSamples(zip)).toBeNull();
  });
});

import { Unzip, UnzipInflate } from 'fflate';
import type { Sample } from './dailyAggregator';
import type { MetricId } from './metricCatalog';
import { extractDateKeyFromLocalString, toNumber } from './valueNormalizer';

/**
 * Export do app Saude do iPhone ("Exportar Todos os Dados de Saude"): um ZIP
 * com `apple_health_export/export.xml`, que no export real tem ~250MB
 * descomprimido (12MB comprimido) -- muito acima de MAX_ENTRY_SIZE_BYTES do
 * archiveReader. Por isso este leitor NAO infla a entrada inteira: descomprime
 * em stream e le um `<Record .../>` por linha, guardando so as Samples.
 */
const EXPORT_XML_PATTERN = /(^|\/)export\.xml$/;

/** Corte de zip bomb: para de ler o export.xml depois disso (o real tem ~250MB). */
export const MAX_APPLE_XML_BYTES = 1024 * 1024 * 1024;

type QuantityMapping = { metrics: MetricId[]; unitFactors: Record<string, number> };

// Tipos e unidades conferidos contra um export real (iOS, 2022-2026). Unidade
// fora da lista = registro ignorado, nunca convertido "no chute".
const QUANTITY_TYPES: Record<string, QuantityMapping> = {
  HKQuantityTypeIdentifierStepCount: { metrics: ['steps'], unitFactors: { count: 1 } },
  HKQuantityTypeIdentifierDistanceWalkingRunning: { metrics: ['distanceKm'], unitFactors: { km: 1, m: 0.001, mi: 1.609344 } },
  HKQuantityTypeIdentifierActiveEnergyBurned: { metrics: ['activeEnergyKcal'], unitFactors: { Cal: 1, kcal: 1, kJ: 1 / 4.184 } },
  HKQuantityTypeIdentifierAppleExerciseTime: { metrics: ['activeMinutes'], unitFactors: { min: 1 } },
  HKQuantityTypeIdentifierHeartRate: {
    metrics: ['heartRateAvgBpm', 'heartRateMinBpm', 'heartRateMaxBpm'],
    unitFactors: { 'count/min': 1 },
  },
  HKQuantityTypeIdentifierRestingHeartRate: { metrics: ['restingHeartRateBpm'], unitFactors: { 'count/min': 1 } },
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: { metrics: ['hrvSdnnMs'], unitFactors: { ms: 1 } },
  // A Apple grava percentuais como fracao (0.97 com unit="%").
  HKQuantityTypeIdentifierOxygenSaturation: { metrics: ['spo2Pct'], unitFactors: { '%': 100 } },
  HKQuantityTypeIdentifierBodyFatPercentage: { metrics: ['bodyFatPct'], unitFactors: { '%': 100 } },
  HKQuantityTypeIdentifierRespiratoryRate: { metrics: ['respiratoryRateBrpm'], unitFactors: { 'count/min': 1 } },
  HKQuantityTypeIdentifierBodyMass: { metrics: ['weightKg'], unitFactors: { kg: 1, g: 0.001, lb: 0.45359237 } },
  HKQuantityTypeIdentifierFlightsClimbed: { metrics: ['floorsClimbed'], unitFactors: { count: 1 } },
};

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis';

// null = conta so no total de sono (sem estagio); InBed fica de fora (deitado nao e dormindo).
const SLEEP_VALUES: Record<string, MetricId | null> = {
  HKCategoryValueSleepAnalysisAsleepDeep: 'sleepDeepMinutes',
  HKCategoryValueSleepAnalysisAsleepREM: 'sleepRemMinutes',
  HKCategoryValueSleepAnalysisAsleepCore: 'sleepLightMinutes',
  HKCategoryValueSleepAnalysisAsleepUnspecified: null,
  HKCategoryValueSleepAnalysisAsleep: null,
  HKCategoryValueSleepAnalysisAwake: 'sleepAwakeMinutes',
};

const MAX_PLAUSIBLE_SEGMENT_MINUTES = 720; // mesmo corte de dailyAggregator.sleepStagesFromSegments

/** "2022-04-21 01:17:53 -0300" -> instante absoluto (ms). */
function parseAppleDate(raw: string | undefined): number | null {
  if (!raw) return null;
  const iso = raw.trim().replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2');
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function readAttributes(line: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of line.matchAll(/(\w+)="([^"]*)"/g)) {
    attributes[match[1]!] = match[2]!;
  }
  return attributes;
}

/**
 * Converte UMA linha do export.xml em Samples. Linhas que nao sao `<Record`
 * de um tipo conhecido viram []. O `sourceName` (iPhone, Watch, app de
 * terceiro...) e o deviceId, para que dedupeByDevice nao some passos do
 * iPhone com os do relogio no mesmo dia.
 */
export function parseAppleRecordLine(line: string): Sample[] {
  if (!line.includes('<Record ')) return [];
  const { type, unit, value, startDate, endDate, sourceName } = readAttributes(line);
  if (!type) return [];
  const deviceId = sourceName ?? null;

  if (type === SLEEP_TYPE) {
    if (!value || !(value in SLEEP_VALUES)) return [];
    const start = parseAppleDate(startDate);
    const end = parseAppleDate(endDate);
    const dateKey = endDate ? extractDateKeyFromLocalString(endDate) : null; // dia do despertar
    if (start === null || end === null || !dateKey) return [];

    const minutes = (end - start) / 60_000;
    if (minutes <= 0 || minutes > MAX_PLAUSIBLE_SEGMENT_MINUTES) return [];

    const stageMetric = SLEEP_VALUES[value];
    const samples: Sample[] = [];
    if (stageMetric) samples.push({ metric: stageMetric, dateKey, value: minutes, deviceId });
    if (stageMetric !== 'sleepAwakeMinutes') samples.push({ metric: 'sleepMinutes', dateKey, value: minutes, deviceId });
    return samples;
  }

  const mapping = QUANTITY_TYPES[type];
  const factor = mapping && unit ? mapping.unitFactors[unit] : undefined;
  const numeric = toNumber(value);
  const dateKey = startDate ? extractDateKeyFromLocalString(startDate) : null;
  if (!mapping || factor === undefined || numeric === null || !dateKey) return [];

  return mapping.metrics.map((metric) => ({ metric, dateKey, value: numeric * factor, deviceId }));
}

/**
 * Le as Samples do `export.xml` de um ZIP do app Saude. Retorna null quando o
 * ZIP nao tem export.xml (nao e um export da Apple -- o handler segue para o
 * leitor do Samsung).
 */
export function extractAppleHealthSamples(zipBytes: Uint8Array): Sample[] | null {
  let found = false;
  const samples: Sample[] = [];
  // O sono total vem em trechos (um por estagio); somados por fonte e noite
  // aqui, porque sanity.filterSamplesByRange exige >= 60 min por leitura.
  const sleepByNight = new Map<string, Sample>();
  const unzip = new Unzip();
  unzip.register(UnzipInflate);

  unzip.onfile = (file) => {
    if (found || !EXPORT_XML_PATTERN.test(file.name.replace(/\\/g, '/'))) return; // nao iniciada = nunca inflada
    found = true;

    const decoder = new TextDecoder('utf-8');
    let pending = '';
    let bytesRead = 0;
    let stopped = false;

    file.ondata = (error, chunk, final) => {
      if (error) throw error;
      if (stopped) return;

      bytesRead += chunk.length;
      if (bytesRead > MAX_APPLE_XML_BYTES) {
        stopped = true;
        console.warn(`export.xml passou de ${MAX_APPLE_XML_BYTES} bytes; leitura interrompida.`);
        return;
      }

      // Linha que atravessa dois pedacos do stream fica em `pending` ate o proximo.
      const lines = (pending + decoder.decode(chunk, { stream: !final })).split('\n');
      pending = final ? '' : (lines.pop() ?? '');
      for (const line of lines) {
        for (const sample of parseAppleRecordLine(line)) {
          if (sample.metric !== 'sleepMinutes') {
            samples.push(sample);
            continue;
          }
          const key = `${sample.deviceId}|${sample.dateKey}`;
          const night = sleepByNight.get(key);
          if (night) night.value += sample.value;
          else sleepByNight.set(key, { ...sample });
        }
      }
    };
    file.start();
  };

  unzip.push(zipBytes, true);
  return found ? [...samples, ...sleepByNight.values()] : null;
}

import { type AggregationOp, getMetric, type MetricId } from './metricCatalog';
import { mean, median } from './mathUtils';
import { extractDateKeyFromLocalString, parseLocalTimestampAsNaiveDate } from './valueNormalizer';

/** Uma leitura ja normalizada, pronta para ser agregada por dia. */
export type Sample = {
  metric: MetricId;
  dateKey: string; // YYYY-MM-DD
  value: number;
  deviceId: string | null;
};

export type DailyPoint = {
  dateKey: string;
  value: number;
  sampleCount: number;
};

export type DailySeries = Partial<Record<MetricId, DailyPoint[]>>;

function applyOp(op: AggregationOp, values: number[]): number {
  switch (op) {
    case 'sum':
      return values.reduce((sum, v) => sum + v, 0);
    case 'mean':
      return mean(values) ?? 0;
    case 'median':
      return median(values) ?? 0;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'last':
      return values[values.length - 1] ?? 0;
    case 'count':
      return values.length;
    default: {
      const exhaustiveCheck: never = op;
      throw new Error(`Operacao de agregacao desconhecida: ${String(exhaustiveCheck)}`);
    }
  }
}

// Separador improvavel de colidir com um MetricId (camelCase) ou uma dateKey
// (digitos e hifens) -- usado so como chave interna de agrupamento.
const GROUP_KEY_SEPARATOR = '__';

/**
 * Colapsa amostras em pontos diarios, aplicando a operacao de agregacao de
 * cada metrica (metricCatalog.ts) sobre os valores do mesmo dia. Chame
 * `dedupeByDevice` ANTES desta funcao quando as amostras podem vir de mais
 * de um dispositivo (ver plan.md 3.3.7 -- somar duas fontes dobraria, por
 * exemplo, a contagem de passos).
 */
export function aggregateDaily(samples: Sample[]): DailySeries {
  const groups = new Map<string, Sample[]>();

  for (const sample of samples) {
    const key = `${sample.metric}${GROUP_KEY_SEPARATOR}${sample.dateKey}`;
    const group = groups.get(key);
    if (group) group.push(sample);
    else groups.set(key, [sample]);
  }

  const series: DailySeries = {};

  for (const groupSamples of groups.values()) {
    const metric = groupSamples[0]?.metric;
    const dateKey = groupSamples[0]?.dateKey;
    if (!metric || !dateKey) continue;

    const values = groupSamples.map((s) => s.value);
    const op = getMetric(metric).op;
    const point: DailyPoint = { dateKey, value: applyOp(op, values), sampleCount: values.length };

    const existing = series[metric];
    if (existing) existing.push(point);
    else series[metric] = [point];
  }

  for (const points of Object.values(series)) {
    points?.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }

  return series;
}

/**
 * Quando o mesmo dia tem amostras de mais de um dispositivo para a mesma
 * metrica, mantem SO as do dispositivo com mais amostras naquele dia --
 * nunca soma (caso real confirmado: dois `deviceuuid` diferentes gravando os
 * mesmos 979 passos no mesmo `day_time`, que dobraria a contagem se somado).
 */
export function dedupeByDevice(samples: Sample[]): Sample[] {
  const groups = new Map<string, Sample[]>();

  for (const sample of samples) {
    const key = `${sample.metric}${GROUP_KEY_SEPARATOR}${sample.dateKey}`;
    const group = groups.get(key);
    if (group) group.push(sample);
    else groups.set(key, [sample]);
  }

  const result: Sample[] = [];

  for (const groupSamples of groups.values()) {
    const deviceIds = new Set(groupSamples.map((s) => s.deviceId));

    if (deviceIds.size <= 1) {
      result.push(...groupSamples);
      continue;
    }

    const countByDevice = new Map<string | null, number>();
    for (const sample of groupSamples) {
      countByDevice.set(sample.deviceId, (countByDevice.get(sample.deviceId) ?? 0) + 1);
    }

    let bestDevice: string | null = null;
    let bestCount = -1;
    for (const [deviceId, count] of countByDevice) {
      if (count > bestCount) {
        bestCount = count;
        bestDevice = deviceId;
      }
    }

    result.push(...groupSamples.filter((s) => s.deviceId === bestDevice));
  }

  return result;
}

export type SleepStageSegment = {
  sleepId: string;
  startTime: string;
  endTime: string;
  stageCode: string;
  deviceId: string | null;
};

/**
 * Codigos observados no export real (com.samsung.health.sleep_stage.csv,
 * coluna `stage`): 40001-40004, confirmados por frequencia relativa
 * (leve > acordado > REM > profundo, condizente com uma noite tipica) contra
 * documentacao da comunidade que reverse-engenheirou o formato Samsung --
 * NAO confirmado por documentacao oficial da Samsung (ambiguidade
 * documentada, regra 8 da constituicao).
 */
const STAGE_CODE_TO_METRIC: Record<string, MetricId> = {
  '40001': 'sleepAwakeMinutes',
  '40002': 'sleepLightMinutes',
  '40003': 'sleepDeepMinutes',
  '40004': 'sleepRemMinutes',
};

const MAX_PLAUSIBLE_SEGMENT_MINUTES = 720; // 12h -- um segmento de estagio maior que isso e descartado

/**
 * Converte segmentos de estagio de sono (start_time/end_time/stage por
 * segmento) em Samples de minutos por estagio, atribuidos ao dia de
 * DESPERTAR de cada sessao -- nunca ao dia de inicio, porque a maioria das
 * sessoes cruza a meia-noite. As sessoes sao agrupadas por `sleepId` (a
 * coluna `sleep_id` do CSV, que liga cada segmento a UMA noite), e o dia de
 * despertar e a data-calendario do MAIOR `end_time` dentro do grupo.
 */
export function sleepStagesFromSegments(segments: SleepStageSegment[]): Sample[] {
  const bySession = new Map<string, SleepStageSegment[]>();

  for (const segment of segments) {
    const group = bySession.get(segment.sleepId);
    if (group) group.push(segment);
    else bySession.set(segment.sleepId, [segment]);
  }

  const samples: Sample[] = [];

  for (const sessionSegments of bySession.values()) {
    let wakeDateKey: string | null = null;
    let latestEnd = -Infinity;

    for (const segment of sessionSegments) {
      const endDate = parseLocalTimestampAsNaiveDate(segment.endTime);
      if (endDate && endDate.getTime() > latestEnd) {
        latestEnd = endDate.getTime();
        wakeDateKey = extractDateKeyFromLocalString(segment.endTime);
      }
    }

    if (!wakeDateKey) continue;

    const minutesByMetric = new Map<MetricId, number>();
    let deviceId: string | null = null;

    for (const segment of sessionSegments) {
      const metric = STAGE_CODE_TO_METRIC[segment.stageCode];
      if (!metric) continue; // codigo de estagio desconhecido -- ignorado, nunca lanca

      const start = parseLocalTimestampAsNaiveDate(segment.startTime);
      const end = parseLocalTimestampAsNaiveDate(segment.endTime);
      if (!start || !end) continue;

      const minutes = (end.getTime() - start.getTime()) / 60_000;
      if (minutes <= 0 || minutes > MAX_PLAUSIBLE_SEGMENT_MINUTES) continue;

      minutesByMetric.set(metric, (minutesByMetric.get(metric) ?? 0) + minutes);
      deviceId ??= segment.deviceId;
    }

    for (const [metric, minutes] of minutesByMetric) {
      samples.push({ metric, dateKey: wakeDateKey, value: minutes, deviceId });
    }
  }

  return samples;
}

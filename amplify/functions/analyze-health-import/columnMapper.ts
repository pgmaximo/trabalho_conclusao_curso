import { type CanonicalMetric, findMetricByAlias, getMetric, type MetricId, normalizeColumnName } from './metricCatalog';

/**
 * Metricas candidatas por tipo Samsung (linha 1 do CSV, via fileSniffer).
 * Existe para nao deixar `findMetricByAlias` procurar globalmente em
 * CANONICAL_METRICS -- aliases curtos como "distance", "score", "min"/"max"
 * significam coisas diferentes em arquivos diferentes (distanceKm vs.
 * workoutDistanceKm; stressScore vs. um futuro "score"; heartRateMin/MaxBpm
 * vs. um "min"/"max" de outro arquivo).
 */
export const METRICS_BY_SAMSUNG_TYPE: Readonly<Record<string, readonly MetricId[]>> = {
  'com.samsung.shealth.tracker.pedometer_day_summary': ['steps', 'distanceKm', 'activeEnergyKcal', 'activeMinutes'],
  'com.samsung.shealth.step_daily_trend': ['steps', 'distanceKm', 'activeEnergyKcal'],
  'com.samsung.shealth.activity.day_summary': ['steps', 'distanceKm', 'activeEnergyKcal', 'activeMinutes'],
  'com.samsung.shealth.tracker.heart_rate': ['heartRateAvgBpm', 'heartRateMinBpm', 'heartRateMaxBpm'],
  'com.samsung.shealth.sleep': ['sleepMinutes', 'sleepScore', 'sleepEfficiency', 'physicalRecovery', 'mentalRecovery'],
  'com.samsung.shealth.tracker.oxygen_saturation': ['spo2Pct'],
  'com.samsung.health.respiratory_rate': ['respiratoryRateBrpm'],
  'com.samsung.health.skin_temperature': ['skinTemperatureC'],
  'com.samsung.health.weight': ['weightKg', 'bodyFatPct'],
  'com.samsung.shealth.exercise': ['workoutMinutes', 'workoutDistanceKm'],
  'com.samsung.health.floors_climbed': ['floorsClimbed'],
  'com.samsung.shealth.stress': ['stressScore'],
  'com.samsung.shealth.vitality_score': ['vitalityScore'],
};

/** Tipos Samsung reconhecidos que tratamos de forma especial (nao via coluna numerica direta). */
export const SLEEP_STAGE_SAMSUNG_TYPE = 'com.samsung.health.sleep_stage';

export function getCandidateMetricsForType(samsungType: string): CanonicalMetric[] {
  const ids = METRICS_BY_SAMSUNG_TYPE[samsungType];
  return ids ? ids.map(getMetric) : [];
}

export type ColumnMapping = {
  columnIndex: number;
  metric: CanonicalMetric;
}[];

/** Mapeia cada coluna do cabecalho para a metrica canonica correspondente, se houver. */
export function mapColumns(headers: string[], samsungType: string): ColumnMapping {
  const candidates = getCandidateMetricsForType(samsungType);
  const mapping: ColumnMapping = [];

  headers.forEach((header, columnIndex) => {
    const metric = findMetricByAlias(header, candidates);
    if (metric) mapping.push({ columnIndex, metric });
  });

  return mapping;
}

/** Indice da primeira coluna cujo nome normalizado bate exatamente com `name`, ou null. */
export function findColumnByNormalizedName(headers: string[], name: string): number | null {
  const index = headers.findIndex((header) => normalizeColumnName(header) === name);
  return index === -1 ? null : index;
}

/**
 * Coluna de timestamp preferida para atribuir a data-calendario de uma
 * linha: "day_time" (ja e a meia-noite do dia, presente nos arquivos de
 * resumo diario) > "start_time" (amostra pontual) > "create_time" (fallback
 * usado por vitality_score.csv, que nao tem nenhuma das duas anteriores).
 * Chamadores com semantica diferente (ex.: sleep.csv deve usar o horario de
 * DESPERTAR, nao o de inicio) devem ignorar este default e buscar a coluna
 * certa diretamente com findColumnByNormalizedName.
 */
export function findTimestampColumn(headers: string[]): number | null {
  return (
    findColumnByNormalizedName(headers, 'day_time') ??
    findColumnByNormalizedName(headers, 'start_time') ??
    findColumnByNormalizedName(headers, 'create_time')
  );
}

export function findOffsetColumn(headers: string[]): number | null {
  return findColumnByNormalizedName(headers, 'time_offset');
}

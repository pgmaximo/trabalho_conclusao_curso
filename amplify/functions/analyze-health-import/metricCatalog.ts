// Catalogo declarativo de metricas canonicas. Formato mudou, ou apareceu um
// alias novo? Adiciona-se uma linha aqui -- nenhum outro modulo muda, e o
// teste (metricCatalog.test.ts) cobre a linha nova. Aliases e unidades foram
// derivados do export real do Samsung Health do usuario (nao de suposicao),
// ver docs/superpowers/plans/2026-09-09-importacao-wearables-bedrock.md
// secao 0.2 e 3.2.

export type MetricId =
  | 'steps'
  | 'distanceKm'
  | 'activeEnergyKcal'
  | 'activeMinutes'
  | 'heartRateAvgBpm'
  | 'heartRateMinBpm'
  | 'heartRateMaxBpm'
  | 'restingHeartRateBpm'
  | 'hrvSdnnMs'
  | 'hrvRmssdMs'
  | 'sleepMinutes'
  | 'sleepScore'
  | 'sleepEfficiency'
  | 'physicalRecovery'
  | 'mentalRecovery'
  | 'sleepDeepMinutes'
  | 'sleepRemMinutes'
  | 'sleepLightMinutes'
  | 'sleepAwakeMinutes'
  | 'spo2Pct'
  | 'respiratoryRateBrpm'
  | 'skinTemperatureC'
  | 'weightKg'
  | 'bodyFatPct'
  | 'workoutMinutes'
  | 'workoutDistanceKm'
  | 'floorsClimbed'
  | 'stressScore'
  | 'vitalityScore';

export type AggregationOp = 'sum' | 'mean' | 'median' | 'min' | 'max' | 'last' | 'count';

export type CanonicalMetric = {
  id: MetricId;
  label: string; // pt-BR, para a UI e o prompt
  unit: string;
  op: AggregationOp;
  /** Faixa fisiologicamente sa -- valor fora daqui e descartado e contabilizado (sanity.ts). */
  sane: [number, number];
  /**
   * Nomes de coluna reconhecidos, ja normalizados (minusculo, sem o prefixo
   * com.samsung.*.). Casamento e por IGUALDADE EXATA do nome normalizado,
   * nunca substring -- isso evita colisao com colunas de nome parecido mas
   * semantica diferente (ex.: "total_sleep_time_weight" do sleep.csv NAO deve
   * casar com a metrica de peso corporal so porque termina em "weight").
   * Vazio quando a metrica vem de outra fonte que nao coluna CSV direta
   * (HRV vem de JSON via jsonWalker; estagios de sono vem de segmentos de
   * tempo via dailyAggregator.sleepStagesFromSegments).
   */
  aliases: string[];
  /** Multiplica o valor bruto por este fator para chegar na unidade canonica. */
  unitFactor?: number;
};

export const CANONICAL_METRICS: readonly CanonicalMetric[] = [
  {
    id: 'steps',
    label: 'Passos',
    unit: 'passos',
    op: 'sum',
    sane: [0, 100_000],
    // 'count' vem de step_daily_trend.csv -- alias curto, ambiguidade
    // documentada (regra 8 da constituicao): um outro arquivo do Samsung com
    // uma coluna generica "count" de semantica diferente colidiria aqui, mas
    // nenhum dos arquivos do catalogo atual tem esse conflito.
    aliases: ['step_count', 'count'],
  },
  {
    id: 'distanceKm',
    label: 'Distância percorrida',
    unit: 'km',
    op: 'sum',
    sane: [0, 100],
    aliases: ['distance'], // metros no Samsung
    unitFactor: 0.001,
  },
  {
    id: 'activeEnergyKcal',
    label: 'Energia ativa',
    unit: 'kcal',
    op: 'sum',
    sane: [0, 10_000],
    aliases: ['calorie'],
  },
  {
    id: 'activeMinutes',
    label: 'Tempo ativo',
    unit: 'min',
    op: 'sum',
    sane: [0, 1440],
    aliases: ['active_time'], // milissegundos no Samsung
    unitFactor: 1 / 60_000,
  },
  {
    id: 'heartRateAvgBpm',
    label: 'Frequência cardíaca média',
    unit: 'bpm',
    op: 'mean',
    sane: [25, 230],
    aliases: ['heart_rate'],
  },
  {
    id: 'heartRateMinBpm',
    label: 'Frequência cardíaca mínima',
    unit: 'bpm',
    op: 'min',
    sane: [25, 220],
    aliases: ['min'],
  },
  {
    id: 'heartRateMaxBpm',
    label: 'Frequência cardíaca máxima',
    unit: 'bpm',
    op: 'max',
    sane: [40, 230],
    aliases: ['max'],
  },
  {
    id: 'restingHeartRateBpm',
    label: 'Frequência cardíaca de repouso (estimada)',
    unit: 'bpm',
    op: 'median',
    sane: [25, 120],
    // Derivada (minimo diario de heartRateMinBpm) em statistics.ts/summaryBuilder.ts
    // -- Samsung nao exporta RHR direto no dump padrao.
    aliases: [],
  },
  {
    id: 'hrvSdnnMs',
    label: 'Variabilidade da frequência cardíaca (SDNN)',
    unit: 'ms',
    op: 'median',
    sane: [1, 300],
    aliases: [], // vem de jsons/com.samsung.health.hrv/*.json via jsonWalker
  },
  {
    id: 'hrvRmssdMs',
    label: 'Variabilidade da frequência cardíaca (RMSSD)',
    unit: 'ms',
    op: 'median',
    sane: [1, 300],
    aliases: [],
  },
  {
    id: 'sleepMinutes',
    label: 'Duração do sono',
    unit: 'min',
    op: 'sum',
    sane: [60, 960],
    aliases: ['sleep_duration'],
  },
  {
    id: 'sleepScore',
    label: 'Pontuação do sono',
    unit: 'pontos',
    op: 'last',
    sane: [0, 100],
    aliases: ['sleep_score'],
  },
  {
    id: 'sleepEfficiency',
    label: 'Eficiência do sono',
    unit: '%',
    op: 'last',
    sane: [0, 100],
    aliases: ['efficiency'],
  },
  {
    id: 'physicalRecovery',
    label: 'Recuperação física',
    unit: 'pontos',
    op: 'last',
    sane: [0, 100],
    aliases: ['physical_recovery'],
  },
  {
    id: 'mentalRecovery',
    label: 'Recuperação mental',
    unit: 'pontos',
    op: 'last',
    sane: [0, 100],
    aliases: ['mental_recovery'],
  },
  {
    id: 'sleepDeepMinutes',
    label: 'Sono profundo',
    unit: 'min',
    op: 'sum',
    sane: [0, 600],
    aliases: [], // vem de sleep_stage.csv via dailyAggregator.sleepStagesFromSegments
  },
  {
    id: 'sleepRemMinutes',
    label: 'Sono REM',
    unit: 'min',
    op: 'sum',
    sane: [0, 600],
    aliases: [],
  },
  {
    id: 'sleepLightMinutes',
    label: 'Sono leve',
    unit: 'min',
    op: 'sum',
    sane: [0, 600],
    aliases: [],
  },
  {
    id: 'sleepAwakeMinutes',
    label: 'Tempo acordado durante a noite',
    unit: 'min',
    op: 'sum',
    sane: [0, 600],
    aliases: [],
  },
  {
    id: 'spo2Pct',
    label: 'Saturação de oxigênio (SpO₂)',
    unit: '%',
    op: 'median',
    sane: [70, 100],
    aliases: ['spo2'],
  },
  {
    id: 'respiratoryRateBrpm',
    label: 'Frequência respiratória',
    unit: 'rpm',
    op: 'median',
    sane: [4, 40],
    aliases: ['average'],
  },
  {
    id: 'skinTemperatureC',
    label: 'Temperatura da pele',
    unit: '°C',
    op: 'mean',
    sane: [25, 42],
    aliases: ['temperature'],
  },
  {
    id: 'weightKg',
    label: 'Peso corporal',
    unit: 'kg',
    op: 'last',
    sane: [25, 300],
    aliases: ['weight'],
  },
  {
    id: 'bodyFatPct',
    label: 'Percentual de gordura corporal',
    unit: '%',
    op: 'last',
    sane: [3, 70],
    aliases: ['body_fat'],
  },
  {
    id: 'workoutMinutes',
    label: 'Duração de exercícios',
    unit: 'min',
    op: 'sum',
    sane: [0, 600],
    aliases: ['duration'], // milissegundos no Samsung (com.samsung.health.exercise.duration)
    unitFactor: 1 / 60_000,
  },
  {
    id: 'workoutDistanceKm',
    label: 'Distância em exercícios',
    unit: 'km',
    op: 'sum',
    sane: [0, 200],
    // mesmo alias "distance" de distanceKm -- desambiguado por ARQUIVO
    // (columnMapper.ts so aplica esta entrada ao mapear com.samsung.health.exercise),
    // nunca globalmente.
    aliases: ['distance'],
    unitFactor: 0.001,
  },
  {
    id: 'floorsClimbed',
    label: 'Andares subidos',
    unit: 'andares',
    op: 'sum',
    sane: [0, 500],
    aliases: ['floor'],
  },
  {
    id: 'stressScore',
    label: 'Nível de estresse',
    unit: 'pontos',
    op: 'mean',
    sane: [0, 100],
    aliases: ['score'],
  },
  {
    id: 'vitalityScore',
    label: 'Pontuação de vitalidade',
    unit: 'pontos',
    op: 'last',
    sane: [0, 100],
    aliases: ['total_score'],
  },
];

const METRIC_BY_ID = new Map(CANONICAL_METRICS.map((metric) => [metric.id, metric]));

export function getMetric(id: MetricId): CanonicalMetric {
  const metric = METRIC_BY_ID.get(id);
  if (!metric) throw new Error(`Metrica desconhecida: ${id}`);
  return metric;
}

/**
 * Normaliza um nome de coluna para comparacao: minusculo, sem espacos nas
 * pontas, e sem o prefixo com.samsung.<...>. quando presente (mantendo so o
 * ultimo segmento, que e o nome real do campo).
 */
export function normalizeColumnName(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith('com.samsung.')) {
    const parts = trimmed.split('.');
    return parts[parts.length - 1] || trimmed;
  }
  return trimmed;
}

/**
 * Procura uma metrica por nome de coluna, dentro de uma lista candidata
 * (tipicamente as metricas relevantes para o arquivo/tipo Samsung sendo
 * mapeado -- ver columnMapper.ts). Nunca busca globalmente em
 * CANONICAL_METRICS para evitar colisao entre metricas com o mesmo alias
 * curto usado por arquivos diferentes (ex.: "distance" em distanceKm vs.
 * workoutDistanceKm, "score" em stressScore vs. um futuro uso de "score").
 */
export function findMetricByAlias(
  rawColumnName: string,
  candidates: readonly CanonicalMetric[] = CANONICAL_METRICS,
): CanonicalMetric | null {
  const normalized = normalizeColumnName(rawColumnName);
  return candidates.find((metric) => metric.aliases.includes(normalized)) ?? null;
}

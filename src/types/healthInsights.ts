/**
 * Resumo do arquivo:
 * Tipos espelhando o JSON gravado pela Lambda analyze-health-import em
 * `HealthImport.metricsJson` (AnalysisSummary) e `HealthImport.insightsJson`
 * (Insights) — ver amplify/functions/analyze-health-import/summaryBuilder.ts
 * e insightSchema.ts. Duplicados de propósito em vez de importados: o
 * frontend não importa de `amplify/functions/*` (sem precedente no repo, e
 * puxaria zod/módulos de backend pro bundle do app); e o valor chega como
 * string JSON de qualquer forma, então o parse já exige um type assertion.
 */

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

export type MonthlyPoint = {
  month: string; // YYYY-MM
  mean: number | null;
};

export type MetricSummary = {
  metric: MetricId;
  label: string;
  unit: string;
  n: number;
  firstSeen: string;
  lastSeen: string;
  daysWithData: number;
  coveragePct: number;
  mean: number | null;
  median: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  p25: number | null;
  p75: number | null;
  weekday: number | null;
  weekend: number | null;
  trendSlopePerDay: number | null;
  monthly: MonthlyPoint[];
};

export type CorrelationSummary = {
  metricA: MetricId;
  metricB: MetricId;
  lagDays: number;
  label: string;
  r: number;
  n: number;
};

export type AnalysisSummary = {
  periodStart: string;
  periodEnd: string;
  dayCount: number;
  metrics: MetricSummary[];
  correlations: CorrelationSummary[];
  warnings: string[];
};

export type InsightTone = 'positivo' | 'neutro' | 'atencao';
export type InsightSeverity = 'informativo' | 'atencao';
export type InsightConfidence = 'baixa' | 'media' | 'alta';
export type InsightEffort = 'baixo' | 'medio' | 'alto';

export type InsightHighlight = {
  metrica: string;
  valor: string;
  comparacao: string;
  tom: InsightTone;
};

export type InsightAttentionPoint = {
  titulo: string;
  descricao: string;
  severidade: InsightSeverity;
  metricas: string[];
};

export type InsightPattern = {
  titulo: string;
  descricao: string;
  evidencia: string;
  confianca: InsightConfidence;
};

export type InsightSuggestion = {
  titulo: string;
  acao: string;
  porque: string;
  esforco: InsightEffort;
};

export type Insights = {
  resumo: string;
  destaques: InsightHighlight[];
  pontosDeAtencao: InsightAttentionPoint[];
  padroes: InsightPattern[];
  sugestoes: InsightSuggestion[];
  perguntasParaOMedico: string[];
  limitacoes: string;
};

export type HealthImportStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type HealthImportSourceHint = 'SAMSUNG_HEALTH' | 'APPLE_HEALTH' | 'OUTRO' | 'DESCONHECIDO';

export type HealthImport = {
  id: string;
  status: HealthImportStatus;
  sourceHint: HealthImportSourceHint | null;
  fileNames: string[];
  periodStart: string | null;
  periodEnd: string | null;
  dayCount: number | null;
  warnings: string[];
  errorMessage: string | null;
  startedAt: string | null;
  analyzedAt: string | null;
  modelId: string | null;
  summary: AnalysisSummary | null;
  insights: Insights | null;
  createdAt: string;
  updatedAt: string;
};

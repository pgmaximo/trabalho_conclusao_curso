// Primitivas estatisticas puras, sem dependencia de nenhum outro modulo do
// pipeline -- usadas tanto por dailyAggregator.ts (para colapsar multiplas
// amostras do mesmo dia com op 'mean'/'median') quanto por statistics.ts
// (para as estatisticas descritivas por metrica).

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? null);
}

export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = mean(values);
  if (avg === null) return null;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Percentil por interpolacao linear (metodo "linear" do numpy/Excel), p em [0,100]. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0] ?? null;

  const rank = (p / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sorted[lowerIndex] ?? 0;
  const upper = sorted[upperIndex] ?? lower;
  const fraction = rank - lowerIndex;

  return lower + (upper - lower) * fraction;
}

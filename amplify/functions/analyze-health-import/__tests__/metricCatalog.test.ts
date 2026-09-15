import { HEALTH_IMPORT_STATUS } from '../../../data/schemas/healthImportEnums';
import { CANONICAL_METRICS, findMetricByAlias, getMetric, normalizeColumnName } from '../metricCatalog';

describe('normalizeColumnName', () => {
  it('lowercases and trims', () => {
    expect(normalizeColumnName('  Step_Count  ')).toBe('step_count');
  });

  it('strips a com.samsung.* prefix, keeping only the last segment', () => {
    expect(normalizeColumnName('com.samsung.health.heart_rate.heart_rate')).toBe('heart_rate');
    expect(normalizeColumnName('com.samsung.health.oxygen_saturation.spo2')).toBe('spo2');
  });

  it('leaves a short unprefixed column name untouched', () => {
    expect(normalizeColumnName('distance')).toBe('distance');
  });

  it('does NOT mistake an unrelated column ending in a metric-like suffix for that metric', () => {
    // Regressao real: "total_sleep_time_weight" (sleep.csv) nao pode virar "weight".
    expect(normalizeColumnName('total_sleep_time_weight')).toBe('total_sleep_time_weight');
  });
});

describe('findMetricByAlias', () => {
  it('matches a short unprefixed alias', () => {
    expect(findMetricByAlias('distance')?.id).toBe('distanceKm');
  });

  it('matches a prefixed column by its last segment', () => {
    expect(findMetricByAlias('com.samsung.health.oxygen_saturation.spo2')?.id).toBe('spo2Pct');
  });

  it('returns null for an unrecognized column', () => {
    expect(findMetricByAlias('some_unknown_column')).toBeNull();
  });

  it('does not match "total_sleep_time_weight" to the weight metric', () => {
    expect(findMetricByAlias('total_sleep_time_weight')).toBeNull();
  });

  it('restricts matches to the given candidate list (per-file disambiguation)', () => {
    const distanceMetric = getMetric('distanceKm');
    const workoutDistanceMetric = getMetric('workoutDistanceKm');

    // "distance" e alias de AMBAS -- o candidate list decide qual delas.
    expect(findMetricByAlias('distance', [distanceMetric])?.id).toBe('distanceKm');
    expect(findMetricByAlias('distance', [workoutDistanceMetric])?.id).toBe('workoutDistanceKm');
  });

  it('returns null when the alias exists in the catalog but not in the given candidates', () => {
    const spo2Metric = getMetric('spo2Pct');
    expect(findMetricByAlias('distance', [spo2Metric])).toBeNull();
  });
});

describe('CANONICAL_METRICS', () => {
  it('has no duplicate metric ids', () => {
    const ids = CANONICAL_METRICS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a sane range where min < max for every metric', () => {
    for (const metric of CANONICAL_METRICS) {
      expect(metric.sane[0]).toBeLessThan(metric.sane[1]);
    }
  });

  it('has normalized (lowercase) aliases for every metric', () => {
    for (const metric of CANONICAL_METRICS) {
      for (const alias of metric.aliases) {
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });
});

describe('getMetric', () => {
  it('throws for an unknown id (defensive -- should never happen with a valid MetricId)', () => {
    // @ts-expect-error -- id invalido de proposito, para testar o guard-rail em runtime
    expect(() => getMetric('doesNotExist')).toThrow();
  });
});

// Garantia de que o catalogo de status usado pelas duas Lambdas (fonte unica
// em amplify/data/schemas/healthImportEnums.ts) continua com exatamente os
// 4 valores esperados -- se alguem adicionar/remover um valor sem atualizar
// os dois lugares que o usam (handler.ts + schema), este teste acusa.
describe('HEALTH_IMPORT_STATUS (sanity cross-check)', () => {
  it('has exactly the four expected values, in order', () => {
    expect(HEALTH_IMPORT_STATUS).toEqual(['PENDING', 'PROCESSING', 'READY', 'FAILED']);
  });
});

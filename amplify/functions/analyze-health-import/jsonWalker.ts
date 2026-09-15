// Acha arrays de objetos dentro de um JSON de estrutura arbitraria -- usado
// para extrair amostras de HRV dos JSONs do Samsung
// (`jsons/com.samsung.health.hrv/*.binning_data.json`, formato
// `[{"start_time":...,"end_time":...,"sdnn":...,"rmssd":...}]`) e, no futuro,
// para JSON de exportadores terceiros (Health Auto Export) cujo shape exato
// nao foi verificado contra um export real.

export type RecordArray = {
  /** Caminho ate o array, tipo "data.metrics", para depuracao. */
  path: string;
  records: Record<string, unknown>[];
};

const MAX_DEPTH = 6;

/**
 * Procura recursivamente por arrays cujos elementos sejam objetos simples
 * (nao arrays, nao null) em qualquer profundidade do JSON. Um array vazio ou
 * de objetos vazios (`[{},{},...]` -- caso real confirmado em
 * step_daily_trend do Samsung) ainda conta como RecordArray, mas
 * flattenRecord devolvera um objeto vazio para cada elemento, entao no
 * pipeline downstream ele nao produz nenhuma amostra util.
 */
export function findRecordArrays(value: unknown, maxDepth: number = MAX_DEPTH, path = '$'): RecordArray[] {
  if (maxDepth < 0) return [];

  if (Array.isArray(value)) {
    const allObjects = value.every(
      (item) => typeof item === 'object' && item !== null && !Array.isArray(item),
    );

    if (allObjects && value.length > 0) {
      return [{ path, records: value as Record<string, unknown>[] }];
    }

    // Array de arrays ou array vazio: desce em cada elemento.
    return value.flatMap((item, index) => findRecordArrays(item, maxDepth - 1, `${path}[${index}]`));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => findRecordArrays(child, maxDepth - 1, `${path}.${key}`));
  }

  return [];
}

/**
 * Achata um objeto aninhado em um unico nivel, unindo chaves com "." (ex.:
 * `{a:{b:1}}` -> `{"a.b":1}`). Usado para JSON de exportadores terceiros cujo
 * shape pode aninhar o valor (ex.: `{metric:{name, value}}`) -- os JSONs de
 * HRV do Samsung ja sao planos e nao precisam disso, mas a funcao existe para
 * quando o bloco Apple/HAE do catalogo for verificado contra um export real.
 */
export function flattenRecord(record: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenRecord(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

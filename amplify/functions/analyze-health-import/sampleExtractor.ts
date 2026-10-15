import type { ParsedCsv } from './csvParser';
import { findColumnByNormalizedName, findTimestampColumn, mapColumns } from './columnMapper';
import { convertToCanonicalUnit, extractDateKeyFromLocalString, toNumber } from './valueNormalizer';
import type { Sample } from './dailyAggregator';

export type ExtractionResult = {
  samples: Sample[];
  /** Colunas do cabecalho que nao casaram com nenhuma metrica conhecida. */
  unmappedColumnCount: number;
  /** Linhas descartadas por nao terem uma data-calendario legivel. */
  rowsWithoutTimestamp: number;
};

const COLUMNS_ALWAYS_IGNORED = ['day_time', 'start_time', 'create_time', 'end_time', 'time_offset', 'deviceuuid'];

/**
 * Extrai Samples de um CSV Samsung generico ja parseado (headers+rows),
 * identificado pelo tipo declarado na linha 1 (fileSniffer.detectSamsungType).
 * NAO cobre com.samsung.health.sleep_stage (segmentos de tempo, nao coluna de
 * valor direto -- ver dailyAggregator.sleepStagesFromSegments) nem HRV via
 * JSON (ver hrvExtractor.ts).
 */
export function extractSamples(parsed: ParsedCsv, samsungType: string): ExtractionResult {
  const { headers, rows } = parsed;
  const mapping = mapColumns(headers, samsungType);

  // com.samsung.shealth.sleep e o unico tipo onde a data-calendario correta
  // e a do DESPERTAR (end_time), nao a do inicio da sessao -- uma sessao de
  // sono tipica comeca numa noite e termina na manha seguinte, e "o dia
  // daquela noite de sono" para fins de dashboard e o dia em que a pessoa
  // acordou. Os demais tipos usam o default (day_time > start_time > create_time).
  const timestampIndex =
    samsungType === 'com.samsung.shealth.sleep'
      ? findColumnByNormalizedName(headers, 'end_time')
      : findTimestampColumn(headers);

  const deviceIndex = findColumnByNormalizedName(headers, 'deviceuuid');

  if (timestampIndex === null) {
    return { samples: [], unmappedColumnCount: headers.length, rowsWithoutTimestamp: rows.length };
  }

  const samples: Sample[] = [];
  let rowsWithoutTimestamp = 0;

  for (const row of rows) {
    const rawTimestamp = row[timestampIndex];
    const dateKey = rawTimestamp ? extractDateKeyFromLocalString(rawTimestamp) : null;

    if (!dateKey) {
      rowsWithoutTimestamp++;
      continue;
    }

    const deviceId = deviceIndex !== null ? row[deviceIndex] || null : null;

    for (const { columnIndex, metric } of mapping) {
      const numeric = toNumber(row[columnIndex]);
      if (numeric === null) continue;

      samples.push({
        metric: metric.id,
        dateKey,
        value: convertToCanonicalUnit(numeric, metric),
        deviceId,
      });
    }
  }

  const ignoredColumnCount = COLUMNS_ALWAYS_IGNORED.filter(
    (name) => findColumnByNormalizedName(headers, name) !== null,
  ).length;
  const unmappedColumnCount = Math.max(0, headers.length - mapping.length - ignoredColumnCount);

  return { samples, unmappedColumnCount, rowsWithoutTimestamp };
}

import { findRecordArrays } from './jsonWalker';
import { DEFAULT_TZ_OFFSET_MINUTES, epochMsToDateKey, toNumber } from './valueNormalizer';
import type { Sample } from './dailyAggregator';

/**
 * Extrai amostras de HRV (SDNN e RMSSD) dos JSONs de
 * `jsons/com.samsung.health.hrv/*.json` -- formato observado no export real:
 * `[{"start_time":1734505203353,"end_time":...,"sdnn":70.75,"rmssd":44.10}]`,
 * timestamps em epoch ms, SEM coluna de offset de fuso propria (ao contrario
 * dos CSVs). Por isso usa DEFAULT_TZ_OFFSET_MINUTES como aproximacao -- ver
 * o comentario em valueNormalizer.ts.
 *
 * `findRecordArrays` tolera o formato vazio real `[{},{},...]` (visto em
 * step_daily_trend, nao em HRV, mas o mesmo shape geral pode aparecer aqui)
 * sem produzir amostras -- `toNumber(undefined)` retorna null e a linha e
 * pulada, nunca lanca.
 */
export function extractHrvSamples(json: unknown, offsetMinutes: number = DEFAULT_TZ_OFFSET_MINUTES): Sample[] {
  const recordArrays = findRecordArrays(json);
  const samples: Sample[] = [];

  for (const { records } of recordArrays) {
    for (const record of records) {
      const startTime = toNumber(record.start_time as number | string | undefined);
      if (startTime === null) continue;

      const dateKey = epochMsToDateKey(startTime, offsetMinutes);

      const sdnn = toNumber(record.sdnn as number | string | undefined);
      if (sdnn !== null) {
        samples.push({ metric: 'hrvSdnnMs', dateKey, value: sdnn, deviceId: null });
      }

      const rmssd = toNumber(record.rmssd as number | string | undefined);
      if (rmssd !== null) {
        samples.push({ metric: 'hrvRmssdMs', dateKey, value: rmssd, deviceId: null });
      }
    }
  }

  return samples;
}

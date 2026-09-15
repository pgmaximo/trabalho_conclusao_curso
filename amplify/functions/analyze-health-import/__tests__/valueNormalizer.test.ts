import { getMetric } from '../metricCatalog';
import {
  convertToCanonicalUnit,
  DEFAULT_TZ_OFFSET_MINUTES,
  epochMsToDateKey,
  extractDateKeyFromLocalString,
  parseLocalTimestampAsNaiveDate,
  parseOffsetString,
  toNumber,
} from '../valueNormalizer';

describe('toNumber', () => {
  it('parses a plain integer string', () => {
    expect(toNumber('979')).toBe(979);
  });

  it('parses a decimal with dot', () => {
    expect(toNumber('722.32')).toBeCloseTo(722.32);
  });

  it('parses a pt-BR decimal comma', () => {
    expect(toNumber('72,5')).toBeCloseTo(72.5);
  });

  it('returns null for an empty string', () => {
    expect(toNumber('')).toBeNull();
  });

  it('returns null for a lone dash (Samsung "no value" marker)', () => {
    expect(toNumber('-')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
  });

  it('passes through a finite number unchanged', () => {
    expect(toNumber(42)).toBe(42);
  });

  it('returns null for a non-numeric string', () => {
    expect(toNumber('abc')).toBeNull();
  });

  it('returns null for NaN/Infinity', () => {
    expect(toNumber(NaN)).toBeNull();
    expect(toNumber(Infinity)).toBeNull();
  });
});

describe('convertToCanonicalUnit', () => {
  it('applies the unit factor (meters to km)', () => {
    const distanceKm = getMetric('distanceKm');
    expect(convertToCanonicalUnit(722.32, distanceKm)).toBeCloseTo(0.72232);
  });

  it('leaves the value unchanged when there is no unit factor', () => {
    const steps = getMetric('steps');
    expect(convertToCanonicalUnit(979, steps)).toBe(979);
  });

  it('converts milliseconds to minutes (active_time)', () => {
    const activeMinutes = getMetric('activeMinutes');
    expect(convertToCanonicalUnit(557_658, activeMinutes)).toBeCloseTo(557658 / 60000);
  });
});

describe('extractDateKeyFromLocalString', () => {
  it('extracts the date from a real Samsung local timestamp', () => {
    expect(extractDateKeyFromLocalString('2023-06-02 17:24:05.687')).toBe('2023-06-02');
  });

  it('extracts the date-only day_time column value', () => {
    expect(extractDateKeyFromLocalString('2023-06-02 00:00:00.000')).toBe('2023-06-02');
  });

  it('returns null for a string with no leading date', () => {
    expect(extractDateKeyFromLocalString('not a date')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractDateKeyFromLocalString('')).toBeNull();
  });
});

describe('epochMsToDateKey', () => {
  it('converts an HRV epoch-ms sample to the expected date under the default offset', () => {
    // 1734505203353 ms = 2024-12-18 03:20:03 UTC; UTC-3 => ainda 2024-12-18
    expect(epochMsToDateKey(1734505203353)).toBe('2024-12-18');
  });

  it('respects a custom offset', () => {
    // Perto da meia-noite UTC: um offset diferente pode mudar o dia.
    const nearMidnightUtc = Date.parse('2024-01-01T00:30:00Z');
    expect(epochMsToDateKey(nearMidnightUtc, 0)).toBe('2024-01-01');
    expect(epochMsToDateKey(nearMidnightUtc, -60)).toBe('2023-12-31');
  });

  it('uses UTC-3 as the documented default', () => {
    expect(DEFAULT_TZ_OFFSET_MINUTES).toBe(-180);
  });
});

describe('parseLocalTimestampAsNaiveDate', () => {
  it('parses a Samsung local timestamp into a Date usable for duration math', () => {
    const date = parseLocalTimestampAsNaiveDate('2023-11-27 05:15:00.000');
    expect(date).not.toBeNull();
    expect(date?.getUTCFullYear()).toBe(2023);
  });

  it('produces a correct duration when subtracting two same-row timestamps regardless of true timezone', () => {
    const start = parseLocalTimestampAsNaiveDate('2023-11-27 05:15:00.000')!;
    const end = parseLocalTimestampAsNaiveDate('2023-11-27 11:13:00.000')!;
    const minutes = (end.getTime() - start.getTime()) / 60_000;
    expect(minutes).toBe(358); // confirmado contra o export real: sleep_duration=358
  });

  it('returns null for garbage input', () => {
    expect(parseLocalTimestampAsNaiveDate('not-a-timestamp')).toBeNull();
  });
});

describe('parseOffsetString', () => {
  it('parses a negative offset', () => {
    expect(parseOffsetString('UTC-0300')).toBe(-180);
  });

  it('parses a positive offset', () => {
    expect(parseOffsetString('UTC+0530')).toBe(330);
  });

  it('parses the older DST-era offset seen in the real export', () => {
    expect(parseOffsetString('UTC-0200')).toBe(-120);
  });

  it('returns null for an unrecognized format', () => {
    expect(parseOffsetString('GMT-3')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(parseOffsetString(null)).toBeNull();
    expect(parseOffsetString(undefined)).toBeNull();
  });
});

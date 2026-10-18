import { formatImportPeriod, formatMonthLabel, monthlyChartPoints } from '@/utils/healthImportDisplay';

// O backend só manda os meses que têm dado. Desenhado por índice, o array
// cru ligava os meses dos dois lados de uma pausa numa reta — interpolação,
// que a regra 2 da constituição proíbe.

describe('monthlyChartPoints', () => {
  it('fills the months with no data with null, so the chart breaks the line there', () => {
    expect(
      monthlyChartPoints([
        { month: '2020-02', mean: 8000 },
        { month: '2020-05', mean: 9000 },
      ]),
    ).toEqual([
      { dateKey: '2020-02-01', value: 8000 },
      { dateKey: '2020-03-01', value: null },
      { dateKey: '2020-04-01', value: null },
      { dateKey: '2020-05-01', value: 9000 },
    ]);
  });

  it('crosses the turn of the year', () => {
    const points = monthlyChartPoints([
      { month: '2018-11', mean: 1 },
      { month: '2019-02', mean: 2 },
    ]);
    expect(points.map((point) => point.dateKey)).toEqual(['2018-11-01', '2018-12-01', '2019-01-01', '2019-02-01']);
  });

  it('returns nothing for an empty series', () => {
    expect(monthlyChartPoints([])).toEqual([]);
  });
});

describe('formatMonthLabel', () => {
  it('labels a monthly point by month and year — "01/07" said neither', () => {
    expect(formatMonthLabel('2018-11-01')).toBe('11/2018');
    expect(formatMonthLabel(undefined)).toBe('');
  });
});

describe('formatImportPeriod', () => {
  it('formats both ends as DD/MM/AAAA', () => {
    expect(formatImportPeriod('2018-11-25', '2026-09-08')).toBe('25/11/2018 a 08/09/2026');
    expect(formatImportPeriod(null, '2026-09-08')).toBe('');
  });
});

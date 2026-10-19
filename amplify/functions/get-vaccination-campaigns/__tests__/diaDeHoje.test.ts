import { diaDeHoje } from '../diaDeHoje';

describe('diaDeHoje', () => {
  it('as 23h30 em Brasilia ainda e o mesmo dia (no UTC ja seria o seguinte)', () => {
    expect(diaDeHoje(new Date('2026-10-19T02:30:00Z'))).toBe('2026-10-18');
  });

  it('as 21h em Brasilia (00h UTC) continua no dia de Brasilia', () => {
    expect(diaDeHoje(new Date('2026-10-19T00:00:00Z'))).toBe('2026-10-18');
  });

  it('a partir da meia-noite em Brasilia vira o dia', () => {
    expect(diaDeHoje(new Date('2026-10-19T03:00:00Z'))).toBe('2026-10-19');
  });

  it('no meio da manha e o mesmo dia nos dois fusos', () => {
    expect(diaDeHoje(new Date('2026-10-19T13:00:00Z'))).toBe('2026-10-19');
  });

  it('cruza o ano certo na virada', () => {
    expect(diaDeHoje(new Date('2027-01-01T02:00:00Z'))).toBe('2026-12-31');
  });
});

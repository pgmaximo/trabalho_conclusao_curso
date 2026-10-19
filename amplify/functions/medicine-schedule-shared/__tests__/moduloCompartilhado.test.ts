/**
 * Resumo do arquivo:
 * O que o modulo compartilhado de horarios (E3) promete e que o teste antigo de
 * `src/` nao cobre: que ele nao depende do app, que o app recebe dele os MESMOS
 * objetos -- e nao uma copia que pudesse divergir da do chat --, e que o dia da
 * semana nao depende do fuso do processo (a Lambda roda em UTC; o Jest, em
 * Brasilia).
 *
 * O teste antigo (`__tests__/medicine-schedule.test.ts`) ficou intocado, de
 * proposito: rodando pela reexportacao, ele prova a logica e a reexportacao de
 * uma vez so (CA-1).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  getMedicineDoseTimesForDate,
  horariosMarcadosNoCampoAntigo,
  isMedicineScheduledOnDate,
  LATE_DOSE_TOLERANCE_MINUTES,
  minutesFromTime,
  passouDaTolerancia,
  type RemedioComAgenda,
} from '../doseSchedule';

const FONTE = readFileSync(join(__dirname, '..', 'doseSchedule.ts'), 'utf8');

const remedio = (campos: Partial<RemedioComAgenda> = {}): RemedioComAgenda => ({
  active: true,
  startDate: '2026-09-01',
  frequencyType: 'SPECIFIC_DAYS',
  weekDays: ['MON'],
  times: ['08:00'],
  ...campos,
});

describe('o modulo compartilhado de horarios (E3)', () => {
  it('nao importa nada do app -- o alias @/ nem existe no empacotamento da Lambda', () => {
    expect(FONTE).not.toMatch(/from\s+['"](@\/|react|react-native)/);
  });

  it('o app reexporta os mesmos objetos, e nao uma copia', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const app = require('../../../../src/utils/medicineSchedule');
    expect(app.isMedicineScheduledOnDate).toBe(isMedicineScheduledOnDate);
    expect(app.getMedicineDoseTimesForDate).toBe(getMedicineDoseTimesForDate);
    expect(app.minutesFromTime).toBe(minutesFromTime);
    expect(app.LATE_DOSE_TOLERANCE_MINUTES).toBe(LATE_DOSE_TOLERANCE_MINUTES);
    // Desde o /simplify do E3, tambem o atraso e o campo antigo: a tela e o
    // chat decidem "sem marcação" e "marcado hoje" pela mesma funcao.
    expect(app.passouDaTolerancia).toBe(passouDaTolerancia);
    expect(app.horariosMarcadosNoCampoAntigo).toBe(horariosMarcadosNoCampoAntigo);
  });

  it('horario repetido no cadastro vira um so, na tela e no chat', () => {
    expect(getMedicineDoseTimesForDate(remedio({ frequencyType: 'DAILY', times: ['08:00', '08:00'] }), '2026-09-07')).toEqual([
      '08:00',
    ]);
  });

  it('o dia da semana e calculado em UTC, sem depender do fuso do processo (CA-2)', () => {
    expect(FONTE).not.toMatch(/\.getDay\(/);
    expect(FONTE).toMatch(/\.getUTCDay\(/);
  });

  it('segunda e domingo caem no dia certo', () => {
    expect(isMedicineScheduledOnDate(remedio(), '2026-09-07')).toBe(true); // segunda
    expect(isMedicineScheduledOnDate(remedio(), '2026-09-06')).toBe(false); // domingo
    expect(isMedicineScheduledOnDate(remedio({ weekDays: ['SUN'] }), '2026-09-06')).toBe(true);
    expect(isMedicineScheduledOnDate(remedio({ weekDays: ['SUN'] }), '2026-09-07')).toBe(false);
  });

  it('aceita a linha crua do banco: weekDays nulo e endDate ausente nao lancam', () => {
    const cru = remedio({ weekDays: null, endDate: undefined });
    expect(getMedicineDoseTimesForDate(cru, '2026-09-07')).toEqual([]);
    expect(getMedicineDoseTimesForDate({ ...cru, frequencyType: 'DAILY' }, '2026-09-07')).toEqual(['08:00']);
  });
});

/**
 * Menor adiado da revisao do E3: "8:00" (hora com um digito) era lido como
 * ilegivel -- na tela, a dose nunca ficava atrasada; no chat, ficava "pendente"
 * o dia inteiro. O formulario grava hh:mm, mas um registro antigo pode ter a
 * hora sem o zero.
 */
describe('minutesFromTime e passouDaTolerancia', () => {
  it('le a hora com um digito', () => {
    expect(minutesFromTime('8:00')).toBe(480);
    expect(minutesFromTime('08:00')).toBe(480);
    expect(minutesFromTime('23:59')).toBe(1439);
  });

  it.each(['lixo', '24:00', '8:60', '123:00', ''])('recusa "%s"', (horario) => {
    expect(minutesFromTime(horario)).toBeNull();
  });

  it('a dose de "8:00" passa da tolerancia como a de "08:00"', () => {
    expect(passouDaTolerancia('8:00', 9 * 60 + 1)).toBe(true);
    expect(passouDaTolerancia('8:00', 9 * 60)).toBe(false);
    expect(passouDaTolerancia('lixo', 23 * 60)).toBe(false);
  });
});

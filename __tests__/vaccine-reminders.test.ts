import { buildVaccineReminderPlans } from '../src/services/vaccineReminderService';

describe('buildVaccineReminderPlans', () => {
  it('inclui os dois lembretes (D-14 e D-0) quando a data devida está longe no futuro', () => {
    const plans = buildVaccineReminderPlans('2026-12-01', '2026-01-01');
    expect(plans).toEqual([
      { label: 'antecipado', fireDate: '2026-11-17' },
      { label: 'no_dia', fireDate: '2026-12-01' },
    ]);
  });

  it('inclui apenas o lembrete do dia quando faltam menos de 14 dias', () => {
    const plans = buildVaccineReminderPlans('2026-01-10', '2026-01-05');
    expect(plans).toEqual([{ label: 'no_dia', fireDate: '2026-01-10' }]);
  });

  it('não inclui nenhum lembrete para uma data devida já no passado', () => {
    const plans = buildVaccineReminderPlans('2026-01-01', '2026-06-01');
    expect(plans).toEqual([]);
  });

  it('inclui o lembrete do dia quando a data devida é hoje', () => {
    const plans = buildVaccineReminderPlans('2026-06-01', '2026-06-01');
    expect(plans).toEqual([{ label: 'no_dia', fireDate: '2026-06-01' }]);
  });

  it('retorna vazio para uma data inválida', () => {
    expect(buildVaccineReminderPlans('', '2026-01-01')).toEqual([]);
  });
});

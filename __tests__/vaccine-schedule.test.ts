import {
  addDaysToDate,
  addMonthsToDate,
  addYearsToDate,
  ageInMonths,
  deriveDueVaccinesForAge,
  deriveNextDose,
  derivePendingSeries,
} from '../src/services/vaccineScheduleService';
import { findVacinaCatalogo, CALENDARIO_NACIONAL_VACINACAO } from '../src/data/calendarioNacionalVacinacao';

describe('date helpers', () => {
  it('adds days across month boundaries', () => {
    expect(addDaysToDate('2026-01-28', 5)).toBe('2026-02-02');
  });

  it('adds months preserving day-of-month when possible', () => {
    expect(addMonthsToDate('2026-01-15', 2)).toBe('2026-03-15');
  });

  it('adds years', () => {
    expect(addYearsToDate('2016-06-01', 10)).toBe('2026-06-01');
  });

  it('computes full months of age, not rounding up before the birthday-equivalent day', () => {
    // Nascido em 15/03/2026, em 14/06/2026 ainda não completou 3 meses.
    expect(ageInMonths('2026-03-15', '2026-06-14')).toBe(2);
    expect(ageInMonths('2026-03-15', '2026-06-15')).toBe(3);
  });
});

describe('deriveNextDose — série de N doses (Hepatite B)', () => {
  const hepatiteB = findVacinaCatalogo('hepatite-b')!;

  it('recomenda a 1ª dose ao nascer quando nenhuma foi aplicada', () => {
    const next = deriveNextDose(hepatiteB, [], '2026-01-01', '2026-01-01');
    expect(next).toEqual({ ordem: 1, rotulo: '1ª dose', dueDate: '2026-01-01' });
  });

  it('recomenda a 2ª dose respeitando o intervalo mínimo da 1ª dose aplicada', () => {
    const next = deriveNextDose(
      hepatiteB,
      [{ ordem: 1, appliedDate: '2026-01-01' }],
      '2026-01-01',
      '2026-01-01',
    );
    // intervaloMinimoDiasDaAnterior da 2ª dose = 30
    expect(next).toEqual({ ordem: 2, rotulo: '2ª dose', dueDate: '2026-01-31' });
  });

  it('retorna null quando a série de 3 doses está completa e não há reforço', () => {
    const next = deriveNextDose(
      hepatiteB,
      [
        { ordem: 1, appliedDate: '2026-01-01' },
        { ordem: 2, appliedDate: '2026-01-31' },
        { ordem: 3, appliedDate: '2026-06-01' },
      ],
      '2026-01-01',
      '2026-07-01',
    );
    expect(next).toBeNull();
  });
});

describe('deriveNextDose — reforço decenal (dT)', () => {
  const dt = findVacinaCatalogo('dt')!;

  it('recomenda reforço 10 anos após a última dose da série', () => {
    const next = deriveNextDose(
      dt,
      [
        { ordem: 1, appliedDate: '2016-01-01' },
        { ordem: 2, appliedDate: '2016-03-01' },
        { ordem: 3, appliedDate: '2016-05-01' },
      ],
      undefined,
      '2026-01-01',
    );
    expect(next).toEqual({ ordem: 4, rotulo: 'Reforço', dueDate: '2026-05-01' });
  });
});

describe('deriveNextDose — dose anual (Influenza)', () => {
  const influenza = findVacinaCatalogo('influenza')!;

  it('está devida quando nunca foi tomada', () => {
    const next = deriveNextDose(influenza, [], undefined, '2026-06-01');
    expect(next).toEqual({ ordem: 1, rotulo: 'Dose anual', dueDate: '2026-06-01' });
  });

  it('não está devida dentro de ~11 meses da última dose', () => {
    const next = deriveNextDose(influenza, [{ ordem: 1, appliedDate: '2026-04-01' }], undefined, '2026-09-01');
    expect(next).toBeNull();
  });

  it('volta a ficar devida após ~1 ano da última dose', () => {
    const next = deriveNextDose(influenza, [{ ordem: 1, appliedDate: '2025-04-01' }], undefined, '2026-06-01');
    expect(next).not.toBeNull();
  });
});

describe('deriveNextDose — corte por faixa etária', () => {
  it('retorna null quando o usuário passou da idade máxima e não há reforço', () => {
    const rotavirus = findVacinaCatalogo('rotavirus')!; // idadeMaxMeses: 8
    const next = deriveNextDose(rotavirus, [], '2020-01-01', '2026-01-01');
    expect(next).toBeNull();
  });
});

describe('derivePendingSeries — cascata ao registrar a 1ª dose', () => {
  it('gera as doses 2 e 3 pendentes de uma série de 3, encadeando as datas', () => {
    const hepatiteB = findVacinaCatalogo('hepatite-b')!;
    const pending = derivePendingSeries(hepatiteB, { ordem: 1, appliedDate: '2026-01-01' });

    expect(pending).toHaveLength(2);
    expect(pending[0]).toEqual({ ordem: 2, rotulo: '2ª dose', dueDate: '2026-01-31' });
    expect(pending[1].ordem).toBe(3);
    // 3ª dose: 150 dias após a data devida da 2ª dose (encadeamento best-effort)
    expect(pending[1].dueDate).toBe('2026-06-30');
  });

  it('não gera nada quando a dose aplicada já é a última da série', () => {
    const bcg = findVacinaCatalogo('bcg')!; // dose única
    const pending = derivePendingSeries(bcg, { ordem: 1, appliedDate: '2026-01-01' });
    expect(pending).toHaveLength(0);
  });
});

describe('deriveDueVaccinesForAge', () => {
  it('inclui HPV para um adolescente de 10 anos e exclui BCG', () => {
    const due = deriveDueVaccinesForAge(CALENDARIO_NACIONAL_VACINACAO, '2016-01-01', '2026-01-01');
    const ids = due.map((v) => v.catalogoId);
    expect(ids).toContain('hpv4');
    expect(ids).not.toContain('bcg'); // idadeMaxMeses: 60
  });

  it('nunca inclui o id "outras" na lista sugerida', () => {
    const due = deriveDueVaccinesForAge(CALENDARIO_NACIONAL_VACINACAO, '1996-01-01', '2026-01-01');
    expect(due.map((v) => v.catalogoId)).not.toContain('outras');
  });
});

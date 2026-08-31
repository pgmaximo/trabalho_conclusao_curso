import { deriveVaccinationLists } from '@/hooks/useVaccinationData';
import type { VaccineDoseRecord } from '@/services/vaccinationService';

jest.mock('@/services/vaccinationService', () => ({
  listVaccineDosesForUser: jest.fn(),
}));

jest.mock('@/config/vaccinationCampaigns', () => ({
  getActiveVaccinationCampaign: jest.fn(() => null),
}));

const TODAY = '2026-08-21';

describe('deriveVaccinationLists', () => {
  it('marks a dose without appliedDate as "pendente" while still inside its due window', () => {
    const records: VaccineDoseRecord[] = [
      { id: '1', name: 'Influenza (gripe)', dueDate: '2026-09-30', isCampaign: true },
    ];

    const { upcoming, history } = deriveVaccinationLists(records, TODAY);

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].status).toBe('pendente');
    expect(upcoming[0].description).toBe('Dose anual · campanha até 30/09/2026');
    expect(history).toHaveLength(0);
  });

  it('marks a dose without appliedDate as "atrasada" once its dueDate has passed', () => {
    const records: VaccineDoseRecord[] = [
      { id: '2', name: 'Dupla adulto (dT)', dueDate: '2020-01-01', recommendedIntervalYears: 10 },
    ];

    const { upcoming } = deriveVaccinationLists(records, TODAY);

    expect(upcoming[0].status).toBe('atrasada');
    expect(upcoming[0].description).toBe('Reforço a cada 10 anos');
  });

  it('never marks a dose as "aplicada" unless appliedDate is genuinely present', () => {
    const records: VaccineDoseRecord[] = [
      { id: '3', name: 'Sem data nenhuma', dueDate: null },
    ];

    const { upcoming } = deriveVaccinationLists(records, TODAY);

    expect(upcoming[0].status).toBe('pendente');
  });

  it('moves a dose with appliedDate to history as "aplicada", regardless of dueDate', () => {
    const records: VaccineDoseRecord[] = [
      {
        id: '4',
        name: 'Hepatite B',
        doseNumber: 3,
        appliedDate: '2025-03-14',
        location: 'UBS Jardim América',
        dueDate: '2020-01-01', // dueDate no passado não deve importar quando já aplicada
      },
    ];

    const { upcoming, history } = deriveVaccinationLists(records, TODAY);

    expect(upcoming).toHaveLength(0);
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('aplicada');
    expect(history[0].description).toBe('Hepatite B · 3ª dose');
  });

  it('orders upcoming by dueDate ascending and history by appliedDate descending', () => {
    const records: VaccineDoseRecord[] = [
      { id: 'later', name: 'B', dueDate: '2026-12-01' },
      { id: 'sooner', name: 'A', dueDate: '2026-09-01' },
      { id: 'older-dose', name: 'Old', appliedDate: '2024-01-01' },
      { id: 'newer-dose', name: 'New', appliedDate: '2026-01-01' },
    ];

    const { upcoming, history } = deriveVaccinationLists(records, TODAY);

    expect(upcoming.map((item) => item.id)).toEqual(['sooner', 'later']);
    expect(history.map((item) => item.id)).toEqual(['newer-dose', 'older-dose']);
  });
});

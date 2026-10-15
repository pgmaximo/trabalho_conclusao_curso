const mockUpdate = jest.fn();
const mockList = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({
    models: {
      VaccineDose: {
        update: (...args: unknown[]) => mockUpdate(...args),
        list: (...args: unknown[]) => mockList(...args),
      },
    },
  })),
}));

jest.mock('@/hooks/vaccinationCache', () => ({
  invalidateVaccinationCache: jest.fn(),
}));

const mockSyncVaccineReminder = jest.fn();
const mockRemoveVaccineReminder = jest.fn();

jest.mock('@/services/vaccineReminderService', () => ({
  syncVaccineReminder: (...args: unknown[]) => mockSyncVaccineReminder(...args),
  removeVaccineReminder: (...args: unknown[]) => mockRemoveVaccineReminder(...args),
}));

import { markDoseApplied } from '@/services/vaccinationService';
import type { VaccineDoseRecord } from '@/services/vaccinationService';

function record(overrides: Partial<VaccineDoseRecord> & { id: string }): VaccineDoseRecord {
  return { name: 'Hepatite B', ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue({ data: record({ id: 'updated' }), errors: undefined });
});

describe('markDoseApplied', () => {
  it('rejects an appliedDate in the future without calling update', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await expect(markDoseApplied({ id: 'dose-1', appliedDate: tomorrow })).rejects.toThrow(
      'A data de aplicação não pode estar no futuro.',
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates the dose fields and removes its reminder when no catalogId is given', async () => {
    await markDoseApplied({
      id: 'dose-1',
      appliedDate: '2026-01-01',
      location: 'UBS Centro',
      lot: 'L1',
      manufacturer: 'Fiocruz',
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dose-1',
        appliedDate: '2026-01-01',
        location: 'UBS Centro',
        lot: 'L1',
        manufacturer: 'Fiocruz',
      }),
    );
    expect(mockRemoveVaccineReminder).toHaveBeenCalledWith('dose-1');
    expect(mockList).not.toHaveBeenCalled(); // sem catalogId, não há série para recalcular
  });

  it('recalculates and updates the dueDate + reminder of the next pending dose in the same series', async () => {
    mockList.mockResolvedValue({
      data: [
        record({ id: 'dose-1', catalogId: 'hepatite-b', doseNumber: 1, appliedDate: '2026-01-01' }),
        record({ id: 'dose-2', catalogId: 'hepatite-b', doseNumber: 2, appliedDate: null, dueDate: '2026-02-15' }),
        record({ id: 'dose-3', catalogId: 'hepatite-b', doseNumber: 3, appliedDate: null, dueDate: '2026-07-01' }),
      ],
      errors: undefined,
    });

    await markDoseApplied({
      id: 'dose-1',
      catalogId: 'hepatite-b',
      ordem: 1,
      appliedDate: '2026-01-01',
    });

    // dose-2: intervaloMinimoDiasDaAnterior = 30 a partir de 2026-01-01
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'dose-2', dueDate: '2026-01-31' });
    expect(mockSyncVaccineReminder).toHaveBeenCalledWith({ id: 'dose-2', name: 'Hepatite B', dueDate: '2026-01-31' });

    // dose-3: encadeada 150 dias após a data recalculada da dose-2
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'dose-3', dueDate: '2026-06-30' });
    expect(mockSyncVaccineReminder).toHaveBeenCalledWith({ id: 'dose-3', name: 'Hepatite B', dueDate: '2026-06-30' });
  });

  it('does not fail when a recalculated dose in the series was never created', async () => {
    mockList.mockResolvedValue({
      data: [record({ id: 'dose-1', catalogId: 'hepatite-b', doseNumber: 1, appliedDate: '2026-01-01' })],
      errors: undefined,
    });

    await expect(
      markDoseApplied({ id: 'dose-1', catalogId: 'hepatite-b', ordem: 1, appliedDate: '2026-01-01' }),
    ).resolves.toBeUndefined();

    // Nenhum registro pendente encontrado para as próximas doses — nada além
    // da dose marcada deve ser atualizado.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('does nothing beyond the base update for a single-dose vaccine (no series)', async () => {
    await markDoseApplied({ id: 'dose-1', catalogId: 'bcg', ordem: 1, appliedDate: '2026-01-01' });

    expect(mockList).not.toHaveBeenCalled();
    expect(mockSyncVaccineReminder).not.toHaveBeenCalled();
  });
});

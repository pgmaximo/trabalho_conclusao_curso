jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({})),
}));

import { validateMedicineReminder, type MedicineInput } from '@/services/medicineService';

function baseInput(overrides: Partial<MedicineInput> = {}): MedicineInput {
  return {
    name: 'Dipirona',
    dosage: '500mg',
    form: 'PILL',
    times: ['08:00'],
    frequencyType: 'DAILY',
    weekDays: [],
    intervalHours: undefined,
    startDate: '2026-08-21',
    endDate: null,
    currentStock: 10,
    initialStock: 10,
    unit: 'COMP',
    ...overrides,
  };
}

describe('validateMedicineReminder', () => {
  it('accepts well-formed HH:MM dose times', () => {
    const errors = validateMedicineReminder(baseInput({ times: ['08:00', '23:59', '00:00'] }));
    expect(errors).toEqual([]);
  });

  it('rejects a malformed dose time (partial input like "8")', () => {
    const errors = validateMedicineReminder(baseInput({ times: ['8'] }));
    expect(errors).toContainEqual({ field: 'times', message: 'Informe os horários de dose no formato hh:mm.' });
  });

  it('rejects a malformed dose time (incomplete minutes like "08:0")', () => {
    const errors = validateMedicineReminder(baseInput({ times: ['08:0'] }));
    expect(errors).toContainEqual({ field: 'times', message: 'Informe os horários de dose no formato hh:mm.' });
  });

  it('rejects an out-of-range hour or minute', () => {
    expect(validateMedicineReminder(baseInput({ times: ['24:00'] }))).toContainEqual({
      field: 'times',
      message: 'Informe os horários de dose no formato hh:mm.',
    });
    expect(validateMedicineReminder(baseInput({ times: ['08:60'] }))).toContainEqual({
      field: 'times',
      message: 'Informe os horários de dose no formato hh:mm.',
    });
  });
});

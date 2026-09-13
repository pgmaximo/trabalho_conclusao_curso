jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));

import type { MedicineRecord } from '@/services/medicineService';
import { validateMedicineReminder } from '@/services/medicineService';
import { getMedicineDoseTimesForDate } from '@/utils/medicineSchedule';

function medicine(overrides: Partial<MedicineRecord> = {}): MedicineRecord {
  return {
    id: 'med-1', name: 'Dipirona', dosage: '500mg', form: 'PILL', times: ['08:00'],
    frequencyType: 'DAILY', weekDays: [], startDate: '2026-09-01', endDate: null,
    currentStock: 10, initialStock: 10, unit: 'COMP', active: true, ...overrides,
  };
}

describe('medicine schedule', () => {
  it('does not expose doses before the start or after the end date', () => {
    const record = medicine({ endDate: '2026-09-03' });
    expect(getMedicineDoseTimesForDate(record, '2026-08-31')).toEqual([]);
    expect(getMedicineDoseTimesForDate(record, '2026-09-04')).toEqual([]);
    expect(getMedicineDoseTimesForDate(record, '2026-09-03')).toEqual(['08:00']);
  });

  it('expands every-x-hours doses from the configured anchor time', () => {
    const record = medicine({ frequencyType: 'EVERY_X_HOURS', intervalHours: 8, times: ['06:00'] });
    expect(getMedicineDoseTimesForDate(record, '2026-09-01')).toEqual(['06:00', '14:00', '22:00']);
    expect(getMedicineDoseTimesForDate(record, '2026-09-02')).toEqual(['06:00', '14:00', '22:00']);
  });

  it('enforces selected weekdays', () => {
    const record = medicine({ frequencyType: 'SPECIFIC_DAYS', weekDays: ['MON'] });
    expect(getMedicineDoseTimesForDate(record, '2026-09-07')).toEqual(['08:00']);
    expect(getMedicineDoseTimesForDate(record, '2026-09-08')).toEqual([]);
  });
});

describe('medicine validation', () => {
  it('rejects a malformed date and an end date before the start date', () => {
    const invalidDate = medicine({ id: undefined as never, startDate: '2026-02-30' });
    expect(validateMedicineReminder(invalidDate)).toContainEqual(expect.objectContaining({ field: 'startDate' }));
    const inverted = medicine({ id: undefined as never, startDate: '2026-09-10', endDate: '2026-09-01' });
    expect(validateMedicineReminder(inverted)).toContainEqual(expect.objectContaining({ field: 'endDate' }));
  });
});

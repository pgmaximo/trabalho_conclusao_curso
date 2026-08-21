import {
  buildMedicineReminderPlans,
  parseTimeToHourMinute,
} from '@/services/medicineReminderService';

describe('parseTimeToHourMinute', () => {
  it('parses a valid HH:MM string', () => {
    expect(parseTimeToHourMinute('08:30')).toEqual({ hour: 8, minute: 30 });
  });

  it('rejects a string with an invalid hour', () => {
    expect(parseTimeToHourMinute('25:00')).toBeNull();
  });

  it('rejects a string that is not HH:MM', () => {
    expect(parseTimeToHourMinute('8:3')).toBeNull();
    expect(parseTimeToHourMinute('')).toBeNull();
  });
});

describe('buildMedicineReminderPlans', () => {
  it('builds one daily plan per valid dose time when frequencyType is DAILY', () => {
    const plans = buildMedicineReminderPlans({
      times: ['08:00', '20:00'],
      frequencyType: 'DAILY',
      weekDays: [],
      intervalHours: undefined,
    });

    expect(plans).toEqual([
      { type: 'daily', hour: 8, minute: 0 },
      { type: 'daily', hour: 20, minute: 0 },
    ]);
  });

  it('drops unparseable times instead of throwing', () => {
    const plans = buildMedicineReminderPlans({
      times: ['08:00', 'bad-time'],
      frequencyType: 'DAILY',
      weekDays: [],
      intervalHours: undefined,
    });

    expect(plans).toEqual([{ type: 'daily', hour: 8, minute: 0 }]);
  });

  it('builds one weekly plan per (weekday x time) combination when SPECIFIC_DAYS', () => {
    const plans = buildMedicineReminderPlans({
      times: ['09:00'],
      frequencyType: 'SPECIFIC_DAYS',
      weekDays: ['MON', 'WED'],
      intervalHours: undefined,
    });

    expect(plans).toEqual([
      { type: 'weekly', hour: 9, minute: 0, weekday: 2 },
      { type: 'weekly', hour: 9, minute: 0, weekday: 4 },
    ]);
  });

  it('builds a single repeating interval plan when EVERY_X_HOURS', () => {
    const plans = buildMedicineReminderPlans({
      times: ['08:00'],
      frequencyType: 'EVERY_X_HOURS',
      weekDays: [],
      intervalHours: 8,
    });

    expect(plans).toEqual([{ type: 'interval', seconds: 8 * 60 * 60 }]);
  });

  it('returns no plans for EVERY_X_HOURS without a positive intervalHours', () => {
    expect(
      buildMedicineReminderPlans({
        times: ['08:00'],
        frequencyType: 'EVERY_X_HOURS',
        weekDays: [],
        intervalHours: 0,
      }),
    ).toEqual([]);
  });

  it('returns no plans when frequencyType is missing', () => {
    expect(
      buildMedicineReminderPlans({
        times: ['08:00'],
        frequencyType: undefined,
        weekDays: [],
        intervalHours: undefined,
      }),
    ).toEqual([]);
  });
});

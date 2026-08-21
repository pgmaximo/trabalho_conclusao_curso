jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('@/services/reminderService', () => ({
  ensureNotificationPermission: jest.fn(() => Promise.resolve(true)),
}));

import * as Notifications from 'expo-notifications';
import { ensureNotificationPermission } from '@/services/reminderService';
import type { MedicineRecord } from '@/services/medicineService';
import {
  buildMedicineReminderPlans,
  parseTimeToHourMinute,
  syncMedicineReminders,
} from '@/services/medicineReminderService';

function baseMedicine(overrides: Partial<MedicineRecord> = {}): MedicineRecord {
  return {
    id: 'med-1',
    name: 'Dipirona',
    dosage: '500mg',
    form: 'PILL',
    times: ['08:00'],
    frequencyType: 'DAILY',
    weekDays: [],
    intervalHours: undefined,
    startDate: '2020-01-01',
    endDate: null,
    currentStock: 10,
    initialStock: 10,
    unit: 'COMP',
    active: true,
    ...overrides,
  };
}

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

describe('syncMedicineReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureNotificationPermission as jest.Mock).mockResolvedValue(true);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id');
  });

  it('schedules reminders for a medicine without an endDate', async () => {
    await syncMedicineReminders(baseMedicine({ endDate: null }));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('skips scheduling entirely when endDate is already in the past', async () => {
    await syncMedicineReminders(baseMedicine({ endDate: '2020-01-02' }));
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('still schedules reminders when endDate is in the future', async () => {
    await syncMedicineReminders(baseMedicine({ endDate: '2099-01-01' }));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});

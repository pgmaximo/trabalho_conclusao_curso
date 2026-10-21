jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('@/services/reminderService', () => ({
  ensureNotificationPermission: jest.fn(() => Promise.resolve(true)),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ensureNotificationPermission } from '@/services/reminderService';
import type { MedicineRecord } from '@/services/medicineService';
import {
  buildMedicineReminderPlans,
  parseTimeToHourMinute,
  removeAllMedicineReminders,
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

  it('still schedules reminders when endDate is today (local date, not UTC)', async () => {
    const now = new Date();
    const todayISO = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    await syncMedicineReminders(baseMedicine({ endDate: todayISO }));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('does not schedule a local reminder before a future treatment start date', async () => {
    await syncMedicineReminders(baseMedicine({ startDate: '2099-01-01' }));
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('reminders scheduled on the device (no duplicates)', () => {
  type FakeRequest = { identifier: string; content: { data?: Record<string, unknown> } };
  let scheduled: Map<string, FakeRequest>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (ensureNotificationPermission as jest.Mock).mockResolvedValue(true);

    scheduled = new Map();
    let nextId = 0;
    (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(async (request) => {
      const identifier = `notification-${++nextId}`;
      scheduled.set(identifier, { identifier, content: request.content });
      return identifier;
    });
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockImplementation(async (identifier: string) => {
      scheduled.delete(identifier);
    });
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockImplementation(async () => [
      ...scheduled.values(),
    ]);
  });

  function scheduledFor(medicineId: string): FakeRequest[] {
    return [...scheduled.values()].filter((request) => request.content.data?.medicineId === medicineId);
  }

  it('keeps one reminder per dose when the dashboard and Medicamentos sync at the same time', async () => {
    const medicines = [baseMedicine({ id: 'med-1' }), baseMedicine({ id: 'med-2' })];

    await Promise.all([
      ...medicines.map((medicine) => syncMedicineReminders(medicine)),
      ...medicines.map((medicine) => syncMedicineReminders(medicine)),
    ]);
    await Promise.all(medicines.map((medicine) => syncMedicineReminders(medicine)));

    expect(scheduledFor('med-1')).toHaveLength(1);
    expect(scheduledFor('med-2')).toHaveLength(1);
  });

  it('cancels orphan reminders the stored map no longer knows about', async () => {
    scheduled.set('orphan', { identifier: 'orphan', content: { data: { medicineId: 'med-1' } } });

    await syncMedicineReminders(baseMedicine({ id: 'med-1' }));

    expect(scheduled.has('orphan')).toBe(false);
    expect(scheduledFor('med-1')).toHaveLength(1);
  });

  it('removes orphan medicine reminders on logout, leaving other reminders alone', async () => {
    scheduled.set('orphan', { identifier: 'orphan', content: { data: { medicineId: 'med-1' } } });
    scheduled.set('vaccine', { identifier: 'vaccine', content: { data: { vaccineDoseId: 'dose-1' } } });

    await removeAllMedicineReminders();

    expect([...scheduled.keys()]).toEqual(['vaccine']);
  });
});

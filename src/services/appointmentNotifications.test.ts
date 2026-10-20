jest.mock('@/services/notificationsClient', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

import * as Notifications from '@/services/notificationsClient';
import { getReminderDateFromScheduledAt, scheduleAppointmentReminder } from './appointmentNotifications';

describe('appointmentNotifications', () => {
  it('schedules a reminder two hours before the appointment time', () => {
    const reminderDate = getReminderDateFromScheduledAt('2026-09-01T15:00');
    expect(reminderDate.getTime()).toBe(new Date('2026-09-01T13:00').getTime());
  });

  it('uses a date trigger so the reminder does not fire immediately', async () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await scheduleAppointmentReminder('appt-1', 'Consulta', nextWeek);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: {
          type: 'date',
          date: getReminderDateFromScheduledAt(nextWeek),
          channelId: 'appointments-reminders',
        },
      }),
    );
  });
});

import { getReminderDateFromScheduledAt } from './appointmentNotifications';

describe('appointmentNotifications', () => {
  it('schedules a reminder two hours before the appointment time', () => {
    const reminderDate = getReminderDateFromScheduledAt('2026-09-01T15:00');
    expect(reminderDate.getTime()).toBe(new Date('2026-09-01T13:00').getTime());
  });
});

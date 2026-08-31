import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const APPOINTMENT_NOTIFICATION_IDS_KEY = '@SuaSaude:appointmentNotificationIds';

export function getReminderDateFromScheduledAt(scheduledAt: string): Date {
  const date = new Date(scheduledAt);
  date.setHours(date.getHours() - 2);
  return date;
}

async function loadAppointmentNotificationIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(APPOINTMENT_NOTIFICATION_IDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function saveAppointmentNotificationId(appointmentId: string, notificationId: string): Promise<void> {
  const ids = await loadAppointmentNotificationIds();
  ids[appointmentId] = notificationId;
  await AsyncStorage.setItem(APPOINTMENT_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
}

export async function getStoredAppointmentNotificationId(appointmentId: string): Promise<string | undefined> {
  const ids = await loadAppointmentNotificationIds();
  return ids[appointmentId];
}

export async function removeAppointmentNotificationId(appointmentId: string): Promise<void> {
  const ids = await loadAppointmentNotificationIds();
  delete ids[appointmentId];
  await AsyncStorage.setItem(APPOINTMENT_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
}

export async function requestAppointmentNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();

  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function scheduleAppointmentReminder(
  appointmentId: string,
  title: string,
  scheduledAt: string,
): Promise<string | undefined> {
  const permissionGranted = await requestAppointmentNotificationPermission();
  if (!permissionGranted) {
    return undefined;
  }

  const reminderDate = getReminderDateFromScheduledAt(scheduledAt);
  const now = new Date();

  if (reminderDate <= now) {
    return undefined;
  }

  const existingNotificationId = await getStoredAppointmentNotificationId(appointmentId);
  if (existingNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(existingNotificationId);
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete de compromisso',
      body: `${title} começa em 2 horas.`,
      sound: true,
    },
    trigger: {
      date: reminderDate,
      channelId: 'appointments-reminders',
    },
  });

  await saveAppointmentNotificationId(appointmentId, notificationId);
  return notificationId;
}

export async function cancelAppointmentReminder(notificationId?: string): Promise<void> {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function restoreAppointmentReminders(
  appointments: Array<{ id: string; appointmentName: string; scheduledAt: string }>,
): Promise<void> {
  for (const appointment of appointments) {
    const existingNotificationId = await getStoredAppointmentNotificationId(appointment.id);
    if (existingNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(existingNotificationId);
    }

    const notificationId = await scheduleAppointmentReminder(appointment.id, appointment.appointmentName, appointment.scheduledAt);
    if (notificationId) {
      await saveAppointmentNotificationId(appointment.id, notificationId);
    }
  }
}

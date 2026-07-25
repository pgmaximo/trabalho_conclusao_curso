/**
 * Resumo do arquivo:
 * Gerencia lembretes locais (notificacoes no proprio aparelho) para recomendacoes
 * preventivas. Nao depende de backend/push — agenda via expo-notifications e
 * persiste o mapeamento recomendacao -> notificationId e a preferencia de
 * antecedencia localmente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const REMINDER_MAP_KEY = '@SuaSaude:preventionReminders';
const REMINDER_LEAD_DAYS_KEY = '@SuaSaude:reminderLeadDays';

export const DEFAULT_REMINDER_LEAD_DAYS = 7;
export const REMINDER_LEAD_DAYS_OPTIONS = [1, 3, 7, 14, 30] as const;

export type ReminderMap = Record<string, string>;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleRecommendationReminder(rec: {
  id: string;
  title: string;
}): Promise<string> {
  const leadDays = await loadReminderLeadDays();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete de prevenção',
      body: `Não esqueça de agendar: ${rec.title}`,
      data: { recommendationId: rec.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: leadDays * 24 * 60 * 60,
    },
  });
}

export async function cancelRecommendationReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function loadReminderMap(): Promise<ReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_MAP_KEY);
    return raw ? (JSON.parse(raw) as ReminderMap) : {};
  } catch (error) {
    console.error('Erro ao carregar lembretes:', error);
    return {};
  }
}

export async function saveReminderMap(map: ReminderMap): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Erro ao salvar lembretes:', error);
  }
}

export async function loadReminderLeadDays(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_LEAD_DAYS_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REMINDER_LEAD_DAYS;
  } catch (error) {
    console.error('Erro ao carregar preferência de lembrete:', error);
    return DEFAULT_REMINDER_LEAD_DAYS;
  }
}

export async function saveReminderLeadDays(days: number): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_LEAD_DAYS_KEY, String(days));
  } catch (error) {
    console.error('Erro ao salvar preferência de lembrete:', error);
  }
}

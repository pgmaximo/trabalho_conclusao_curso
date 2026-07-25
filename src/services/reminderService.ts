/**
 * Resumo do arquivo:
 * Gerencia lembretes locais (notificacoes no proprio aparelho) para recomendacoes
 * preventivas. Nao depende de backend/push — agenda via expo-notifications e
 * persiste o mapeamento recomendacao -> notificationId localmente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const REMINDER_MAP_KEY = '@SuaSaude:preventionReminders';
const REMINDER_LEAD_DAYS = 7;

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
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete de prevenção',
      body: `Não esqueça de agendar: ${rec.title}`,
      data: { recommendationId: rec.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REMINDER_LEAD_DAYS * 24 * 60 * 60,
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

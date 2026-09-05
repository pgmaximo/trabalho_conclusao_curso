/**
 * Resumo do arquivo:
 * Gerencia lembretes locais (notificacoes no proprio aparelho) para recomendacoes
 * preventivas. Nao depende de backend/push — agenda via expo-notifications,
 * repetindo automaticamente no intervalo configurado para o grau da recomendacao,
 * e persiste tudo (mapeamento + preferencias) localmente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import type { UspstfGrade } from '@/types/models';

const REMINDER_MAP_KEY = '@SuaSaude:preventionReminders';
const REMINDER_INTERVALS_KEY = '@SuaSaude:reminderIntervalsByGrade';

// Dias, meses e anos convertidos em dias — cobre desde reforcos curtos ate
// reavaliacoes anuais, adequado para lembretes recorrentes (nao apenas um aviso
// unico de curto prazo).
export const REMINDER_INTERVAL_OPTIONS = [7, 14, 30, 60, 90, 180, 365] as const;

// Graus mais fortemente recomendados (A/B) tendem a justificar reforcos mais
// frequentes; C/D/I usam um intervalo mais longo por padrao. O usuario pode
// ajustar cada um livremente na tela de Perfil.
export const DEFAULT_REMINDER_INTERVALS_BY_GRADE: Record<UspstfGrade, number> = {
  A: 30,
  B: 60,
  C: 90,
  D: 180,
  I: 90,
};

export type ReminderMap = Record<string, string>;
export type ReminderIntervalsByGrade = Record<UspstfGrade, number>;

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
  grade: UspstfGrade;
}): Promise<string> {
  const intervals = await loadReminderIntervalsByGrade();
  const days = intervals[rec.grade] ?? DEFAULT_REMINDER_INTERVALS_BY_GRADE[rec.grade];

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete de prevenção',
      body: `Não esqueça de agendar: ${rec.title}`,
      data: { recommendationId: rec.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: days * 24 * 60 * 60,
      // Repete automaticamente nesse intervalo em vez de disparar uma unica vez —
      // adequado para exames de rastreio periodico, nao so um aviso pontual.
      repeats: true,
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

export async function loadReminderIntervalsByGrade(): Promise<ReminderIntervalsByGrade> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_INTERVALS_KEY);
    if (!raw) {
      return { ...DEFAULT_REMINDER_INTERVALS_BY_GRADE };
    }

    const parsed = JSON.parse(raw) as Partial<ReminderIntervalsByGrade>;
    return { ...DEFAULT_REMINDER_INTERVALS_BY_GRADE, ...parsed };
  } catch (error) {
    console.error('Erro ao carregar preferências de lembrete:', error);
    return { ...DEFAULT_REMINDER_INTERVALS_BY_GRADE };
  }
}

/**
 * Salva o intervalo de um grau especifico. So afeta lembretes agendados a
 * partir de agora — nao reagenda lembretes ja ativos (eles mantem o intervalo
 * com que foram criados ate serem desligados e ligados novamente).
 */
export async function saveReminderIntervalForGrade(
  grade: UspstfGrade,
  days: number,
): Promise<void> {
  try {
    const current = await loadReminderIntervalsByGrade();
    const updated = { ...current, [grade]: days };
    await AsyncStorage.setItem(REMINDER_INTERVALS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Erro ao salvar preferência de lembrete:', error);
  }
}

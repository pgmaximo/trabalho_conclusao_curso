/**
 * Resumo do arquivo:
 * Gerencia lembretes locais reais (expo-notifications) para as doses de
 * medicamento cadastradas em Medicamentos (3d/3f/3g). Segue o mesmo padrão já
 * usado por src/services/reminderService.ts (Prevenção, 3e) — reaproveita
 * ensureNotificationPermission de lá em vez de duplicar — mas com trigger
 * próprio: aqui o horário real de cada dose importa (DAILY/WEEKLY calendar
 * trigger), não um intervalo de dias fixo. Nunca simula sucesso: se a
 * permissão for negada, o medicamento continua salvo, só o lembrete não é
 * criado. Ver specs/design/GAP_ANALYSIS.md item 22.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from '@/services/notificationsClient';
import { Platform } from 'react-native';

import { ensureNotificationPermission } from '@/services/reminderService';
import type { MedicineRecord } from '@/services/medicineService';
import { isServerMedicineRemindersEnabled } from '@/services/medicineReminderConfig';

const MEDICINE_REMINDER_MAP_KEY = '@SuaSaude:medicineReminders';

// Weekday do expo-notifications: 1 = domingo ... 7 = sabado (mesma convencao de
// Date.getDay(), documentada em WeeklyTriggerInput).
const WEEKDAY_TO_EXPO_WEEKDAY: Record<string, number> = {
  SUN: 1,
  MON: 2,
  TUE: 3,
  WED: 4,
  THU: 5,
  FRI: 6,
  SAT: 7,
};

export type MedicineReminderMap = Record<string, string[]>;

export type MedicineNotificationPlan =
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; hour: number; minute: number; weekday: number }
  | { type: 'interval'; seconds: number };

type MedicineScheduleInput = {
  times: string[];
  frequencyType?: MedicineRecord['frequencyType'];
  weekDays: string[];
  intervalHours?: number;
};

export function parseTimeToHourMinute(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

/**
 * Traduz o formulario de Medicamentos (horarios + frequencia) em uma lista de
 * planos de notificacao. Funcao pura — nao chama expo-notifications — para
 * ser testavel sem mockar o modulo nativo.
 */
export function buildMedicineReminderPlans(
  medicine: MedicineScheduleInput,
): MedicineNotificationPlan[] {
  const validTimes = medicine.times
    .map(parseTimeToHourMinute)
    .filter((t): t is { hour: number; minute: number } => t !== null);

  if (medicine.frequencyType === 'EVERY_X_HOURS') {
    if (!medicine.intervalHours || medicine.intervalHours <= 0) {
      return [];
    }
    return [{ type: 'interval', seconds: medicine.intervalHours * 60 * 60 }];
  }

  if (medicine.frequencyType === 'SPECIFIC_DAYS') {
    const weekdays = (medicine.weekDays ?? [])
      .map((day) => WEEKDAY_TO_EXPO_WEEKDAY[day])
      .filter((weekday): weekday is number => weekday !== undefined);

    const plans: MedicineNotificationPlan[] = [];
    for (const weekday of weekdays) {
      for (const t of validTimes) {
        plans.push({ type: 'weekly', hour: t.hour, minute: t.minute, weekday });
      }
    }
    return plans;
  }

  if (medicine.frequencyType === 'DAILY') {
    return validTimes.map((t) => ({ type: 'daily', hour: t.hour, minute: t.minute }));
  }

  return [];
}

function toExpoTrigger(plan: MedicineNotificationPlan): Notifications.NotificationTriggerInput {
  if (plan.type === 'daily') {
    return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: plan.hour, minute: plan.minute };
  }
  if (plan.type === 'weekly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: plan.weekday,
      hour: plan.hour,
      minute: plan.minute,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: plan.seconds,
    repeats: true,
  };
}

async function scheduleMedicineReminders(medicine: MedicineRecord): Promise<string[]> {
  const plans = buildMedicineReminderPlans(medicine);
  const ids: string[] = [];

  for (const plan of plans) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora do medicamento',
        body: `${medicine.name} · ${medicine.dosage}`,
        data: { medicineId: medicine.id },
        ...(Platform.OS === 'android' ? { channelId: 'medicine-reminders' } : {}),
      },
      trigger: toExpoTrigger(plan),
    });
    ids.push(id);
  }

  return ids;
}

async function cancelMedicineReminders(notificationIds: string[]): Promise<void> {
  await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

// Fila que serializa toda leitura-modificacao-escrita do mapa. Sem ela, os
// syncs paralelos (Promise.all em useMedicinesData, montado no dashboard E em
// Medicamentos) liam o mesmo mapa, cada um salvava por cima do outro, e os ids
// perdidos viravam lembretes diarios orfaos — duplicados no mesmo horario.
let reminderQueue: Promise<unknown> = Promise.resolve();

function withReminderLock<T>(task: () => Promise<T>): Promise<T> {
  const run = reminderQueue.then(task, task);
  reminderQueue = run.catch(() => undefined);
  return run;
}

/**
 * Ids agendados no aparelho com este medicineId (ou de qualquer medicamento,
 * sem argumento). Cobre os orfaos que o mapa ja perdeu — inclusive os criados
 * por builds antigos —, que de outra forma nunca seriam cancelados.
 */
async function findScheduledMedicineReminderIds(medicineId?: string): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .filter((request) => {
      const scheduledMedicineId = request.content.data?.medicineId;
      return medicineId === undefined ? typeof scheduledMedicineId === 'string' : scheduledMedicineId === medicineId;
    })
    .map((request) => request.identifier);
}

async function cancelAllRemindersFor(map: MedicineReminderMap, medicineId: string): Promise<void> {
  const staleIds = new Set([...(map[medicineId] ?? []), ...(await findScheduledMedicineReminderIds(medicineId))]);
  if (staleIds.size > 0) {
    await cancelMedicineReminders([...staleIds]);
  }
  delete map[medicineId];
}

export async function loadMedicineReminderMap(): Promise<MedicineReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(MEDICINE_REMINDER_MAP_KEY);
    return raw ? (JSON.parse(raw) as MedicineReminderMap) : {};
  } catch (error) {
    console.error('Erro ao carregar lembretes de medicamento:', error);
    return {};
  }
}

export async function saveMedicineReminderMap(map: MedicineReminderMap): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDICINE_REMINDER_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Erro ao salvar lembretes de medicamento:', error);
  }
}

/**
 * Cancela os lembretes agendados anteriormente para este medicamento (se
 * houver) e reagenda a partir do estado atual — chamar depois de criar ou
 * atualizar um medicamento. Se `active` for false, ou a permissao for
 * negada, nenhum lembrete novo e criado (nunca falha a operacao de
 * salvar o medicamento por causa disso — quem chama decide se propaga erro).
 */
function isEndDateInThePast(endDate: string | null | undefined): boolean {
  if (!endDate || !/^\d{4}-\d{2}-\d{2}/.test(endDate)) {
    return false;
  }
  // Compara strings YYYY-MM-DD diretamente (sem round-trip por Date/setHours):
  // Date() interpreta uma string "YYYY-MM-DD" como meia-noite UTC, e setHours()
  // trunca no fuso local — em fusos negativos (ex. Brasil, UTC-3) isso faz
  // endDate="hoje" virar "ontem", parando o lembrete um dia cedo demais.
  const todayLocal = new Date();
  const todayISO = [
    todayLocal.getFullYear(),
    String(todayLocal.getMonth() + 1).padStart(2, '0'),
    String(todayLocal.getDate()).padStart(2, '0'),
  ].join('-');

  return endDate.slice(0, 10) < todayISO;
}

function isStartDateInTheFuture(startDate: string): boolean {
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate > today;
}

export function syncMedicineReminders(medicine: MedicineRecord): Promise<void> {
  return withReminderLock(() => syncMedicineRemindersUnlocked(medicine));
}

async function syncMedicineRemindersUnlocked(medicine: MedicineRecord): Promise<void> {
  const map = await loadMedicineReminderMap();
  await cancelAllRemindersFor(map, medicine.id);

  // Curso de tratamento ja encerrado (endDate no passado): trata como inativo,
  // nao agenda nada novo. Nao implementa janela parcial/agendamento futuro —
  // apenas o corte quando a data final ja passou. Ver GAP_ANALYSIS.md item 22.
  if (isServerMedicineRemindersEnabled()) {
    // O backend passa a ser a fonte de entrega: o token e sincronizado, e os
    // agendamentos locais antigos são removidos para não duplicar alertas.
    if (medicine.active !== false && !isEndDateInThePast(medicine.endDate) && !isStartDateInTheFuture(medicine.startDate)) {
      const { registerMedicinePushDevice } = await import('@/services/medicinePushService');
      await registerMedicinePushDevice();
    }
  } else if (medicine.active !== false && !isEndDateInThePast(medicine.endDate) && !isStartDateInTheFuture(medicine.startDate)) {
    const granted = await ensureNotificationPermission();
    if (granted) {
      const newIds = await scheduleMedicineReminders(medicine);
      if (newIds.length > 0) {
        map[medicine.id] = newIds;
      }
    }
  }

  await saveMedicineReminderMap(map);
}

/** Cancela e remove os lembretes de um medicamento excluido. */
export function removeMedicineReminders(medicineId: string): Promise<void> {
  return withReminderLock(async () => {
    const map = await loadMedicineReminderMap();
    await cancelAllRemindersFor(map, medicineId);
    await saveMedicineReminderMap(map);
  });
}

/** Limpa lembretes locais da conta anterior no logout. */
export function removeAllMedicineReminders(): Promise<void> {
  return withReminderLock(async () => {
    const map = await loadMedicineReminderMap();
    const staleIds = new Set([...Object.values(map).flat(), ...(await findScheduledMedicineReminderIds())]);
    await cancelMedicineReminders([...staleIds]);
    await saveMedicineReminderMap({});
  });
}

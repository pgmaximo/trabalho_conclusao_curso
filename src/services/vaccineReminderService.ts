/**
 * Resumo do arquivo:
 * Lembretes locais reais (expo-notifications) para doses de vacina pendentes
 * — reaproveita `ensureNotificationPermission` de src/services/reminderService.ts
 * em vez de duplicar (mesmo padrão de medicineReminderService.ts), mas com
 * gatilho por DATA (não intervalo recorrente): um lembrete ~14 dias antes do
 * vencimento e um no próprio dia — padrão confirmado na pesquisa de UX de
 * carteiras de vacinação digitais (avisar antes do prazo, não só no dia).
 * Nunca falha o cadastro da dose por causa de lembrete: se a permissão for
 * negada, a dose continua salva, só o lembrete não é criado.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { ensureNotificationPermission } from '@/services/reminderService';

const VACCINE_REMINDER_MAP_KEY = '@SuaSaude:vaccineReminders';
const DAYS_BEFORE_DUE = 14;

export type VaccineReminderMap = Record<string, string[]>;

export type VaccineReminderPlan = {
  label: 'antecipado' | 'no_dia';
  fireDate: string; // YYYY-MM-DD
};

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Deriva as datas de lembrete (D-14 e D-0) a partir da data devida, mantendo
 * apenas as que ainda estão no futuro em relação a `hoje` — função pura para
 * ser testável sem mockar expo-notifications.
 */
export function buildVaccineReminderPlans(dueDate: string, hoje: string): VaccineReminderPlan[] {
  const due = parseIsoDate(dueDate);
  if (!due) return [];

  const antecipado = new Date(due);
  antecipado.setUTCDate(antecipado.getUTCDate() - DAYS_BEFORE_DUE);

  const plans: VaccineReminderPlan[] = [];
  const antecipadoIso = toIsoDate(antecipado);
  const dueIso = toIsoDate(due);

  if (antecipadoIso >= hoje) {
    plans.push({ label: 'antecipado', fireDate: antecipadoIso });
  }
  if (dueIso >= hoje && dueIso !== antecipadoIso) {
    plans.push({ label: 'no_dia', fireDate: dueIso });
  }

  return plans;
}

async function scheduleVaccineNotifications(
  doseId: string,
  vaccineName: string,
  plans: VaccineReminderPlan[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const plan of plans) {
    const fireDate = parseIsoDate(plan.fireDate);
    if (!fireDate) continue;

    // 9h da manhã, horário local do dispositivo — mesmo horário fixo usado
    // em outros lembretes de data única do app (não há preferência de
    // horário configurável para vacinação nesta fase).
    fireDate.setHours(9, 0, 0, 0);

    const body =
      plan.label === 'antecipado'
        ? `Faltam ${DAYS_BEFORE_DUE} dias para a próxima dose de ${vaccineName}.`
        : `Hoje é a data recomendada para a próxima dose de ${vaccineName}.`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Lembrete de vacinação',
        body,
        data: { vaccineDoseId: doseId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
    ids.push(id);
  }

  return ids;
}

async function cancelVaccineNotifications(notificationIds: string[]): Promise<void> {
  await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function loadVaccineReminderMap(): Promise<VaccineReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(VACCINE_REMINDER_MAP_KEY);
    return raw ? (JSON.parse(raw) as VaccineReminderMap) : {};
  } catch (error) {
    console.error('Erro ao carregar lembretes de vacina:', error);
    return {};
  }
}

export async function saveVaccineReminderMap(map: VaccineReminderMap): Promise<void> {
  try {
    await AsyncStorage.setItem(VACCINE_REMINDER_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Erro ao salvar lembretes de vacina:', error);
  }
}

/**
 * Cancela lembretes anteriores da dose (se houver) e agenda os novos a
 * partir de `dueDate`. Chamar após criar/atualizar uma dose pendente. Nunca
 * lança erro por falha de permissão — apenas não cria lembretes.
 */
export async function syncVaccineReminder(dose: { id: string; name: string; dueDate: string }): Promise<void> {
  const map = await loadVaccineReminderMap();
  const existingIds = map[dose.id] ?? [];

  if (existingIds.length > 0) {
    await cancelVaccineNotifications(existingIds);
    delete map[dose.id];
  }

  const hoje = toIsoDate(new Date());
  const plans = buildVaccineReminderPlans(dose.dueDate, hoje);

  if (plans.length > 0) {
    const granted = await ensureNotificationPermission();
    if (granted) {
      const newIds = await scheduleVaccineNotifications(dose.id, dose.name, plans);
      if (newIds.length > 0) {
        map[dose.id] = newIds;
      }
    }
  }

  await saveVaccineReminderMap(map);
}

/** Cancela e remove os lembretes de uma dose excluída ou já aplicada. */
export async function removeVaccineReminder(doseId: string): Promise<void> {
  const map = await loadVaccineReminderMap();
  const existingIds = map[doseId] ?? [];

  if (existingIds.length > 0) {
    await cancelVaccineNotifications(existingIds);
  }

  delete map[doseId];
  await saveVaccineReminderMap(map);
}

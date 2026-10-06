/**
 * Resumo do arquivo:
 * Fachada segura sobre expo-notifications. Importar 'expo-notifications' de
 * forma estática dispara, só de ser importado, um registro automático de
 * push token (DevicePushTokenAutoRegistration.fx.ts dentro do próprio
 * pacote) que LANÇA uma exceção no Android dentro do Expo Go — push
 * (remoto) foi removido do Expo Go a partir do SDK 53 do Expo, e o pacote
 * troca o antigo aviso por um `throw` nesse cenário (comportamento
 * documentado do pacote, não um bug deste app). Como `src/app/_layout.tsx`
 * importa 'expo-notifications' no escopo do módulo, isso derrubava o app
 * inteiro antes de qualquer tela renderizar.
 *
 * Este arquivo é o ÚNICO lugar do app que importa 'expo-notifications' de
 * verdade, e faz isso com `require` tardio (nunca `import` estático) atrás
 * de uma checagem de ambiente, para nunca disparar aquele import no
 * cenário perigoso. No Android dentro do Expo Go, os lembretes locais
 * viram no-op silencioso — o medicamento/compromisso/vacina continua
 * salvo normalmente, só o lembrete não é criado — igual ao app já se
 * comporta quando a permissão de notificação é negada. Em iOS Expo Go e em
 * qualquer build de desenvolvimento/produção (onde o módulo nativo existe
 * de verdade), tudo funciona normalmente.
 *
 * Os outros arquivos de lembrete (reminderService, appointmentNotifications,
 * medicineReminderService, vaccineReminderService, medicinePushService)
 * importam só DESTE módulo, nunca de 'expo-notifications' diretamente.
 */
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type * as NotificationsType from 'expo-notifications';

// Cada valor é convertido para o tipo nominal exato do enum real (via `as`)
// em vez de deixar inferir string/number literal: os tipos de trigger de
// expo-notifications (ex. `DailyTriggerInput.type`) exigem especificamente
// `SchedulableTriggerInputTypes.DAILY`, não a string `'daily'` solta.
export const SchedulableTriggerInputTypes = {
  CALENDAR: 'calendar' as NotificationsType.SchedulableTriggerInputTypes.CALENDAR,
  DAILY: 'daily' as NotificationsType.SchedulableTriggerInputTypes.DAILY,
  WEEKLY: 'weekly' as NotificationsType.SchedulableTriggerInputTypes.WEEKLY,
  MONTHLY: 'monthly' as NotificationsType.SchedulableTriggerInputTypes.MONTHLY,
  YEARLY: 'yearly' as NotificationsType.SchedulableTriggerInputTypes.YEARLY,
  DATE: 'date' as NotificationsType.SchedulableTriggerInputTypes.DATE,
  TIME_INTERVAL: 'timeInterval' as NotificationsType.SchedulableTriggerInputTypes.TIME_INTERVAL,
};

export const AndroidImportance = {
  UNKNOWN: 0 as NotificationsType.AndroidImportance.UNKNOWN,
  UNSPECIFIED: 1 as NotificationsType.AndroidImportance.UNSPECIFIED,
  NONE: 2 as NotificationsType.AndroidImportance.NONE,
  MIN: 3 as NotificationsType.AndroidImportance.MIN,
  LOW: 4 as NotificationsType.AndroidImportance.LOW,
  DEFAULT: 5 as NotificationsType.AndroidImportance.DEFAULT,
  HIGH: 6 as NotificationsType.AndroidImportance.HIGH,
};

export const IosAuthorizationStatus = {
  NOT_DETERMINED: 0 as NotificationsType.IosAuthorizationStatus.NOT_DETERMINED,
  DENIED: 1 as NotificationsType.IosAuthorizationStatus.DENIED,
  AUTHORIZED: 2 as NotificationsType.IosAuthorizationStatus.AUTHORIZED,
  PROVISIONAL: 3 as NotificationsType.IosAuthorizationStatus.PROVISIONAL,
  EPHEMERAL: 4 as NotificationsType.IosAuthorizationStatus.EPHEMERAL,
};

export type NotificationTriggerInput = NotificationsType.NotificationTriggerInput;

const UNAVAILABLE_PERMISSIONS: NotificationsType.NotificationPermissionsStatus = {
  status: 'denied' as NotificationsType.PermissionStatus.DENIED,
  expires: 'never',
  granted: false,
  canAskAgain: false,
};

// `isRunningInExpoGo()` já é a mesma checagem que o próprio expo-notifications
// usa internamente antes de lançar — replicada aqui para decidir SE o import
// tardio abaixo deve acontecer, em vez de descobrir depois de já ter lançado.
const isAndroidExpoGoUnavailable = Platform.OS === 'android' && isRunningInExpoGo();

let cachedModule: typeof NotificationsType | null | undefined;

function getNotifications(): typeof NotificationsType | null {
  if (isAndroidExpoGoUnavailable) {
    return null;
  }
  if (cachedModule === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- precisa ser `require` tardio, não `import` estático (ver comentário do arquivo).
    cachedModule = require('expo-notifications') as typeof NotificationsType;
  }
  return cachedModule;
}

/** Para UI que queira avisar explicitamente que lembretes não funcionam neste ambiente. */
export function isNotificationsAvailable(): boolean {
  return !isAndroidExpoGoUnavailable;
}

export function setNotificationHandler(handler: NotificationsType.NotificationHandler | null): void {
  getNotifications()?.setNotificationHandler(handler);
}

export async function setNotificationChannelAsync(
  channelId: string,
  channel: NotificationsType.NotificationChannelInput,
): Promise<NotificationsType.NotificationChannel | null> {
  const notifications = getNotifications();
  if (!notifications) {
    return null;
  }
  return notifications.setNotificationChannelAsync(channelId, channel);
}

export async function getPermissionsAsync(): Promise<NotificationsType.NotificationPermissionsStatus> {
  const notifications = getNotifications();
  if (!notifications) {
    return UNAVAILABLE_PERMISSIONS;
  }
  return notifications.getPermissionsAsync();
}

export async function requestPermissionsAsync(): Promise<NotificationsType.NotificationPermissionsStatus> {
  const notifications = getNotifications();
  if (!notifications) {
    return UNAVAILABLE_PERMISSIONS;
  }
  return notifications.requestPermissionsAsync();
}

export async function scheduleNotificationAsync(
  request: NotificationsType.NotificationRequestInput,
): Promise<string> {
  const notifications = getNotifications();
  if (!notifications) {
    // ID local só para manter o fluxo de salvar/cancelar por id intacto —
    // nenhuma notificação real é agendada, então cancelar este id depois
    // (também por aqui) é igualmente um no-op.
    return `unavailable-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return notifications.scheduleNotificationAsync(request);
}

export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) {
    return;
  }
  await notifications.cancelScheduledNotificationAsync(identifier);
}

export async function getExpoPushTokenAsync(
  options?: NotificationsType.ExpoPushTokenOptions,
): Promise<NotificationsType.ExpoPushToken> {
  const notifications = getNotifications();
  if (!notifications) {
    throw new Error(
      'Push notifications não estão disponíveis no Expo Go para Android (removido desde o SDK 53 do Expo). Use um development build.',
    );
  }
  return notifications.getExpoPushTokenAsync(options);
}

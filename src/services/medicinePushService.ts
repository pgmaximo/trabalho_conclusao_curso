import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { generateClient } from 'aws-amplify/data';

import type { Schema } from '../../amplify/data/resource';
import { ensureNotificationPermission } from '@/services/reminderService';
import { isServerMedicineRemindersEnabled } from '@/services/medicineReminderConfig';

const client = generateClient<Schema>();

type ExtraConfig = {
  eas?: { projectId?: string };
};

function getExtra(): ExtraConfig {
  return (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
}

/** Registra este aparelho no backend. Retorna um motivo utilizável pela UI,
 * pois lembretes nunca devem fazer o cadastro do medicamento falhar. */
export async function registerMedicinePushDevice(): Promise<{ registered: boolean; reason?: string }> {
  if (!isServerMedicineRemindersEnabled()) return { registered: false, reason: 'not-configured' };
  if (!Device.isDevice) return { registered: false, reason: 'physical-device-required' };
  const projectId = getExtra().eas?.projectId;
  if (!projectId) return { registered: false, reason: 'missing-project-id' };
  if (!(await ensureNotificationPermission())) return { registered: false, reason: 'permission-denied' };

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const id = expoPushToken;
  const { errors } = await client.models.MedicinePushDevice.update({
    id,
    expoPushToken,
    platform: Platform.OS,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    active: true,
  });
  // update pode retornar vazio quando o token ainda não existe.
  if (errors?.length) {
    const { errors: createErrors } = await client.models.MedicinePushDevice.create({
      id,
      expoPushToken,
      platform: Platform.OS,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      active: true,
    });
    if (createErrors?.length) throw new Error(createErrors.map((error) => error.message).filter(Boolean).join('; '));
  }
  return { registered: true };
}

/** Desativa o dispositivo no logout para que notificações não alcancem a próxima conta. */
export async function unregisterMedicinePushDevice(): Promise<void> {
  if (!isServerMedicineRemindersEnabled() || !Device.isDevice) return;
  const projectId = getExtra().eas?.projectId;
  if (!projectId) return;
  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await client.models.MedicinePushDevice.update({ id: expoPushToken, active: false });
}

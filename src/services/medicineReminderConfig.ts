import Constants from 'expo-constants';

type ExtraConfig = { medicineReminders?: { serverEnabled?: boolean } };

export function isServerMedicineRemindersEnabled(): boolean {
  return ((Constants.expoConfig?.extra ?? {}) as ExtraConfig).medicineReminders?.serverEnabled === true;
}

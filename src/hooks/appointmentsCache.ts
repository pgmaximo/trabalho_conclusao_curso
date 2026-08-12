import AsyncStorage from '@react-native-async-storage/async-storage';

const APPOINTMENTS_CACHE_KEY = '@SuaSaude:appointmentsCache';

let refetchCallbacks: Array<() => void> = [];

export function registerAppointmentsRefetchCallback(callback: () => void) {
  refetchCallbacks.push(callback);
  return () => {
    refetchCallbacks = refetchCallbacks.filter((cb) => cb !== callback);
  };
}

export async function invalidateAppointmentsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(APPOINTMENTS_CACHE_KEY);
    refetchCallbacks.forEach((callback) => callback());
  } catch (error) {
    console.error('Error invalidating appointments cache:', error);
  }
}

export async function loadCachedAppointments<T>(): Promise<T | null> {
  try {
    const cachedData = await AsyncStorage.getItem(APPOINTMENTS_CACHE_KEY);
    return cachedData ? (JSON.parse(cachedData) as T) : null;
  } catch (error) {
    console.warn('Failed to load cached appointments:', error);
    return null;
  }
}

export async function saveAppointmentsCache<T>(value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(APPOINTMENTS_CACHE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save appointments cache:', error);
  }
}

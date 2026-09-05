/**
 * Resumo do arquivo:
 * Cache local (AsyncStorage) do snapshot de vacinação — mesmo formato de
 * src/hooks/appointmentsCache.ts / medicinesCache.ts (register*RefetchCallback
 * / invalidate*Cache / loadCached* / save*Cache com pub/sub de invalidação).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const VACCINATION_CACHE_KEY = '@SuaSaude:vaccinationCache';

let refetchCallbacks: Array<() => void> = [];

export function registerVaccinationRefetchCallback(callback: () => void) {
  refetchCallbacks.push(callback);
  return () => {
    refetchCallbacks = refetchCallbacks.filter((cb) => cb !== callback);
  };
}

export async function invalidateVaccinationCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VACCINATION_CACHE_KEY);
    refetchCallbacks.forEach((callback) => callback());
  } catch (error) {
    console.error('Error invalidating vaccination cache:', error);
  }
}

export async function loadCachedVaccination<T>(): Promise<T | null> {
  try {
    const cachedData = await AsyncStorage.getItem(VACCINATION_CACHE_KEY);
    return cachedData ? (JSON.parse(cachedData) as T) : null;
  } catch (error) {
    console.warn('Failed to load cached vaccination data:', error);
    return null;
  }
}

export async function saveVaccinationCache<T>(value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(VACCINATION_CACHE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save vaccination cache:', error);
  }
}

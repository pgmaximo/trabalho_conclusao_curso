/**
 * Resumo do arquivo:
 * Cache local (AsyncStorage) da última importação de saúde pronta — mesmo
 * formato de src/hooks/vaccinationCache.ts (register*RefetchCallback /
 * invalidate*Cache / loadCached* / save*Cache com pub/sub de invalidação).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_IMPORT_CACHE_KEY = '@SuaSaude:healthImportCache';

let refetchCallbacks: Array<() => void> = [];

export function registerHealthImportRefetchCallback(callback: () => void) {
  refetchCallbacks.push(callback);
  return () => {
    refetchCallbacks = refetchCallbacks.filter((cb) => cb !== callback);
  };
}

export async function invalidateHealthImportCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HEALTH_IMPORT_CACHE_KEY);
    refetchCallbacks.forEach((callback) => callback());
  } catch (error) {
    console.error('Error invalidating health import cache:', error);
  }
}

export async function loadCachedHealthImport<T>(): Promise<T | null> {
  try {
    const cachedData = await AsyncStorage.getItem(HEALTH_IMPORT_CACHE_KEY);
    return cachedData ? (JSON.parse(cachedData) as T) : null;
  } catch (error) {
    console.warn('Failed to load cached health import data:', error);
    return null;
  }
}

export async function saveHealthImportCache<T>(value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(HEALTH_IMPORT_CACHE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save health import cache:', error);
  }
}

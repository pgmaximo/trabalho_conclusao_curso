import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDICINES_CACHE_KEY = '@SuaSaude:medicinesCache';
export const MEDICINES_CACHE_TTL_MS = 5 * 60 * 1000;

let refetchCallbacks: Array<() => void> = [];

export function registerMedicinesRefetchCallback(callback: () => void) {
  refetchCallbacks.push(callback);
  return () => {
    refetchCallbacks = refetchCallbacks.filter((cb) => cb !== callback);
  };
}

export async function invalidateMedicinesCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MEDICINES_CACHE_KEY);
    refetchCallbacks.forEach((callback) => callback());
  } catch (error) {
    console.error('Error invalidating medicines cache:', error);
  }
}

export async function loadCachedMedicines<T>(maxAgeMs = MEDICINES_CACHE_TTL_MS): Promise<T | null> {
  try {
    const cachedData = await AsyncStorage.getItem(MEDICINES_CACHE_KEY);
    if (!cachedData) return null;
    const parsed = JSON.parse(cachedData) as { savedAt?: number; value?: T };
    // Ignora o formato antigo sem data: ele poderia exibir informacao de outra
    // sessao para sempre. A proxima leitura recarrega o backend e o substitui.
    if (typeof parsed.savedAt !== 'number' || !('value' in parsed)) return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) return null;
    return parsed.value ?? null;
  } catch (error) {
    console.warn('Failed to load cached medicines:', error);
    return null;
  }
}

export async function saveMedicinesCache<T>(value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDICINES_CACHE_KEY, JSON.stringify({ value, savedAt: Date.now() }));
  } catch (error) {
    console.warn('Failed to save medicines cache:', error);
  }
}

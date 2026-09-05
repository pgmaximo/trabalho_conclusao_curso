import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDICINES_CACHE_KEY = '@SuaSaude:medicinesCache';

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

export async function loadCachedMedicines<T>(): Promise<T | null> {
  try {
    const cachedData = await AsyncStorage.getItem(MEDICINES_CACHE_KEY);
    return cachedData ? (JSON.parse(cachedData) as T) : null;
  } catch (error) {
    console.warn('Failed to load cached medicines:', error);
    return null;
  }
}

export async function saveMedicinesCache<T>(value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDICINES_CACHE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save medicines cache:', error);
  }
}

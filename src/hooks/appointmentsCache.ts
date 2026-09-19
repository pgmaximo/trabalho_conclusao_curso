import AsyncStorage from '@react-native-async-storage/async-storage';

import { getUserId } from '@/services/auth/userSessionService';

const APPOINTMENTS_CACHE_PREFIX = '@SuaSaude:appointmentsCache';
// 5 minutos: curto o bastante para uma alteracao feita em outro dispositivo
// aparecer antes de o usuario notar, longo o bastante para navegar entre telas
// sem refazer a consulta.
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEnvelope<T> = { savedAt: number; value: T };

let refetchCallbacks: Array<() => void> = [];

async function cacheKey(): Promise<string> {
  const userId = await getUserId();
  return `${APPOINTMENTS_CACHE_PREFIX}:${userId ?? 'anonimo'}`;
}

export function registerAppointmentsRefetchCallback(callback: () => void) {
  refetchCallbacks.push(callback);
  return () => {
    refetchCallbacks = refetchCallbacks.filter((cb) => cb !== callback);
  };
}

export async function invalidateAppointmentsCache(): Promise<void> {
  try {
    // Remove TODAS as chaves do prefixo, nao so a do usuario atual. No logout,
    // `logoutUser()` (src/services/auth/session.ts) apaga a sessao ANTES de
    // chamar esta funcao, e `getUserId()` lanca quando nao ha sessao — depender
    // dele aqui faria a invalidacao falhar em silencio justamente no momento em
    // que ela mais importa. Apagar tudo do prefixo e o que o logout quer de
    // qualquer forma.
    const todasAsChaves = await AsyncStorage.getAllKeys();
    const nossas = todasAsChaves.filter((chave) => chave.startsWith(APPOINTMENTS_CACHE_PREFIX));

    if (nossas.length > 0) {
      await AsyncStorage.multiRemove(nossas);
    }

    refetchCallbacks.forEach((callback) => callback());
  } catch (error) {
    console.error('Error invalidating appointments cache:', error);
  }
}

export async function loadCachedAppointments<T>(): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(await cacheKey());
    if (!raw) {
      return null;
    }

    const envelope = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    // Ignora o formato sem envelope (ou com envelope incompleto): sem
    // `savedAt` numerico, `Date.now() - undefined` e `NaN`, `NaN > CACHE_TTL_MS`
    // e `false`, e a expiracao nunca dispara — o cache viraria eterno. A
    // proxima leitura recarrega o backend e o substitui por um envelope valido.
    if (typeof envelope.savedAt !== 'number' || !('value' in envelope)) {
      return null;
    }
    if (Date.now() - envelope.savedAt > CACHE_TTL_MS) {
      return null;
    }

    return envelope.value as T;
  } catch (error) {
    console.warn('Failed to load cached appointments:', error);
    return null;
  }
}

export async function saveAppointmentsCache<T>(value: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), value };
    await AsyncStorage.setItem(await cacheKey(), JSON.stringify(envelope));
  } catch (error) {
    console.warn('Failed to save appointments cache:', error);
  }
}

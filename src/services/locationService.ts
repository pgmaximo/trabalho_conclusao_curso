/**
 * Resumo do arquivo:
 * Resolve a localização do usuário (UF + código IBGE do município) para
 * alimentar as campanhas regionais (getVaccinationCampaigns) e a busca de
 * unidades de saúde próximas (getVaccinationSites). Fluxo: permissão de
 * localização (expo-location) -> GPS -> geocodificação reversa -> normaliza
 * o nome do estado para sigla (src/data/estadosBrasileiros.ts) -> resolve o
 * código IBGE do município via API pública do Ministério da Saúde.
 *
 * Degradação obrigatória (nunca lança/derruba a tela): qualquer etapa que
 * falhar retorna `null`, e o chamador cai para nível nacional + seletor
 * manual de município — nunca crash, nunca dado fingido. Web e emulador sem
 * GPS também caem aqui.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { resolveUfSigla } from '@/data/estadosBrasileiros';

const LOCATION_CACHE_KEY = '@SuaSaude:userLocation';
const MUNICIPIO_API_URL = 'https://apidadosabertos.saude.gov.br/macrorregiao-e-regiao-de-saude/municipio';

// Teto de espera pela posição do GPS. Em ambientes com sinal fraco (indoor,
// prédios altos) `getCurrentPositionAsync` pode demorar muito ou, em alguns
// aparelhos Android, nunca resolver nem rejeitar — sem este teto, o botão
// "Buscando sua localização..." fica preso indefinidamente (bug relatado em
// teste real de dispositivo: a permissão foi concedida, mas a UI nunca saiu
// do estado de carregamento). `withTimeout` garante que a função sempre
// resolve, mesmo que a chamada nativa trave.
const LOCATION_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/**
 * `getCurrentPositionAsync` pedindo um fix novo de GPS é conhecida por travar
 * (nunca resolver nem rejeitar) em vários aparelhos Android mesmo com
 * permissão concedida e localização ativada — bug antigo e recorrente do
 * módulo nativo, não específico do Expo Go nem deste app (ver
 * github.com/expo/expo issues #39851, #33981, #26825, #26790). O workaround
 * documentado pela própria comunidade é tentar primeiro
 * `getLastKnownPositionAsync` (fix já em cache do SO, retorna quase
 * instantaneamente) e só cair para `getCurrentPositionAsync` — com o teto de
 * `withTimeout` acima — quando não houver nenhum fix em cache ainda (ex.:
 * primeiro uso do app no aparelho).
 */
async function resolvePosition(): Promise<Location.LocationObject | null> {
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({});
    if (lastKnown) {
      return lastKnown;
    }
  } catch (error) {
    console.warn('[locationService] getLastKnownPositionAsync falhou, tentando getCurrentPositionAsync:', error);
  }

  return withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    LOCATION_TIMEOUT_MS,
    null,
  );
}

export type UserLocation = {
  uf: string; // sigla, ex. "SP"
  municipioNome: string | null;
  codigoMunicipio: string | null; // código IBGE — pode ser null se a resolução falhar
  latitude: number;
  longitude: number;
};

export type MunicipioOption = {
  codigoMunicipio: string;
  municipio: string;
  uf: string;
};

async function resolveCodigoMunicipio(municipioNome: string, uf: string): Promise<string | null> {
  try {
    const url = `${MUNICIPIO_API_URL}?municipio=${encodeURIComponent(municipioNome)}&sigla_uf=${encodeURIComponent(uf)}&limit=5`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const body = (await response.json()) as {
      macrorregiao_regiao_saude_municipios?: { codigo_municipio: string; municipio: string }[];
    };
    const rows = body.macrorregiao_regiao_saude_municipios ?? [];
    return rows[0]?.codigo_municipio ?? null;
  } catch {
    return null;
  }
}

/**
 * Busca municípios por nome parcial + UF — usado pelo seletor manual quando
 * a localização por GPS não está disponível ou foi negada.
 */
export async function searchMunicipios(query: string, uf?: string): Promise<MunicipioOption[]> {
  if (query.trim().length < 2) return [];

  try {
    const params = new URLSearchParams({ municipio: query.trim(), limit: '10' });
    if (uf) params.set('sigla_uf', uf);

    const response = await fetch(`${MUNICIPIO_API_URL}?${params.toString()}`);
    if (!response.ok) return [];

    const body = (await response.json()) as {
      macrorregiao_regiao_saude_municipios?: { codigo_municipio: string; municipio: string; uf: string }[];
    };

    return (body.macrorregiao_regiao_saude_municipios ?? []).map((row) => ({
      codigoMunicipio: row.codigo_municipio,
      municipio: row.municipio,
      uf: resolveUfSigla(row.uf) ?? row.uf,
    }));
  } catch {
    return [];
  }
}

/**
 * Solicita permissão de localização, obtém a posição atual e resolve UF +
 * código IBGE do município. Retorna `null` em qualquer ponto de falha
 * (permissão negada, web, sem GPS, geocodificação sem resultado) — o
 * chamador deve tratar `null` como "sem localização", nunca como erro fatal.
 */
export async function requestAndResolveLocation(): Promise<UserLocation | null> {
  if (Platform.OS === 'web') {
    return null; // expo-location de GPS não é suportado no build web deste app
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[locationService] permissão de localização não concedida:', status);
      return null;
    }

    const position = await resolvePosition();
    if (!position) {
      // Chega aqui com a permissão já confirmada como concedida — não é um
      // problema de permissão/configuração do aparelho, é o GPS não ter
      // respondido a tempo (ver comentário de resolvePosition). Mostrar isso
      // no log evita reproduzir o mesmo diagnóstico errado ("verifique a
      // permissão") quando a causa real é essa.
      console.warn('[locationService] getLastKnownPositionAsync/getCurrentPositionAsync não retornaram posição a tempo.');
      return null;
    }

    const geocodeResult = await withTimeout(
      Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      LOCATION_TIMEOUT_MS,
      [] as Location.LocationGeocodedAddress[],
    );
    const [place] = geocodeResult;

    const uf = resolveUfSigla(place?.region);
    if (!uf) {
      // sem UF reconhecível, não há como filtrar campanhas/UBS com confiança
      console.warn('[locationService] geocodificação reversa não retornou uma UF reconhecível:', place);
      return null;
    }

    const municipioNome = place?.city ?? place?.subregion ?? null;
    const codigoMunicipio = municipioNome ? await resolveCodigoMunicipio(municipioNome, uf) : null;

    const location: UserLocation = {
      uf,
      municipioNome,
      codigoMunicipio,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    await saveCachedLocation(location);
    return location;
  } catch (error) {
    console.warn('[locationService] falha inesperada ao resolver localização:', error);
    return null;
  }
}

export async function loadCachedLocation(): Promise<UserLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
}

async function saveCachedLocation(location: UserLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch {
    // Falha ao cachear não impede o uso da localização recém-obtida nesta sessão.
  }
}

/** Salva uma localização escolhida manualmente (seletor de município) no mesmo cache do GPS. */
export async function saveManualLocation(option: MunicipioOption): Promise<UserLocation> {
  const location: UserLocation = {
    uf: option.uf,
    municipioNome: option.municipio,
    codigoMunicipio: option.codigoMunicipio,
    latitude: 0,
    longitude: 0,
  };
  await saveCachedLocation(location);
  return location;
}

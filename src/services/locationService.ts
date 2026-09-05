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
      return null;
    }

    const position = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const uf = resolveUfSigla(place?.region);
    if (!uf) {
      return null; // sem UF reconhecível, não há como filtrar campanhas/UBS com confiança
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
  } catch {
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

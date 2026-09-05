const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetLastKnownPositionAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockReverseGeocodeAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockRequestForegroundPermissionsAsync(...args),
  getLastKnownPositionAsync: (...args: unknown[]) => mockGetLastKnownPositionAsync(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
  reverseGeocodeAsync: (...args: unknown[]) => mockReverseGeocodeAsync(...args),
  Accuracy: { Balanced: 3 },
}));

import { requestAndResolveLocation } from '@/services/locationService';

const SAO_PAULO_POSITION = { coords: { latitude: -23.55, longitude: -46.63 } };
const SAO_PAULO_PLACE = { region: 'São Paulo', city: 'São Paulo', subregion: null };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockReverseGeocodeAsync.mockResolvedValue([SAO_PAULO_PLACE]);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      macrorregiao_regiao_saude_municipios: [{ codigo_municipio: '355030', municipio: 'SAO PAULO' }],
    }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requestAndResolveLocation', () => {
  it('returns null immediately when permission is denied, without touching the GPS', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const result = await requestAndResolveLocation();

    expect(result).toBeNull();
    expect(mockGetLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it('prefers getLastKnownPositionAsync (fast, OS-cached) over requesting a fresh GPS fix', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(SAO_PAULO_POSITION);

    const result = await requestAndResolveLocation();

    expect(result).toEqual(
      expect.objectContaining({ uf: 'SP', municipioNome: 'São Paulo', codigoMunicipio: '355030' }),
    );
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back to getCurrentPositionAsync when there is no cached last-known position', async () => {
    mockGetLastKnownPositionAsync.mockResolvedValue(null);
    mockGetCurrentPositionAsync.mockResolvedValue(SAO_PAULO_POSITION);

    const result = await requestAndResolveLocation();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ uf: 'SP' }));
  });

  it('resolves to null instead of hanging forever when both position calls never settle', async () => {
    // Reproduz o bug real relatado em dispositivo: getCurrentPositionAsync
    // trava indefinidamente mesmo com permissão concedida (ver comentário em
    // locationService.ts#resolvePosition e as issues do expo/expo citadas lá).
    // Fake timers evitam esperar os 15s reais do teto de withTimeout.
    jest.useFakeTimers();
    mockGetLastKnownPositionAsync.mockResolvedValue(null);
    mockGetCurrentPositionAsync.mockReturnValue(new Promise(() => {})); // nunca resolve

    const resultPromise = requestAndResolveLocation();
    await jest.advanceTimersByTimeAsync(15000);
    const result = await resultPromise;

    expect(result).toBeNull();
    jest.useRealTimers();
  });

  it('falls back to getCurrentPositionAsync when getLastKnownPositionAsync itself throws', async () => {
    mockGetLastKnownPositionAsync.mockRejectedValue(new Error('native module unavailable'));
    mockGetCurrentPositionAsync.mockResolvedValue(SAO_PAULO_POSITION);

    const result = await requestAndResolveLocation();

    expect(result).toEqual(expect.objectContaining({ uf: 'SP' }));
  });
});

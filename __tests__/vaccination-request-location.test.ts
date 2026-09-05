import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockListVaccineDosesForUser = jest.fn();
const mockFetchVaccinationCampaigns = jest.fn();
const mockFetchVaccinationSites = jest.fn();
const mockRequestAndResolveLocation = jest.fn();
const mockLoadCachedLocation = jest.fn();

jest.mock('@/services/vaccinationService', () => ({
  listVaccineDosesForUser: (...args: unknown[]) => mockListVaccineDosesForUser(...args),
  fetchVaccinationCampaigns: (...args: unknown[]) => mockFetchVaccinationCampaigns(...args),
  fetchVaccinationSites: (...args: unknown[]) => mockFetchVaccinationSites(...args),
}));

jest.mock('@/services/locationService', () => ({
  requestAndResolveLocation: (...args: unknown[]) => mockRequestAndResolveLocation(...args),
  loadCachedLocation: (...args: unknown[]) => mockLoadCachedLocation(...args),
}));

import { useVaccinationData } from '@/hooks/useVaccinationData';

beforeEach(() => {
  jest.clearAllMocks();
  mockListVaccineDosesForUser.mockResolvedValue([]);
  mockFetchVaccinationCampaigns.mockResolvedValue({ campanhas: [], amostragem: null });
  mockFetchVaccinationSites.mockResolvedValue([]);
  mockLoadCachedLocation.mockResolvedValue(null);
});

describe('useVaccinationData - requestLocation', () => {
  it('does NOT reload the whole snapshot when the location attempt fails', async () => {
    mockRequestAndResolveLocation.mockResolvedValue(null);

    const { result } = renderHook(() => useVaccinationData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListVaccineDosesForUser).toHaveBeenCalledTimes(1);

    let returned: unknown;
    await act(async () => {
      returned = await result.current.requestLocation();
    });

    // Bug reportado: chamar retry() incondicionalmente aqui fazia a tela
    // inteira voltar ao estado de carregamento (parecia "a página recarrega")
    // mesmo quando a localização falhou e nada mudou de fato.
    expect(returned).toBeNull();
    expect(mockListVaccineDosesForUser).toHaveBeenCalledTimes(1);
    expect(result.current.isRequestingLocation).toBe(false);
  });

  it('DOES reload the snapshot when the location attempt succeeds, so campaigns/sites reflect the new UF', async () => {
    mockRequestAndResolveLocation.mockResolvedValue({
      uf: 'SP',
      municipioNome: 'São Paulo',
      codigoMunicipio: '355030',
      latitude: -23.55,
      longitude: -46.63,
    });

    const { result } = renderHook(() => useVaccinationData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListVaccineDosesForUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.requestLocation();
    });

    await waitFor(() => expect(mockListVaccineDosesForUser).toHaveBeenCalledTimes(2));
  });

  it('sets hasLocation from the UF alone, independent of the município lookup (which can fail on its own)', async () => {
    // Bug real: a UF resolve com sucesso (GPS + geocodificação), mas a 2ª
    // consulta de rede que resolve o código IBGE do município
    // (resolveCodigoMunicipio, dentro de requestAndResolveLocation) falha
    // sozinha. hasLocation não pode depender dela, senão o prompt "Ative a
    // localização" nunca some mesmo com a localização já obtida.
    const locationWithoutMunicipio = {
      uf: 'SP',
      municipioNome: null,
      codigoMunicipio: null,
      latitude: -23.55,
      longitude: -46.63,
    };
    mockRequestAndResolveLocation.mockResolvedValue(locationWithoutMunicipio);
    // fetchVaccinationSnapshot lê a localização via loadCachedLocation (não
    // via o retorno de requestAndResolveLocation) — em produção,
    // requestAndResolveLocation grava no cache antes de retornar; aqui
    // simulamos isso apontando o mock de leitura para o mesmo valor.
    mockLoadCachedLocation.mockResolvedValue(locationWithoutMunicipio);

    const { result } = renderHook(() => useVaccinationData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.requestLocation();
    });
    await waitFor(() => expect(mockListVaccineDosesForUser).toHaveBeenCalledTimes(2));

    expect(result.current.hasLocation).toBe(true);
    expect(result.current.hasMunicipio).toBe(false);
    // Sem código de município, não há como consultar UBS por proximidade —
    // não deve nem tentar a chamada.
    expect(mockFetchVaccinationSites).not.toHaveBeenCalled();
  });
});

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
});

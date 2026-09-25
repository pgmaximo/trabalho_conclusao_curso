import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  invalidateAppointmentsCache,
  loadCachedAppointments,
  saveAppointmentsCache,
} from '@/hooks/appointmentsCache';
import { getUserId } from '@/services/auth/userSessionService';

jest.mock('@/services/auth/userSessionService', () => ({
  getUserId: jest.fn(),
}));

const getUserIdMock = getUserId as jest.MockedFunction<typeof getUserId>;

describe('appointmentsCache — escopo por usuario e TTL', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useRealTimers();
  });

  it('nao devolve o cache gravado por outro usuario', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    await saveAppointmentsCache([{ id: 'apt-a' }]);

    getUserIdMock.mockResolvedValue('usuario-b');

    expect(await loadCachedAppointments()).toBeNull();
  });

  it('devolve o cache do proprio usuario dentro do TTL', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    await saveAppointmentsCache([{ id: 'apt-a' }]);

    expect(await loadCachedAppointments()).toEqual([{ id: 'apt-a' }]);
  });

  it('descarta o cache expirado', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 18, 10, 0));
    await saveAppointmentsCache([{ id: 'apt-a' }]);

    jest.setSystemTime(new Date(2026, 8, 18, 10, 6)); // 6 minutos depois, TTL e 5

    expect(await loadCachedAppointments()).toBeNull();
  });

  it('devolve null para um envelope malformado (sem savedAt numerico)', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    // Mesmo formato de chave que o modulo constroi: `prefixo:userId`.
    await AsyncStorage.setItem(
      '@SuaSaude:appointmentsCache:usuario-a',
      JSON.stringify([{ id: 'apt-cru' }]),
    );

    expect(await loadCachedAppointments()).toBeNull();
  });

  it('invalida o cache mesmo quando nao ha sessao — o caso do logout', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    await saveAppointmentsCache([{ id: 'apt-a' }]);

    // No logout a sessao ja foi apagada antes desta chamada.
    getUserIdMock.mockRejectedValue(new Error('sem sessao'));
    await invalidateAppointmentsCache();

    getUserIdMock.mockResolvedValue('usuario-a');
    expect(await loadCachedAppointments()).toBeNull();
  });
});

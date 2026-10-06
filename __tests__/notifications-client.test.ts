/**
 * Resumo do arquivo:
 * Trava de regressão para o bug corrigido em src/services/notificationsClient.ts:
 * importar 'expo-notifications' estaticamente no Android dentro do Expo Go lança
 * uma exceção (o pacote remove push/remoto do Expo Go desde o SDK 53 do Expo e
 * troca o aviso por um `throw`), derrubando o app inteiro antes de qualquer tela
 * renderizar. Este teste simula exatamente esse ambiente e garante que nenhuma
 * função do wrapper requer o módulo real nem lança.
 */
import { Platform } from 'react-native';

describe('notificationsClient no Android dentro do Expo Go', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.resetModules();
    Platform.OS = 'android';
    jest.doMock('expo', () => ({
      isRunningInExpoGo: () => true,
    }));
    jest.doMock('expo-notifications', () => {
      throw new Error(
        'expo-notifications nunca deveria ser importado neste cenário (Android + Expo Go)',
      );
    });
  });

  afterEach(() => {
    Platform.OS = originalOS;
    jest.dontMock('expo');
    jest.dontMock('expo-notifications');
  });

  function loadClient() {
    return require('@/services/notificationsClient') as typeof import('@/services/notificationsClient');
  }

  it('não lança ao ser importado', () => {
    expect(() => loadClient()).not.toThrow();
  });

  it('isNotificationsAvailable() retorna false', () => {
    const client = loadClient();
    expect(client.isNotificationsAvailable()).toBe(false);
  });

  it('setNotificationHandler não lança', () => {
    const client = loadClient();
    expect(() => client.setNotificationHandler({ handleNotification: jest.fn() } as never)).not.toThrow();
  });

  it('setNotificationChannelAsync resolve com null em vez de lançar', async () => {
    const client = loadClient();
    await expect(
      client.setNotificationChannelAsync('canal', { name: 'Canal', importance: client.AndroidImportance.HIGH }),
    ).resolves.toBeNull();
  });

  it('getPermissionsAsync/requestPermissionsAsync resolvem como não concedido', async () => {
    const client = loadClient();
    await expect(client.getPermissionsAsync()).resolves.toMatchObject({ granted: false });
    await expect(client.requestPermissionsAsync()).resolves.toMatchObject({ granted: false });
  });

  it('scheduleNotificationAsync resolve com um id local, e cancelScheduledNotificationAsync aceita esse id sem lançar', async () => {
    const client = loadClient();
    const id = await client.scheduleNotificationAsync({
      content: { title: 'x', body: 'y' },
      trigger: null,
    });
    expect(typeof id).toBe('string');
    await expect(client.cancelScheduledNotificationAsync(id)).resolves.toBeUndefined();
  });

  it('getExpoPushTokenAsync rejeita com uma mensagem clara em vez de lançar um erro nativo confuso', async () => {
    const client = loadClient();
    await expect(client.getExpoPushTokenAsync({ projectId: 'p' })).rejects.toThrow(/Expo Go/);
  });
});

describe('notificationsClient fora do Android+Expo Go (iOS, web, dev/production build)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('expo', () => ({ isRunningInExpoGo: () => true }));
    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    }));
  });

  afterEach(() => {
    jest.dontMock('expo');
    jest.dontMock('expo-notifications');
  });

  it('usa o módulo real de expo-notifications normalmente', async () => {
    // Platform.OS real do ambiente de teste (ios) — não é Android, então o
    // wrapper deve carregar o módulo mockado acima normalmente.
    const client = require('@/services/notificationsClient') as typeof import('@/services/notificationsClient');

    expect(client.isNotificationsAvailable()).toBe(true);
    await expect(client.getPermissionsAsync()).resolves.toEqual({ granted: true });
  });
});

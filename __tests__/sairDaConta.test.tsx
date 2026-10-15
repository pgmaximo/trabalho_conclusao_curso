import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileScreen } from '@/screens/ProfileScreen';
import { DEFAULT_REMINDER_INTERVALS_BY_GRADE } from '@/services/reminderService';

// "Sair da conta" saia no toque. A regra do app e confirmar toda acao que a
// pessoa nao desfaz com um toque (DESIGN_TOKENS.md §4), e o botao fica no fim
// de uma tela que se rola com o dedao
// (specs/00-fundacao/consistencia-e-textos/spec.md, D1).

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('@/contexts/ThemeContext', () => ({
  useThemeContext: () => ({ colorScheme: 'light', theme: 'system', setTheme: jest.fn() }),
}));

function renderPerfil(onLogout: () => void | Promise<void>) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <ProfileScreen
        onEditProfile={jest.fn()}
        onLogout={onLogout}
        onSetReminderInterval={jest.fn()}
        onSetTheme={jest.fn()}
        reminderIntervals={DEFAULT_REMINDER_INTERVALS_BY_GRADE}
        theme="system"
        user={{ email: 'maria@exemplo.com', id: 'u-1', name: 'Maria Souza' }}
      />
    </SafeAreaProvider>,
  );
}

describe('Perfil - sair da conta', () => {
  it('o primeiro toque pergunta, e nao sai', () => {
    const onLogout = jest.fn();
    renderPerfil(onLogout);

    fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.getByText(/Sair da conta neste aparelho\?/)).toBeTruthy();
  });

  it('cancelar fecha a pergunta e mantem a pessoa na conta', () => {
    const onLogout = jest.fn();
    renderPerfil(onLogout);
    fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    fireEvent.press(screen.getByRole('button', { name: 'Cancelar e continuar na conta' }));

    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.queryByText(/Sair da conta neste aparelho\?/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeTruthy();
  });

  it('confirmar sai, uma vez so', async () => {
    const onLogout = jest.fn().mockResolvedValue(undefined);
    renderPerfil(onLogout);
    fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    fireEvent.press(screen.getByRole('button', { name: 'Confirmar saída da conta' }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });

  it('se sair falhar, a tela diz, em vez de ficar parada', async () => {
    const onLogout = jest.fn().mockRejectedValue(new Error('Network error'));
    renderPerfil(onLogout);
    fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    fireEvent.press(screen.getByRole('button', { name: 'Confirmar saída da conta' }));

    expect(await screen.findByText('Não foi possível sair agora. Tente novamente.')).toBeTruthy();
    // O texto tecnico nao vai para a tela.
    expect(screen.queryByText(/Network error/)).toBeNull();
  });
});

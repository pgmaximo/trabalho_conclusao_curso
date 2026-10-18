import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileScreen } from '@/screens/ProfileScreen';
import type { UserProfile } from '@/contexts/UserContext';

// Correcoes do Perfil (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D10):
//
// 1. O topo mostrava a LOGO do app, e nao o avatar da pessoa que o Canvas 4b
//    pede. A foto enviada em "Editar perfil" nao aparecia em lugar nenhum daqui.
// 2. "Exportar meus dados" parecia um botao comum e so dizia "Em breve" depois
//    do toque, num alerta. Em 2026-10-18 a linha saiu de vez, a pedido do dono
//    do projeto: a copia dos dados e pedida pelo canal de privacidade.

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

const MARIA: UserProfile = {
  id: 'u-1',
  name: 'Maria Souza',
  email: 'maria.souza@example.com',
  gender: undefined,
  onboardingCompleted: true,
};

function renderProfile(props: Partial<React.ComponentProps<typeof ProfileScreen>> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <ProfileScreen
        onEditProfile={jest.fn()}
        onLogout={jest.fn()}
        onSetReminderInterval={jest.fn()}
        onSetTheme={jest.fn()}
        reminderIntervals={{ A: 30, B: 60, C: 90, D: 180, I: 90 }}
        theme="system"
        user={MARIA}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

describe('Perfil - avatar', () => {
  it('mostra as iniciais da pessoa quando ela nao tem foto', () => {
    renderProfile();

    expect(screen.getByText('MS')).toBeTruthy();
  });

  it('nao mostra mais a logo do app no lugar do avatar', () => {
    renderProfile();

    expect(screen.queryByLabelText('SuaSaude')).toBeNull();
  });
});

describe('Perfil - exportar meus dados', () => {
  it('a linha saiu: o Perfil nao mostra uma acao que nao existe', () => {
    renderProfile();

    expect(screen.queryByText(/Exportar/)).toBeNull();
    expect(screen.queryByText('Em breve')).toBeNull();
  });

  it('os termos continuam a um toque, e e por eles que se pede a copia', () => {
    const onOpenTerms = jest.fn();
    renderProfile({ onOpenTerms });

    fireEvent.press(screen.getByText('Termos de Uso e Política de Privacidade'));
    expect(onOpenTerms).toHaveBeenCalledTimes(1);
  });
});

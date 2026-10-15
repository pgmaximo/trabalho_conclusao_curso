import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/HomeScreen';

// O sino do cabecalho do Inicio era um botao morto: nao havia central de
// notificacoes nem acao ligada a ele. Ele deu lugar ao avatar, que abre o
// Perfil com um toque -- antes so alcancavel por Mais > Perfil
// (specs/02-perfil-home-agenda/home-acesso-completo/spec.md, D3).

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 24, left: 0, right: 0, top: 44 },
};

function renderHome(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  const base = {
    greeting: 'Bom dia, Maria',
    todayLabel: 'sexta-feira, 9 de outubro de 2026',
    todaySummaryText: 'Nenhum compromisso ou pendência para hoje.',
    recentExams: [],
    examsLoading: false,
    examsError: null,
    onRetryExams: jest.fn(),
    upcomingAppointments: [],
    appointmentsLoading: false,
    appointmentsError: null,
    onRetryAppointments: jest.fn(),
    onNavigateToExamDetail: jest.fn(),
    onNavigateToExams: jest.fn(),
  };

  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <HomeScreen {...base} {...props} />
    </SafeAreaProvider>,
  );
}

describe('Home - cabecalho', () => {
  it('abre o Perfil com um toque no avatar', () => {
    const onNavigateToProfile = jest.fn();
    renderHome({ onNavigateToProfile, profileAvatar: { name: 'Maria Souza' } });

    fireEvent.press(screen.getByRole('button', { name: 'Abrir perfil' }));

    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);
  });

  it('mostra as iniciais quando a pessoa nao tem foto nem genero informado', () => {
    renderHome({ onNavigateToProfile: jest.fn(), profileAvatar: { name: 'Maria Souza' } });

    expect(screen.getByText('MS')).toBeTruthy();
  });

  it('nao tem mais o sino de notificacoes, que nao fazia nada', () => {
    renderHome({ onNavigateToProfile: jest.fn() });

    expect(screen.queryByRole('button', { name: 'Notificações' })).toBeNull();
    expect(screen.queryByText('notifications-outline')).toBeNull();
  });

  it('nao desenha um avatar sem acao: sem destino, nao ha botao', () => {
    renderHome();

    expect(screen.queryByRole('button', { name: 'Abrir perfil' })).toBeNull();
  });
});

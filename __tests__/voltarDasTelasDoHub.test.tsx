import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ScreenHeader } from '@/components/ScreenHeader';
import { AgendaScreen } from '@/screens/AgendaScreen';
import { HealthDashboardScreen } from '@/screens/HealthDashboardScreen';
import { PreventionScreen } from '@/screens/PreventionScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { goBackOr } from '@/utils/goBack';

// Agenda, Prevencao, Dados do smartwatch e Perfil sao abertas por cima de outra
// tela (do Inicio ou do hub Mais) e nao tinham botao de voltar; so a Carteira
// de vacinacao tinha. Elas nao ficam numa pilha de navegacao, entao no iPhone
// nem o gesto de voltar existia
// (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D6).

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));

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

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 24, left: 0, right: 0, top: 44 },
};

function naTela(tela: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{tela}</SafeAreaProvider>);
}

function tocarEmVoltar() {
  fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
}

describe('ScreenHeader', () => {
  it('nao tem botao de voltar nas telas que sao abas', () => {
    render(<ScreenHeader title="Exames e receitas" />);
    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull();
  });

  it('mostra o voltar quando a tela diz para onde voltar', () => {
    const onBack = jest.fn();
    render(<ScreenHeader onBack={onBack} subtitle="Seus compromissos de saúde" title="Agenda" />);

    tocarEmVoltar();

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByText('Seus compromissos de saúde')).toBeTruthy();
  });
});

describe('goBackOr', () => {
  beforeEach(() => jest.clearAllMocks());

  it('volta para a tela anterior quando ha uma', () => {
    (router.canGoBack as jest.Mock).mockReturnValue(true);

    goBackOr('/more');

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sem tela anterior, vai para o destino de reserva em vez de nao fazer nada', () => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);

    goBackOr('/more');

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/more');
  });
});

describe('telas do hub', () => {
  it('Agenda', () => {
    const onBack = jest.fn();
    naTela(<AgendaScreen appointments={[]} errorMessage={null} isLoading={false} onBack={onBack} onRetry={jest.fn()} />);

    tocarEmVoltar();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('Dados do smartwatch', () => {
    const onBack = jest.fn();
    naTela(
      <HealthDashboardScreen
        errorMessage={null}
        healthImport={null}
        isLoading={false}
        isTimedOut={false}
        onBack={onBack}
        onImportPress={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    tocarEmVoltar();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('Perfil', () => {
    const onBack = jest.fn();
    naTela(
      <ProfileScreen
        onBack={onBack}
        onEditProfile={jest.fn()}
        onLogout={jest.fn()}
        onSetReminderInterval={jest.fn()}
        onSetTheme={jest.fn()}
        reminderIntervals={{ A: 30, B: 60, C: 90, D: 180, I: 90 }}
        theme="system"
        user={null}
      />,
    );

    tocarEmVoltar();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // A Prevencao so desenhava o cabecalho depois de carregar: carregando, com
  // erro ou com o perfil incompleto, a tela nao tinha titulo nem saida.
  describe('Prevencao', () => {
    const base = {
      recommendations: [],
      lastUpdated: '',
      profileComplete: true,
      isLoading: false,
      errorMessage: null,
      onRetry: jest.fn(),
      onToggleReminder: jest.fn(),
      onEnableRemindersForIds: jest.fn(),
      onCompleteProfile: jest.fn(),
      pendingReminderIds: new Set<number>(),
      activeCampaignMessage: null,
    };

    it.each([
      ['carregada', {}],
      ['carregando', { isLoading: true }],
      ['com erro', { errorMessage: 'Falha de rede.' }],
      ['com o perfil incompleto', { profileComplete: false }],
    ])('tem titulo e voltar quando esta %s', (_estado, props) => {
      const onBack = jest.fn();
      naTela(<PreventionScreen {...base} {...props} onBack={onBack} />);

      expect(screen.getByText('Prevenção & Alertas')).toBeTruthy();
      tocarEmVoltar();
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('so conta as recomendacoes no selo depois de carregar', () => {
      naTela(<PreventionScreen {...base} isLoading onBack={jest.fn()} />);
      expect(screen.queryByText(/recomendaç/)).toBeNull();
    });
  });
});

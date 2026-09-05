import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { VaccinationScreen } from '@/screens/VaccinationScreen';
import type { VaccineDoseItem } from '@/types/models';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

function renderScreen(props?: Partial<React.ComponentProps<typeof VaccinationScreen>>) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <VaccinationScreen
        activeCampaignMessage={null}
        errorMessage={null}
        history={[]}
        isEmpty
        isLoading={false}
        onAddVaccine={jest.fn()}
        onRetry={jest.fn()}
        upcoming={[]}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

const PENDING_ITEM: VaccineDoseItem = {
  id: '1',
  name: 'Influenza (gripe)',
  status: 'pendente',
  description: 'Dose anual · campanha até 30/09/2026',
  dueDate: '2026-09-30',
};

const LATE_ITEM: VaccineDoseItem = {
  id: '2',
  name: 'Dupla adulto (dT)',
  status: 'atrasada',
  description: 'Reforço a cada 10 anos',
  dueDate: '2020-01-01',
};

const HISTORY_ITEM: VaccineDoseItem = {
  id: '3',
  name: 'Hepatite B',
  doseNumber: 3,
  status: 'aplicada',
  description: 'Hepatite B · 3ª dose',
  appliedDate: '2025-03-14',
  location: 'UBS Jardim América',
};

describe('VaccinationScreen', () => {
  it('shows the empty state with a CTA when there is no vaccine registered', () => {
    renderScreen();

    expect(screen.getByText('Carteira de vacinação')).toBeTruthy();
    expect(screen.getByText('Você ainda não tem vacinas registradas.')).toBeTruthy();
    expect(screen.getByText('Adicionar vacina')).toBeTruthy();
  });

  it('shows the loading skeleton and the error callout in their respective states', () => {
    const { rerender } = renderScreen({ isEmpty: false, isLoading: true });
    expect(screen.queryByText('Você ainda não tem vacinas registradas.')).toBeNull();

    rerender(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 24, left: 0, right: 0, top: 44 },
        }}
      >
        <VaccinationScreen
          activeCampaignMessage={null}
          errorMessage="Falha de rede."
          history={[]}
          isEmpty={false}
          isLoading={false}
          onAddVaccine={jest.fn()}
          onRetry={jest.fn()}
          upcoming={[]}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Não foi possível carregar sua carteira')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('differentiates Pendente (amber) from Atrasada (red) with distinct badges', () => {
    renderScreen({ isEmpty: false, upcoming: [PENDING_ITEM, LATE_ITEM] });

    expect(screen.getByText('Influenza (gripe)')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(screen.getByText('Dupla adulto (dT)')).toBeTruthy();
    expect(screen.getByText('Atrasada')).toBeTruthy();
  });

  it('shows applied doses in the history section with date and location', () => {
    renderScreen({ isEmpty: false, history: [HISTORY_ITEM] });

    expect(screen.getByText('Hepatite B')).toBeTruthy();
    expect(screen.getByText('Aplicada')).toBeTruthy();
    expect(screen.getByText('Aplicada em 14/03/2025 · UBS Jardim América')).toBeTruthy();
  });

  it('shows the campaign banner as institutional content, distinct from user records', () => {
    renderScreen({
      activeCampaignMessage: 'Campanha de vacinação contra a gripe até 30/09 nas unidades de saúde.',
    });

    expect(
      screen.getByText('Campanha de vacinação contra a gripe até 30/09 nas unidades de saúde.'),
    ).toBeTruthy();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { VaccinationScreen } from '@/screens/VaccinationScreen';
import type { VaccinationCampaignView, VaccineDoseItem, VaccineGroupView } from '@/types/models';

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
        campaignSamplingNotice={null}
        campaigns={[]}
        errorMessage={null}
        groups={[]}
        hasLocation={false}
        isEmpty
        isLoading={false}
        isRequestingLocation={false}
        onAddVaccine={jest.fn()}
        onRequestLocation={jest.fn()}
        onRetry={jest.fn()}
        sites={[]}
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

const HEPATITE_B_GROUP: VaccineGroupView = {
  catalogId: 'hepatite-b',
  nome: 'Hepatite B',
  seriesTotal: 3,
  dosesAplicadas: [
    {
      id: '3',
      name: 'Hepatite B',
      doseNumber: 3,
      status: 'aplicada',
      description: 'Hepatite B · 3ª dose',
      appliedDate: '2025-03-14',
      location: 'UBS Jardim América',
    },
  ],
  proximaDose: null,
};

const ACTIVE_CAMPAIGN: VaccinationCampaignView = {
  catalogId: 'multivacinacao-2026',
  nome: 'Campanha Nacional de Multivacinação',
  janelaInicio: '2026-08-03',
  janelaFim: '2026-09-01',
  dosesNoPeriodo: 812345,
  ufReferencia: 'SP',
  dataAsOf: '2026-08-30',
  fonteUrl: 'https://exemplo.gov.br/campanha',
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
          campaignSamplingNotice={null}
          campaigns={[]}
          errorMessage="Falha de rede."
          groups={[]}
          hasLocation={false}
          isEmpty={false}
          isLoading={false}
          isRequestingLocation={false}
          onAddVaccine={jest.fn()}
          onRequestLocation={jest.fn()}
          onRetry={jest.fn()}
          sites={[]}
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

  it('shows applied doses grouped by vaccine with dose progress', () => {
    renderScreen({ isEmpty: false, groups: [HEPATITE_B_GROUP] });

    expect(screen.getByText('Hepatite B')).toBeTruthy();
    expect(screen.getByText('1 de 3 doses')).toBeTruthy();
    expect(screen.getByText(/UBS Jardim América/)).toBeTruthy();
  });

  it('shows the campaign banner with real PNI data and its official source link, distinct from user records', () => {
    renderScreen({ campaigns: [ACTIVE_CAMPAIGN] });

    expect(screen.getByText('Campanha Nacional de Multivacinação')).toBeTruthy();
    expect(screen.getByText(/812\.345 doses registradas/)).toBeTruthy();
    expect(screen.getByText('Ver fonte oficial')).toBeTruthy();
  });

  it('never claims a campaign is active without a real source citation', () => {
    renderScreen({ campaigns: [ACTIVE_CAMPAIGN] });
    expect(screen.getByText('Ver fonte oficial')).toBeTruthy();
  });

  it('prompts for location instead of silently omitting nearby health units', () => {
    renderScreen({ hasLocation: false });
    expect(
      screen.getByText(/Ative a localização para ver campanhas da sua região/),
    ).toBeTruthy();
  });
});

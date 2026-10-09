import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { VaccinationScreen } from '@/screens/VaccinationScreen';
import type { VaccineDoseItem, VaccineGroupView } from '@/types/models';

// Dois defeitos da Carteira de vacinacao
// (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D3):
//
// 1. A unica forma de marcar uma dose como aplicada era tocar no SELO de
//    status ("Pendente"/"Atrasada"), que nao parece um botao.
// 2. Um registro lancado errado nao podia ser apagado em lugar nenhum.

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

const PENDING_ITEM: VaccineDoseItem = {
  id: '1',
  name: 'Influenza (gripe)',
  status: 'pendente',
  description: 'Dose anual · campanha até 30/09/2026',
  dueDate: '2026-09-30',
};

const HEPATITE_B_GROUP: VaccineGroupView = {
  catalogId: 'hepatite-b',
  nome: 'Hepatite B',
  seriesTotal: 3,
  dosesAplicadas: [
    {
      id: '3',
      name: 'Hepatite B',
      doseNumber: 1,
      status: 'aplicada',
      description: 'Hepatite B · 1ª dose',
      appliedDate: '2025-03-14',
      location: 'UBS Jardim América',
    },
  ],
  proximaDose: {
    id: '4',
    name: 'Hepatite B',
    doseNumber: 2,
    status: 'pendente',
    description: 'Recomendada até 13/04/2025',
    dueDate: '2025-04-13',
  },
};

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
        hasMunicipio={false}
        isEmpty={false}
        isLoading={false}
        isRequestingLocation={false}
        onAddVaccine={jest.fn()}
        onMarkDoseApplied={jest.fn()}
        onRequestLocation={jest.fn()}
        onRetry={jest.fn()}
        sites={[]}
        upcoming={[]}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

describe('Carteira de vacinacao - marcar como aplicada', () => {
  it('tem um botao escrito "Marcar como aplicada" na dose pendente', () => {
    const onMarkDoseApplied = jest.fn();
    renderScreen({ upcoming: [PENDING_ITEM], onMarkDoseApplied });

    fireEvent.press(screen.getByText('Marcar como aplicada'));

    expect(onMarkDoseApplied).toHaveBeenCalledWith(PENDING_ITEM);
  });

  it('o selo de status deixou de ser o botao', () => {
    const onMarkDoseApplied = jest.fn();
    renderScreen({ upcoming: [PENDING_ITEM], onMarkDoseApplied });

    fireEvent.press(screen.getByText('Pendente'));

    expect(onMarkDoseApplied).not.toHaveBeenCalled();
  });

  it('tem o mesmo botao na proxima dose de cada vacina da carteira', () => {
    const onMarkDoseApplied = jest.fn();
    renderScreen({ groups: [HEPATITE_B_GROUP], onMarkDoseApplied });

    fireEvent.press(screen.getByText('Marcar como aplicada'));

    expect(onMarkDoseApplied).toHaveBeenCalledWith(HEPATITE_B_GROUP.proximaDose);
  });
});

describe('Carteira de vacinacao - excluir um registro', () => {
  it('pede confirmacao antes de excluir uma dose pendente', async () => {
    const onDeleteDose = jest.fn(async () => {});
    renderScreen({ upcoming: [PENDING_ITEM], onDeleteDose });

    fireEvent.press(screen.getByRole('button', { name: 'Excluir Influenza (gripe)' }));

    // Tocar na lixeira so abre a pergunta: nada foi apagado ainda.
    expect(onDeleteDose).not.toHaveBeenCalled();
    expect(screen.getByText('Excluir este registro de vacina? Essa ação não pode ser desfeita.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() => expect(onDeleteDose).toHaveBeenCalledWith(PENDING_ITEM));
  });

  it('desiste sem excluir', () => {
    const onDeleteDose = jest.fn(async () => {});
    renderScreen({ upcoming: [PENDING_ITEM], onDeleteDose });

    fireEvent.press(screen.getByRole('button', { name: 'Excluir Influenza (gripe)' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar exclusão' }));

    expect(onDeleteDose).not.toHaveBeenCalled();
    expect(screen.queryByText(/Excluir este registro de vacina\?/)).toBeNull();
  });

  it('deixa excluir uma dose ja aplicada, lancada por engano', async () => {
    const onDeleteDose = jest.fn(async () => {});
    renderScreen({ groups: [HEPATITE_B_GROUP], onDeleteDose });

    fireEvent.press(screen.getByRole('button', { name: 'Excluir Hepatite B, 1ª dose' }));
    fireEvent.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() =>
      expect(onDeleteDose).toHaveBeenCalledWith(HEPATITE_B_GROUP.dosesAplicadas[0]),
    );
  });

  it('avisa quando a exclusao falha, e mantem o registro', async () => {
    const onDeleteDose = jest.fn(async () => {
      throw new Error('Não foi possível excluir a vacina.');
    });
    renderScreen({ upcoming: [PENDING_ITEM], onDeleteDose });

    fireEvent.press(screen.getByRole('button', { name: 'Excluir Influenza (gripe)' }));
    fireEvent.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    expect(await screen.findByText('Não foi possível excluir a vacina.')).toBeTruthy();
    expect(screen.getByText('Influenza (gripe)')).toBeTruthy();
  });

  it('nao desenha a lixeira quando a tela nao recebe como excluir', () => {
    renderScreen({ upcoming: [PENDING_ITEM] });

    expect(screen.queryByRole('button', { name: /^Excluir / })).toBeNull();
  });
});

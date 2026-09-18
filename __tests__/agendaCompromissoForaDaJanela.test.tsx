import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AgendaScreen } from '@/screens/AgendaScreen';
import { useAgendaNavigation } from '@/hooks/useAgendaNavigation';
import type { AppointmentEntry } from '@/types/models';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

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

// Datas relativas a hoje: o teste nao pode depender do dia em que roda.
function isoEmDias(offsetDias: number, hora = '09:00'): string {
  const hoje = new Date();
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + offsetDias);
  const ano = alvo.getFullYear();
  const mes = String(alvo.getMonth() + 1).padStart(2, '0');
  const dia = String(alvo.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}`;
}

const FUTURO_DISTANTE: AppointmentEntry = {
  id: 'apt-futuro',
  time: '09:00',
  title: 'Cardiologista',
  location: 'Clinica Central',
  type: 'consulta',
  scheduledAt: isoEmDias(13),
};

const PASSADO: AppointmentEntry = {
  id: 'apt-passado',
  time: '14:00',
  title: 'Medico de cabeca',
  location: 'Hospital Sao Lucas',
  type: 'consulta',
  scheduledAt: isoEmDias(-20, '14:00'),
};

// Wrapper: a tela e de apresentacao pura, entao o hook de navegacao vive aqui,
// exatamente como a rota real fara na Task 8.
function Harness({ appointments }: { appointments: AppointmentEntry[] }) {
  const navigation = useAgendaNavigation();
  return (
    <AgendaScreen
      appointments={appointments}
      errorMessage={null}
      isLoading={false}
      navigation={navigation}
      onRetry={jest.fn()}
    />
  );
}

function renderAgenda(appointments: AppointmentEntry[]) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Harness appointments={appointments} />
    </SafeAreaProvider>,
  );
}

describe('Agenda — compromissos fora da janela de 7 dias', () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
  });

  it('alcanca um compromisso a 13 dias pelo modo "Proximos" e abre a tela de edicao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Próximos'));

    expect(screen.getByText('Cardiologista')).toBeTruthy();

    fireEvent.press(screen.getByText('Cardiologista'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-futuro');
  });

  it('alcanca um compromisso passado pelo modo "Historico" e abre a tela de edicao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Histórico'));

    expect(screen.getByText('Medico de cabeca')).toBeTruthy();

    fireEvent.press(screen.getByText('Medico de cabeca'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-passado');
  });

  it('nao mostra o compromisso a 13 dias no escopo Dia ancorado em hoje', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    // Comportamento correto e desejado: o escopo Dia recorta so o dia atual.
    // O defeito nunca foi este recorte — foi nao existir nenhum outro caminho.
    expect(screen.queryByText('Cardiologista')).toBeNull();
    expect(screen.queryByText('Medico de cabeca')).toBeNull();
  });
});

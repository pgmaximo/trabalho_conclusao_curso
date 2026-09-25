import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AgendaScreen } from '@/screens/AgendaScreen';
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

const CORROMPIDO: AppointmentEntry = {
  id: 'apt-corrompido',
  time: '--:--',
  title: 'Consulta sem data',
  location: 'Local desconhecido',
  type: 'consulta',
  scheduledAt: 'lixo',
};

function renderAgenda(appointments: AppointmentEntry[]) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AgendaScreen
        appointments={appointments}
        errorMessage={null}
        isLoading={false}
        onRetry={jest.fn()}
      />
    </SafeAreaProvider>,
  );
}

describe('Agenda — todo compromisso e alcancavel na lista continua', () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
  });

  it('mostra um compromisso a 13 dias SEM nenhuma interacao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    // A garantia e mais forte que na versao anterior deste teste: antes era
    // preciso tocar um chip para alcancar o compromisso. Agora ele esta la.
    expect(screen.getByText('Cardiologista')).toBeTruthy();
  });

  it('mostra um compromisso de 20 dias atras SEM nenhuma interacao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    expect(screen.getByText('Medico de cabeca')).toBeTruthy();
  });

  it('abre a tela de edicao do compromisso futuro tocado', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Cardiologista'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-futuro');
  });

  it('abre a tela de edicao do compromisso passado tocado', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Medico de cabeca'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-passado');
  });

  it('mostra e permite abrir um compromisso com data corrompida', () => {
    renderAgenda([FUTURO_DISTANTE, CORROMPIDO]);

    expect(screen.getByText('Data inválida')).toBeTruthy();

    fireEvent.press(screen.getByText('Consulta sem data'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-corrompido');
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/HomeScreen';
import type { AppointmentEntry } from '@/types/models';

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

function isoEmDias(offset: number, hora: string): string {
  const hoje = new Date();
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + offset);
  const ano = alvo.getFullYear();
  const mes = String(alvo.getMonth() + 1).padStart(2, '0');
  const dia = String(alvo.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}`;
}

const AMANHA: AppointmentEntry = {
  id: 'apt-1',
  time: '08:00',
  title: 'Cardiologista',
  location: 'Clinica Central',
  type: 'consulta',
  scheduledAt: isoEmDias(1, '08:00'),
};

function renderHome(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  const base = {
    greeting: 'Bom dia, Pedro',
    todayLabel: 'sexta-feira, 18 de setembro de 2026',
    todaySummaryText: 'Nenhum compromisso ou pendência para hoje.',
    recentExams: [],
    examsLoading: false,
    examsError: null,
    onRetryExams: jest.fn(),
    upcomingAppointments: [AMANHA],
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

describe('Home — navegacao dos compromissos', () => {
  it('tocar o card abre AQUELE compromisso, nao a agenda generica', () => {
    const onNavigateToAppointmentDetail = jest.fn();
    const onNavigateToAppointments = jest.fn();

    renderHome({ onNavigateToAppointmentDetail, onNavigateToAppointments });

    fireEvent.press(screen.getByText(/Cardiologista/));

    expect(onNavigateToAppointmentDetail).toHaveBeenCalledWith('apt-1');
    expect(onNavigateToAppointments).not.toHaveBeenCalled();
  });

  it('"Ver agenda" continua indo para a agenda', () => {
    const onNavigateToAppointmentDetail = jest.fn();
    const onNavigateToAppointments = jest.fn();

    renderHome({ onNavigateToAppointmentDetail, onNavigateToAppointments });

    fireEvent.press(screen.getByText('Ver agenda'));

    expect(onNavigateToAppointments).toHaveBeenCalled();
    expect(onNavigateToAppointmentDetail).not.toHaveBeenCalled();
  });

  it('rotula um compromisso de amanha como "Amanhã"', () => {
    renderHome({ onNavigateToAppointmentDetail: jest.fn() });

    expect(screen.getByText(/Amanhã/)).toBeTruthy();
  });

  it('rotula um compromisso com data corrompida como "Data inválida"', () => {
    const corrompido: AppointmentEntry = { ...AMANHA, id: 'apt-2', scheduledAt: 'lixo' };

    renderHome({ upcomingAppointments: [corrompido], onNavigateToAppointmentDetail: jest.fn() });

    expect(screen.getByText(/Data inválida/)).toBeTruthy();
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/HomeScreen';
import type { AppointmentEntry } from '@/types/models';

// Pedido do usuario ao escolher a Opcao 1 da barra
// (specs/00-fundacao/barra-de-navegacao/spec.md, D6): com Consultas fora da
// barra, o Inicio precisa levar a Exames, Remedios e Consultas com um toque, de
// forma bem visivel -- e, onde o Inicio ja tem o dado, dizer algo util sobre
// cada um, sem inventar nada.

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
    greeting: 'Bom dia',
    todayLabel: 'sexta-feira, 25 de setembro de 2026',
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
    onNavigateToAppointments: jest.fn(),
    onNavigateToMedicines: jest.fn(),
    onNavigateToPrevention: jest.fn(),
  };

  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <HomeScreen {...base} {...props} />
    </SafeAreaProvider>,
  );
}

// Todos os textos da tela, na ordem em que aparecem.
function textosEmOrdem(): string[] {
  const textos: string[] = [];
  const visitar = (no: unknown) => {
    if (typeof no === 'string') {
      textos.push(no);
    } else if (Array.isArray(no)) {
      no.forEach(visitar);
    } else if (no && typeof no === 'object' && 'children' in no) {
      visitar((no as { children: unknown }).children);
    }
  };
  visitar(screen.toJSON());
  return textos;
}

describe('Home - Acesso rapido', () => {
  it.each([
    ['Consultas', 'onNavigateToAppointments'],
    ['Exames', 'onNavigateToExams'],
    ['Remédios', 'onNavigateToMedicines'],
    ['Prevenção', 'onNavigateToPrevention'],
  ] as const)('o atalho %s leva a sua tela com um toque', (rotulo, handler) => {
    const onPress = jest.fn();
    renderHome({ [handler]: onPress });

    fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${rotulo}`) }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('nao tem mais o atalho "Análise IA", que virou a aba Assistente', () => {
    renderHome();
    expect(screen.queryByText('Análise IA')).toBeNull();
  });

  it('vem logo depois do Resumo de hoje, antes de Ultimos exames', () => {
    renderHome();
    const textos = textosEmOrdem();

    expect(textos.indexOf('Acesso rápido')).toBeGreaterThan(textos.indexOf('Resumo de hoje'));
    expect(textos.indexOf('Acesso rápido')).toBeLessThan(textos.indexOf('Últimos exames'));
  });

  it('mostra no atalho de Consultas quando e o proximo compromisso', () => {
    renderHome({ upcomingAppointments: [AMANHA] });
    expect(screen.getByText('Próximo: Amanhã, 08:00')).toBeTruthy();
  });

  it('diz que nao ha nada agendado quando a agenda carregou vazia', () => {
    renderHome({ upcomingAppointments: [] });
    expect(screen.getByText('Nada agendado')).toBeTruthy();
  });

  it.each([
    [2, '2 doses a tomar hoje'],
    [1, '1 dose a tomar hoje'],
    [0, 'Nenhuma dose a tomar hoje'],
  ])('mostra no atalho de Remedios as doses que faltam hoje (%s)', (doses, texto) => {
    renderHome({ pendingDosesToday: doses });
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it.each([
    [3, '3 documentos guardados'],
    [1, '1 documento guardado'],
    [0, 'Nenhum documento guardado'],
  ])('mostra no atalho de Exames quantos documentos ha (%s)', (quantidade, texto) => {
    renderHome({ examsCount: quantidade });
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it('nao inventa linha de apoio enquanto o dado nao chegou ou falhou', () => {
    renderHome({
      appointmentsLoading: true,
      upcomingAppointments: [AMANHA],
      examsError: 'Falhou',
      examsCount: 3,
      pendingDosesToday: null,
    });

    expect(screen.queryByText(/^Próximo:/)).toBeNull();
    expect(screen.queryByText('Nada agendado')).toBeNull();
    expect(screen.queryByText(/documentos? guardados?$/)).toBeNull();
    expect(screen.queryByText(/a tomar hoje$/)).toBeNull();
  });
});

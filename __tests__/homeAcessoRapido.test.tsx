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
//
// A grade cresceu de 2x2 para 2x3 em
// specs/02-perfil-home-agenda/home-acesso-completo/spec.md (D1 e D2): Vacinacao
// e Smartwatch so eram alcancaveis pelo hub Mais, e ganharam atalho com a
// mesma regra de linha de apoio.

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
    ['Vacinação', 'onNavigateToVaccination'],
    ['Smartwatch', 'onNavigateToHealthData'],
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

  // Toda linha de apoio cabe em UMA linha. Medido no navegador em 360dp: o
  // atalho tem 121dp uteis para o texto (IBM Plex Sans 16px), o que da uns 14
  // caracteres. As frases antigas ("2 doses a tomar hoje", "7 documentos
  // guardados") quebravam em duas, e os atalhos ficavam desalinhados entre si
  // (specs/02-perfil-home-agenda/home-acesso-completo/spec.md, D8).

  it('mostra no atalho de Consultas quando e o proximo compromisso', () => {
    renderHome({ upcomingAppointments: [AMANHA] });
    expect(screen.getByText('Amanhã, 08:00')).toBeTruthy();
  });

  it('diz que nao ha nada agendado quando a agenda carregou vazia', () => {
    renderHome({ upcomingAppointments: [] });
    expect(screen.getByText('Nada agendado')).toBeTruthy();
  });

  it.each([
    [2, 'Faltam 2 hoje'],
    [1, 'Falta 1 hoje'],
    [0, 'Nada pendente'],
  ])('mostra no atalho de Remedios as doses que faltam hoje (%s)', (doses, texto) => {
    renderHome({ pendingDosesToday: doses });
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it.each([
    [3, '3 documentos'],
    [1, '1 documento'],
    [0, 'Nada guardado'],
  ])('mostra no atalho de Exames quantos documentos ha (%s)', (quantidade, texto) => {
    renderHome({ examsCount: quantidade });
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it.each([
    // As atrasadas vencem as pendentes, e as pendentes vencem as aplicadas: a
    // linha diz primeiro o que pede acao.
    [{ overdue: 2, pending: 1, applied: 4 }, '2 atrasadas'],
    [{ overdue: 1, pending: 0, applied: 0 }, '1 atrasada'],
    [{ overdue: 0, pending: 3, applied: 4 }, '3 pendentes'],
    [{ overdue: 0, pending: 1, applied: 0 }, '1 pendente'],
    [{ overdue: 0, pending: 0, applied: 5 }, '5 aplicadas'],
    [{ overdue: 0, pending: 0, applied: 1 }, '1 aplicada'],
    [{ overdue: 0, pending: 0, applied: 0 }, 'Nenhuma dose'],
  ])('mostra no atalho de Vacinacao o estado da carteira (%j)', (doses, texto) => {
    renderHome({ vaccineDoseCounts: doses });
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it.each([
    [true, 'Análise pronta'],
    // "Nenhum dado importado" seria falso enquanto uma importacao ainda esta
    // sendo analisada: o Inicio so enxerga a analise que ja ficou pronta.
    [false, 'Sem análise'],
  ])('mostra no atalho de Smartwatch se ha analise pronta (%s)', (pronta, texto) => {
    renderHome({ smartwatchAnalysisReady: pronta });
    expect(screen.getByText(texto)).toBeTruthy();
  });

  // Pedido do usuario ao ver a grade no aparelho: "alguns tem subtitulo e
  // outros nao". Todo atalho tem sempre a sua linha -- inclusive Prevencao,
  // que nao tem fonte de dado no Inicio, e inclusive enquanto o dado carrega.
  describe('sem o dado, a linha descreve o destino', () => {
    const DESCRICOES = [
      'Sua agenda',
      'Seu histórico',
      'Doses de hoje',
      'Orientações',
      'Sua carteira',
      'Sono e passos',
    ];

    it('mostra a descricao de cada atalho enquanto o dado nao chegou ou falhou', () => {
      renderHome({
        appointmentsLoading: true,
        upcomingAppointments: [AMANHA],
        examsError: 'Falhou',
        examsCount: 3,
        pendingDosesToday: null,
        vaccineDoseCounts: null,
        smartwatchAnalysisReady: null,
      });

      for (const descricao of DESCRICOES) {
        expect(screen.getByText(descricao)).toBeTruthy();
      }
    });

    it('nao afirma nada sobre os dados da pessoa enquanto nao os tem', () => {
      renderHome({
        appointmentsLoading: true,
        upcomingAppointments: [AMANHA],
        examsError: 'Falhou',
        examsCount: 3,
        pendingDosesToday: null,
        vaccineDoseCounts: null,
        smartwatchAnalysisReady: null,
      });

      // O compromisso de amanha so pode aparecer no card de "Proximos
      // compromissos" (que esta carregando), nunca no atalho.
      expect(screen.queryByText('Amanhã, 08:00')).toBeNull();
      expect(screen.queryByText('Nada agendado')).toBeNull();
      expect(screen.queryByText(/^\d+ documentos?$/)).toBeNull();
      expect(screen.queryByText('Nada guardado')).toBeNull();
      expect(screen.queryByText(/^Faltam? \d+ hoje$/)).toBeNull();
      expect(screen.queryByText('Nada pendente')).toBeNull();
      expect(screen.queryByText(/^\d+ (atrasadas?|pendentes?|aplicadas?)$/)).toBeNull();
      expect(screen.queryByText('Nenhuma dose')).toBeNull();
      expect(screen.queryByText('Análise pronta')).toBeNull();
      expect(screen.queryByText('Sem análise')).toBeNull();
    });

    it('da a Prevencao a sua linha, mesmo sem fonte de dado no Inicio', () => {
      renderHome();
      expect(screen.getByRole('button', { name: 'Prevenção. Orientações' })).toBeTruthy();
    });

    it('le a linha de apoio junto com o rotulo no leitor de tela', () => {
      renderHome({ pendingDosesToday: 2 });
      expect(screen.getByRole('button', { name: 'Remédios. Faltam 2 hoje' })).toBeTruthy();
    });
  });
});

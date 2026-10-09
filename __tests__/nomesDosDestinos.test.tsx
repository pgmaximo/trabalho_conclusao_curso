import React from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_TABS, MORE_MENU_ITEMS } from '@/constants/navigation';
import { AddAppointmentScreen } from '@/screens/AddAppointmentScreen';
import { AddMedicineScreen } from '@/screens/AddMedicineScreen';
import { AgendaScreen } from '@/screens/AgendaScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { MedicinesScreen } from '@/screens/MedicinesScreen';
import { buildDashboardTodaySummary, buildTodaySummaryText } from '@/services/homeAppointments';

// Um destino, um nome. A agenda se chamava "Consultas" no Inicio e no hub Mais,
// "Agenda" na propria tela, e o botao de marcar dizia "Agendar consulta" e
// abria "Novo agendamento". A aba "Remédios" abria a tela "Medicamentos", cujo
// botao "Adicionar medicamento" abria "Novo lembrete". E excluir era, conforme
// a tela, "excluir", "apagar" ou "deletar"
// (specs/00-fundacao/consistencia-e-textos/spec.md, D2).

jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn(), getCurrentUser: jest.fn() }));
jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
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

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 24, left: 0, right: 0, top: 44 },
};

function naTela(tela: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{tela}</SafeAreaProvider>);
}

function renderHome(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return naTela(
    <HomeScreen
      appointmentsError={null}
      appointmentsLoading={false}
      examsError={null}
      examsLoading={false}
      greeting="Bom dia"
      onNavigateToAppointments={jest.fn()}
      onNavigateToExamDetail={jest.fn()}
      onNavigateToExams={jest.fn()}
      onNavigateToMedicines={jest.fn()}
      onNavigateToPrevention={jest.fn()}
      onRetryAppointments={jest.fn()}
      onRetryExams={jest.fn()}
      recentExams={[]}
      todayLabel="sexta-feira, 9 de outubro de 2026"
      todaySummaryText="Nenhum compromisso ou pendência para hoje."
      upcomingAppointments={[]}
      {...props}
    />,
  );
}

function renderMedicamentos() {
  return naTela(
    <MedicinesScreen
      errorMessage={null}
      hasMedicines={false}
      interactions={[]}
      isLoading={false}
      medicines={[]}
      onRetry={jest.fn()}
      onToggleMedicineStatus={jest.fn()}
      pendingCount={0}
      stocks={[]}
    />,
  );
}

describe('Agenda: o lugar tem um nome so', () => {
  it('o hub Mais chama de Agenda, como a tela', () => {
    expect(MORE_MENU_ITEMS[0]).toMatchObject({ label: 'Agenda', href: '/appointments' });
  });

  it('as descricoes do hub cabem em uma linha, sem reticencias', () => {
    // Olhado no navegador em 360dp: cabem 25 caracteres. Quatro das seis
    // descricoes estavam cortadas ("Insights do seu sono, pass...").
    for (const item of MORE_MENU_ITEMS) {
      expect(item.description.length).toBeLessThanOrEqual(25);
    }
  });

  it('o atalho do Inicio chama de Agenda', () => {
    const onNavigateToAppointments = jest.fn();
    renderHome({ onNavigateToAppointments });

    fireEvent.press(screen.getByRole('button', { name: /^Agenda\./ }));

    expect(onNavigateToAppointments).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Consultas')).toBeNull();
  });

  it('a tela se chama Agenda', () => {
    naTela(<AgendaScreen appointments={[]} errorMessage={null} isLoading={false} onRetry={jest.fn()} />);

    expect(screen.getByText('Agenda')).toBeTruthy();
  });
});

describe('Agenda: a coisa marcada e sempre "compromisso"', () => {
  it('o botao de marcar tem o nome da tela que ele abre', () => {
    naTela(<AgendaScreen appointments={[]} errorMessage={null} isLoading={false} onRetry={jest.fn()} />);

    // O "+" do cabecalho, pelo nome, e o botao da lista vazia, pelo texto.
    expect(screen.getByRole('button', { name: 'Novo compromisso' })).toBeTruthy();
    expect(screen.getByText('Novo compromisso')).toBeTruthy();
    expect(screen.queryByText('Agendar consulta')).toBeNull();
  });

  it('o formulario se chama Novo compromisso, e salva um compromisso', () => {
    naTela(<AddAppointmentScreen />);

    expect(screen.getByText('Novo compromisso')).toBeTruthy();
    expect(screen.getByText('Nome do compromisso')).toBeTruthy();
    expect(screen.getByText('Salvar compromisso')).toBeTruthy();
    expect(screen.queryByText(/agendamento/i)).toBeNull();
  });

  it('o resumo do Inicio conta compromissos, e nao so consultas', () => {
    // Um exame ou uma cirurgia marcados para hoje tambem entram na conta.
    const hoje = new Date(2026, 9, 9, 9, 0);
    const lista = [
      { id: 'a', scheduledAt: '2026-10-09T15:00', time: '15:00' },
      { id: 'b', scheduledAt: '2026-10-09T17:00', time: '17:00' },
    ];

    expect(buildTodaySummaryText(lista.slice(0, 1), hoje)).toBe('1 compromisso às 15:00');
    expect(buildTodaySummaryText(lista, hoje)).toBe('2 compromissos às 15:00');
    expect(buildDashboardTodaySummary(lista, 1, hoje)).toBe('2 compromissos às 15:00 · 1 medicamento pendente');
  });

  it('no Inicio sem nada marcado, "Novo compromisso" abre o formulario, e nao a agenda', () => {
    // O botao dizia "Agendar consulta" e levava a lista da Agenda, onde havia
    // outro botao igual.
    const onNavigateToAppointments = jest.fn();
    const onNavigateToNewAppointment = jest.fn();
    renderHome({ onNavigateToAppointments, onNavigateToNewAppointment });

    fireEvent.press(screen.getByText('Novo compromisso'));

    expect(onNavigateToNewAppointment).toHaveBeenCalledTimes(1);
    expect(onNavigateToAppointments).not.toHaveBeenCalled();
  });
});

describe('Remedios: o lugar tem um nome so', () => {
  it('a aba e a tela usam a mesma palavra', () => {
    renderMedicamentos();

    const aba = APP_TABS.find((item) => item.id === 'medicines');
    expect(aba?.label).toBe('Remédios');
    expect(screen.getByText('Remédios')).toBeTruthy();
    expect(screen.queryByText('Medicamentos')).toBeNull();
  });

  it('"Adicionar medicamento" abre a tela "Adicionar medicamento"', () => {
    renderMedicamentos();
    expect(screen.getAllByRole('button', { name: 'Adicionar medicamento' }).length).toBeGreaterThan(0);

    naTela(<AddMedicineScreen />);

    expect(screen.getAllByText('Adicionar medicamento').length).toBeGreaterThan(0);
    expect(screen.queryByText('Novo lembrete')).toBeNull();
  });
});

describe('Inicio: a lista de documentos nao se chama "exames"', () => {
  it('a secao lista exames E receitas, e diz "documentos" como a tela de Exames', () => {
    renderHome();

    expect(screen.getByText('Últimos documentos')).toBeTruthy();
    expect(screen.getByText('Nenhum documento enviado')).toBeTruthy();
    expect(screen.queryByText('Últimos exames')).toBeNull();
  });
});

describe('excluir tem um verbo so', () => {
  const raiz = join(__dirname, '..', 'src');

  function arquivos(pasta: string): { nome: string; texto: string }[] {
    return readdirSync(join(raiz, pasta), { withFileTypes: true }).flatMap((entrada) => {
      const caminho = join(pasta, entrada.name);
      if (entrada.isDirectory()) return arquivos(caminho);
      if (!/\.tsx?$/.test(entrada.name)) return [];
      return [{ nome: caminho, texto: readFileSync(join(raiz, caminho), 'utf8') }];
    });
  }

  // Tira os comentarios: a regra e sobre o que a pessoa le.
  function semComentarios(texto: string): string {
    return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  }

  it('nenhuma tela ou componente diz "apagar" ou "deletar"', () => {
    // Nomes de funcao (`state.apagar(...)`, `apagarConversa`) nao contam: a
    // palavra precisa estar solta, como num texto.
    const verbo = /(?<![.\w])(?:[Aa]pag(?:ar|ue|ados?|adas?)|[Dd]elet(?:ar|ado|ada))(?![\w(:])(?!\s*[=,)}])/;

    const infratores = [...arquivos('screens'), ...arquivos('components')]
      .flatMap(({ nome, texto }) =>
        semComentarios(texto)
          .split('\n')
          .filter((linha) => verbo.test(linha) && !/console\./.test(linha))
          .map((linha) => `${nome}: ${linha.trim()}`),
      );

    expect(infratores).toEqual([]);
  });
});

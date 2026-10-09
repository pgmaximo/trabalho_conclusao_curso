import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/HomeScreen';
import type { AppointmentEntry, MedicalDocument } from '@/types/models';

// Enquanto os documentos e os compromissos carregavam, cada secao do Inicio
// mostrava o esqueleto de TELA INTEIRA: duas barras de titulo e dois cartoes de
// tres linhas, perto do dobro da altura das duas linhas que entram no lugar.
// Quando o dado chegava, tudo o que vinha abaixo pulava para cima, uma vez por
// secao. O esqueleto agora tem a forma das linhas que ele guarda lugar
// (specs/00-fundacao/correcoes-menores/spec.md, D2).
//
// A altura em si nao da para afirmar aqui (o Jest nao calcula layout): ela foi
// conferida no navegador, comparando a pagina carregando com a carregada.

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

const DOCUMENTO: MedicalDocument = {
  id: 'doc-1',
  title: 'Hemograma completo',
  subtitle: 'Exame · 02/10/2026',
  category: 'Exames',
  documentType: 'exam',
  documentDate: '2026-10-02',
} as MedicalDocument;

const COMPROMISSO: AppointmentEntry = {
  id: 'apt-1',
  time: '08:00',
  title: 'Cardiologista',
  location: 'Clínica Central',
  type: 'consulta',
  scheduledAt: '2099-01-01T08:00',
};

function renderHome(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <HomeScreen
        appointmentsError={null}
        appointmentsLoading={false}
        examsError={null}
        examsLoading={false}
        greeting="Bom dia"
        onNavigateToExamDetail={jest.fn()}
        onNavigateToExams={jest.fn()}
        onRetryAppointments={jest.fn()}
        onRetryExams={jest.fn()}
        recentExams={[DOCUMENTO]}
        todayLabel="sexta-feira, 9 de outubro de 2026"
        todaySummaryText="Nenhum compromisso ou pendência para hoje."
        upcomingAppointments={[COMPROMISSO]}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

describe('Inicio carregando', () => {
  it('guarda lugar para os dois documentos que a secao mostra', () => {
    renderHome({ examsLoading: true });

    expect(screen.getAllByTestId('documento-carregando')).toHaveLength(2);
    // O compromisso ja carregado continua na tela, sem esqueleto.
    expect(screen.queryByTestId('compromisso-carregando')).toBeNull();
    expect(screen.getByText(/Cardiologista/)).toBeTruthy();
  });

  it('guarda lugar para os dois compromissos que a secao mostra', () => {
    renderHome({ appointmentsLoading: true });

    expect(screen.getAllByTestId('compromisso-carregando')).toHaveLength(2);
    expect(screen.queryByTestId('documento-carregando')).toBeNull();
    expect(screen.getByText('Hemograma completo')).toBeTruthy();
  });

  it('diz ao leitor de tela o que esta carregando', () => {
    renderHome({ appointmentsLoading: true, examsLoading: true });

    expect(screen.getByLabelText('Carregando seus documentos')).toBeTruthy();
    expect(screen.getByLabelText('Carregando seus compromissos')).toBeTruthy();
  });

  it('some quando o dado chega', () => {
    renderHome();

    expect(screen.queryByTestId('documento-carregando')).toBeNull();
    expect(screen.queryByTestId('compromisso-carregando')).toBeNull();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HealthDashboardScreen } from '@/screens/HealthDashboardScreen';
import type { AnalysisSummary, HealthImport, Insights } from '@/types/healthInsights';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

function renderScreen(props: Partial<React.ComponentProps<typeof HealthDashboardScreen>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <HealthDashboardScreen
        errorMessage={null}
        healthImport={null}
        isLoading={false}
        isTimedOut={false}
        onImportPress={jest.fn()}
        onRetry={jest.fn()}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

const DISCLAIMER_TEXT = 'Apoio informativo — não substitui avaliação médica.';

function baseSummary(overrides: Partial<AnalysisSummary> = {}): AnalysisSummary {
  return {
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    dayCount: 90,
    metrics: [
      {
        metric: 'steps',
        label: 'Passos',
        unit: 'passos',
        n: 80,
        firstSeen: '2026-01-01',
        lastSeen: '2026-03-31',
        daysWithData: 80,
        coveragePct: 89,
        mean: 8200,
        median: 8000,
        sd: 1500,
        min: 2000,
        max: 15000,
        p25: 6000,
        p75: 10000,
        weekday: 8500,
        weekend: 7000,
        trendSlopePerDay: 5,
        monthly: [
          { month: '2026-01', mean: 8000 },
          { month: '2026-02', mean: 8300 },
          { month: '2026-03', mean: 8300 },
        ],
      },
    ],
    correlations: [{ metricA: 'steps', metricB: 'sleepMinutes', lagDays: 0, label: 'Passos e sono', r: 0.42, n: 30 }],
    warnings: ['12 colunas não reconhecidas foram ignoradas.'],
    ...overrides,
  };
}

function baseInsights(overrides: Partial<Insights> = {}): Insights {
  return {
    resumo: 'Seus passos aumentaram ao longo do período analisado.',
    destaques: [{ metrica: 'Passos', valor: '8.200/dia', comparacao: 'acima da média do período', tom: 'positivo' }],
    pontosDeAtencao: [],
    padroes: [],
    sugestoes: [],
    perguntasParaOMedico: [],
    limitacoes: 'Cobertura de sono limitada a 40% dos dias.',
    ...overrides,
  };
}

function baseHealthImport(overrides: Partial<HealthImport> = {}): HealthImport {
  return {
    id: 'import-1',
    status: 'READY',
    sourceHint: 'SAMSUNG_HEALTH',
    fileNames: ['pedometer.csv'],
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    dayCount: 90,
    warnings: ['12 colunas não reconhecidas foram ignoradas.'],
    errorMessage: null,
    startedAt: '2026-04-01T10:00:00.000Z',
    analyzedAt: '2026-04-01T10:02:00.000Z',
    modelId: 'us.anthropic.claude-sonnet-4-6',
    summary: baseSummary(),
    insights: baseInsights(),
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:02:00.000Z',
    ...overrides,
  };
}

describe('HealthDashboardScreen', () => {
  it('always shows the AI disclaimer banner, in every state', () => {
    renderScreen({ healthImport: null });
    expect(screen.getByText(DISCLAIMER_TEXT)).toBeTruthy();
  });

  it('shows the empty state with an import CTA when the user never imported anything', () => {
    renderScreen({ healthImport: null });
    expect(screen.getByText('Nenhum dado importado ainda')).toBeTruthy();
    expect(screen.getByText('Importar dados')).toBeTruthy();
  });

  it('shows a loading skeleton while the first fetch is pending', () => {
    renderScreen({ isLoading: true });
    expect(screen.queryByText('Nenhum dado importado ainda')).toBeNull();
  });

  it('shows an error empty-state with retry when fetching fails', () => {
    renderScreen({ errorMessage: 'Falha de rede.' });
    expect(screen.getByText('Não foi possível carregar seus dados')).toBeTruthy();
    expect(screen.getByText('Falha de rede.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('shows a skeleton with a processing step label while PENDING', () => {
    renderScreen({ healthImport: baseHealthImport({ status: 'PENDING', summary: null, insights: null }) });
    expect(screen.getByText('Preparando seus arquivos…')).toBeTruthy();
  });

  it('shows a skeleton with a different step label while PROCESSING', () => {
    renderScreen({ healthImport: baseHealthImport({ status: 'PROCESSING', summary: null, insights: null }) });
    expect(screen.getByText('Lendo seus dados e analisando padrões…')).toBeTruthy();
  });

  it('shows a "stuck" error state when the poll has timed out', () => {
    renderScreen({
      healthImport: baseHealthImport({ status: 'PROCESSING', summary: null, insights: null }),
      isTimedOut: true,
    });
    expect(screen.getByText('A análise está demorando')).toBeTruthy();
  });

  it('shows the FAILED empty-state with the backend error message', () => {
    renderScreen({
      healthImport: baseHealthImport({ status: 'FAILED', errorMessage: 'Nenhuma métrica com dados suficientes.', summary: null, insights: null }),
    });
    expect(screen.getByText('Não foi possível analisar os dados')).toBeTruthy();
    expect(screen.getByText('Nenhuma métrica com dados suficientes.')).toBeTruthy();
  });

  it('renders the full dashboard on READY: summary, highlights, and warnings', () => {
    renderScreen({ healthImport: baseHealthImport() });

    expect(screen.getByText('Seus passos aumentaram ao longo do período analisado.')).toBeTruthy();
    expect(screen.getByText(/8.200\/dia/)).toBeTruthy();
    expect(screen.getByText(/O que não conseguimos ler/)).toBeTruthy();
  });

  it('shows the correlation evidence (r and n), not just the AI narrative', () => {
    renderScreen({ healthImport: baseHealthImport() });
    expect(screen.getByText(/r=0.42, n=30/)).toBeTruthy();
  });

  it('shows an error state when the import is READY but the JSON could not be parsed', () => {
    renderScreen({ healthImport: baseHealthImport({ summary: null, insights: null }) });
    expect(screen.getByText('Resultado indisponível')).toBeTruthy();
  });

  it('clarifies that the metric card number is a daily average, not the latest reading (regra: usuário não deve confundir com "hoje")', () => {
    renderScreen({ healthImport: baseHealthImport() });
    expect(screen.getByText('Números = média diária do período · gráfico = tendência mensal')).toBeTruthy();
    expect(screen.getByText('média diária')).toBeTruthy();
  });

  it('clarifies that coverage is measured in days, not a generic percentage', () => {
    renderScreen({ healthImport: baseHealthImport() });
    expect(screen.getByText('cobertura de 89% dos dias')).toBeTruthy();
  });
});

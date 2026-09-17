jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { checkLanguageRules } from '../amplify/functions/ai-language-rules/languageRules';
import type { UseAnalyteSeriesResult } from '@/hooks/useAnalyteSeries';
import { AnalyteSeriesScreen } from '@/screens/AnalyteSeriesScreen';
import type { AnalyteSeries, ExcludedResult, SeriesPoint } from '@/services/analyteSeries';
import type { LabResultView } from '@/services/extractionService';

const DATAS = ['2026-03-12', '2026-06-01', '2026-09-20'];

function ponto(id: string, collectedAt: string, value: number): SeriesPoint {
  return {
    id,
    documentId: 'doc-1',
    collectedAt,
    value,
    referenceLow: 30,
    referenceHigh: 100,
    rawValue: '32,5',
    rawUnit: 'ng/mL',
  };
}

// 62292-8 do extrato oficial do LOINC, como em toda esta EPIC.
function serieCom(n: number, over: Partial<AnalyteSeries> = {}): AnalyteSeries {
  return {
    analyteCode: '62292-8',
    projectLabel: 'Vitamina D (25-OH)',
    analyteLabel: '25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma',
    collectionMoment: null,
    unit: 'ng/mL',
    points: DATAS.slice(0, n).map((d, i) => ponto(`p${i}`, d, 32 + i * 5)),
    excluded: [],
    ...over,
  };
}

function excluida(reason: ExcludedResult['reason']): ExcludedResult {
  return {
    id: 'x1',
    documentId: 'doc-2',
    collectedAt: '2026-06-01',
    reason,
    result: {} as LabResultView,
  };
}

function seriesDaCurvaGlicemica(): AnalyteSeries[] {
  const base = { analyteCode: '2345-7', projectLabel: 'Glicose', unit: 'mg/dL' };
  return [
    serieCom(2, { ...base, collectionMoment: 'jejum' }),
    serieCom(2, { ...base, collectionMoment: '120 minutos' }),
  ];
}

function props(over: Partial<UseAnalyteSeriesResult> = {}): UseAnalyteSeriesResult {
  const series = over.series ?? [serieCom(2)];
  return {
    options: [
      { analyteCode: '62292-8', projectLabel: 'Vitamina D (25-OH)', collectionCount: 2, pendingCount: 0 },
    ],
    selectedCode: '62292-8',
    selectCode: jest.fn(),
    series,
    selectedMoment: null,
    selectMoment: jest.fn(),
    activeSeries: series[0] ?? null,
    referenceRange: { low: 30, high: 100 },
    isLoading: false,
    errorMessage: null,
    refresh: jest.fn(),
    ...over,
  };
}

function renderScreen(estado: UseAnalyteSeriesResult) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AnalyteSeriesScreen state={estado} />
    </SafeAreaProvider>,
  );
}

describe('AnalyteSeriesScreen — os quatro estados', () => {
  it('sem nenhum exame, explica e leva para adicionar', () => {
    renderScreen(props({ options: [], series: [], activeSeries: null }));
    // Texto exato: a frase acima do botao tambem diz "adicionar um exame".
    expect(screen.getByText('Adicionar um exame')).toBeTruthy();
    expect(screen.queryByText(/erro/i)).toBeNull();
  });

  it('uma coleta so NAO desenha grafico', () => {
    // Um grafico de um ponto nao e uma serie: e um ponto com eixos em volta.
    const s = serieCom(1);
    renderScreen(props({ series: [s], activeSeries: s }));
    expect(screen.getByText(/ainda não há com o que comparar/i)).toBeTruthy();
    expect(screen.queryByLabelText(/evolução de/i)).toBeNull();
  });

  it('duas coletas desenham o grafico com a unidade canonica', () => {
    renderScreen(props());
    expect(screen.getByLabelText(/evolução de/i)).toBeTruthy();
    expect(screen.getAllByText(/ng\/mL/).length).toBeGreaterThan(0);
  });

  it('analito sem nenhuma linha comparavel diz o que esta faltando', () => {
    const s = serieCom(0, { excluded: [excluida('pendente-de-revisao')] });
    renderScreen(props({ series: [s], activeSeries: s }));
    expect(screen.getByText(/nenhuma coleta.*conferida|ainda não há valor/i)).toBeTruthy();
  });
});

describe('AnalyteSeriesScreen — o que ficou de fora', () => {
  it('diz o que ficou de fora, com contagem e motivo', () => {
    const s = serieCom(2, { excluded: [excluida('pendente-de-revisao')] });
    renderScreen(props({ series: [s], activeSeries: s }));
    expect(screen.getByText(/1 resultado aguarda sua conferência/i)).toBeTruthy();
  });

  it('o motivo de cada exclusao e dito, e nao so a contagem', () => {
    const s = serieCom(2, { excluded: [excluida('limite-de-deteccao')] });
    renderScreen(props({ series: [s], activeSeries: s }));
    expect(screen.getByText(/limite, não como uma medida/i)).toBeTruthy();
  });

  it('cada exclusao leva ao documento dela', () => {
    const s = serieCom(2, { excluded: [excluida('sem-valor')] });
    renderScreen(props({ series: [s], activeSeries: s }));
    expect(screen.getByLabelText(/ver o documento/i)).toBeTruthy();
  });
});

describe('AnalyteSeriesScreen — o seletor de momento (D22)', () => {
  it('nao aparece quando ha um momento so', () => {
    renderScreen(props());
    expect(screen.queryByText(/momento da coleta/i)).toBeNull();
  });

  it('aparece quando ha mais de um', () => {
    const s = seriesDaCurvaGlicemica();
    renderScreen(props({ series: s, activeSeries: s[0], selectedMoment: 'jejum' }));
    expect(screen.getByText(/momento da coleta/i)).toBeTruthy();
    expect(screen.getAllByText(/jejum/i).length).toBeGreaterThan(0);
  });
});

describe('AnalyteSeriesScreen — o que a tela nao pode dizer', () => {
  it('sempre encaminha a um profissional de saude', () => {
    renderScreen(props());
    const texto = JSON.stringify(screen.toJSON());
    expect(checkLanguageRules(texto, { questionKind: 'clinica' })).toEqual({ ok: true });
  });

  it('nenhuma copy interpreta o resultado', () => {
    renderScreen(props());
    const texto = JSON.stringify(screen.toJSON()).toLowerCase();
    expect(texto).not.toMatch(
      /melhorou|piorou|alterado|preocupante|dentro da faixa|fora da faixa|tendência/,
    );
  });
});

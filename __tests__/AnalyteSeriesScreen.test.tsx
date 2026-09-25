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
import { ANALYTE_CATALOG } from '../amplify/functions/extract-document-data/analyteCatalog';
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

// D27: nenhum codigo LOINC e digitado a mao, nem como exemplo em teste, e
// comentario dizendo "vem do extrato oficial" nao e verificacao -- um literal
// errado e o comentario ao lado dele erram juntos. O codigo sai do catalogo
// gerado a partir do extrato, buscado pelo rotulo em portugues, que e campo
// nosso e pode ser digitado.
const doCatalogo = (rotulo: string) => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado;
};

const VITAMINA_D = doCatalogo('Vitamina D (25-OH)');
const GLICOSE = doCatalogo('Glicose');

function serieCom(n: number, over: Partial<AnalyteSeries> = {}): AnalyteSeries {
  return {
    analyteCode: VITAMINA_D.code,
    projectLabel: VITAMINA_D.projectLabel,
    analyteLabel: VITAMINA_D.label,
    collectionMoment: null,
    unit: 'ng/mL',
    points: DATAS.slice(0, n).map((d, i) => ponto(`p${i}`, d, 32 + i * 5)),
    excluded: [],
    ...over,
  };
}

/**
 * A linha do laudo que existe e NAO entra na comparacao. Ela carrega o
 * `result` inteiro de proposito: e dele que sai o valor com o sinal quando o
 * resultado e um limite (D21), e um fixture vazio esconderia essa exigencia.
 */
const LINHA_EXCLUIDA: LabResultView = {
  id: 'x1',
  analyteCode: VITAMINA_D.code,
  projectLabel: 'Vitamina D (25-OH)',
  analyteLabel: '25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma',
  value: 32.5,
  valueQualifier: null,
  unit: 'ng/mL',
  rawValue: '32,5',
  rawUnit: 'ng/mL',
  referenceLow: 30,
  referenceHigh: 100,
  collectedAt: '2026-06-01',
  collectionMoment: null,
  sourcePage: 2,
  reviewStatus: 'AUTO',
};

function excluida(
  reason: ExcludedResult['reason'],
  result: Partial<LabResultView> = {},
): ExcludedResult {
  return {
    id: 'x1',
    documentId: 'doc-2',
    collectedAt: '2026-06-01',
    reason,
    result: { ...LINHA_EXCLUIDA, ...result },
  };
}

/** `<0,01`: o laboratorio guardou o numero e o sinal ao lado dele (D21). */
function limiteDeDeteccao(): ExcludedResult {
  return excluida('limite-de-deteccao', {
    value: 0.01,
    valueQualifier: '<',
    rawValue: '<0,01',
  });
}

function seriesDaCurvaGlicemica(): AnalyteSeries[] {
  const base = { analyteCode: GLICOSE.code, projectLabel: GLICOSE.projectLabel, unit: 'mg/dL' };
  return [
    serieCom(2, { ...base, collectionMoment: 'jejum' }),
    serieCom(2, { ...base, collectionMoment: '120 minutos' }),
  ];
}

function props(over: Partial<UseAnalyteSeriesResult> = {}): UseAnalyteSeriesResult {
  const series = over.series ?? [serieCom(2)];
  return {
    options: [
      {
        analyteCode: VITAMINA_D.code,
        projectLabel: VITAMINA_D.projectLabel,
        collectionCount: 2,
        pendingCount: 0,
      },
    ],
    selectedCode: VITAMINA_D.code,
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
    const s = serieCom(2, { excluded: [limiteDeDeteccao()] });
    renderScreen(props({ series: [s], activeSeries: s }));
    expect(screen.getByText(/limite, não como uma medida/i)).toBeTruthy();
  });

  it('valor censurado continua legivel na lista, com o sinal preservado (D21)', () => {
    // O criterio de aceite promete o VALOR, e nao so o motivo: quem abre a
    // evolucao do analito precisa conseguir ler o `<0,01` ali, sem ter de
    // abrir o documento de origem para descobrir qual era o numero.
    const s = serieCom(2, { excluded: [limiteDeDeteccao()] });
    renderScreen(props({ series: [s], activeSeries: s }));
    expect(screen.getByText('<0,01 ng/mL')).toBeTruthy();
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
    // `temOrigem` e verdadeiro porque esta tela mostra o valor REGISTRADO, com a
    // data e o documento ao lado: a origem esta na propria tela. A R4 existe
    // contra numero que o modelo escreveu sem ter de onde tira-lo, e aqui nao ha
    // modelo nenhum no caminho.
    renderScreen(props());
    const texto = JSON.stringify(screen.toJSON());
    expect(checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true })).toEqual({
      ok: true,
    });
  });

  it('nenhuma copy interpreta o resultado', () => {
    renderScreen(props());
    const texto = JSON.stringify(screen.toJSON()).toLowerCase();
    expect(texto).not.toMatch(
      /melhorou|piorou|alterado|preocupante|dentro da faixa|fora da faixa|tendência/,
    );
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { AnalyteSeriesChart } from '@/components/AnalyteSeriesChart';
import { buildLinePath } from '@/components/charts/chartScale';
import type { AnalyteSeries, SeriesPoint } from '@/services/analyteSeries';

function ponto(over: Partial<SeriesPoint> & { id: string; collectedAt: string; value: number }): SeriesPoint {
  return {
    documentId: 'doc',
    referenceLow: 30,
    referenceHigh: 100,
    rawValue: '32,5',
    rawUnit: 'ng/mL',
    ...over,
  };
}

function serieCom(n: number): AnalyteSeries {
  const datas = ['2026-03-12', '2026-06-01', '2026-09-20'];
  return {
    analyteCode: '62292-8',
    projectLabel: 'Vitamina D (25-OH)',
    analyteLabel: '25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma',
    collectionMoment: null,
    unit: 'ng/mL',
    points: datas.slice(0, n).map((d, i) => ponto({ id: `p${i}`, collectedAt: d, value: 32 + i * 5 })),
    excluded: [],
  };
}

describe('AnalyteSeriesChart', () => {
  it('desenha a linha de referencia quando os laboratorios concordam', () => {
    render(<AnalyteSeriesChart referenceRange={{ low: 30, high: 100 }} series={serieCom(2)} />);
    expect(screen.getByLabelText(/evolução de/i)).toBeTruthy();
    expect(screen.queryByText(/faixas diferentes/i)).toBeNull();
  });

  it('NAO desenha linha de referencia quando eles divergem, e explica', () => {
    render(<AnalyteSeriesChart referenceRange={null} series={serieCom(2)} />);
    expect(screen.getByText(/laboratórios usam faixas diferentes/i)).toBeTruthy();
  });

  it('nao explica faixa divergente quando nenhum laboratorio informou faixa', () => {
    // Nao ha divergencia entre nada e nada. O aviso ali seria ruido.
    const semFaixa = serieCom(2);
    semFaixa.points = semFaixa.points.map((p) => ({ ...p, referenceLow: null, referenceHigh: null }));
    render(<AnalyteSeriesChart referenceRange={null} series={semFaixa} />);
    expect(screen.queryByText(/faixas diferentes/i)).toBeNull();
  });

  it('rotula TODOS os pontos com a data', () => {
    // Mitigacao registrada na spec: o eixo X do LineChart posiciona por
    // indice, e nao por data. Com todos os pontos rotulados nao ha ambiguidade
    // numa serie de duas a seis coletas, que e o que este dominio produz.
    render(<AnalyteSeriesChart referenceRange={null} series={serieCom(3)} />);
    // getAllByText porque o proprio LineChart rotula PARTE do eixo X. A
    // fileira abaixo do grafico e que rotula TODOS os pontos, e com o valor
    // junto -- que e o que o eixo nao da.
    expect(screen.getAllByText(/12\/03/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/01\/06/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20\/09/).length).toBeGreaterThan(0);
    // E o valor aparece ao lado de cada data:
    expect(screen.getByText(/12\/03 · 32/)).toBeTruthy();
  });

  it('nenhuma cor comunica julgamento', () => {
    // Verde para "dentro" e vermelho para "fora" e interpretacao clinica
    // pintada. O token de perigo do projeto e o que nao pode aparecer aqui.
    const { toJSON } = render(<AnalyteSeriesChart referenceRange={null} series={serieCom(3)} />);
    const cores = (JSON.stringify(toJSON()).match(/#[0-9a-f]{6}/gi) ?? []).map((c) => c.toLowerCase());
    expect(cores).not.toContain('#b3261e');
  });

  it('buraco quebra o traco -- nada e interpolado', () => {
    // Garantia herdada de chartScale, e esta EPIC depende dela. A assinatura
    // real e (points, width, height, yDomain, padding); o plano trocava a
    // ordem dos argumentos.
    const path = buildLinePath(
      [
        { dateKey: '2026-03-12', value: 32 },
        { dateKey: '2026-06-01', value: null },
        { dateKey: '2026-09-20', value: 41 },
      ],
      100,
      50,
      [0, 50],
      { top: 0, bottom: 0, left: 0, right: 0 },
    );
    expect(path.split('M').length - 1).toBeGreaterThan(1);
  });

  it('o resumo para leitor de tela diz os valores, nao um julgamento', () => {
    // O SVG e invisivel para acessibilidade, e este texto e tudo que a pessoa
    // ouve. Uma palavra de interpretacao aqui seria a mais invisivel de todas.
    render(<AnalyteSeriesChart referenceRange={null} series={serieCom(2)} />);
    const rotulo = screen.getByLabelText(/evolução de/i).props.accessibilityLabel.toLowerCase();
    expect(rotulo).toMatch(/ng\/ml/);
    expect(rotulo).toMatch(/32/);
    expect(rotulo).not.toMatch(/melhor|pior|alterado|subiu|caiu/);
  });
});

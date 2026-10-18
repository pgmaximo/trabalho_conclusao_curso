import React from 'react';
import { StyleSheet, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { BarChart, type BarChartPoint } from '@/components/charts/BarChart';
import { formatMonthLabel, monthlyChartPoints } from '@/utils/healthImportDisplay';

// Com os ~90 meses de um export de oito anos, o espaço fixo de 4px entre as
// barras passava da largura da tela sozinho, e o gráfico de passos aparecia
// vazio.

function monthlyPoints(count: number): BarChartPoint[] {
  const monthly = Array.from({ length: count }, (_, index) => {
    const year = 2018 + Math.floor((index + 10) / 12);
    const month = ((index + 10) % 12) + 1;
    return { month: `${year}-${String(month).padStart(2, '0')}`, mean: 8000 + index };
  });
  return monthlyChartPoints(monthly).map((point) => ({
    dateKey: point.dateKey,
    segments: point.value !== null ? [{ id: 'steps', value: point.value, color: '#10794E' }] : [],
  }));
}

function barRowGap(): number | undefined {
  const row = screen.UNSAFE_getAllByType(View).find((view) => StyleSheet.flatten(view.props.style)?.gap !== undefined);
  return StyleSheet.flatten(row?.props.style)?.gap as number | undefined;
}

function renderChart(points: BarChartPoint[]) {
  render(
    <BarChart
      accessibilityLabel="Passos por mês"
      emptyMessage="Sem dados"
      formatXLabel={formatMonthLabel}
      height={140}
      points={points}
      yUnit="passos/dia"
    />,
  );
}

describe('BarChart', () => {
  it('shrinks the gap between bars as the number of bars grows', () => {
    renderChart(monthlyPoints(12));
    expect(barRowGap()).toBe(4);
  });

  it('uses a 1px gap for an eight-year monthly series, so the bars keep a width', () => {
    renderChart(monthlyPoints(94));
    expect(barRowGap()).toBe(1);
  });

  it('labels the first and last month on the x axis', () => {
    renderChart(monthlyPoints(94));
    expect(screen.getByText('11/2018')).toBeTruthy();
    expect(screen.getByText('08/2026')).toBeTruthy();
  });
});

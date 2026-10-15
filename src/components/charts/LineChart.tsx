import React, { useState } from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import {
  buildLinePath,
  type ChartPoint,
  computeYDomain,
  niceTicks,
  xLabelIndices,
  xPositionForIndex,
  yPositionForValue,
} from './chartScale';

export type LineChartSeries = {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  style?: 'solid' | 'dashed';
  showDots?: boolean;
};

export type LineChartReferenceLine = {
  value: number;
  label: string;
  color: string;
};

type LineChartProps = {
  series: LineChartSeries[];
  height: number;
  yUnit: string;
  referenceLines?: LineChartReferenceLine[];
  /** Exibida no lugar do gráfico quando nenhuma série tem dado — nunca renderiza um gráfico vazio sem explicação. */
  emptyMessage: string;
  /** Resumo textual da série, para leitor de tela (o SVG é invisível para acessibilidade). */
  accessibilityLabel: string;
};

const Y_AXIS_WIDTH = 34;
const CHART_PADDING = { top: 10, bottom: 4, left: 2, right: 2 };

function formatShortDate(dateKey?: string): string {
  if (!dateKey) return '';
  const parts = dateKey.split('-');
  const month = parts[1];
  const day = parts[2];
  return month && day ? `${day}/${month}` : '';
}

/**
 * Gráfico de linha com múltiplas séries, linhas de referência e faixa
 * mín-máx (via duas séries `style: 'dashed'`). Dia sem dado vira quebra no
 * traço (chartScale.buildLinePath), nunca interpolação.
 */
export function LineChart({ series, height, yUnit, referenceLines = [], emptyMessage, accessibilityLabel }: LineChartProps) {
  const [width, setWidth] = useState(0);

  const hasData = series.some((s) => s.points.some((p) => p.value !== null));

  if (!hasData) {
    return (
      <View
        className="items-center justify-center rounded-app border border-app-border bg-app-surfaceMuted dark:border-app-dark-border dark:bg-app-dark-surfaceMuted"
        style={{ height }}
      >
        <Text className="px-6 text-center text-[14px] text-app-textMuted dark:text-app-dark-textMuted">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const chartWidth = Math.max(width - Y_AXIS_WIDTH, 0);
  const referenceAsPoints = referenceLines.map((ref) => ({ dateKey: '', value: ref.value }));
  const domain = computeYDomain([...series.map((s) => s.points), referenceAsPoints], { padPct: 0.15 });
  const ticks = niceTicks(domain, 4);

  const longestSeries = series.reduce((longest, current) =>
    current.points.length >= longest.points.length ? current : longest,
  );
  const labelIndices = xLabelIndices(longestSeries.points, 4);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View accessibilityLabel={accessibilityLabel} accessible onLayout={handleLayout}>
      <View className="flex-row">
        <View style={{ height, width: Y_AXIS_WIDTH }}>
          {ticks.map((tick, index) => (
            <Text
              className="text-[10px] text-app-textMuted dark:text-app-dark-textMuted"
              key={index}
              style={{ position: 'absolute', top: Math.max(0, yPositionForValue(tick, height, domain, CHART_PADDING) - 6) }}
            >
              {Math.round(tick)}
            </Text>
          ))}
        </View>

        {chartWidth > 0 ? (
          <Svg height={height} width={chartWidth}>
            {referenceLines.map((ref, index) => {
              const y = yPositionForValue(ref.value, height, domain, CHART_PADDING);
              return (
                <Line
                  key={index}
                  stroke={ref.color}
                  strokeDasharray="4,4"
                  strokeWidth={1}
                  x1={0}
                  x2={chartWidth}
                  y1={y}
                  y2={y}
                />
              );
            })}

            {series.map((s) => (
              <Path
                d={buildLinePath(s.points, chartWidth, height, domain, CHART_PADDING)}
                fill="none"
                key={s.id}
                stroke={s.color}
                strokeDasharray={s.style === 'dashed' ? '5,4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            ))}

            {series.flatMap((s) =>
              s.showDots
                ? s.points.map((point, index) =>
                    point.value !== null ? (
                      <Circle
                        cx={xPositionForIndex(index, s.points.length, chartWidth, CHART_PADDING)}
                        cy={yPositionForValue(point.value, height, domain, CHART_PADDING)}
                        fill={s.color}
                        key={`${s.id}-${index}`}
                        r={2.5}
                      />
                    ) : null,
                  )
                : [],
            )}
          </Svg>
        ) : null}
      </View>

      <View className="ml-[34px] mt-1 flex-row justify-between">
        {labelIndices.map((index) => (
          <Text className="text-[10px] text-app-textMuted dark:text-app-dark-textMuted" key={index}>
            {formatShortDate(longestSeries.points[index]?.dateKey)}
          </Text>
        ))}
      </View>

      {series.length > 1 ? (
        <View className="mt-2 flex-row flex-wrap gap-3">
          {series.map((s) => (
            <View className="flex-row items-center gap-1.5" key={s.id}>
              <View style={{ backgroundColor: s.color, height: 2, width: 10 }} />
              <Text className="text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text className="mt-1 text-[11px] text-app-textMuted dark:text-app-dark-textMuted">{yUnit}</Text>
    </View>
  );
}

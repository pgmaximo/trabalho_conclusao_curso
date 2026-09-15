import React from 'react';
import { Text, View } from 'react-native';

export type BarChartSegment = {
  id: string;
  value: number;
  color: string;
};

export type BarChartPoint = {
  dateKey: string;
  segments: BarChartSegment[];
};

export type BarChartGoalLine = {
  value: number;
  label: string;
};

type BarChartProps = {
  points: BarChartPoint[];
  height: number;
  yUnit: string;
  goalLine?: BarChartGoalLine;
  /** Fundo sutil nas colunas de sábado/domingo (ex.: passos/dia). */
  highlightWeekends?: boolean;
  emptyMessage: string;
  accessibilityLabel: string;
};

function isWeekend(dateKey: string): boolean {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

const AXIS_LABEL_HEIGHT = 20;

/**
 * Barras por dia, empilháveis (estágios de sono) — construído com Views
 * (flexbox), não SVG: barras são retângulos alinhados a um eixo, mais
 * simples e robusto em RN do que medir largura para desenhar `<Rect>`.
 */
export function BarChart({ points, height, yUnit, goalLine, highlightWeekends, emptyMessage, accessibilityLabel }: BarChartProps) {
  const hasData = points.some((point) => point.segments.some((segment) => segment.value > 0));

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

  const totals = points.map((point) => point.segments.reduce((sum, segment) => sum + segment.value, 0));
  const maxValue = Math.max(...totals, goalLine?.value ?? 0, 1);
  const barAreaHeight = height - AXIS_LABEL_HEIGHT;

  return (
    <View accessibilityLabel={accessibilityLabel} accessible>
      <View style={{ height: barAreaHeight, position: 'relative' }}>
        {goalLine ? (
          <View
            className="absolute left-0 right-0 border-t border-dashed border-app-accent dark:border-app-dark-accent"
            style={{ top: barAreaHeight - (goalLine.value / maxValue) * barAreaHeight }}
          />
        ) : null}

        <View className="h-full flex-row items-end gap-1">
          {points.map((point) => {
            const weekend = Boolean(highlightWeekends) && isWeekend(point.dateKey);

            return (
              <View
                className={[
                  'h-full flex-1 items-center justify-end rounded-t-sm',
                  weekend ? 'bg-app-surfaceMuted dark:bg-app-dark-surfaceMuted' : '',
                ].join(' ')}
                key={point.dateKey}
              >
                <View className="w-full items-stretch overflow-hidden rounded-t-sm">
                  {point.segments.map((segment) => (
                    <View
                      key={segment.id}
                      style={{
                        backgroundColor: segment.color,
                        height: Math.max(0, (segment.value / maxValue) * barAreaHeight),
                      }}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <Text className="mt-1 text-[11px] text-app-textMuted dark:text-app-dark-textMuted">
        {yUnit}
        {goalLine ? ` · meta: ${goalLine.label}` : ''}
      </Text>
    </View>
  );
}

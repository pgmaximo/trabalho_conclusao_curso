import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { buildLinePath, computeYDomain, isolatedPointIndices, xPositionForIndex, yPositionForValue, type ChartPoint } from './chartScale';

type SparklineProps = {
  points: ChartPoint[];
  color: string;
  width: number;
  height: number;
  accessibilityLabel?: string;
};

const PADDING = { top: 2, bottom: 2, left: 1, right: 1 };

/** Linha minimalista sem eixos/rótulos — usada dentro de `MetricCard`. */
export function Sparkline({ points, color, width, height, accessibilityLabel }: SparklineProps) {
  const hasData = points.some((point) => point.value !== null);
  if (!hasData || width <= 0) return null;

  const domain = computeYDomain([points], { padPct: 0.15 });
  const path = buildLinePath(points, width, height, domain, PADDING);

  return (
    // A acessibilidade fica na View, e não no Svg: no react-native-web o Svg
    // repassa `accessible` cru para o DOM, que reclamava no console.
    <View accessibilityLabel={accessibilityLabel} accessible={!!accessibilityLabel}>
      <Svg height={height} width={width}>
        <Path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        {/* Um mês com dado entre dois sem dado não forma linha — sem o ponto,
            uma métrica medida poucas vezes (peso) sumia do gráfico. */}
        {isolatedPointIndices(points).map((index) => (
          <Circle
            cx={xPositionForIndex(index, points.length, width, PADDING)}
            cy={yPositionForValue(points[index]!.value!, height, domain, PADDING)}
            fill={color}
            key={index}
            r={1.75}
          />
        ))}
      </Svg>
    </View>
  );
}

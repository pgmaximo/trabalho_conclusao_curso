import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { buildLinePath, computeYDomain, type ChartPoint } from './chartScale';

type SparklineProps = {
  points: ChartPoint[];
  color: string;
  width: number;
  height: number;
};

/** Linha minimalista sem eixos/rótulos — usada dentro de `MetricCard`. */
export function Sparkline({ points, color, width, height }: SparklineProps) {
  const hasData = points.some((point) => point.value !== null);
  if (!hasData || width <= 0) return null;

  const domain = computeYDomain([points], { padPct: 0.15 });
  const path = buildLinePath(points, width, height, domain, { top: 2, bottom: 2, left: 1, right: 1 });

  return (
    <Svg height={height} width={width}>
      <Path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
    </Svg>
  );
}

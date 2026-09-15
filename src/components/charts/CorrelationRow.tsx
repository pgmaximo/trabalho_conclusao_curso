import React from 'react';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type CorrelationRowProps = {
  labelA: string;
  labelB: string;
  /** -1..1 */
  r: number;
  /** Dias pareados — sempre exibido: um r com n baixo não é confiável. */
  n: number;
  interpretation: string;
};

/**
 * Barra divergente centrada em zero (sem SVG — dois `View` de largura
 * percentual bastam) mostrando a força e a direção de uma correlação, mais
 * `r` e `n` sempre visíveis por extenso — um r=0.9 com n=15 não é o mesmo
 * que r=0.9 com n=200, e o usuário precisa ver os dois números.
 */
export function CorrelationRow({ labelA, labelB, r, n, interpretation }: CorrelationRowProps) {
  const colors = useThemeColors();
  const isPositive = r >= 0;
  const magnitudePercent = Math.min(Math.abs(r), 1) * 50; // metade da barra, de cada lado do centro
  const barColor = isPositive ? colors.primary : colors.danger;

  return (
    <View className="mb-3 rounded-card border border-app-border bg-app-surface p-3 dark:border-app-dark-border dark:bg-app-dark-surface">
      <Text className="mb-2 text-[14px] font-semibold text-app-text dark:text-app-dark-text">
        {labelA} × {labelB}
      </Text>

      <View className="h-2 flex-row overflow-hidden rounded-full bg-app-border dark:bg-app-dark-border">
        <View className="h-full flex-1 flex-row justify-end">
          {!isPositive ? <View style={{ backgroundColor: barColor, width: `${magnitudePercent * 2}%` }} /> : null}
        </View>
        <View className="h-full flex-1 flex-row justify-start">
          {isPositive ? <View style={{ backgroundColor: barColor, width: `${magnitudePercent * 2}%` }} /> : null}
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">{interpretation}</Text>
        <Text className="ml-2 text-[12px] font-semibold text-app-textMuted dark:text-app-dark-textMuted">
          r={r.toFixed(2)}, n={n}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// Arquivo: YearMonthsGrid.tsx
// Descricao: Visao anual da Agenda — 12 meses com contagem, apresentacao pura
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AgendaMonthCell } from '@/services/agendaDateRange';

type YearMonthsGridProps = {
  cells: AgendaMonthCell[];
  onSelectMonth: (isoDate: string) => void;
};

// Contagem como TEXTO, nao numero solto: leitor de tela precisa da unidade.
function countLabel(count: number): string {
  if (count === 0) return 'Sem compromissos';
  return count === 1 ? '1 compromisso' : `${count} compromissos`;
}

export function YearMonthsGrid({ cells, onSelectMonth }: YearMonthsGridProps) {
  return (
    <View className="mb-4 flex-row flex-wrap">
      {cells.map((cell) => (
        <View className="w-1/3 p-1" key={cell.isoDate}>
          <Pressable
            accessibilityLabel={`${cell.label}, ${countLabel(cell.count)}`}
            accessibilityRole="button"
            className="min-h-[64px] items-center justify-center rounded-app border border-app-border bg-app-surface p-2 dark:border-app-dark-border dark:bg-app-dark-surface"
            onPress={() => onSelectMonth(cell.isoDate)}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text
              className={`text-[15px] ${
                cell.count > 0 ? 'font-bold' : 'font-normal'
              } text-app-text dark:text-app-dark-text`}
            >
              {cell.label}
            </Text>
            <Text className="mt-1 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {countLabel(cell.count)}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

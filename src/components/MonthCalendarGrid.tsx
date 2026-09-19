// =============================================================================
// Arquivo: MonthCalendarGrid.tsx
// Descricao: Grade mensal da Agenda — apresentacao pura
// =============================================================================
//
// Recebe as semanas ja montadas por buildMonthCells(). Nao calcula data.
// Marcador de compromisso e ponto MAIS peso de fonte — nunca cor sozinha
// (regra do design system, DESIGN_TOKENS.md §4).
//
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import type { CalendarDateItem } from '@/types/models';

type MonthCalendarGridProps = {
  weeks: (CalendarDateItem | null)[][];
  selectedIsoDate: string;
  onSelectDate: (isoDate: string) => void;
};

const WEEKDAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Rotulo por extenso para leitor de tela: "15" sozinho nao diz nada.
const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function accessibilityLabelFor(cell: CalendarDateItem): string {
  const [year, month, day] = cell.isoDate.split('-').map(Number);
  const label = DATE_LABEL_FORMATTER.format(new Date(year, month - 1, day));
  return cell.hasAppointments ? `${label}, com compromissos` : label;
}

export function MonthCalendarGrid({ weeks, selectedIsoDate, onSelectDate }: MonthCalendarGridProps) {
  const colors = useThemeColors();

  return (
    <View className="mb-4">
      <View className="flex-row">
        {WEEKDAY_HEADERS.map((header, index) => (
          <View className="flex-1 items-center py-1" key={`header-${index}`}>
            <Text className="text-[12px] font-semibold text-app-textSecondary dark:text-app-dark-textSecondary">
              {header}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View className="flex-row" key={`week-${weekIndex}`}>
          {week.map((cell, dayIndex) => {
            if (!cell) {
              return <View className="flex-1" key={`empty-${weekIndex}-${dayIndex}`} style={{ height: 44 }} />;
            }

            const isSelected = cell.isoDate === selectedIsoDate;

            return (
              <Pressable
                accessibilityLabel={accessibilityLabelFor(cell)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className="flex-1 items-center justify-center"
                hitSlop={2}
                key={cell.isoDate}
                onPress={() => onSelectDate(cell.isoDate)}
                style={({ pressed }) => [{ height: 44 }, pressed && { opacity: 0.6 }]}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: cell.isToday && !isSelected ? 1 : 0,
                    borderColor: colors.secondary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      // Peso acompanha o ponto: o marcador nunca e so cor.
                      fontWeight: cell.hasAppointments ? '700' : '400',
                      color: isSelected ? colors.onPrimary : colors.text,
                    }}
                  >
                    {cell.day}
                  </Text>
                </View>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    marginTop: 1,
                    borderRadius: 2,
                    backgroundColor: cell.hasAppointments && !isSelected ? colors.primary : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

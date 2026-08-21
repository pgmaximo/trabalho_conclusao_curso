import React from 'react';
import { Pressable, ScrollView, Text, StyleSheet } from 'react-native';

import { FONTS, RADII, SPACING, useThemeColors } from '@/constants/theme';

type FilterChipsProps = {
  options: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  /**
   * Opções desabilitadas — não disparam `onFilterChange` e recebem indicação visual
   * "Em breve" (ex.: filtro "Alterados" em 3a, sem dado real de status de resultado,
   * ver specs/03-exames-receitas/lista/plan.md §2).
   */
  disabledOptions?: string[];
};

// Padrão de chip selecionado/não-selecionado do Canvas 1a (DESIGN_TOKENS.md §4
// "Segmented/chip selectors"), reutilizável para filtros de lista, sexo,
// tabagismo, sim/não, tipo de consulta etc. Scroll horizontal conforme Canvas 3a §3.
export function FilterChips({ options, activeFilter, onFilterChange, disabledOptions }: FilterChipsProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isActive = activeFilter === option;
        const isDisabled = disabledOptions?.includes(option) ?? false;
        return (
          <Pressable
            key={option}
            disabled={isDisabled}
            accessibilityState={{ disabled: isDisabled, selected: isActive }}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: isDisabled ? colors.border : isActive ? colors.primary : colors.border,
                backgroundColor: isDisabled ? colors.surfaceMuted : isActive ? colors.primarySoft : colors.surface,
                opacity: isDisabled ? 0.6 : 1,
              },
              pressed && !isDisabled && styles.chipPressed,
            ]}
            onPress={() => onFilterChange(option)}
          >
            <Text
              style={[
                FONTS.rotulo,
                { color: isDisabled ? colors.textMuted : isActive ? colors.primaryDark : colors.textSecondary },
              ]}
            >
              {option}
              {isDisabled ? ' · Em breve' : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  chip: {
    height: 48,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    opacity: 0.8,
  },
});

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, StyleSheet } from 'react-native';

import { FONTS, RADII, SPACING, useThemeColors, type ThemeColors } from '@/constants/theme';

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

type ChipProps = {
  option: string;
  isActive: boolean;
  isDisabled: boolean;
  colors: ThemeColors;
  onPress: () => void;
};

// `style` de Pressable NÃO pode ser função aqui — sem `className`, o NativeWind
// (jsxImportSource global) descarta o resultado da função e o chip renderiza sem
// nenhum estilo (bug relatado: filtro sem o visual sólido de seleção).
function Chip({ option, isActive, isDisabled, colors, onPress }: ChipProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityState={{ disabled: isDisabled, selected: isActive }}
      style={[
        styles.chip,
        {
          borderColor: isDisabled ? colors.border : isActive ? colors.primary : colors.border,
          backgroundColor: isDisabled ? colors.surfaceMuted : isActive ? colors.primary : colors.surface,
          opacity: isDisabled ? 0.6 : 1,
        },
        isPressed && !isDisabled && styles.chipPressed,
      ]}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
    >
      <Text
        style={[
          FONTS.rotulo,
          { color: isDisabled ? colors.textMuted : isActive ? colors.onPrimary : colors.textSecondary },
          isActive && !isDisabled ? { fontWeight: '600' } : null,
        ]}
      >
        {option}
        {isDisabled ? ' · Em breve' : ''}
      </Text>
    </Pressable>
  );
}

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
      {options.map((option) => (
        <Chip
          key={option}
          option={option}
          isActive={activeFilter === option}
          isDisabled={disabledOptions?.includes(option) ?? false}
          colors={colors}
          onPress={() => onFilterChange(option)}
        />
      ))}
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

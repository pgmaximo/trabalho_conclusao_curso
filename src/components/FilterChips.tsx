import React, { useState } from 'react';
import { Pressable, ScrollView, Text, StyleSheet } from 'react-native';

import { FONTS, RADII, SPACING, useThemeColors, type ThemeColors } from '@/constants/theme';

type FilterChipsProps = {
  options: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

type ChipProps = {
  option: string;
  isActive: boolean;
  colors: ThemeColors;
  onPress: () => void;
};

// `style` de Pressable NÃO pode ser função aqui — sem `className`, o NativeWind
// (jsxImportSource global) descarta o resultado da função e o chip renderiza sem
// nenhum estilo (bug relatado: filtro sem o visual sólido de seleção).
function Chip({ option, isActive, colors, onPress }: ChipProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      accessibilityState={{ selected: isActive }}
      style={[
        styles.chip,
        {
          borderColor: isActive ? colors.primary : colors.border,
          backgroundColor: isActive ? colors.primary : colors.surface,
        },
        isPressed && styles.chipPressed,
      ]}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
    >
      <Text
        style={[
          FONTS.rotulo,
          { color: isActive ? colors.onPrimary : colors.textSecondary },
          isActive ? { fontWeight: '600' } : null,
        ]}
      >
        {option}
      </Text>
    </Pressable>
  );
}

// Padrão de chip selecionado/não-selecionado do Canvas 1a (DESIGN_TOKENS.md §4
// "Segmented/chip selectors"), reutilizável para filtros de lista, sexo,
// tabagismo, sim/não, tipo de consulta etc. Scroll horizontal conforme Canvas 3a §3.
export function FilterChips({ options, activeFilter, onFilterChange }: FilterChipsProps) {
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

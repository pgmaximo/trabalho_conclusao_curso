import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';

import { FONTS, RADII, SPACING, useThemeColors } from '@/constants/theme';

type FilterChipsProps = {
  options: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

// Padrão de chip selecionado/não-selecionado do Canvas 1a (DESIGN_TOKENS.md §4
// "Segmented/chip selectors"), reutilizável para filtros de lista, sexo,
// tabagismo, sim/não, tipo de consulta etc.
export function FilterChips({ options, activeFilter, onFilterChange }: FilterChipsProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = activeFilter === option;
        return (
          <Pressable
            key={option}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: isActive ? colors.primary : colors.border,
                backgroundColor: isActive ? colors.primarySoft : colors.surface,
              },
              pressed && styles.chipPressed,
            ]}
            onPress={() => onFilterChange(option)}
          >
            <Text
              style={[
                FONTS.rotulo,
                { color: isActive ? colors.primaryDark : colors.textSecondary },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1.5,
  },
  chipPressed: {
    opacity: 0.8,
  },
});

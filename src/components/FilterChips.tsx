import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type FilterChipsProps = {
  options: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

export function FilterChips({ options, activeFilter, onFilterChange }: FilterChipsProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = activeFilter === option;
        return (
          <Pressable
            key={option}
            style={({ pressed }) => [
              styles.chip,
              isActive && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
            onPress={() => onFilterChange(option)}
          >
            <Text
              style={[styles.chipText, isActive && styles.chipTextActive]}
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
    marginVertical: SIZES.base,
    gap: SIZES.small,
  },
  chip: {
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipPressed: {
    opacity: 0.8,
  },
});

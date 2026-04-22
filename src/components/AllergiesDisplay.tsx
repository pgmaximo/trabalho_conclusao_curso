import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface AllergiesDisplayProps {
  title: string;
  items: string[];
}

export function AllergiesDisplay({ title, items }: AllergiesDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.badge}>
            <Text style={styles.badgeText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.large,
  },
  title: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.small,
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.small,
  },
  badge: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    ...FONTS.caption,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
});

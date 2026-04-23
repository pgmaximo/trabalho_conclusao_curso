import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface HealthDataRowProps {
  items: {
    label: string;
    value: string;
  }[];
}

export function HealthDataRow({ items }: HealthDataRowProps) {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View
          key={index}
          style={[
            styles.item,
            index !== items.length - 1 && styles.itemBorder,
          ]}
        >
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: SIZES.large,
  },
  item: {
    flex: 1,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBorder: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  value: {
    ...FONTS.heading,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});

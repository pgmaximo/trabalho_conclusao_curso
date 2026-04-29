import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface ReminderBannerProps {
  title: string;
  description: string;
}

export function ReminderBanner({ title, description }: ReminderBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🔔</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#E0F7F4',
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: SIZES.base,
    marginBottom: SIZES.base,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: SIZES.base,
    marginTop: 2,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  description: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});

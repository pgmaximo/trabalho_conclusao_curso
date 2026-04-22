import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type AlertBannerProps = {
  icon: string;
  title: string;
  message: string;
  type?: 'warning' | 'info' | 'success';
};

export function AlertBanner({ icon, title, message, type = 'info' }: AlertBannerProps) {
  const backgroundColor =
    type === 'warning' ? '#FEF3C7' : type === 'success' ? '#DBEAFE' : '#E0E7FF';
  const borderColor =
    type === 'warning' ? '#FCD34D' : type === 'success' ? '#60A5FA' : '#818CF8';
  const textColor =
    type === 'warning' ? '#92400E' : type === 'success' ? '#1E40AF' : '#3730A3';

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginBottom: SIZES.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 18,
    marginRight: SIZES.small,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    ...FONTS.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    ...FONTS.caption,
    lineHeight: 18,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type MetricCardProps = {
  label: string;
  value: string;
  status: string;
  statusColor?: string;
  progressPercent?: number;
  variant?: 'horizontal' | 'vertical';
};

export function MetricCard({
  label,
  value,
  status,
  statusColor = COLORS.primary,
  progressPercent,
  variant = 'vertical',
}: MetricCardProps) {
  const backgroundColor = statusColor === COLORS.primary ? '#E8F5EB' : statusColor;

  return (
    <View style={[styles.card, variant === 'horizontal' && styles.cardHorizontal]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {progressPercent !== undefined && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
      )}
      <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    minHeight: 140,
    justifyContent: 'space-between',
    marginHorizontal: SIZES.small,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
  },
  header: {
    marginBottom: SIZES.small,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...FONTS.heading,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  status: {
    ...FONTS.caption,
    fontWeight: '600',
  },
});

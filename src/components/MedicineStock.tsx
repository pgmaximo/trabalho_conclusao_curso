import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface MedicineStockProps {
  name: string;
  quantity: number;
  unit: string;
  status: 'ok' | 'low' | 'critical';
  percentage?: number;
}

export function MedicineStock({
  name,
  quantity,
  unit,
  status,
  percentage = 100,
}: MedicineStockProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'ok':
        return '#27AE60';
      case 'low':
        return '#F39C12';
      case 'critical':
        return '#E74C3C';
      default:
        return COLORS.primary;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'ok':
        return 'OK';
      case 'low':
        return 'Baixo';
      case 'critical':
        return 'Crítico';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.quantity}>
            {quantity} {unit}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.badgeText}>{getStatusLabel()}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginBottom: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.base,
  },
  info: {
    flex: 1,
  },
  name: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  quantity: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  badge: {
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.base,
    borderRadius: 6,
  },
  badgeText: {
    ...FONTS.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  progressContainer: {
    marginTop: SIZES.small,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});

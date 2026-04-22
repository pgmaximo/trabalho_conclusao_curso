import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type AnalysisMetricRowProps = {
  label: string;
  value: string;
  status: string;
  statusColor: string;
};

export function AnalysisMetricRow({ label, value, status, statusColor }: AnalysisMetricRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rightContent}>
        <Text style={styles.value}>{value}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 80,
    textAlign: 'right',
    marginRight: SIZES.base,
  },
  statusBadge: {
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    borderRadius: 6,
    minWidth: 70,
  },
  status: {
    ...FONTS.caption,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
});

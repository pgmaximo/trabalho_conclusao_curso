import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS, SIZES } from '@/constants/theme';

type AnalysisTableProps = {
  data: {
    label: string;
    value: string;
    status: string;
    statusColor: string;
  }[];
};

export function AnalysisTable({ data }: AnalysisTableProps) {
  return (
    <View style={styles.container}>
      {data.map((row, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.leftContent}>
            <Text style={styles.label}>{row.label}</Text>
          </View>
          <View style={styles.rightContent}>
            <Text style={styles.value}>{row.value}</Text>
            <View style={[styles.statusBadge, { backgroundColor: row.statusColor }]}>
              <Text style={styles.status}>{row.status}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: SIZES.small,
    marginVertical: SIZES.small,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  leftContent: {
    flex: 1,
  },
  label: {
    ...FONTS.body,
    color: '#5B3B8F',
    fontWeight: '600',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.small,
  },
  value: {
    ...FONTS.body,
    color: '#5B3B8F',
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: SIZES.base,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 65,
  },
  status: {
    ...FONTS.caption,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 10,
  },
});

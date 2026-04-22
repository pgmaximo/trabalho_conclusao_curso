import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface MedicineCardProps {
  name: string;
  dosage: string;
  time: string;
  status: 'pending' | 'taken' | 'missed';
  onPress?: () => void;
  onToggle?: () => void;
}

export function MedicineCard({
  name,
  dosage,
  time,
  status,
  onPress,
  onToggle,
}: MedicineCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return '#E74C3C';
      case 'taken':
        return '#27AE60';
      case 'missed':
        return '#F39C12';
      default:
        return COLORS.primary;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'taken':
        return 'Tomado';
      case 'missed':
        return 'Perdido';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return '●';
      case 'taken':
        return '✓';
      case 'missed':
        return '⚠';
      default:
        return '';
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.dosage}>{dosage}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Pressable
          style={[styles.statusButton, { borderColor: getStatusColor() }]}
          onPress={onToggle}
        >
          <Text style={[styles.statusIcon, { color: getStatusColor() }]}>
            {getStatusIcon()}
          </Text>
        </Pressable>
      </View>
      <View style={[styles.statusLabel, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusLabelText}>{getStatusLabel()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8F0',
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: SIZES.base,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.base,
    paddingBottom: SIZES.small,
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
  dosage: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  time: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  statusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 20,
  },
  statusLabel: {
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.base,
    alignItems: 'flex-end',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 0,
  },
  statusLabelText: {
    ...FONTS.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
});

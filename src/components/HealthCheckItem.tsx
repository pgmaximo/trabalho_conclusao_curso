import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface HealthCheckItemProps {
  title: string;
  date: string;
  status: 'em_dia' | 'vencido' | 'pendente';
  onPress?: () => void;
}

export function HealthCheckItem({
  title,
  date,
  status,
  onPress,
}: HealthCheckItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'em_dia':
        return '#27AE60';
      case 'vencido':
        return '#E74C3C';
      case 'pendente':
        return '#F39C12';
      default:
        return COLORS.primary;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'em_dia':
        return 'Em dia';
      case 'vencido':
        return 'Vencido';
      case 'pendente':
        return 'Pendente';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'em_dia':
        return '✓';
      case 'vencido':
        return '⚠';
      case 'pendente':
        return '☐';
      default:
        return '';
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.badgeText}>{getStatusLabel()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginBottom: SIZES.small,
  },
  pressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.base,
  },
  icon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
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
  date: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: SIZES.small,
    borderRadius: 4,
  },
  badgeText: {
    ...FONTS.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
});

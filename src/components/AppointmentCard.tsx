import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface AppointmentCardProps {
  time: string;
  title: string;
  location: string;
  type: 'consulta' | 'retorno' | 'exame';
  onPress?: () => void;
}

export function AppointmentCard({
  time,
  title,
  location,
  type,
  onPress,
}: AppointmentCardProps) {
  const getTypeColor = () => {
    switch (type) {
      case 'consulta':
        return '#3498DB';
      case 'retorno':
        return '#E74C3C';
      case 'exame':
        return '#F39C12';
      default:
        return COLORS.primary;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'consulta':
        return 'Consulta';
      case 'retorno':
        return 'Retorno';
      case 'exame':
        return 'Exame';
      default:
        return '';
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.leftBorder, { backgroundColor: getTypeColor() }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.time}>{time}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor() }]}>
            <Text style={styles.typeLabel}>{getTypeLabel()}</Text>
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.location}>{location}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  leftBorder: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: SIZES.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  time: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: 12,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: SIZES.small,
    borderRadius: 4,
  },
  typeLabel: {
    ...FONTS.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  title: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  location: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});

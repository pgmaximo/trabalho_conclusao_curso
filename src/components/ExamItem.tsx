import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

export type ExamItemType = 'exam' | 'prescription' | 'report';

type ExamItemProps = {
  icon: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusColor: string;
  onPress?: () => void;
};

export function ExamItem({
  icon,
  title,
  subtitle,
  statusLabel,
  statusColor,
  onPress,
}: ExamItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusLabel}</Text>
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
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.base,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radius,
    marginLeft: SIZES.base,
  },
  statusText: {
    ...FONTS.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
});

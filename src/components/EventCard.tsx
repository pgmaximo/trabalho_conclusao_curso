import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type EventCardProps = {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionColor?: string;
  onActionPress?: () => void;
  variant?: 'default' | 'alert';
};

export function EventCard({
  icon,
  title,
  subtitle,
  actionLabel,
  actionColor = COLORS.primary,
  onActionPress,
  variant = 'default',
}: EventCardProps) {
  const isAlert = variant === 'alert';
  const borderColor = isAlert ? '#F5D547' : COLORS.border;
  const backgroundColor = isAlert ? '#FFFBEB' : COLORS.surface;

  return (
    <View style={[styles.card, { borderColor, backgroundColor }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {actionLabel && (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={onActionPress}
        >
          <Text style={[styles.actionText, { color: actionColor }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radius,
    borderWidth: 1,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    marginVertical: SIZES.small,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: SIZES.base,
  },
  textContainer: {
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
  action: {
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    ...FONTS.body,
    fontWeight: '600',
    fontSize: 12,
  },
});

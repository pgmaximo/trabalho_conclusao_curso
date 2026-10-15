import React from 'react';
import { View, Text, Pressable } from 'react-native';

import { useThemeColors } from '@/constants/theme';

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
  actionColor,
  onActionPress,
  variant = 'default',
}: EventCardProps) {
  const colors = useThemeColors();
  const isAlert = variant === 'alert';

  return (
    <View
      className={[
        'my-2 flex-row items-center justify-between rounded-app border px-3 py-2',
        isAlert
          ? 'border-app-warning bg-app-warningSoft dark:border-app-dark-warning dark:bg-app-dark-warningSoft'
          : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface',
      ].join(' ')}
    >
      <View className="flex-1 flex-row items-center">
        <Text className="mr-3 text-2xl">{icon}</Text>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">{title}</Text>
          <Text className="mt-0.5 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {subtitle}
          </Text>
        </View>
      </View>
      {actionLabel ? (
        <Pressable
          className="px-3 py-2"
          onPress={onActionPress}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text className="text-xs font-semibold" style={{ color: actionColor ?? colors.primary }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

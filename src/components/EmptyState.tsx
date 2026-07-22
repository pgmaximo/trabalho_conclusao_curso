import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { useThemeColors } from '@/constants/theme';

type EmptyStateTone = 'neutral' | 'error';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: string;
  tone?: EmptyStateTone;
  actionLabel?: string;
  onActionPress?: () => void;
};

// DECISION: nomes de Ionicon sao ASCII com hifen; emojis caem no else (compat retro
// com chamadas antigas que ainda passam emoji)
function isIoniconName(icon: string): boolean {
  return /^[a-z0-9-]+$/.test(icon);
}

export function EmptyState({
  title,
  description,
  icon = 'medkit-outline',
  tone = 'neutral',
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  const colors = useThemeColors();
  const accentColor = tone === 'error' ? colors.danger : colors.primary;

  return (
    <View className="items-center justify-center py-8">
      {isIoniconName(icon) ? (
        <Ionicons
          color={accentColor}
          name={icon as never}
          size={28}
          style={{ marginBottom: 8 }}
        />
      ) : (
        <Text className="mb-2 text-[28px]" style={{ color: accentColor }}>
          {icon}
        </Text>
      )}
      <Text className="mb-1 text-center text-2xl font-bold text-app-text dark:text-app-dark-text">
        {title}
      </Text>
      <Text className="max-w-[280px] text-center text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
        {description}
      </Text>
      {actionLabel && onActionPress ? (
        <Button
          title={actionLabel}
          onPress={onActionPress}
          variant={tone === 'error' ? 'secondary' : 'primary'}
          style={{ marginTop: 16 }}
        />
      ) : null}
    </View>
  );
}

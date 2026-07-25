import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Badge } from '@/components/Badge';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeVariant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'neutral';
  action?: ReactNode;
};

export function ScreenHeader({
  title,
  subtitle,
  badgeLabel,
  badgeVariant = 'primary',
  action,
}: ScreenHeaderProps) {
  return (
    <View className="mb-6 flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-2xl font-bold text-app-text dark:text-app-dark-text">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {subtitle}
          </Text>
        ) : null}
        {badgeLabel ? (
          <Badge label={badgeLabel} variant={badgeVariant} style={{ marginTop: 8 }} />
        ) : null}
      </View>
      {action ? <View className="pt-1">{action}</View> : null}
    </View>
  );
}

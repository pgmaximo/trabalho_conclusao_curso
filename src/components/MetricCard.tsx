import React from 'react';
import { View, Text } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type MetricCardProps = {
  label: string;
  value: string;
  status: string;
  statusColor?: string;
  progressPercent?: number;
  variant?: 'horizontal' | 'vertical';
};

export function MetricCard({
  label,
  value,
  status,
  statusColor,
  progressPercent,
  variant = 'vertical',
}: MetricCardProps) {
  const colors = useThemeColors();
  const accent = statusColor ?? colors.primary;

  return (
    <View
      className={[
        'mx-1 flex-1 justify-between rounded-app border border-app-border bg-app-surface p-3 dark:border-app-dark-border dark:bg-app-dark-surface',
        variant === 'horizontal' ? 'min-h-[90px] flex-row items-center' : 'min-h-[140px]',
      ].join(' ')}
    >
      <View className="mb-2">
        <Text className="text-[13px] uppercase tracking-wide text-app-textSecondary dark:text-app-dark-textSecondary">
          {label}
        </Text>
      </View>

      <Text className="mb-1 text-2xl font-bold text-app-text dark:text-app-dark-text">{value}</Text>

      {progressPercent !== undefined ? (
        <View className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-app-border dark:bg-app-dark-border">
          <View
            style={{ width: `${Math.min(progressPercent, 100)}%`, height: '100%', backgroundColor: accent }}
          />
        </View>
      ) : null}

      <Text className="text-[13px] font-semibold" style={{ color: accent }}>
        {status}
      </Text>
    </View>
  );
}

import React, { ReactNode } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';

type SectionProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Section({ title, subtitle, action, children, style }: SectionProps) {
  return (
    <View className="mb-6" style={style}>
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-app-textSecondary dark:text-app-dark-textSecondary">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-[13px] text-app-textMuted dark:text-app-dark-textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action ? <View>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}

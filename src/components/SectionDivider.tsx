import React from 'react';
import { Text, View } from 'react-native';

export function SectionDivider({ label }: { label: string }) {
  return (
    <View className="my-6 flex-row items-center">
      <View className="h-px flex-1 bg-app-border dark:bg-app-dark-border" />
      <Text className="mx-3 text-[13px] uppercase leading-[18px] tracking-[0.7px] text-app-textMuted dark:text-app-dark-textMuted">
        {label}
      </Text>
      <View className="h-px flex-1 bg-app-border dark:bg-app-dark-border" />
    </View>
  );
}

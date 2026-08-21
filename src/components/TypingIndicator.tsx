import React from 'react';
import { View } from 'react-native';

export function TypingIndicator() {
  return (
    <View className="mb-3 flex-row justify-start">
      <View className="flex-row items-center gap-[5px] rounded-app border border-app-border bg-app-surface px-4 py-3 dark:border-app-dark-border dark:bg-app-dark-surface">
        <View className="size-[7px] rounded-full bg-app-textSecondary dark:bg-app-dark-textSecondary" />
        <View className="size-[7px] rounded-full bg-app-textSecondary dark:bg-app-dark-textSecondary" />
        <View className="size-[7px] rounded-full bg-app-textSecondary dark:bg-app-dark-textSecondary" />
      </View>
    </View>
  );
}

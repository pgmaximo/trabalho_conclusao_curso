import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/Card';

type ScreenSkeletonProps = {
  blocks?: number;
};

const lineClass = 'overflow-hidden rounded-full bg-app-border dark:bg-app-dark-border';

export function ScreenSkeleton({ blocks = 3 }: ScreenSkeletonProps) {
  return (
    <View className="gap-4">
      <View className={`${lineClass} h-6 w-[52%]`} />
      <View className={`${lineClass} h-4 w-[68%]`} />

      {Array.from({ length: blocks }).map((_, index) => (
        <Card key={index}>
          <View className={`${lineClass} mb-4 h-4 w-[45%]`} />
          <View className={`${lineClass} mb-3 h-3.5 w-full`} />
          <View className={`${lineClass} h-3.5 w-[70%]`} />
        </Card>
      ))}
    </View>
  );
}

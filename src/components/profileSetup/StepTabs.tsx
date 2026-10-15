import React from 'react';
import { Pressable, Text, View } from 'react-native';

type StepTabsProps = {
  steps: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

export function StepTabs({ steps, currentIndex, onSelect }: StepTabsProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {steps.map((step, index) => {
        const isActive = currentIndex === index;
        const isVisited = index < currentIndex;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className={[
              'rounded-full border px-3 py-2',
              isActive
                ? 'border-app-primary bg-app-primary dark:border-app-dark-primary dark:bg-app-dark-primary'
                : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface',
              isVisited && !isActive ? 'border-app-primarySoft dark:border-app-dark-primarySoft' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={step}
            onPress={() => onSelect(index)}
          >
            <Text
              className={[
                'text-[13px] font-bold leading-[18px]',
                isActive
                  ? 'text-app-surface dark:text-app-dark-onPrimary'
                  : 'text-app-textSecondary dark:text-app-dark-textSecondary',
              ].join(' ')}
            >
              {step}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

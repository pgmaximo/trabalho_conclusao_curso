import React from 'react';
import { Pressable, Text, View } from 'react-native';

type SelectableOptionProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectableOption({ label, description, selected, onPress }: SelectableOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        'min-h-[56px] flex-row items-center justify-between gap-3 rounded-[18px] border p-4',
        selected
          ? 'border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft'
          : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface',
      ].join(' ')}
      onPress={onPress}
      style={({ pressed }) => [pressed ? { opacity: 0.88 } : null]}
    >
      <View className="flex-1">
        <Text
          className={[
            'text-[15px] font-semibold leading-[22px]',
            selected
              ? 'text-app-primaryDark dark:text-app-dark-primary'
              : 'text-app-text dark:text-app-dark-text',
          ].join(' ')}
        >
          {label}
        </Text>
        {description ? (
          <Text className="mt-2 text-[13px] leading-[18px] text-app-textMuted dark:text-app-dark-textMuted">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        className={[
          'size-5 items-center justify-center rounded-[10px] border-2',
          selected
            ? 'border-app-primary dark:border-app-dark-primary'
            : 'border-app-borderStrong dark:border-app-dark-borderStrong',
        ].join(' ')}
      >
        {selected ? (
          <View className="size-2.5 rounded-[5px] bg-app-primary dark:bg-app-dark-primary" />
        ) : null}
      </View>
    </Pressable>
  );
}

import React from 'react';
import { Text, View } from 'react-native';

import { SelectableOption } from '@/components/profileSetup/SelectableOption';

type Option<TValue extends string> = {
  label: string;
  value: TValue;
  description?: string;
};

type OptionGroupProps<TValue extends string> = {
  title: string;
  helperText?: string;
  value: TValue;
  options: Option<TValue>[];
  onChange: (value: TValue) => void;
};

export function OptionGroup<TValue extends string>({
  title,
  helperText,
  value,
  options,
  onChange,
}: OptionGroupProps<TValue>) {
  return (
    <View className="mt-4">
      <Text className="text-[15px] font-bold leading-[22px] text-app-text dark:text-app-dark-text">
        {title}
      </Text>
      {helperText ? (
        <Text className="mt-2 text-[13px] leading-[18px] text-app-textMuted dark:text-app-dark-textMuted">
          {helperText}
        </Text>
      ) : null}
      <View className="mt-3 gap-3">
        {options.map((option) => (
          <SelectableOption
            description={option.description}
            key={option.value}
            label={option.label}
            onPress={() => onChange(option.value)}
            selected={value === option.value}
          />
        ))}
      </View>
    </View>
  );
}

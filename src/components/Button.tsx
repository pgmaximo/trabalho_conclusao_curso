import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  ViewStyle,
} from 'react-native';

import { useThemeColors } from '@/constants/theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = 'primary', style, ...rest }: ButtonProps) {
  const colors = useThemeColors();
  const isPrimary = variant === 'primary';
  const isDisabled = Boolean(rest.disabled);

  const buttonClassName = [
    'mt-3 w-full items-center justify-center rounded-app py-4',
    isPrimary
      ? 'bg-app-primary dark:bg-app-dark-primary'
      : 'border border-app-primary bg-transparent dark:border-app-dark-primary',
    isDisabled
      ? 'border-app-border bg-app-border dark:border-app-dark-border dark:bg-app-dark-border'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const textClassName = [
    'text-base font-semibold leading-5',
    isPrimary
      ? 'text-app-onPrimary dark:text-app-dark-onPrimary'
      : 'text-app-primary dark:text-app-dark-primary',
    isDisabled ? 'text-app-textMuted dark:text-app-dark-textMuted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Pressable
      android_ripple={{ color: isPrimary ? colors.primaryDark : colors.background }}
      className={buttonClassName}
      style={({ pressed }) => [
        isPrimary && !isDisabled
          ? {
              boxShadow: `0px 8px 18px ${colors.shadow}1F`,
            }
          : null,
        pressed && !isDisabled ? { opacity: 0.88 } : null,
        isDisabled ? { boxShadow: 'none' } : null,
        style,
      ]}
      {...rest}
    >
      <Text className={textClassName}>{title}</Text>
    </Pressable>
  );
}

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { useThemeColors } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'social' | 'destructive';

type ButtonProps = Omit<PressableProps, 'style' | 'disabled'> & {
  title: string;
  variant?: ButtonVariant;
  /** Estado de carregamento — bloqueia o toque e troca para o bg "pressed" (#0C6341). */
  loading?: boolean;
  /** Motivo exibido como texto abaixo do botão quando `disabled` é true (nunca só um botão cinza). */
  disabledReason?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabledReason,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const colors = useThemeColors();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isSocial = variant === 'social';
  const isDestructive = variant === 'destructive';
  const isDisabled = Boolean(disabled) && !loading;
  const isBlocked = Boolean(disabled) || loading;

  const buttonClassName = [
    'mt-3 h-14 w-full flex-row items-center justify-center gap-2 rounded-field',
    isPrimary && !isDisabled
      ? loading
        ? 'bg-app-primaryDark dark:bg-app-dark-primaryDark'
        : 'bg-app-primary dark:bg-app-dark-primary'
      : '',
    isSecondary && !isDisabled
      ? 'border border-app-primary bg-transparent dark:border-app-dark-primary'
      : '',
    isSocial && !isDisabled
      ? 'border-[1.5px] border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface'
      : '',
    isDestructive && !isDisabled
      ? 'border-[1.5px] border-app-danger bg-app-surface dark:border-app-dark-danger dark:bg-app-dark-surface'
      : '',
    isDisabled
      ? 'border border-app-border bg-app-border dark:border-app-dark-border dark:bg-app-dark-border'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const textClassName = [
    'text-[17px] font-semibold leading-6',
    isPrimary ? 'text-app-onPrimary dark:text-app-dark-onPrimary' : '',
    isSecondary ? 'text-app-primary dark:text-app-dark-primary' : '',
    isSocial ? 'text-app-text dark:text-app-dark-text' : '',
    isDestructive ? 'text-app-danger dark:text-app-dark-danger' : '',
    isDisabled ? 'text-app-textMuted dark:text-app-dark-textMuted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const label = loading ? `${title}…` : title;
  const spinnerColor = isPrimary ? colors.onPrimary : colors.primary;

  const button = (
    <Pressable
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      android_ripple={{ color: isPrimary ? colors.primaryDark : colors.background }}
      className={buttonClassName}
      disabled={isBlocked}
      style={({ pressed }) => [
        isPrimary && !isDisabled
          ? {
              boxShadow: `0px 8px 18px ${colors.shadow}1F`,
            }
          : null,
        pressed && !isBlocked ? { opacity: 0.88 } : null,
        isDisabled ? { boxShadow: 'none' } : null,
        style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={spinnerColor} size="small" /> : null}
      <Text className={textClassName}>{label}</Text>
    </Pressable>
  );

  if (isDisabled && disabledReason) {
    return (
      <View>
        {button}
        <Text className="mt-2 text-center text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {disabledReason}
        </Text>
      </View>
    );
  }

  return button;
}

import React from 'react';
import {
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useThemeColors } from '@/constants/theme';

type FormFieldProps = TextInputProps & {
  label: string;
  icon?: React.ReactNode;
  hasError?: boolean;
  helperText?: string;
  errorMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
  containerClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
  style?: StyleProp<TextStyle>;
};

export function FormField({
  label,
  icon,
  hasError,
  helperText,
  errorMessage,
  containerStyle,
  containerClassName,
  inputWrapperClassName,
  inputClassName,
  style,
  ...rest
}: FormFieldProps) {
  const colors = useThemeColors();
  const isInvalid = Boolean(hasError || errorMessage);

  const wrapperClassName = [
    'flex-row items-center rounded-[18px] border px-4 py-3.5',
    isInvalid
      ? 'border-app-danger bg-app-dangerSoft dark:border-app-dark-danger dark:bg-app-dark-dangerSoft'
      : 'border-app-border bg-app-inputBackground dark:border-app-dark-border dark:bg-app-dark-inputBackground',
    inputWrapperClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={['mt-4', containerClassName].filter(Boolean).join(' ')} style={containerStyle}>
      <Text className="mb-2 text-[15px] leading-[22px] text-app-text dark:text-app-dark-text">
        {label}
      </Text>

      <View className={wrapperClassName}>
        {icon ? (
          <View className="mr-3 w-5 items-center justify-center">
            {typeof icon === 'string' ? (
              <Text className="text-base text-app-placeholder dark:text-app-dark-placeholder">
                {icon}
              </Text>
            ) : (
              icon
            )}
          </View>
        ) : null}

        <TextInput
          accessibilityLabel={label}
          className={[
            'min-h-5 flex-1 text-[15px] leading-[22px] text-app-text dark:text-app-dark-text',
            inputClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          placeholderTextColor={colors.placeholder}
          style={style}
          {...rest}
        />
      </View>

      {errorMessage ? (
        <Text className="mt-2 text-[13px] leading-[18px] text-app-danger dark:text-app-dark-danger">
          {errorMessage}
        </Text>
      ) : null}

      {!isInvalid && helperText ? (
        <Text className="mt-2 text-[13px] leading-[18px] text-app-textMuted dark:text-app-dark-textMuted">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

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
  // ATTENTION: useThemeColors() mantido apenas para placeholderTextColor —
  // prop nativa do TextInput que não aceita className
  const colors = useThemeColors();
  const isInvalid = Boolean(hasError || errorMessage);

  const wrapperClasses = [
    'flex-row items-center rounded-app border px-4 py-3',
    isInvalid
      ? 'border-app-danger bg-app-dangerSoft dark:border-app-dark-danger dark:bg-app-dark-dangerSoft'
      : 'border-app-border bg-app-inputBackground dark:border-app-dark-border dark:bg-app-dark-inputBackground',
    inputWrapperClassName ?? '',
  ].join(' ');

  return (
    <View className={`mt-6 ${containerClassName ?? ''}`} style={containerStyle}>
      <Text className="mb-3 text-sm font-semibold text-app-text dark:text-app-dark-text">
        {label}
      </Text>

      <View className={wrapperClasses}>
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
          className={`flex-1 text-[15px] text-app-text dark:text-app-dark-text ${inputClassName ?? ''}`}
          placeholderTextColor={colors.placeholder}
          style={style}
          {...rest}
        />
      </View>

      {errorMessage ? (
        <Text className="mt-3 text-[13px] text-app-danger dark:text-app-dark-danger">
          {errorMessage}
        </Text>
      ) : null}

      {!isInvalid && helperText ? (
        <Text className="mt-3 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

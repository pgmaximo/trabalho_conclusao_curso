import React from 'react';
import { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { FormField } from '@/components/FormField';

type AuthInputProps = TextInputProps & {
  label: string;
  icon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  hasError?: boolean;
  errorMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
  containerClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
};

export function AuthInput({
  label,
  icon,
  trailingAction,
  hasError,
  errorMessage,
  containerStyle,
  containerClassName,
  inputWrapperClassName,
  inputClassName,
  style,
  ...rest
}: AuthInputProps) {
  return (
    <FormField
      label={label}
      icon={icon}
      trailingAction={trailingAction}
      hasError={hasError}
      errorMessage={errorMessage}
      containerStyle={containerStyle}
      containerClassName={containerClassName}
      inputWrapperClassName={inputWrapperClassName}
      inputClassName={inputClassName}
      style={style}
      {...rest}
    />
  );
}

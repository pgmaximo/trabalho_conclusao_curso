import React, { useState } from 'react';
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
  /** Slot à direita do valor, dentro do input (ex.: link "Mostrar/Ocultar" no campo de senha). */
  trailingAction?: React.ReactNode;
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
  trailingAction,
  hasError,
  helperText,
  errorMessage,
  containerStyle,
  containerClassName,
  inputWrapperClassName,
  inputClassName,
  style,
  onFocus,
  onBlur,
  ...rest
}: FormFieldProps) {
  // ATTENTION: useThemeColors() mantido apenas para placeholderTextColor —
  // prop nativa do TextInput que não aceita className
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);
  const isInvalid = Boolean(hasError || errorMessage);
  const isMultiline = Boolean(rest.multiline);

  // Estados do campo (Canvas 1a — DESIGN_TOKENS.md §4 "Inputs"):
  // default: borda 1.5px; focus: borda 2px secundária; error: borda 2px
  // danger + fundo tintado. Altura fixa 56px, raio 14px (rounded-field).
  // Campos `multiline` não podem usar a altura/alinhamento fixos acima — o
  // wrapper precisa crescer com o texto (senão o TextInput fica maior que o
  // wrapper e vaza para cima, sobrepondo o label do campo). Aplicado aqui
  // (e não deixado a cargo do caller via `inputWrapperClassName`) porque um
  // dos formulários esquecia o override e reproduzia o bug.
  const wrapperClasses = [
    isMultiline ? 'min-h-14 h-auto items-start py-3' : 'h-14 items-center',
    'flex-row rounded-field border px-4',
    isInvalid
      ? 'border-2 border-app-danger bg-app-dangerSoft dark:border-app-dark-danger dark:bg-app-dark-dangerSoft'
      : isFocused
        ? 'border-2 border-app-secondary bg-app-inputBackground dark:border-app-dark-secondary dark:bg-app-dark-inputBackground'
        : 'border-[1.5px] border-app-border bg-app-inputBackground dark:border-app-dark-border dark:bg-app-dark-inputBackground',
    inputWrapperClassName ?? '',
  ].join(' ');

  return (
    <View className={`mt-6 ${containerClassName ?? ''}`} style={containerStyle}>
      <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
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
          className={`flex-1 text-[17px] text-app-text dark:text-app-dark-text ${inputClassName ?? ''}`}
          placeholderTextColor={colors.placeholder}
          style={style}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          {...rest}
        />

        {trailingAction ? <View className="ml-3">{trailingAction}</View> : null}
      </View>

      {errorMessage ? (
        <View className="mt-3 flex-row items-center gap-2">
          <View
            className="items-center justify-center rounded-full bg-app-danger dark:bg-app-dark-danger"
            style={{ height: 22, width: 22 }}
          >
            <Text className="text-xs font-bold text-white">!</Text>
          </View>
          <Text className="flex-1 text-[16px] text-app-danger dark:text-app-dark-danger">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {!isInvalid && helperText ? (
        <Text className="mt-3 text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

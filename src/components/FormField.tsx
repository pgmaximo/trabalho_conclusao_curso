import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useThemeColors, COLORS, FONTS, SIZES } from '@/constants/theme';

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

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputWrapper, isInvalid && styles.inputWrapperInvalid]}>
        {icon ? (
          <View style={styles.iconContainer}>
            {typeof icon === 'string' ? (
              <Text style={styles.iconText}>{icon}</Text>
            ) : (
              icon
            )}
          </View>
        ) : null}

        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { color: COLORS.text }, style]}
          {...rest}
        />
      </View>

      {errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}

      {!isInvalid && helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SIZES.large,
  },
  label: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SIZES.small,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.base,
    paddingVertical: 12,
  },
  inputWrapperInvalid: {
    borderColor: COLORS.danger,
    backgroundColor: `${COLORS.danger}15`,
  },
  iconContainer: {
    marginRight: SIZES.small,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    color: COLORS.placeholder,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    minHeight: 20,
  },
  errorMessage: {
    marginTop: SIZES.small,
    ...FONTS.caption,
    color: COLORS.danger,
  },
  helperText: {
    marginTop: SIZES.small,
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
});

import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type AuthInputProps = TextInputProps & {
  label: string;
  icon?: string;
};

export function AuthInput({ label, icon, style, ...rest }: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <TextInput
          placeholderTextColor={COLORS.placeholder}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SIZES.large,
  },
  label: {
    ...FONTS.body,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.base,
    paddingVertical: 14,
  },
  icon: {
    marginRight: SIZES.small,
    fontSize: 16,
    color: COLORS.placeholder,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
    minHeight: 20,
  },
});

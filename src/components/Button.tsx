import React from 'react';
import { Pressable, Text, StyleSheet, PressableProps } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, variant = 'primary', style, ...rest }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        style,
      ]}
      android_ripple={{ color: isPrimary ? COLORS.primaryDark : COLORS.background }}
      {...rest}
    >
      <Text style={[styles.title, isPrimary ? styles.primaryText : styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: SIZES.base,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.small,
  },
  primary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  secondary: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  title: {
    ...FONTS.button,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: COLORS.primary,
  },
  pressed: {
    opacity: 0.88,
  },
});

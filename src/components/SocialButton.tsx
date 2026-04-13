import React from 'react';
import { Pressable, Text, StyleSheet, PressableProps } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type SocialButtonProps = PressableProps & {
  title: string;
};

export function SocialButton({ title, ...rest }: SocialButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      android_ripple={{ color: COLORS.background }}
      {...rest}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: SIZES.base,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  title: {
    ...FONTS.body,
    color: COLORS.text,
  },
  pressed: {
    opacity: 0.85,
  },
});

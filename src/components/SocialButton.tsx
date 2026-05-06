import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  Text,
  StyleSheet,
  PressableProps,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type SocialButtonProps = PressableProps & {
  title: string;
  iconSource?: ImageSourcePropType;
};

export function SocialButton({ title, iconSource, ...rest }: SocialButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      android_ripple={{ color: COLORS.background }}
      {...rest}
    >
      {iconSource ? <Image source={iconSource} style={styles.icon} resizeMode="contain" /> : null}
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
    flexDirection: 'row',
    gap: SIZES.small,
    marginHorizontal: 4,
  },
  icon: {
    width: 20,
    height: 20,
  },
  title: {
    ...FONTS.body,
    color: COLORS.text,
  },
  pressed: {
    opacity: 0.85,
  },
});

import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  PressableProps,
  Text,
} from 'react-native';

import { useThemeColors } from '@/constants/theme';

type SocialButtonProps = PressableProps & {
  title: string;
  iconSource?: ImageSourcePropType;
};

const socialIconSize = 20;

export function SocialButton({ title, iconSource, ...rest }: SocialButtonProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      android_ripple={{ color: colors.background }}
      className="mx-1 flex-1 flex-row items-center justify-center gap-3 rounded-app border border-app-border bg-app-surface py-4 dark:border-app-dark-border dark:bg-app-dark-surface"
      style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
      {...rest}
    >
      {iconSource ? (
        <Image
          className="h-5 w-5"
          resizeMode="contain"
          source={iconSource}
          style={{ height: socialIconSize, width: socialIconSize }}
          testID="social-button-icon"
        />
      ) : null}
      <Text className="text-[15px] leading-[22px] text-app-text dark:text-app-dark-text">
        {title}
      </Text>
    </Pressable>
  );
}

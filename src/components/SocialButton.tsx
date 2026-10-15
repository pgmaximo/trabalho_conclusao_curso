import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  PressableProps,
  Text,
  View,
} from 'react-native';

import { useThemeColors } from '@/constants/theme';

type SocialButtonProps = PressableProps & {
  title: string;
  iconSource?: ImageSourcePropType;
};

const socialIconSize = 20;
const socialLogoTileSize = 26;

// Variante "social" do botão de autenticação (Google/Apple) — Canvas 1a
// (DESIGN_TOKENS.md §4 "Social (Google/Apple)"): bg branco, borda 1.5px
// #DFE3E1, texto #141817, com tile 26×26 (bg #EFF1F0) ao redor do logo.
export function SocialButton({ title, iconSource, ...rest }: SocialButtonProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      android_ripple={{ color: colors.background }}
      className="mx-1 h-14 flex-1 flex-row items-center justify-center gap-3 rounded-field border-[1.5px] border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface"
      style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
      {...rest}
    >
      {iconSource ? (
        <View
          className="items-center justify-center rounded-full bg-app-neutralSoft dark:bg-app-dark-neutralSoft"
          style={{ height: socialLogoTileSize, width: socialLogoTileSize }}
        >
          <Image
            className="size-5"
            resizeMode="contain"
            source={iconSource}
            style={{ height: socialIconSize, width: socialIconSize }}
            testID="social-button-icon"
          />
        </View>
      ) : null}
      <Text className="text-[15px] leading-[22px] text-app-text dark:text-app-dark-text">
        {title}
      </Text>
    </Pressable>
  );
}

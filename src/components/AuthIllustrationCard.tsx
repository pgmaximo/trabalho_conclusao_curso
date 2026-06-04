import React, { ReactNode } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type AuthIllustrationCardProps = {
  children: ReactNode;
  imageSource: ImageSourcePropType;
};

/**
 * Shared auth composition that keeps the illustration visually attached to the
 * form card while the whole block stays centered on short screens.
 */
export function AuthIllustrationCard({ children, imageSource }: AuthIllustrationCardProps) {
  const colors = useThemeColors();

  return (
    <View className="w-full justify-center" testID="auth-illustration-card-root">
      <View className="items-stretch">
        <View className="z-10 -mb-20 items-center">
          <Image
            className="h-[260px] w-full max-w-[320px]"
            resizeMode="contain"
            source={imageSource}
            testID="auth-illustration-card-image"
          />
        </View>

        <View
          className="z-20 rounded-card bg-app-surface p-6 pt-[88px] dark:bg-app-dark-surface"
          style={{ boxShadow: `0px 12px 30px ${colors.shadow}14` }}
          testID="auth-illustration-card-content"
        >
          {children}
        </View>
      </View>
    </View>
  );
}

import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

type BrandLogoProps = {
  variant: 'full' | 'symbol';
  size?: 'default' | 'screen';
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
};

const logoSources = {
  full: require('../../assets/images/logos/logo com nome.svg'),
  symbol: require('../../assets/images/logos/logo sem nome.svg'),
} as const;

const logoLayouts = {
  // The source SVGs include transparent padding around the artwork.
  full: {
    container: { width: 180, height: 204 },
    image: { width: 300, height: 300, left: -70, top: -56 },
  },
  symbol: {
    container: { width: 40, height: 44 },
    image: { width: 88, height: 88, left: -27, top: -16 },
  },
  symbolScreen: {
    container: { width: 84, height: 94 },
    image: { width: 184, height: 184, left: -57, top: -33 },
  },
} as const;

const logoLayers = [0, 1];

export function BrandLogo({
  variant,
  size = 'default',
  testID,
  accessible = true,
  accessibilityLabel,
}: BrandLogoProps) {
  const layout = variant === 'symbol' && size === 'screen' ? logoLayouts.symbolScreen : logoLayouts[variant];

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={{ ...layout.container, overflow: 'hidden' }}
      testID={testID}
    >
      {logoLayers.map((layer) => (
        <Image
          key={layer}
          accessible={false}
          contentFit="contain"
          source={logoSources[variant]}
          style={{ position: 'absolute', ...layout.image }}
        />
      ))}
    </View>
  );
}

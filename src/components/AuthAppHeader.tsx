// =============================================================================
// File: AuthAppHeader.tsx
// Description: Branded header used on the login and registration screens.
// =============================================================================

import React from 'react';
import { Text, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';

/**
 * BrandLogo crops the transparent padding in the SVG without modifying the
 * original asset.
 */
export function AuthAppHeader() {
  return (
    <View className="mb-[26px] items-center" testID="auth-app-header">
      <BrandLogo accessibilityLabel="SuaSaúde" testID="auth-app-header-logo" variant="full" />
      <Text
        className="mt-3 text-center text-base leading-[21px] text-app-textSecondary dark:text-app-dark-textSecondary"
        testID="auth-app-header-tagline"
      >
        Sua saúde organizada em um só lugar.
      </Text>
    </View>
  );
}

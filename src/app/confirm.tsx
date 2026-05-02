import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { ConfirmScreen } from '@/screens/ConfirmScreen';

export default function ConfirmRoute() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  return (
    <ConfirmScreen
      email={email}
      onBackToLogin={() => router.replace('/')}
      onConfirmSuccess={() => router.replace('/profile-setup')}
    />
  );
}

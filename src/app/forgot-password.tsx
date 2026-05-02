import React from 'react';
import { router } from 'expo-router';

import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';

export default function ForgotPasswordRoute() {
  return <ForgotPasswordScreen onBackToLogin={() => router.replace('/')} />;
}

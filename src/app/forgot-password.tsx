import React from 'react';
import { router } from 'expo-router';

import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { blurActiveWebElement } from '@/utils/webFocus';

export default function ForgotPasswordRoute() {
  function navigateToLogin() {
    blurActiveWebElement();
    router.replace('/');
  }

  return <ForgotPasswordScreen onBackToLogin={navigateToLogin} />;
}

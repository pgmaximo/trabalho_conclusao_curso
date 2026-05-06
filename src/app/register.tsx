/**
 * Resumo do arquivo:
 * Rota de cadastro do Expo Router.
 * Conecta RegisterScreen ao fluxo de confirmacao por e-mail e ao fluxo Google.
 */
import React from 'react';
import { router } from 'expo-router';

import { RegisterScreen } from '@/screens/RegisterScreen';
import { resolvePostAuthRoute } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

export default function RegisterRoute() {
  async function navigateAfterGoogleAuth() {
    const nextRoute = await resolvePostAuthRoute();
    router.replace(nextRoute);
  }

  function navigateToLogin() {
    blurActiveWebElement();
    router.replace('/');
  }

  function navigateToConfirm(email: string) {
    blurActiveWebElement();
    router.replace({
      pathname: '/confirm',
      params: { email },
    });
  }

  return (
    <RegisterScreen
      onNavigateToLogin={navigateToLogin}
      onRegisterSuccess={navigateToConfirm}
      onGoogleAuthSuccess={navigateAfterGoogleAuth}
    />
  );
}

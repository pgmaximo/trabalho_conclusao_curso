/**
 * Resumo do arquivo:
 * Rota inicial do app no Expo Router.
 * Renderiza a tela de login e decide a rota pos-autenticacao sem depender de App.tsx.
 */
import React from 'react';
import { router } from 'expo-router';

import { HomeScreen } from '@/screens/HomeScreen';
import { resolvePostAuthRoute } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

export default function LoginRoute() {
  async function navigateAfterAuth() {
    const nextRoute = await resolvePostAuthRoute();
    router.replace(nextRoute);
  }

  function navigateToRegister() {
    blurActiveWebElement();
    router.push('/register');
  }

  function navigateToForgotPassword() {
    blurActiveWebElement();
    router.push('/forgot-password');
  }

  return (
    <HomeScreen
      onNavigateToRegister={navigateToRegister}
      onNavigateToForgotPassword={navigateToForgotPassword}
      onLogin={navigateAfterAuth}
      onGoogleAuthSuccess={navigateAfterAuth}
    />
  );
}

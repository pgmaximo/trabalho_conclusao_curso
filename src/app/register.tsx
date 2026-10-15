/**
 * Resumo do arquivo:
 * Rota de cadastro do Expo Router.
 * Conecta RegisterScreen ao fluxo de confirmacao por e-mail e ao fluxo Google.
 */
import React from 'react';
import { router } from 'expo-router';

import { useUserContext } from '@/contexts/UserContext';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { resolvePostAuthRoute } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

export default function RegisterRoute() {
  const { refreshUser } = useUserContext();

  async function navigateAfterGoogleAuth() {
    // Mesmo motivo da rota de login: o perfil foi buscado quando ainda nao
    // havia sessao.
    await refreshUser();
    const nextRoute = await resolvePostAuthRoute();
    router.replace(nextRoute);
  }

  function navigateToLogin() {
    blurActiveWebElement();
    router.replace('/');
  }

  // DECISION: Passa email e password para o ConfirmScreen para que o usuario
  // seja automaticamente autenticado apos confirmar email.
  // Em mobile apps, navigation params sao seguros (nao expostos publicamente como em web).
  function navigateToConfirm(email: string, password: string) {
    blurActiveWebElement();
    router.replace({
      pathname: '/confirm',
      params: { email, password },
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

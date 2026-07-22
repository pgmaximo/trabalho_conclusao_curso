/**
 * Resumo do arquivo:
 * Rota de confirmacao de cadastro.
 * Recebe o e-mail e senha pela URL e avanca para o setup inicial apos confirmar a conta.
 * A senha eh usada para fazer auto-signin apos confirmacao do email.
 */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { ConfirmScreen } from '@/screens/ConfirmScreen';
import { blurActiveWebElement } from '@/utils/webFocus';

export default function ConfirmRoute() {
  const params = useLocalSearchParams<{ email?: string; password?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const password = typeof params.password === 'string' ? params.password : undefined;

  function navigateToProfileSetup() {
    blurActiveWebElement();
    router.replace('/profile-setup');
  }

  function navigateToLogin() {
    blurActiveWebElement();
    router.replace('/');
  }

  return (
    <ConfirmScreen
      email={email}
      password={password}
      onConfirmSuccess={navigateToProfileSetup}
      onBackToLogin={navigateToLogin}
    />
  );
}

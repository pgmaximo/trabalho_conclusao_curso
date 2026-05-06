/**
 * Resumo do arquivo:
 * Rota de confirmacao de cadastro.
 * Recebe o e-mail pela URL e avanca para o setup inicial apos confirmar a conta.
 */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { ConfirmScreen } from '@/screens/ConfirmScreen';
import { blurActiveWebElement } from '@/utils/webFocus';

export default function ConfirmRoute() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

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
      onConfirmSuccess={navigateToProfileSetup}
      onBackToLogin={navigateToLogin}
    />
  );
}

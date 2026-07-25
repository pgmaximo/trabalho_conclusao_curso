/**
 * Resumo do arquivo:
 * Rota inicial do app no Expo Router (tela de bootstrap + login).
 * Se ja existe sessao ativa, redireciona direto para o destino pos-auth;
 * caso contrario, exibe a tela de login. A decisao de rota fica AQUI (tela
 * filha do Stack) e nao no _layout raiz, para nao remontar o navegador e
 * cair em loop de roteamento.
 */
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getCurrentUser } from 'aws-amplify/auth';

import { LoginScreen } from '@/screens/LoginScreen';
import { resolvePostAuthRoute } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

export default function LoginRoute() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function redirectIfAuthenticated() {
      try {
        await getCurrentUser();
        const nextRoute = await resolvePostAuthRoute();
        if (isActive) {
          router.replace(nextRoute);
        }
      } catch {
        // Sem sessao ativa — exibe o login.
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    }

    redirectIfAuthenticated();

    return () => {
      isActive = false;
    };
  }, []);

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

  // Enquanto verifica a sessao, nao renderiza o login (evita "piscar" o login
  // antes de redirecionar um usuario ja autenticado).
  if (isCheckingSession) {
    return null;
  }

  return (
    <LoginScreen
      onNavigateToRegister={navigateToRegister}
      onNavigateToForgotPassword={navigateToForgotPassword}
      onLogin={navigateAfterAuth}
      onGoogleAuthSuccess={navigateAfterAuth}
    />
  );
}

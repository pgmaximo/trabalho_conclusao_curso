/**
 * Resumo do arquivo:
 * Rota de configuracao inicial do perfil.
 * Marca o setup como concluido e leva o usuario para o dashboard autenticado.
 */
import React, { useState } from 'react';
import { router } from 'expo-router';
import { getCurrentUser } from 'aws-amplify/auth';

import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { saveUserProfile, UserNotAuthenticatedError } from '@/services/profileSetupRepository';
import { useUserContext } from '@/contexts/UserContext';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

const SESSION_ENDED_MESSAGE = 'Sua sessão terminou. Entre de novo para concluir o perfil.';

export default function ProfileSetupRoute() {
  const { refreshUser } = useUserContext();
  // A falha aparece na tela, junto do botão, e não num pop-up do sistema
  // (specs/00-fundacao/consistencia-e-textos/spec.md, D4).
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function completeProfileSetup(values: ProfileSetupFormValues) {
    setSubmitError(null);
    try {
      // DECISION: Verifica se o usuario esta realmente autenticado antes de salvar o perfil.
      // Isso fornece um diagnostico melhor se ha problemas de autenticacao.
      try {
        const currentUser = await getCurrentUser();
        console.log('Usuario autenticado:', currentUser.userId);
      } catch (authError) {
        console.error('Erro: Usuario nao esta autenticado', authError);
        setSubmitError(SESSION_ENDED_MESSAGE);
        return;
      }

      await saveUserProfile(values);
      // Atualiza o UserContext (onboardingCompleted: true) antes de navegar
      await refreshUser();
      router.replace('/dashboard');
    } catch (error) {
      console.log('Erro ao salvar perfil:', error);
      
      // Fornece mensagens de erro mais descriptivas baseado no tipo de erro
      const sessionEnded =
        error instanceof UserNotAuthenticatedError ||
        (error instanceof Error &&
          (error.message.includes('NoValidAuthTokens') || error.message.includes('federated jwt')));

      setSubmitError(
        sessionEnded
          ? SESSION_ENDED_MESSAGE
          : 'Não foi possível salvar seu perfil agora. Verifique sua conexão e tente novamente.',
      );
    }
  }

  return (
    <OnboardingScreen
      onBack={() => router.replace('/')}
      onComplete={completeProfileSetup}
      submitError={submitError}
    />
  );
}

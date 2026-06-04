/**
 * Resumo do arquivo:
 * Rota de configuracao inicial do perfil.
 * Marca o setup como concluido e leva o usuario para o dashboard autenticado.
 */
import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { saveUserProfile } from '@/services/profileSetupRepository';
import { useUserContext } from '@/contexts/UserContext';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

export default function ProfileSetupRoute() {
  const { refreshUser } = useUserContext();

  async function completeProfileSetup(values: ProfileSetupFormValues) {
    try {
      await saveUserProfile(values);
      // Atualiza o UserContext (onboardingCompleted: true) antes de navegar
      await refreshUser();
      router.replace('/dashboard');
    } catch (error) {
      console.log('Erro ao salvar perfil:', error);
      Alert.alert(
        'Erro ao salvar perfil',
        'Nao foi possivel salvar seu perfil agora. Verifique sua conexao e tente novamente.',
      );
    }
  }

  return (
    <OnboardingScreen
      onBack={() => router.replace('/')}
      onComplete={completeProfileSetup}
    />
  );
}

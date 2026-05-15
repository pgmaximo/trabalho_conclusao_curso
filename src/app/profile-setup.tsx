/**
 * Resumo do arquivo:
 * Rota de configuracao inicial do perfil.
 * Marca o setup como concluido e leva o usuario para o dashboard autenticado.
 */
import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';
import { markProfileSetupCompleted } from '@/services/auth';
import { saveUserProfile } from '@/services/profileSetupRepository';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

export default function ProfileSetupRoute() {
  async function completeProfileSetup(values: ProfileSetupFormValues) {
    try {
      await saveUserProfile(values);
      await markProfileSetupCompleted();
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
    <ProfileSetupScreen
      onBack={() => router.replace('/')}
      onComplete={completeProfileSetup}
    />
  );
}

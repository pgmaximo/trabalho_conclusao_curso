/**
 * Resumo do arquivo:
 * Rota de configuracao inicial do perfil.
 * Marca o setup como concluido e leva o usuario para o dashboard autenticado.
 */
import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getCurrentUser } from 'aws-amplify/auth';

import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { saveUserProfile } from '@/services/profileSetupRepository';
import { useUserContext } from '@/contexts/UserContext';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

export default function ProfileSetupRoute() {
  const { refreshUser } = useUserContext();

  async function completeProfileSetup(values: ProfileSetupFormValues) {
    try {
      // DECISION: Verifica se o usuario esta realmente autenticado antes de salvar o perfil.
      // Isso fornece um diagnostico melhor se ha problemas de autenticacao.
      try {
        const currentUser = await getCurrentUser();
        console.log('Usuario autenticado:', currentUser.userId);
      } catch (authError) {
        console.error('Erro: Usuario nao esta autenticado', authError);
        Alert.alert(
          'Erro de autenticacao',
          'Voce nao esta autenticado. Por favor, faca login novamente ou complete o cadastro.',
        );
        return;
      }

      await saveUserProfile(values);
      // Atualiza o UserContext (onboardingCompleted: true) antes de navegar
      await refreshUser();
      router.replace('/dashboard');
    } catch (error) {
      console.log('Erro ao salvar perfil:', error);
      
      // Fornece mensagens de erro mais descriptivas baseado no tipo de erro
      let errorMessage = 'Nao foi possivel salvar seu perfil agora. Verifique sua conexao e tente novamente.';
      if (error instanceof Error) {
        if (error.message.includes('NoValidAuthTokens') || error.message.includes('federated jwt')) {
          errorMessage = 'Erro de autenticacao: Seu session expirou. Por favor, faca login novamente.';
        } else if (error.message.includes('usuario nao autenticado')) {
          errorMessage = 'Voce nao esta autenticado. Por favor, faca login para continuar.';
        }
      }
      
      Alert.alert('Erro ao salvar perfil', errorMessage);
    }
  }

  return (
    <OnboardingScreen
      onBack={() => router.replace('/')}
      onComplete={completeProfileSetup}
    />
  );
}

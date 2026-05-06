/**
 * Resumo do arquivo:
 * Rota de configuracao inicial do perfil.
 * Marca o setup como concluido e leva o usuario para o dashboard autenticado.
 */
import React from 'react';
import { router } from 'expo-router';

import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';
import { markProfileSetupCompleted } from '@/services/auth';

export default function ProfileSetupRoute() {
  async function completeProfileSetup() {
    await markProfileSetupCompleted();
    router.replace('/dashboard');
  }

  return (
    <ProfileSetupScreen
      onBack={() => router.replace('/')}
      onComplete={completeProfileSetup}
    />
  );
}

// =============================================================================
// Arquivo: profile-setup.tsx
// Descrição: Rota de configuração inicial do perfil do usuário
// Função: ProfileSetupRoute
// =============================================================================
//
// Este arquivo define a rota de configuração inicial do perfil. É a primeira
// tela que o usuário vê após o registro, onde ele configura suas informações
// básicas e preferências de saúde.
//
// Funcionalidades:
// - Renderização da tela de configuração de perfil
// - Navegação de volta para a tela anterior
// - Redirecionamento para o dashboard após completar setup
//
// Fluxo de Navegação:
// 1. Usuário vem do registro -> /profile-setup
// 2. Preenche informações básicas do perfil
// 3. Ao completar -> /dashboard (início do aplicativo)
// 4. Ao voltar -> retorna para tela anterior (register)
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { router } from 'expo-router';        // Sistema de navegação
import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';  // Tela de setup

// Componente da rota de configuração de perfil
export default function ProfileSetupRoute() {
  // Renderiza a tela de configuração com as callbacks de navegação
  return (
    <ProfileSetupScreen
      // Callback para voltar para a tela anterior
      // Usa back() para retornar à tela anterior no histórico de navegação
      onBack={() => router.back()}
      
      // Callback executado quando o usuário completa a configuração
      // Redireciona para o dashboard principal do aplicativo
      onComplete={async () => {
        // Substitui a rota atual pelo dashboard (início do app)
        router.replace('/dashboard');
      }}
    />
  );
}

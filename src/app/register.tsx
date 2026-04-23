// =============================================================================
// Arquivo: register.tsx
// Descrição: Rota de registro de novo usuário
// Função: RegisterRoute
// =============================================================================
//
// Este arquivo define a rota de registro do aplicativo. Ele conecta a tela de
// registro com as ações de navegação, gerenciando o fluxo de criação de conta.
//
// Funcionalidades:
// - Renderização da tela de registro
// - Navegação de volta para a tela de login
// - Redirecionamento para configuração de perfil após registro
//
// Fluxo de Navegação:
// 1. Usuário acessa /register
// 2. Preenche formulário de registro
// 3. Ao registrar com sucesso -> /profile-setup
// 4. Ao voltar -> / (login)
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { router } from 'expo-router';        // Sistema de navegação
import { RegisterScreen } from '@/screens/RegisterScreen';  // Tela de registro

// Componente da rota de registro
export default function RegisterRoute() {
  // Renderiza a tela de registro com as callbacks de navegação
  return (
    <RegisterScreen
      // Callback para navegar de volta para a tela de login
      // Usa replace() para substituir a rota atual no histórico
      onNavigateToLogin={() => router.replace('/')}
      
      // Callback executado quando o usuário completa o registro
      // Redireciona para a tela de configuração de perfil
      onRegister={async () => {
        // Substitui a rota atual pela de configuração de perfil
        router.replace('/profile-setup');
      }}
    />
  );
}

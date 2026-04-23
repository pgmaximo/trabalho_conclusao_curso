// =============================================================================
// Arquivo: (app)/profile.tsx
// Descrição: Rota do perfil do usuário com informações e configurações
// Função: ProfileRoute
// =============================================================================
//
// Este arquivo define a rota do perfil, onde o usuário pode visualizar e
// editar suas informações pessoais, dados de saúde, alergias e configurações
// do aplicativo.
//
// Funcionalidades:
// - Exibição de informações pessoais (nome, email, iniciais)
// - Visualização do percentual de completude do perfil
// - Lista de dados de saúde (tipo sanguíneo, peso, altura, etc.)
// - Gestão de alergias e condições médicas
// - Acesso às configurações do aplicativo
// - Funcionalidade de logout
//
// Dados Gerenciados:
// - profile: Objeto completo com todas as informações do usuário
// - isLoading: Estado de carregamento dos dados do perfil
// - errorMessage: Mensagem de erro em caso de falha
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { router } from 'expo-router';        // Sistema de navegação
import { ProfileScreen } from '@/screens/ProfileScreen';  // Tela de perfil
import { useProfileData } from '@/hooks/useProfileData';  // Hook para dados

// Componente da rota do perfil
export default function ProfileRoute() {
  // Hook personalizado que gerencia todo o estado do perfil do usuário
  // Retorna: dados do perfil, loading, erro e callback de retry
  const { profile, isLoading, errorMessage, retry } = useProfileData();

  // Renderiza a tela de perfil com todos os dados e callbacks
  return (
    <ProfileScreen
      // Objeto completo com informações do usuário ou valores padrão
      profile={
        profile ?? {
          name: '',                    // Nome completo do usuário
          email: '',                   // Email de contato
          initials: '',                // Iniciais para avatar
          completionPercentage: 0,     // Percentual de perfil completo
          healthData: [],              // Array de dados de saúde
          allergiesAndConditions: [],  // Array de alergias e condições
          settings: [],                // Array de opções de configuração
        }
      }
      
      // Estado de carregamento dos dados do perfil
      isLoading={isLoading}
      
      // Mensagem de erro caso falhe ao carregar o perfil
      errorMessage={errorMessage}
      
      // Função para tentar recarregar os dados em caso de erro
      onRetry={retry}
      
      // Callback executado quando usuário clica em logout
      // Redireciona para a tela inicial (login)
      onLogout={() => router.replace('/')}
    />
  );
}

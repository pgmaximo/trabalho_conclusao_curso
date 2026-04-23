// =============================================================================
// Arquivo: _layout.tsx
// Descrição: Layout raiz do aplicativo - Configuração principal de navegação
// Função: RootLayout
// =============================================================================
//
// Este arquivo define a estrutura de navegação principal do aplicativo usando
// Stack Navigator do expo-router. Configura todas as rotas principais e suas
// hierarquias, definindo o fluxo de navegação do usuário.
//
// Funcionalidades:
// - Configuração do Stack Navigator principal
// - Definição das rotas de autenticação e aplicativo
// - Ocultação do header padrão para usar headers customizados
//
// Rotas Configuradas:
// - index: Rota raiz (redireciona para dashboard)
// - register: Tela de registro de usuário
// - profile-setup: Configuração inicial do perfil
// - (app): Grupo de rotas do aplicativo principal (tabs internas)
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { Stack } from 'expo-router';         // Componente de navegação Stack

// Componente principal do layout raiz
export default function RootLayout() {
  // Retorna o Stack Navigator configurado com as rotas principais
  return (
    // Stack Navigator com header desativado para usar headers customizados
    <Stack screenOptions={{ headerShown: false }}>
      {/* Rota raiz - Ponto de entrada do aplicativo */}
      <Stack.Screen name="index" />
      
      {/* Rota de registro - Tela para novos usuários */}
      <Stack.Screen name="register" />
      
      {/* Rota de configuração de perfil - Setup inicial do usuário */}
      <Stack.Screen name="profile-setup" />
      
      {/* Grupo de rotas do aplicativo principal - Contém as tabs internas */}
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

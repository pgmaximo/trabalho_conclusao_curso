// =============================================================================
// Arquivo: (app)/_layout.tsx
// Descrição: Layout do aplicativo principal - Configuração das tabs internas
// Função: AppLayout
// =============================================================================
//
// Este arquivo define o layout para o grupo de rotas (app), que contém as
// telas principais do aplicativo após o login. Ele usa o AppShell que
// implementa a navegação por tabs na parte inferior da tela.
//
// Funcionalidades:
// - Renderização do shell principal do aplicativo
// - Configuração da navegação por tabs
// - Estrutura para todas as telas internas do app
//
// Estrutura do AppShell (5 abas + hub "Mais" — ver src/constants/navigation.ts):
// - Início (dashboard)
// - Consultas (agenda, /appointments)
// - Exames
// - Remédios (medicines)
// - Mais (hub: Prevenção, Assistente de IA, Perfil)
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { AppShell } from '@/components/AppShell';  // Shell principal com tabs

// Componente do layout do aplicativo principal
export default function AppLayout() {
  // Renderiza o AppShell que contém toda a estrutura de navegação
  // por tabs para as telas principais do aplicativo
  return <AppShell />;
}

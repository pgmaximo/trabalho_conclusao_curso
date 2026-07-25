// =============================================================================
// Arquivo: navigation.ts
// Descrição: Configurações de navegação do aplicativo - Tabs e rotas principais
// =============================================================================
//
// Este arquivo define as configurações de navegação principal do aplicativo,
// incluindo as tabs da barra inferior, seus ícones, labels e URLs. Também
// contém funções utilitárias para gerenciar o estado de navegação.
//
// Funcionalidades:
// - Definição das tabs principais com ícones e labels
// - Mapeamento de IDs para URLs
// - Função para determinar a tab ativa baseada no pathname
// - Tipos TypeScript para segurança de tipo
//
// Estrutura das Tabs (icon = nome base do Ionicon; a variante "-outline" é usada
// quando a tab está inativa, e a cheia quando ativa — ver BottomTabBar):
// - dashboard:  home                 Início    - Centro de comandos
// - exams:      document-text        Exames    - Histórico médico
// - agenda:     calendar             Agenda    - Compromissos e consultas
// - ai:         chatbubble-ellipses  IA        - Assistente de saúde
// - prevention: shield-checkmark     Prevenção - Cuidados preventivos
// - profile:    person               Perfil    - Informações do usuário
//
// =============================================================================

// Configuração das tabs principais do aplicativo
export const APP_TABS = [
  { icon: 'home', label: 'Início', id: 'dashboard', href: '/dashboard' },
  { icon: 'document-text', label: 'Exames', id: 'exams', href: '/exams' },
  { icon: 'calendar', label: 'Agenda', id: 'agenda', href: '/appointments' },
  { icon: 'chatbubble-ellipses', label: 'IA', id: 'ai', href: '/ai' },
  { icon: 'shield-checkmark', label: 'Prevenção', id: 'prevention', href: '/prevention' },
  { icon: 'person', label: 'Perfil', id: 'profile', href: '/profile' },
] as const;

// Tipo TypeScript para IDs das tabs (extraído do array APP_TABS)
export type AppTabId = (typeof APP_TABS)[number]['id'];

/**
 * Função para determinar qual tab está ativa baseada no pathname atual
 * @param pathname - Caminho atual da rota (ex: '/dashboard', '/exams/resultado')
 * @returns ID da tab ativa
 */
export function getActiveTabId(pathname: string): AppTabId {
  // Verifica se o pathname começa com cada rota específica
  if (pathname.startsWith('/exams')) {
    return 'exams';
  }

  if (pathname.startsWith('/appointments')) {
    return 'agenda';
  }

  if (pathname.startsWith('/ai')) {
    return 'ai';
  }

  if (pathname.startsWith('/prevention')) {
    return 'prevention';
  }

  if (pathname.startsWith('/profile')) {
    return 'profile';
  }

  // Retorna dashboard como padrão para qualquer outra rota
  return 'dashboard';
}

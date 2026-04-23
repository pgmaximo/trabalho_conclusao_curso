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
// Estrutura das Tabs:
// - dashboard: 🏠 Início - Centro de comandos
// - exams: 📋 Exames - Histórico médico
// - ai: 🧠 IA - Análise por inteligência artificial
// - prevention: 🛡️ Prevenção - Cuidados preventivos
// - profile: 👤 Perfil - Informações do usuário
//
// =============================================================================

// Configuração das tabs principais do aplicativo
export const APP_TABS = [
  { 
    icon: '🏠',                    // Ícone da casa
    label: 'Início',               // Texto exibido
    id: 'dashboard',              // Identificador único
    href: '/dashboard'            // URL da rota
  },
  { 
    icon: '📋',                    // Ícone de lista
    label: 'Exames',               // Texto exibido
    id: 'exams',                  // Identificador único
    href: '/exams'                // URL da rota
  },
  { 
    icon: '🧠',                    // Ícone de cérebro
    label: 'IA',                   // Texto exibido
    id: 'ai',                     // Identificador único
    href: '/ai'                   // URL da rota
  },
  { 
    icon: '🛡️',                    // Ícone de escudo
    label: 'Prevenção',           // Texto exibido
    id: 'prevention',             // Identificador único
    href: '/prevention'           // URL da rota
  },
  { 
    icon: '👤',                    // Ícone de pessoa
    label: 'Perfil',               // Texto exibido
    id: 'profile',                // Identificador único
    href: '/profile'              // URL da rota
  },
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

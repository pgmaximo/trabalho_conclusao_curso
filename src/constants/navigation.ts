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
// - dashboard: home                 Início    - Centro de comandos
// - agenda:    calendar             Consultas - Compromissos e consultas (href /appointments)
// - exams:     document-text        Exames    - Histórico médico
// - medicines: medkit                Remédios  - Doses, estoque e lembretes
// - more:      ellipsis-horizontal  Mais      - Hub de acesso a Prevenção, IA, Perfil (e futuramente Vacinação)
//
// A tela "Mais" (src/app/(app)/more.tsx) lista os destinos secundários em
// MORE_MENU_ITEMS. Os pathnames dessas sub-rotas ("atrás de Mais") ficam em
// MORE_ROUTE_PREFIXES e são usados por getActiveTabId para manter a aba
// "Mais" ativa mesmo quando o usuário está em /ai, /prevention ou /profile.
//
// =============================================================================

// Configuração das 5 tabs principais do aplicativo (Canvas 1a — barra de 5 abas)
export const APP_TABS = [
  { icon: 'home', label: 'Início', id: 'dashboard', href: '/dashboard' },
  { icon: 'calendar', label: 'Consultas', id: 'agenda', href: '/appointments' },
  { icon: 'document-text', label: 'Exames', id: 'exams', href: '/exams' },
  { icon: 'medkit', label: 'Remédios', id: 'medicines', href: '/medicines' },
  { icon: 'ellipsis-horizontal', label: 'Mais', id: 'more', href: '/more' },
] as const;

// Tipo TypeScript para IDs das tabs (extraído do array APP_TABS)
export type AppTabId = (typeof APP_TABS)[number]['id'];

// Itens do hub "Mais" (tela de menu, ver src/screens/MoreScreen.tsx).
// Config estática local, sem dependência de dados remotos (spec.md §5).
// NOTA: "Carteira de vacinação" (/vaccination) fica de fora até a tela 4e
// existir (plan.md §7) — quando existir, adicionar aqui e em
// MORE_ROUTE_PREFIXES abaixo (mudança de 1 linha em cada).
export const MORE_MENU_ITEMS = [
  {
    id: 'prevention',
    icon: 'shield-checkmark',
    label: 'Prevenção & Alertas',
    description: 'Itens preventivos e alertas de saúde',
    href: '/prevention',
  },
  {
    id: 'ai',
    icon: 'chatbubble-ellipses',
    label: 'Assistente de IA',
    description: 'Apoio informativo sobre seus exames',
    href: '/ai',
  },
  {
    id: 'profile',
    icon: 'person',
    label: 'Perfil',
    description: 'Seus dados e preferências',
    href: '/profile',
  },
] as const;

// Prefixos de pathname que ficam "atrás" da aba Mais — qualquer rota que
// comece com um destes prefixos marca a aba 'more' como ativa.
export const MORE_ROUTE_PREFIXES = ['/more', '/ai', '/prevention', '/profile'] as const;

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

  if (pathname.startsWith('/medicines')) {
    return 'medicines';
  }

  if (MORE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return 'more';
  }

  // Retorna dashboard como padrão para qualquer outra rota
  return 'dashboard';
}

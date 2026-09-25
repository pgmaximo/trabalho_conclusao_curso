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
// - dashboard: home                 Início     - Centro de comandos + atalhos
// - exams:     document-text        Exames     - Histórico médico
// - assistant: chatbubble-ellipses  Assistente - Chat com a IA (href /ai), no centro
// - medicines: medkit               Remédios   - Doses, estoque e lembretes
// - more:      ellipsis-horizontal  Mais       - Hub: Consultas, Prevenção, Vacinação,
//                                                smartwatch e Perfil
//
// Ordem decidida em specs/00-fundacao/barra-de-navegacao (Opção 1 da proposta):
// o Assistente saiu de "Mais" para a barra, e Consultas (uso mensal) cedeu o
// lugar, indo para o topo do hub. A agenda continua a 1 toque pelo Início
// (Acesso rápido e "Próximos compromissos").
//
// A tela "Mais" (src/app/(app)/more.tsx) lista os destinos secundários em
// MORE_MENU_ITEMS.
//
// Qual aba fica acesa em cada tela é declarado, rota a rota, em ROUTE_TAB_MAP.
// Toda tela do grupo (app) precisa de uma entrada ali — inclusive as que não
// são abas, como /document-detail (acende "Exames") ou /appointments (acende "Mais").
// O teste __tests__/abaAtivaPorRota.test.ts reprova se uma tela nova for
// criada em src/app/(app)/ sem entrada no mapa.
//
// =============================================================================

// Configuração das 5 tabs principais do aplicativo. O teto de 5 vem do Canvas 1a;
// a ordem, de specs/00-fundacao/barra-de-navegacao/spec.md.
export const APP_TABS = [
  { icon: 'home', label: 'Início', id: 'dashboard', href: '/dashboard' },
  { icon: 'document-text', label: 'Exames', id: 'exams', href: '/exams' },
  // DECISION: rótulo "Assistente" medido em 360dp (spec.md, D3): 63,6dp em
  // IBM Plex Sans 600 13px, numa vaga de 70,4dp. "Perguntar" seria o plano B.
  { icon: 'chatbubble-ellipses', label: 'Assistente', id: 'assistant', href: '/ai' },
  { icon: 'medkit', label: 'Remédios', id: 'medicines', href: '/medicines' },
  { icon: 'ellipsis-horizontal', label: 'Mais', id: 'more', href: '/more' },
] as const;

// Tipo TypeScript para IDs das tabs (extraído do array APP_TABS)
export type AppTabId = (typeof APP_TABS)[number]['id'];

// Itens do hub "Mais" (tela de menu, ver src/screens/MoreScreen.tsx).
// Config estática local, sem dependência de dados remotos (spec.md §5).
export const MORE_MENU_ITEMS = [
  {
    id: 'appointments',
    icon: 'calendar',
    label: 'Consultas',
    description: 'Suas consultas marcadas',
    href: '/appointments',
  },
  {
    id: 'prevention',
    icon: 'shield-checkmark',
    label: 'Prevenção & Alertas',
    description: 'Itens preventivos e alertas de saúde',
    href: '/prevention',
  },
  {
    id: 'vaccination',
    icon: 'medical',
    label: 'Carteira de vacinação',
    description: 'Doses aplicadas e recomendadas',
    href: '/vaccination',
  },
  {
    id: 'health-data',
    icon: 'watch',
    label: 'Dados do smartwatch',
    description: 'Insights do seu sono, passos e batimentos',
    href: '/health-data',
  },
  {
    id: 'profile',
    icon: 'person',
    label: 'Perfil',
    description: 'Seus dados e preferências',
    href: '/profile',
  },
] as const;

// Aba acesa para cada tela do grupo (app), pela primeira parte do caminho.
// DECISION: mapa explícito em vez de prefixos + "Início" como padrão. Com o
// padrão, toda tela nova nascia acendendo "Início" em silêncio — foi assim que
// /document-detail, aberto a partir de Exames, passou a acender a aba errada.
export const ROUTE_TAB_MAP = {
  dashboard: 'dashboard',
  exams: 'exams',
  'document-detail': 'exams', // aberto da lista de Exames (e de atalhos da Home/IA)
  'analyte-series': 'exams', // evolução de um analito, aberta a partir de Exames
  medicines: 'medicines',
  ai: 'assistant',
  'assistant-memory': 'assistant', // aberto de dentro do Assistente de IA
  more: 'more',
  // Consultas vive no hub Mais, como Prevenção e Vacinação — que também têm
  // atalho no Início e mesmo assim acendem "Mais" (spec.md, D2).
  appointments: 'more',
  prevention: 'more',
  vaccination: 'more',
  'health-data': 'more',
  profile: 'more',
} as const satisfies Record<string, AppTabId>;

/**
 * Determina qual tab está ativa a partir do pathname atual.
 * @param pathname - Caminho atual da rota (ex: '/dashboard', '/exams/resultado')
 * @returns ID da tab ativa ('dashboard' só para caminhos fora do mapa)
 */
export function getActiveTabId(pathname: string): AppTabId {
  const primeiroSegmento = pathname.split('/').find((parte) => parte !== '') ?? '';
  const mapa: Record<string, AppTabId> = ROUTE_TAB_MAP;
  return mapa[primeiroSegmento] ?? 'dashboard';
}

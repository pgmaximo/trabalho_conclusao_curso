// =============================================================================
// Arquivo: useDashboardData.ts
// Descrição: Hook customizado para gerenciar dados do dashboard
// Hook: useDashboardData
// =============================================================================
//
// Este hook implementa a lógica de gerenciamento de dados do dashboard,
// incluindo carregamento assíncrono, estados de loading/erro e retry
// de falhas. Fornece uma interface limpa para o componente Dashboard.
//
// Funcionalidades:
// - Carregamento assíncrono dos dados do dashboard
// - Estados de loading, error e success
// - Funcionalidade de retry para falhas
// - Label dinâmico para data atual
// - Interface simplificada para componentes
//
// Retorno:
// - dashboard: Dados do dashboard ou null
// - todayLabel: Label formatado para data atual
// - isLoading: Estado de carregamento
// - errorMessage: Mensagem de erro (se houver)
// - retry: Função para tentar novamente
//
// =============================================================================

// Importações necessárias
import { useAsyncResource } from '@/hooks/useAsyncResource';  // Hook genérico para recursos assíncronos
import { getDashboardSnapshot, getDashboardTodayLabel } from '@/services/dashboardService';  // Serviços do dashboard

/**
 * Hook customizado para gerenciar dados do dashboard
 * @returns Objeto com dados do dashboard e estados de carregamento
 */
export function useDashboardData() {
  // Usa o hook genérico para carregar dados do dashboard
  const { data, status, errorMessage, retry } = useAsyncResource(getDashboardSnapshot);

  // Retorna interface simplificada para o componente
  return {
    dashboard: data,                    // Dados do dashboard (pode ser null)
    todayLabel: getDashboardTodayLabel(), // Label formatado para hoje
    isLoading: status === 'loading',     // Estado de carregamento
    errorMessage,                       // Mensagem de erro (se houver)
    retry,                             // Função para retry em caso de erro
  };
}

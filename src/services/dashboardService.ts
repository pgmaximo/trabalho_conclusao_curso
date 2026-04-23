// =============================================================================
// Arquivo: dashboardService.ts
// Descrição: Serviços para dados do dashboard do aplicativo
// =============================================================================
//
// Este arquivo implementa os serviços para carregar dados do dashboard,
// incluindo o snapshot principal e formatação de datas. Usa dados mock
// com simulação de requisições para replicar comportamento de API real.
//
// Funcionalidades:
// - Carregamento assíncrono do snapshot do dashboard
// - Simulação de delay e erros para teste de UI
// - Formatação de datas em português brasileiro
// - Interface limpa para componentes consumirem dados
//
// Uso:
// - getDashboardSnapshot(): Carrega dados completos do dashboard
// - getDashboardTodayLabel(): Formata data atual para exibição
//
// =============================================================================

// Importações necessárias
import { DASHBOARD_SNAPSHOT } from '@/mocks/dashboard';              // Mock data do dashboard
import { simulateRequest } from '@/services/requestSimulator';      // Simulador de requisições

/**
 * Função para obter o snapshot completo do dashboard
 * @returns Promise com dados do dashboard ou erro simulado
 */
export function getDashboardSnapshot() {
  // Usa o simulador de requisições com configurações específicas
  return simulateRequest(DASHBOARD_SNAPSHOT, {
    delayMs: 280,                                    // Delay de 280ms para simular latência
    errorMessage: 'Nao foi possivel carregar o resumo do dashboard.', // Mensagem de erro personalizada
  });
}

/**
 * Função para formatar a data atual em português brasileiro
 * @param date - Data a ser formatada (padrão: data atual)
 * @returns String formatada com dia da semana, dia, mês e ano
 */
export function getDashboardTodayLabel(date = new Date()) {
  // Formata data usando locale pt-BR com opções completas
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',      // Dia da semana completo (ex: "segunda-feira")
    day: 'numeric',       // Dia do mês (ex: "25")
    month: 'long',        // Mês completo (ex: "abril")
    year: 'numeric',      // Ano completo (ex: "2024")
  });
}

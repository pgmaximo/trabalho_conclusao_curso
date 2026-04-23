// =============================================================================
// Arquivo: appointmentsService.ts
// Descrição: Serviços para dados de consultas médicas e compromissos
// =============================================================================
//
// Este arquivo implementa os serviços para carregar dados de consultas médicas,
// incluindo o snapshot completo e filtragem por dia específico. Usa dados mock
// com simulação de requisições para replicar comportamento de API real.
//
// Funcionalidades:
// - Carregamento assíncrono do snapshot de consultas
// - Filtragem de consultas por dia específico
// - Simulação de delay e erros para teste de UI
// - Interface limpa para componentes consumirem dados
//
// Uso:
// - getAppointmentsSnapshot(): Carrega dados completos de consultas
// - getAppointmentsForDay(): Filtra consultas por dia selecionado
//
// =============================================================================

// Importações necessárias
import { APPOINTMENTS_SNAPSHOT } from '@/mocks/appointments';        // Mock data de consultas
import { simulateRequest } from '@/services/requestSimulator';        // Simulador de requisições

/**
 * Função para obter o snapshot completo de consultas médicas
 * @returns Promise com dados de consultas ou erro simulado
 */
export function getAppointmentsSnapshot() {
  // Usa o simulador de requisições com configurações específicas
  return simulateRequest(APPOINTMENTS_SNAPSHOT, {
    delayMs: 300,                                    // Delay de 300ms para simular latência
    errorMessage: 'Nao foi possivel carregar a agenda de consultas.', // Mensagem de erro personalizada
  });
}

/**
 * Função para filtrar consultas por dia específico
 * @param selectedDate - Dia selecionado (número do dia)
 * @param appointmentsByDay - Objeto mapeando dia → array de consultas
 * @returns Array de consultas para o dia selecionado (array vazio se não houver)
 */
export function getAppointmentsForDay(
  selectedDate: number,                                    // Dia selecionado
  appointmentsByDay: typeof APPOINTMENTS_SNAPSHOT.appointmentsByDay // Objeto com consultas por dia
) {
  // Retorna consultas do dia selecionado ou array vazio se não houver
  return appointmentsByDay[selectedDate] ?? [];
}

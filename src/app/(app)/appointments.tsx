// =============================================================================
// Arquivo: (app)/appointments.tsx
// Descrição: Rota de consultas e agendamentos médicos
// Função: AppointmentsRoute
// =============================================================================
//
// Este arquivo define a rota de consultas médicas. Ele gerencia o calendário
// de consultas, permitindo ao usuário visualizar, agendar e gerenciar seus
// compromissos médicos.
//
// Funcionalidades:
// - Exibição de calendário mensal com consultas marcadas
// - Seleção de datas para visualizar consultas do dia
// - Listagem detalhada de consultas por data
// - Gerenciamento de estado de loading e erros
//
// Dados Gerenciados:
// - dates: Array com dias do mês e indicação de consultas
// - selectedDate: Data atualmente selecionada no calendário
// - appointments: Consultas filtradas pela data selecionada
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { AppointmentsScreen } from '@/screens/AppointmentsScreen';  // Tela de consultas
import { useAppointmentsData } from '@/hooks/useAppointmentsData';  // Hook para dados

// Componente da rota de consultas
export default function AppointmentsRoute() {
  // Hook personalizado que gerencia todo o estado das consultas
  // Retorna: dados do calendário, seleção, loading, erro e callbacks
  const appointments = useAppointmentsData();

  // Renderiza a tela de consultas com todos os dados e callbacks
  return (
    <AppointmentsScreen
      // Array de datas do mês com indicação de quais dias têm consultas
      dates={appointments.dates}
      
      // Data atualmente selecionada no calendário pelo usuário
      selectedDate={appointments.selectedDate}
      
      // Array de consultas filtradas para a data selecionada
      appointments={appointments.appointments}
      
      // Estado de carregamento dos dados de consultas
      isLoading={appointments.isLoading}
      
      // Mensagem de erro caso falhe ao carregar as consultas
      errorMessage={appointments.errorMessage}
      
      // Função para tentar recarregar os dados em caso de erro
      onRetry={appointments.retry}
      
      // Callback executado quando usuário seleciona uma data no calendário
      onDateSelect={appointments.setSelectedDate}
    />
  );
}

// =============================================================================
// Arquivo: (app)/dashboard.tsx
// Descrição: Rota do dashboard principal - Centro de comandos do aplicativo
// Função: DashboardRoute
// =============================================================================
//
// Este arquivo define a rota do dashboard, que é a tela principal do aplicativo.
// Ele conecta os dados do dashboard com a tela UI e gerencia a navegação
// para as outras funcionalidades do app.
//
// Funcionalidades:
// - Carregamento e gerenciamento de dados do dashboard
// - Renderização da tela principal com métricas de saúde
// - Navegação para todas as funcionalidades principais
// - Tratamento de estados de loading e erro
//
// Dados Exibidos:
// - Saudação personalizada e data atual
// - Resumo geral de saúde
// - Métricas personalizadas (pressão, peso, etc.)
// - Próximos eventos e consultas
// - Alertas preventivos
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { router } from 'expo-router';        // Sistema de navegação
import { DashboardScreen } from '@/screens/DashboardScreen';  // Tela do dashboard
import { useDashboardData } from '@/hooks/useDashboardData';  // Hook para dados

// Componente da rota do dashboard
export default function DashboardRoute() {
  // Hook personalizado que gerencia o estado e dados do dashboard
  // Retorna: dados, estado de loading, mensagem de erro e função de retry
  const { dashboard, todayLabel, isLoading, errorMessage, retry } = useDashboardData();

  // Renderiza a tela do dashboard com todos os dados e callbacks
  return (
    <DashboardScreen
      // Saudação personalizada baseada no horário (ex: "Bom dia, João")
      greeting={dashboard?.greeting ?? ''}
      
      // Label com a data atual formatada (ex: "Hoje, 23 de abril")
      todayLabel={todayLabel}
      
      // Resumo geral do status de saúde (ex: { value: "Bom", status: "Estável" })
      summary={dashboard?.summary ?? { value: '', status: '' }}
      
      // Array de métricas de saúde (pressão, peso, batimentos, etc.)
      metrics={dashboard?.metrics ?? []}
      
      // Próximos eventos (consultas, exames, lembretes de medicamentos)
      upcomingEvents={dashboard?.upcomingEvents ?? []}
      
      // Alerta preventivo com recomendações de saúde
      preventiveAlert={dashboard?.preventiveAlert ?? { icon: '🩺', title: '', subtitle: '' }}
      
      // Estado de carregamento dos dados
      isLoading={isLoading}
      
      // Mensagem de erro caso falhe ao carregar dados
      errorMessage={errorMessage}
      
      // Função para tentar recarregar os dados em caso de erro
      onRetry={retry}
      
      // Callbacks de navegação para as funcionalidades principais
      onNavigateToAi={() => router.push('/ai')}                    // Análise por IA
      onNavigateToMedicines={() => router.push('/medicines')}      // Medicamentos
      onNavigateToAppointments={() => router.push('/appointments')} // Consultas
      onNavigateToPrevention={() => router.push('/prevention')}     // Prevenção
    />
  );
}

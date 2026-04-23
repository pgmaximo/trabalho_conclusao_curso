// =============================================================================
// Arquivo: (app)/prevention.tsx
// Descrição: Rota de ações preventivas e check-ups de saúde
// Função: PreventionRoute
// =============================================================================
//
// Este arquivo define a rota de prevenção, onde o usuário pode visualizar
// suas ações preventivas, monitorar check-ups de saúde e receber recomendações
// para manter sua saúde em dia.
//
// Funcionalidades:
// - Exibição de alertas preventivos personalizados
// - Visualização do score geral de saúde preventiva
// - Listagem de check-ups necessários e seus status
// - Recomendações baseadas no perfil de saúde
//
// Dados Gerenciados:
// - alert: Alerta preventivo com título, descrição e ação recomendada
// - score: Pontuação de saúde preventiva (score/maxScore e status)
// - checks: Array de check-ups com status (em_dia/vencido/pendente)
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { PreventionScreen } from '@/screens/PreventionScreen';  // Tela de prevenção
import { usePreventionData } from '@/hooks/usePreventionData';  // Hook para dados

// Componente da rota de prevenção
export default function PreventionRoute() {
  // Hook personalizado que gerencia todo o estado da prevenção
  // Retorna: dados de prevenção, loading, erro e callback de retry
  const { prevention, isLoading, errorMessage, retry } = usePreventionData();

  // Renderiza a tela de prevenção com todos os dados e callbacks
  return (
    <PreventionScreen
      // Alerta preventivo com informações importantes sobre saúde
      alert={prevention?.alert ?? { title: '', description: '', actionLabel: '' }}
      
      // Score de saúde preventiva com pontuação e status atual
      score={prevention?.score ?? { score: 0, maxScore: 0, status: '' }}
      
      // Array de check-ups preventivos com seus respectivos status
      checks={prevention?.checks ?? []}
      
      // Estado de carregamento dos dados de prevenção
      isLoading={isLoading}
      
      // Mensagem de erro caso falhe ao carregar os dados de prevenção
      errorMessage={errorMessage}
      
      // Função para tentar recarregar os dados em caso de erro
      onRetry={retry}
    />
  );
}

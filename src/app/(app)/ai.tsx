// =============================================================================
// Arquivo: (app)/ai.tsx
// Descrição: Rota de análise por inteligência artificial de dados de saúde
// Função: AIAnalysisRoute
// =============================================================================
//
// Este arquivo define a rota de análise por IA, onde o usuário pode obter
// insights personalizados sobre sua saúde, recomendações baseadas em seus
// dados e histórico de análises anteriores.
//
// Funcionalidades:
// - Análise inteligente dos dados de saúde do usuário
// - Busca e filtragem de análises anteriores
// - Exibição de métricas e recomendações personalizadas
// - Interface de chat para interações com a IA
//
// Dados Gerenciados:
// - analysis: Dados completos da análise atual (intro, métricas, recomendações)
// - searchQuery: Texto para buscar análises anteriores
// - isLoading: Estado de carregamento durante processamento da IA
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { AIAnalysisScreen } from '@/screens/AIAnalysisScreen';  // Tela de análise IA
import { useAIAnalysisData } from '@/hooks/useAIAnalysisData';  // Hook para dados

// Componente da rota de análise por IA
export default function AIAnalysisRoute() {
  // Hook personalizado que gerencia todo o estado da análise por IA
  // Retorna: dados da análise, busca, loading, erro e callbacks
  const { analysis, searchQuery, setSearchQuery, isLoading, errorMessage, retry } =
    useAIAnalysisData();

  // Renderiza a tela de análise IA com todos os dados e callbacks
  return (
    <AIAnalysisScreen
      // Objeto completo com dados da análise atual (intro, métricas, ações)
      analysis={analysis}
      
      // Texto atual digitado no campo de busca de análises anteriores
      searchQuery={searchQuery}
      
      // Estado de carregamento durante processamento da análise pela IA
      isLoading={isLoading}
      
      // Mensagem de erro caso falhe ao processar a análise
      errorMessage={errorMessage}
      
      // Função para tentar recarregar/reprocessar a análise em caso de erro
      onRetry={retry}
      
      // Callback executado quando usuário digita no campo de busca
      onSearchChange={setSearchQuery}
    />
  );
}

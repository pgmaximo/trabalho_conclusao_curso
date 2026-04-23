// =============================================================================
// Arquivo: (app)/exams.tsx
// Descrição: Rota de histórico de exames médicos e laudos
// Função: ExamsRoute
// =============================================================================
//
// Este arquivo define a rota de exames, onde o usuário pode visualizar,
// buscar e filtrar seu histórico completo de exames médicos, laudos e
// resultados laboratoriais.
//
// Funcionalidades:
// - Listagem completa de documentos médicos (exames, receitas, laudos)
// - Busca por nome ou tipo de documento
// - Filtros por categoria (Todos, Exames, Receitas, Laudos)
// - Visualização detalhada de cada documento
//
// Dados Gerenciados:
// - filterOptions: Opções disponíveis para filtragem
// - searchQuery: Texto atual de busca
// - activeFilter: Filtro selecionado atualmente
// - documents: Array de documentos filtrados
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { ExamsScreen } from '@/screens/ExamsScreen';  // Tela de exames
import { useExamsData } from '@/hooks/useExamsData';  // Hook para dados

// Componente da rota de exames
export default function ExamsRoute() {
  // Hook personalizado que gerencia todo o estado dos exames
  // Retorna: filtros, busca, documentos, loading, erro e callbacks
  const exams = useExamsData();

  // Renderiza a tela de exames com todos os dados e callbacks
  return (
    <ExamsScreen
      // Array de opções de filtro disponíveis (Todos, Exames, Receitas, Laudos)
      filterOptions={exams.filterOptions}
      
      // Texto atual digitado no campo de busca
      searchQuery={exams.searchQuery}
      
      // Filtro categoria atualmente selecionado
      activeFilter={exams.activeFilter}
      
      // Array de documentos médicos filtrados pela busca e filtro
      documents={exams.documents}
      
      // Estado de carregamento dos dados de exames
      isLoading={exams.isLoading}
      
      // Mensagem de erro caso falhe ao carregar os exames
      errorMessage={exams.errorMessage}
      
      // Função para tentar recarregar os dados em caso de erro
      onRetry={exams.retry}
      
      // Callback executado quando usuário digita no campo de busca
      onSearchChange={exams.setSearchQuery}
      
      // Callback executado quando usuário seleciona um filtro de categoria
      onFilterChange={exams.setActiveFilter}
    />
  );
}

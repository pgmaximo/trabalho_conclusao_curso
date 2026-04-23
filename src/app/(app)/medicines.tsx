// =============================================================================
// Arquivo: (app)/medicines.tsx
// Descrição: Rota de controle de medicamentos e doses
// Função: MedicinesRoute
// =============================================================================
//
// Este arquivo define a rota de medicamentos, onde o usuário pode gerenciar
// suas doses diárias, controlar o estoque e receber lembretes para tomar
// medicamentos no horário correto.
//
// Funcionalidades:
// - Listagem de medicamentos com doses do dia
// - Controle de status (pendente/tomado/perdido)
// - Monitoramento do estoque de medicamentos
// - Exibição de lembretes e alertas
// - Contador de medicamentos pendentes
//
// Dados Gerenciados:
// - medicines: Array de medicamentos com doses do dia
// - stocks: Array de medicamentos no estoque com quantidades
// - reminder: Informações de lembretes ativos
// - pendingCount: Número de doses pendentes hoje
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { MedicinesScreen } from '@/screens/MedicinesScreen';  // Tela de medicamentos
import { useMedicinesData } from '@/hooks/useMedicinesData';  // Hook para dados

// Componente da rota de medicamentos
export default function MedicinesRoute() {
  // Hook personalizado que gerencia todo o estado dos medicamentos
  // Retorna: medicamentos, estoque, lembretes, loading, erro e callbacks
  const medicines = useMedicinesData();

  // Renderiza a tela de medicamentos com todos os dados e callbacks
  return (
    <MedicinesScreen
      // Array de medicamentos com doses programadas para hoje
      medicines={medicines.medicines}
      
      // Array de medicamentos no estoque com quantidades e status
      stocks={medicines.stocks}
      
      // Informações do lembrete ativo (título e descrição)
      reminder={medicines.reminder}
      
      // Número total de medicamentos pendentes hoje
      pendingCount={medicines.pendingCount}
      
      // Estado de carregamento dos dados de medicamentos
      isLoading={medicines.isLoading}
      
      // Mensagem de erro caso falhe ao carregar os medicamentos
      errorMessage={medicines.errorMessage}
      
      // Função para tentar recarregar os dados em caso de erro
      onRetry={medicines.retry}
      
      // Callback para alternar status do medicamento (pendente/tomado/perdido)
      onToggleMedicineStatus={medicines.onToggleMedicineStatus}
    />
  );
}

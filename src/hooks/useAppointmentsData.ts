// =============================================================================
// Arquivo: useAppointmentsData.ts
// Descrição: Hook customizado para gerenciar dados de consultas médicas
// Hook: useAppointmentsData
// =============================================================================
//
// Este hook implementa a lógica de gerenciamento de consultas médicas,
// incluindo seleção de datas, filtragem por dia e estados de carregamento.
// Fornece uma interface completa para o componente de consultas.
//
// Funcionalidades:
// - Carregamento assíncrono de todas as consultas
// - Seleção de dia específico
// - Filtragem automática de consultas por dia
// - Estados de loading, error e success
// - Funcionalidade de retry para falhas
// - Lista de datas disponíveis
//
// Retorno:
// - dates: Array de datas disponíveis
// - selectedDate: Dia selecionado atualmente
// - setSelectedDate: Função para selecionar dia
// - appointments: Consultas filtradas pelo dia selecionado
// - isLoading: Estado de carregamento
// - errorMessage: Mensagem de erro (se houver)
// - retry: Função para tentar novamente
//
// =============================================================================

// Importações necessárias
import { useState } from 'react';  // Hook de estado do React

// Importações de hooks e serviços
import { useAsyncResource } from '@/hooks/useAsyncResource';  // Hook genérico para recursos assíncronos
import {
  getAppointmentsForDay,         // Função para filtrar consultas por dia
  getAppointmentsSnapshot,        // Função para carregar snapshot de consultas
} from '@/services/appointmentsService';  // Serviços de consultas

/**
 * Hook customizado para gerenciar dados de consultas médicas
 * @returns Objeto com dados de consultas e funções de controle
 */
export function useAppointmentsData() {
  // Estado para o dia selecionado (padrão: dia 25)
  const [selectedDate, setSelectedDate] = useState(25);
  
  // Usa o hook genérico para carregar dados de consultas
  const { data, status, errorMessage, retry } = useAsyncResource(getAppointmentsSnapshot);
  
  // Referência ao snapshot de dados
  const snapshot = data;

  // Retorna interface completa para o componente
  return {
    // Lista de datas disponíveis (array vazio se não houver dados)
    dates: snapshot?.dates ?? [],
    
    // Dia selecionado atualmente
    selectedDate,
    
    // Função para selecionar um dia
    setSelectedDate,
    
    // Consultas filtradas pelo dia selecionado (array vazio se não houver dados)
    appointments: snapshot 
      ? getAppointmentsForDay(selectedDate, snapshot.appointmentsByDay) 
      : [],
    
    // Estado de carregamento
    isLoading: status === 'loading',
    
    // Mensagem de erro (se houver)
    errorMessage,
    
    // Função para retry em caso de erro
    retry,
  };
}

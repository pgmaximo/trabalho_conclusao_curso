// =============================================================================
// Arquivo: dashboard.ts
// Descrição: Mock data para o dashboard do aplicativo
// =============================================================================
//
// Este arquivo contém dados simulados (mock) para o dashboard do aplicativo.
// É usado durante o desenvolvimento e testes para fornecer dados realistas
// sem depender de uma API real.
//
// Estrutura de Dados:
// - greeting: Mensagem de boas-vindas personalizada
// - summary: Resumo principal do estado de saúde
// - metrics: Array de métricas de saúde com progresso
// - upcomingEvents: Próximos eventos e compromissos
// - preventiveAlert: Alertas preventivos de saúde
//
// Métricas Incluídas:
// - Frequência cardíaca com status normal
// - Sono do dia anterior com avaliação
// - Passos diários com progresso da meta
// - Medicamentos pendentes com alerta
//
// =============================================================================

// Importação do tipo para tipagem segura
import type { DashboardSnapshot } from '@/types/models';

// Mock data completo para o dashboard
export const DASHBOARD_SNAPSHOT: DashboardSnapshot = {
  // Mensagem de boas-vindas personalizada
  greeting: 'Olá, André 👋',
  
  // Resumo principal do estado de saúde
  summary: {
    value: '72 bpm',    // Valor principal (frequência cardíaca)
    status: 'Normal',   // Status da métrica
  },
  
  // Array de métricas de saúde com barras de progresso
  metrics: [
    {
      label: 'Freq. Cardíaca',           // Nome da métrica
      value: '72 bpm',                  // Valor atual
      status: 'Normal',                 // Status da métrica
      statusColor: '#E74C3C',           // Cor do status (vermelho)
      progressPercent: 65,             // Porcentagem para barra de progresso
    },
    {
      label: 'Sono Ontem',               // Nome da métrica
      value: '7h 24min',               // Valor do sono
      status: 'Bom',                    // Status do sono
      statusColor: '#3498DB',           // Cor do status (azul)
      progressPercent: 70,             // Porcentagem para barra de progresso
    },
    {
      label: 'Passos Hoje',             // Nome da métrica
      value: '6.842',                  // Número de passos
      status: '68% da meta',           // Status em relação à meta
      statusColor: '#9B59B6',           // Cor do status (roxo)
      progressPercent: 68,             // Porcentagem para barra de progresso
    },
    {
      label: 'Medicamentos',            // Nome da métrica
      value: '2 pend.',                 // Medicamentos pendentes
      status: 'Atenção',                // Status de atenção
      statusColor: '#F39C12',           // Cor do status (laranja)
      progressPercent: 40,             // Porcentagem para barra de progresso
    },
  ],
  
  // Array de próximos eventos e compromissos
  upcomingEvents: [
    {
      icon: '📋',                       // Ícone representativo
      title: 'Consulta — Cardiologista', // Título do evento
      subtitle: 'Amanhã, 10h00',       // Data e hora
      actionLabel: 'Consulta',          // Tipo de ação
      actionColor: '#21a16f',           // Cor da ação
    },
    {
      icon: '✅',                       // Ícone representativo
      title: 'Hemograma completo',      // Título do exame
      subtitle: 'Pendente — recomendado', // Status
      actionLabel: 'Exame',             // Tipo de ação
      actionColor: '#F39C12',           // Cor da ação (laranja)
    },
    {
      icon: '💊',                       // Ícone representativo
      title: 'Losartana 50mg',         // Nome do medicamento
      subtitle: 'Dose das 12h pendente', // Status da dose
      actionLabel: 'Medicamento',      // Tipo de ação
      actionColor: '#E74C3C',           // Cor da ação (vermelho)
    },
  ],
  
  // Alerta preventivo de saúde
  preventiveAlert: {
    icon: '⚠️',                       // Ícone de alerta
    title: 'Alerta preventivo',        // Título do alerta
    subtitle: 'Colesterol não medido há 14 meses. Protocolo anual recomendado.', // Mensagem detalhada
    variant: 'alert',                  // Variante do alerta
  },
};

// =============================================================================
// Arquivo: models.ts
// Descrição: Tipos e interfaces para dados do aplicativo de saúde
// =============================================================================
//
// Este arquivo define todos os tipos e interfaces TypeScript usados
// throughout the aplicativo para garantir type safety e documentar
// a estrutura de dados de cada funcionalidade.
//
// Categorias de Tipos:
// - Dashboard: Tipos para dados do dashboard principal
// - Medical: Tipos para documentos médicos e exames
// - Analysis: Tipos para análise por IA
// - User: Tipos para dados do usuário e perfil
// - Medicines: Tipos para controle de medicamentos
// - Appointments: Tipos para consultas médicas
// - Prevention: Tipos para ações preventivas
//
// Uso:
// - Importar tipos específicos onde necessário
// - Garantir consistência de dados em toda a aplicação
// - Facilitar refatoração e manutenção
//
// =============================================================================

// =============================================================================
// TIPOS DO DASHBOARD
// =============================================================================

// Interface para resumo principal do dashboard
export interface DashboardSummary {
  value: string;        // Valor principal (ex: "72 bpm")
  status: string;        // Status do resumo (ex: "Normal")
}

// Interface para métricas de saúde do dashboard
export interface DashboardMetric {
  label: string;           // Nome da métrica (ex: "Freq. Cardíaca")
  value: string;           // Valor atual (ex: "72 bpm")
  status: string;          // Status da métrica (ex: "Normal")
  statusColor: string;     // Cor do status (hexadecimal)
  progressPercent: number; // Porcentagem para barra de progresso
}

// Interface para eventos do dashboard
export interface DashboardEvent {
  icon: string;                    // Ícone representativo (emoji)
  title: string;                  // Título do evento
  subtitle: string;               // Subtítulo com detalhes
  actionLabel?: string;           // Label do botão de ação (opcional)
  actionColor?: string;           // Cor do botão de ação (opcional)
  variant?: 'default' | 'alert';   // Variante visual (opcional)
}

// Interface completa para snapshot do dashboard
export interface DashboardSnapshot {
  greeting: string;              // Mensagem de boas-vindas
  summary: DashboardSummary;     // Resumo principal
  metrics: DashboardMetric[];    // Array de métricas
  upcomingEvents: DashboardEvent[]; // Próximos eventos
  preventiveAlert: DashboardEvent; // Alerta preventivo
}

// =============================================================================
// TIPOS DE DOCUMENTOS MÉDICOS
// =============================================================================

// Tipo para filtro de documentos médicos
export type MedicalDocumentFilter = 'Todos' | 'Exames' | 'Receitas' | 'Laudos';

// Interface para documentos médicos
export interface MedicalDocument {
  icon: string;                                    // Ícone representativo
  title: string;                                  // Título do documento
  subtitle: string;                               // Subtítulo com informações
  statusLabel: string;                            // Label do status
  statusColor: string;                            // Cor do status
  category: Exclude<MedicalDocumentFilter, 'Todos'>; // Categoria (excluindo "Todos")
}

// =============================================================================
// TIPOS DE ANÁLISE POR IA
// =============================================================================

// Interface para ações de análise
export interface AnalysisAction {
  icon: string;        // Ícone da ação
  label: string;       // Label descritivo
}

// Interface para métricas de análise
export interface AnalysisMetric {
  label: string;       // Nome da métrica
  value: string;       // Valor da métrica
  status: string;      // Status da métrica
  statusColor: string;
}

// Interface completa para snapshot de análise por IA
export interface AIAnalysisSnapshot {
  introMessage: string;           // Mensagem de introdução
  userMessage: string;            // Mensagem para o usuário
  analysisTitle: string;          // Título da análise
  analysisSubtitle: string;       // Subtítulo da análise
  recommendation: string;         // Recomendação principal
  historyLabel: string;           // Label do histórico
  historyCount: string;           // Contador do histórico
  actions: AnalysisAction[];       // Array de ações sugeridas
  metrics: AnalysisMetric[];       // Array de métricas analisadas
}

// =============================================================================
// TIPOS DE PERFIL E USUÁRIO
// =============================================================================

// Interface para dados de saúde do perfil
export interface HealthDatum {
  label: string;        // Label do dado (ex: "Tipo Sanguíneo")
  value: string;        // Valor do dado (ex: "O+")
}

// Interface para configurações do perfil
export interface ProfileSetting {
  icon: string;         // Ícone da configuração
  title: string;        // Título da configuração
}

// Interface completa para snapshot do perfil do usuário
export interface UserProfileSnapshot {
  name: string;                    // Nome completo do usuário
  email: string;                   // Email do usuário
  initials: string;                // Iniciais (para avatar)
  completionPercentage: number;    // Porcentagem de completude do perfil
  healthData: HealthDatum[];       // Array de dados de saúde
  allergiesAndConditions: string[]; // Array de alergias e condições
  settings: ProfileSetting[];      // Array de configurações
}

// =============================================================================
// TIPOS DE MEDICAMENTOS
// =============================================================================

// Tipo para status de dose de medicamento
export type MedicineStatus = 'pending' | 'taken' | 'missed';

// Tipo para status de estoque de medicamento
export type MedicineStockStatus = 'ok' | 'low' | 'critical';

// Interface para dose de medicamento
export interface MedicineDose {
  id: number;            // ID único da dose
  name: string;          // Nome do medicamento
  dosage: string;        // Dosagem e frequência
  time: string;          // Horário da dose
  status: MedicineStatus; // Status da dose
}

// Interface para item do inventário de medicamentos
export interface MedicineInventoryItem {
  id: number;                    // ID único do item
  name: string;                  // Nome do medicamento
  quantity: number;              // Quantidade em estoque
  unit: string;                  // Unidade de medida
  status: MedicineStockStatus;   // Status do estoque
  percentage: number;
}

// Interface para informações de lembrete
export interface ReminderInfo {
  title: string;         // Título do lembrete
  description: string;  // Descrição detalhada
}

// Interface completa para snapshot de medicamentos
export interface MedicinesSnapshot {
  pendingMedicines: MedicineDose[];       // Array de doses pendentes
  stocks: MedicineInventoryItem[];        // Array de itens em estoque
  reminder: ReminderInfo;                 // Informações do lembrete
}

// =============================================================================
// TIPOS DE CONSULTAS MÉDICAS
// =============================================================================

// Interface para item de calendário
export interface CalendarDateItem {
  day: number;                    // Dia do mês
  month: string;                  // Mês (abreviado)
  hasAppointments?: boolean;       // Se há consultas no dia
}

// Tipo para tipo de consulta
export type AppointmentType = 'consulta' | 'exame' | 'retorno';

// Interface para entrada de consulta
export interface AppointmentEntry {
  id: number;            // ID único da consulta
  time: string;          // Data e hora formatada
  title: string;         // Título da consulta
  location: string;      // Local da consulta
  type: AppointmentType; // Tipo da consulta
}

// Interface completa para snapshot de consultas
export interface AppointmentsSnapshot {
  dates: CalendarDateItem[];                           // Array de datas do calendário
  appointmentsByDay: Record<number, AppointmentEntry[]>; // Mapeamento dia → consultas
}

// =============================================================================
// TIPOS DE PREVENÇÃO E CHECK-UPS
// =============================================================================

// Tipo para status de check-up preventivo
export type PreventiveCheckStatus = 'em_dia' | 'vencido' | 'pendente';

// Interface para alerta preventivo
export interface PreventiveAlert {
  title: string;         // Título do alerta
  description: string;  // Descrição detalhada
  actionLabel: string;  // Label do botão de ação
}

// Interface para snapshot do score de saúde preventivo
export interface PreventiveScoreSnapshot {
  score: number;         // Score atual do usuário
  maxScore: number;      // Score máximo possível
  status: string;        // Status do score
}

// Interface para check-up preventivo
export interface PreventiveCheck {
  id: number;                           // ID único do check-up
  title: string;                        // Título do check-up
  date: string;                         // Data do check-up
  status: PreventiveCheckStatus;         // Status do check-up
}

// Interface completa para snapshot de prevenção
export interface PreventionSnapshot {
  alert: PreventiveAlert;                    // Alerta preventivo principal
  score: PreventiveScoreSnapshot;            // Score de saúde preventivo
  checks: PreventiveCheck[];                 // Array de check-ups preventivos
}

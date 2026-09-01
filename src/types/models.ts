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

// Tipo para filtro de documentos médicos (Canvas 3a: Todos/Exames/Receitas/Alterados —
// "Alterados" substitui o antigo "Laudos", que não correspondia a nenhum documentType real)
export type MedicalDocumentFilter = 'Todos' | 'Exames' | 'Receitas' | 'Alterados';

// Status de validade de receita, calculado localmente (expirationDate vs. hoje) — nunca persistido.
// Não existe equivalente para exames (nenhuma fonte real de resultado clínico no schema —
// ver specs/03-exames-receitas/lista/plan.md §2, Opção A).
export type DocumentValidityStatus = 'valida' | 'vencida';

// Interface para documentos médicos
export interface MedicalDocument {
  id: string;                                      // Database ID for updates/deletes
  icon: string;                                    // Ícone representativo
  title: string;                                  // Título do documento
  subtitle: string;                               // Linha de meta já composta: "{Tipo} · {data}" (exame) ou "{Tipo} · emitida {data}" (receita)
  category: Exclude<MedicalDocumentFilter, 'Todos'>; // Categoria (excluindo "Todos")
  // Full document data for editing
  documentType: 'exam' | 'prescription';           // Tipo de documento
  documentName: string;                           // Nome customizado
  documentDate: string;                           // Data do documento (YYYY-MM-DD)
  expirationDate: string | null;                  // Data de validade (nullable)
  s3FileName: string;                             // Nome do arquivo no S3
  originalFileName: string;                       // Nome original do arquivo
  // Badge de validade (Válida/Vencida), presente só para receitas — ver DocumentValidityStatus acima
  validityStatus?: DocumentValidityStatus | null;
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

// Interface para dose de medicamento — representação de apresentação de uma instância
// diária de uma dose de `Medicine` (ver src/services/medicineService.ts), derivada em
// src/hooks/useMedicinesData.ts. `id` é composto (`${medicineId}__${time}`) porque cada
// `Medicine` pode gerar várias doses/dia (um horário em `times`).
export interface MedicineDose {
  id: string;             // ID composto único da dose (`${medicineId}__${time}`)
  medicineId: string;     // ID do `Medicine` de origem
  time: string;           // Horário da dose (hh:mm)
  name: string;          // Nome do medicamento
  dosage: string;        // Dosagem e frequência
  status: MedicineStatus; // Status da dose
}

// Interface para item do inventário de medicamentos — apresentação derivada de `Medicine`.
export interface MedicineInventoryItem {
  id: string;                    // ID do `Medicine` de origem
  name: string;                  // Nome do medicamento
  quantity: number;              // Quantidade em estoque (currentStock)
  unit: string;                  // Unidade de medida (rótulo já traduzido)
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

// Tipo para tipo de consulta — alinhado ao enum real do schema Amplify
// (`CONSULTA'|'EXAME'|'CIRURGIA'`, ver appointmentService.ts) apos toLowerCase().
// 'retorno' nunca existiu no backend e foi removido (specs/02-perfil-home-agenda/agenda).
export type AppointmentType = 'consulta' | 'exame' | 'cirurgia';

// Interface para entrada de consulta
export interface AppointmentEntry {
  id: string | number;   // ID único da consulta
  time: string;          // Data e hora formatada
  title: string;         // Título da consulta
  location: string;      // Local da consulta
  type: AppointmentType; // Tipo da consulta
  scheduledAt: string;   // ISO original (AppointmentRecord.scheduledAt) — usado para
                          // ordenar/filtrar por proximidade (ex.: Home 2b), já que
                          // `time` é uma string formatada sem ano.
  observations?: string; // Observações/notas da consulta
}

// Interface completa para snapshot de consultas
export interface AppointmentsSnapshot {
  dates: CalendarDateItem[];                           // Array de datas do calendário
  appointmentsByDay: Record<number, AppointmentEntry[]>; // Mapeamento dia -> consultas
}

// =============================================================================
// TIPOS DE PREVENÇÃO E CHECK-UPS
// =============================================================================

// Grau de recomendacao USPSTF (A/B = recomendado, C = sem recomendacao de rotina,
// D = recomendado contra, I = evidencia insuficiente)
export type UspstfGrade = 'A' | 'B' | 'C' | 'D' | 'I';

// Uma recomendacao de prevencao retornada pela funcao getPreventionRecommendations,
// ja filtrada para o perfil do usuario. title/text/rationale vem verbatim da USPSTF
// (em ingles, nao traduzir) por exigencia de direitos autorais da AHRQ.
export interface PreventionRecommendation {
  id: number;
  grade: UspstfGrade;
  gradeText: string;
  title: string;
  text: string;
  rationale: string | null;
  topic: string | null;
  citationYear: string | null;
  ageMin: number | null;
  ageMax: number | null;
  sex: string | null;
  bmi: string | null;
}

// Recomendacao com o estado local (nao persistido no backend) de lembrete ativado
export interface RecommendationView extends PreventionRecommendation {
  isReminderOn: boolean;
}

// Interface completa para snapshot de prevenção
export interface PreventionSnapshot {
  recommendations: PreventionRecommendation[];
  lastUpdated: string;
  // false quando o usuario ainda nao completou o cadastro de perfil de saude
  profileComplete: boolean;
}

// Status derivado de uma dose de vacina — nunca persistido, sempre calculado a
// partir de appliedDate/dueDate (ver useVaccinationData.ts).
export type VaccineDoseStatus = 'pendente' | 'atrasada' | 'aplicada';

// Item de apresentação de uma dose de vacina (recomendação futura ou histórico).
export interface VaccineDoseItem {
  id: string;
  name: string;
  doseNumber?: number;
  status: VaccineDoseStatus;
  description: string;          // ex.: "Dose anual · campanha até 30/09" / "Reforço a cada 10 anos"
  appliedDate?: string;         // preenchido só quando status === 'aplicada'
  location?: string;            // idem
  dueDate?: string;             // preenchido só quando pendente/atrasada
}

// Snapshot completo da Carteira de Vacinação (tela 4e).
export interface VaccinationSnapshot {
  upcoming: VaccineDoseItem[];        // status pendente/atrasada
  history: VaccineDoseItem[];         // status aplicada, ordenado do mais recente
  activeCampaignMessage: string | null; // conteúdo institucional, não dado do usuário
}

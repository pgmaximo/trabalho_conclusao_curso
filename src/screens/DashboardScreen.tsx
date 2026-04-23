// =============================================================================
// Arquivo: DashboardScreen.tsx
// Descrição: Tela principal do dashboard com métricas de saúde e eventos
// Componente: DashboardScreen
// =============================================================================
//
// Este componente implementa a tela principal do dashboard do aplicativo,
// exibindo um resumo completo da saúde do usuário com métricas, eventos
// próximos, alertas preventivos e navegação rápida para outras funcionalidades.
//
// Funcionalidades:
// - Saudação personalizada com data atual
// - Métricas de saúde com barras de progresso
// - Lista de próximos eventos e compromissos
// - Alertas preventivos de saúde
// - Botões de navegação rápida
// - Estados de loading e erro com retry
// - Layout responsivo e scrollável
//
// Estrutura Visual:
// - Header com saudação e data
// - Métricas em grid 2x2
// - Eventos próximos em lista
// - Alertas preventivas destacadas
// - Botões de acesso rápido
//
// =============================================================================

// Importações necessárias
import React from 'react';                                                    // Biblioteca principal React
import { ScrollView, StyleSheet, Text, View } from 'react-native';           // Componentes UI básicos
import { StatusBar } from 'expo-status-bar';                               // Status bar do Expo
import { SafeAreaView } from 'react-native-safe-area-context';              // Área segura para dispositivos

// Importações de componentes
import { Card } from '@/components/Card';                                   // Componente de cartão
import { EmptyState } from '@/components/EmptyState';                       // Estado vazio
import { EventCard } from '@/components/EventCard';                         // Cartão de eventos
import { MetricCard } from '@/components/MetricCard';                       // Cartão de métricas
import { QuickAccessButton } from '@/components/QuickAccessButton';         // Botões de acesso rápido
import { ScreenHeader } from '@/components/ScreenHeader';                   // Header de tela
import { ScreenSkeleton } from '@/components/ScreenSkeleton';               // Skeleton loading
import { Section } from '@/components/Section';                             // Componente de seção

// Importações de tema e tipos
import { COLORS, FONTS, SIZES } from '@/constants/theme';                  // Configurações de tema
import type { DashboardEvent, DashboardMetric, DashboardSummary } from '@/types/models'; // Tipos de dados

// Props do componente DashboardScreen
type DashboardScreenProps = {
  greeting: string;                     // Mensagem de saudação personalizada
  todayLabel: string;                   // Label formatado para data atual
  summary: DashboardSummary;           // Resumo principal do estado de saúde
  metrics: DashboardMetric[];          // Array de métricas de saúde
  upcomingEvents: DashboardEvent[];    // Array de próximos eventos
  preventiveAlert: DashboardEvent;      // Alerta preventivo de saúde
  isLoading: boolean;                   // Estado de carregamento
  errorMessage: string | null;         // Mensagem de erro (se houver)
  onRetry: () => void;                 // Função para retry em caso de erro
  onNavigateToAi?: () => void;         // Callback para navegar para IA
  onNavigateToMedicines?: () => void;  // Callback para navegar para medicamentos
  onNavigateToAppointments?: () => void; // Callback para navegar para consultas
  onNavigateToPrevention?: () => void; // Callback para navegar para prevenção
};

// Componente DashboardScreen principal
export function DashboardScreen({
  greeting,                    // Mensagem de saudação
  todayLabel,                  // Label da data atual
  summary,                     // Resumo do estado de saúde
  metrics,                     // Métricas de saúde
  upcomingEvents,              // Próximos eventos
  preventiveAlert,             // Alerta preventivo
  isLoading,                   // Estado de carregamento
  errorMessage,                // Mensagem de erro
  onRetry,                     // Função de retry
  onNavigateToAi,              // Callback para IA
  onNavigateToMedicines,       // Callback para medicamentos
  onNavigateToAppointments,    // Callback para consultas
  onNavigateToPrevention,      // Callback para prevenção
}: DashboardScreenProps) {
  // Divide métricas em duas linhas para layout 2x2
  const firstRowMetrics = metrics.slice(0, 2);    // Primeira linha (índices 0,1)
  const secondRowMetrics = metrics.slice(2, 4);   // Segunda linha (índices 2,3)

  // Renderiza a tela completa do dashboard
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar configurada para modo escuro */}
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      
      <View style={styles.container}>
        {/* ScrollView principal para conteúdo rolável */}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Estado de loading - exibe skeleton */}
          {isLoading ? (
            <ScreenSkeleton blocks={4} />
          ) : /* Estado de erro - exibe tela de erro com retry */
          errorMessage ? (
            <EmptyState
              icon="⚠️"                                    // Ícone de erro
              title="Nao foi possivel carregar o dashboard"  // Título do erro
              description={errorMessage}                   // Mensagem detalhada
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader title={greeting} subtitle={todayLabel} badgeLabel={summary.status} />

              <Card variant="soft" padding="spacious">
                <Text style={styles.summaryLabel}>Seu resumo de hoje</Text>
                <Text style={styles.summaryValue}>{summary.value}</Text>
                <Text style={styles.summaryStatus}>{summary.status}</Text>
              </Card>

              <Section title="Indicadores principais" subtitle="Resumo rapido do que merece atencao hoje.">
                <View style={styles.metricsRow}>
                  {firstRowMetrics.map((metric) => (
                    <MetricCard
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      status={metric.status}
                      statusColor={metric.statusColor}
                      progressPercent={metric.progressPercent}
                    />
                  ))}
                </View>
                <View style={styles.metricsRow}>
                  {secondRowMetrics.map((metric) => (
                    <MetricCard
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      status={metric.status}
                      statusColor={metric.statusColor}
                      progressPercent={metric.progressPercent}
                    />
                  ))}
                </View>
              </Section>

              <Section title="Próximos eventos" subtitle="Compromissos e lembretes mais proximos.">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <EventCard
                      key={event.title}
                      icon={event.icon}
                      title={event.title}
                      subtitle={event.subtitle}
                      actionLabel={event.actionLabel}
                      actionColor={event.actionColor}
                      onActionPress={() => {}}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="📅"
                    title="Nenhum evento programado"
                    description="Quando houver novos exames ou consultas, eles aparecerao aqui."
                  />
                )}
              </Section>

              <Section title="Prevenção" subtitle="Sinais preventivos com base no seu perfil atual.">
                <EventCard
                  icon={preventiveAlert.icon}
                  title={preventiveAlert.title}
                  subtitle={preventiveAlert.subtitle}
                  variant={preventiveAlert.variant}
                />
              </Section>

              <Section title="Acesso rápido" subtitle="Atalhos para as areas mais usadas do app.">
                <View style={styles.quickAccessRow}>
                  <QuickAccessButton icon="📅" label="Agendas" onPress={onNavigateToAppointments ?? (() => {})} />
                  <QuickAccessButton icon="🧠" label="IA p/ Exames" onPress={onNavigateToAi ?? (() => {})} />
                  <QuickAccessButton icon="💊" label="Medicamentos" onPress={onNavigateToMedicines ?? (() => {})} />
                  <QuickAccessButton icon="⌚" label="Wearable" onPress={() => {}} />
                </View>
                <View style={styles.quickAccessRow}>
                  <QuickAccessButton icon="🛡️" label="Prevenção" onPress={onNavigateToPrevention ?? (() => {})} />
                </View>
              </Section>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.large * 2,
  },
  summaryLabel: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryValue: {
    ...FONTS.title,
    color: COLORS.text,
  },
  summaryStatus: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: SIZES.medium,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

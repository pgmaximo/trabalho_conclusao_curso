import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { MetricCard } from '@/components/MetricCard';
import { QuickAccessButton } from '@/components/QuickAccessButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type {
  DashboardEvent,
  DashboardMetric,
  DashboardSummary,
  MedicalDocument,
} from '@/types/models';

type HomeScreenProps = {
  greeting: string;
  todayLabel: string;
  summary: DashboardSummary;
  metrics: DashboardMetric[];
  upcomingEvents: DashboardEvent[];
  preventiveAlert: DashboardEvent;
  recentExams: MedicalDocument[];
  isLoading: boolean;
  examsLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onNavigateToExamDetail: (id: string) => void;
  onNavigateToAi?: () => void;
  onNavigateToMedicines?: () => void;
  onNavigateToAppointments?: () => void;
  onNavigateToPrevention?: () => void;
};

export function HomeScreen({
  greeting,
  todayLabel,
  summary,
  metrics,
  upcomingEvents,
  preventiveAlert,
  recentExams,
  isLoading,
  examsLoading,
  errorMessage,
  onRetry,
  onNavigateToExamDetail,
  onNavigateToAi,
  onNavigateToMedicines,
  onNavigateToAppointments,
  onNavigateToPrevention,
}: HomeScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();

  const firstRowMetrics = metrics.slice(0, 2);
  const secondRowMetrics = metrics.slice(2, 4);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ScreenSkeleton blocks={4} />
        ) : errorMessage ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar o dashboard"
            description={errorMessage}
            tone="error"
            actionLabel="Tentar novamente"
            onActionPress={onRetry}
          />
        ) : (
          <>
            <ScreenHeader title={greeting} subtitle={todayLabel} badgeLabel={summary.status} />

            <Card variant="soft" padding="spacious">
              <Text className="mb-1.5 text-[13px] font-bold text-app-primary dark:text-app-dark-primary">
                Seu resumo de hoje
              </Text>
              <Text className="text-xl font-bold text-app-text dark:text-app-dark-text">
                {summary.value}
              </Text>
              <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
                {summary.status}
              </Text>
            </Card>

            <View className="mt-6">
              <Section
                title="Indicadores principais"
                subtitle="Resumo rápido do que merece atenção hoje."
              >
                <View className="mb-4 flex-row">
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
                <View className="flex-row">
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

              <Section title="Últimos exames" subtitle="Documentos enviados recentemente.">
                {examsLoading ? (
                  <ScreenSkeleton blocks={2} />
                ) : recentExams.length > 0 ? (
                  recentExams.map((exam) => (
                    <Pressable
                      key={exam.id}
                      className="mb-3 flex-row items-center gap-3 rounded-card border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface"
                      onPress={() => onNavigateToExamDetail(exam.id)}
                      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                    >
                      <Ionicons color={colors.primary} name="document-text-outline" size={22} />
                      <View className="flex-1">
                        <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">
                          {exam.title}
                        </Text>
                        <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
                          {exam.subtitle}
                        </Text>
                      </View>
                      <Ionicons color={colors.iconMuted} name="chevron-forward" size={18} />
                    </Pressable>
                  ))
                ) : (
                  <EmptyState
                    icon="document-text-outline"
                    title="Nenhum exame enviado"
                    description="Seus exames aparecerão aqui após o upload."
                  />
                )}
              </Section>

              <Section
                title="Próximos eventos"
                subtitle="Compromissos e lembretes mais próximos."
              >
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
                    icon="calendar-outline"
                    title="Nenhum evento programado"
                    description="Quando houver novos exames ou consultas, eles aparecerão aqui."
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

              <Section title="Acesso rápido" subtitle="Atalhos para as áreas mais usadas do app.">
                <View className="flex-row justify-between">
                  <QuickAccessButton
                    icon="calendar-outline"
                    label="Agendas"
                    onPress={onNavigateToAppointments ?? (() => {})}
                  />
                  <QuickAccessButton
                    icon="bulb-outline"
                    label="IA p/ Exames"
                    onPress={onNavigateToAi ?? (() => {})}
                  />
                  <QuickAccessButton
                    icon="medkit-outline"
                    label="Medicamentos"
                    onPress={onNavigateToMedicines ?? (() => {})}
                  />
                  <QuickAccessButton icon="watch-outline" label="Wearable" onPress={() => {}} />
                </View>
                <View className="mt-2 flex-row justify-between">
                  <QuickAccessButton
                    icon="shield-checkmark-outline"
                    label="Prevenção"
                    onPress={onNavigateToPrevention ?? (() => {})}
                  />
                </View>
              </Section>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

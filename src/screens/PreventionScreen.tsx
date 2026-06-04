import React from 'react';
import { ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

import { EmptyState } from '@/components/EmptyState';
import { HealthCheckItem } from '@/components/HealthCheckItem';
import { PreventiveScore } from '@/components/PreventiveScore';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { UrgentAlert } from '@/components/UrgentAlert';
import type {
  PreventiveAlert,
  PreventiveCheck,
  PreventiveScoreSnapshot,
} from '@/types/models';

type PreventionScreenProps = {
  alert: PreventiveAlert;
  score: PreventiveScoreSnapshot;
  checks: PreventiveCheck[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export function PreventionScreen({
  alert,
  score,
  checks,
  isLoading,
  errorMessage,
  onRetry,
}: PreventionScreenProps) {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-6 pb-12" showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Não foi possível carregar os alertas"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader
                title="Prevenção & Alertas"
                subtitle="Itens que podem ser acompanhados antes de virarem urgência."
              />

              <UrgentAlert
                title={alert.title}
                description={alert.description}
                actionLabel={alert.actionLabel}
                onActionPress={() => {}}
              />

              <Section title="Pontuação preventiva" subtitle="Leitura sintética do momento atual.">
                <PreventiveScore score={score.score} maxScore={score.maxScore} status={score.status} />
              </Section>

              <Section title="Exames e verificações" subtitle="Checklist priorizado para acompanhamento.">
                {checks.length > 0 ? (
                  checks.map((check) => (
                    <HealthCheckItem
                      key={check.id}
                      title={check.title}
                      date={check.date}
                      status={check.status}
                      onPress={() => {}}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="document-text-outline"
                    title="Nenhum item preventivo pendente"
                    description="Nenhum exame analisado ainda. Faça o upload de um exame."
                  />
                )}
              </Section>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

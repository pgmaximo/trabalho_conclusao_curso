import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { HealthCheckItem } from '@/components/HealthCheckItem';
import { PreventiveScore } from '@/components/PreventiveScore';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { UrgentAlert } from '@/components/UrgentAlert';
import { COLORS, SIZES } from '@/constants/theme';
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
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="🛡️"
              title="Nao foi possivel carregar os alertas"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader
                title="Prevenção & Alertas"
                subtitle="Itens que podem ser acompanhados antes de virarem urgencia."
              />

              <UrgentAlert
                title={alert.title}
                description={alert.description}
                actionLabel={alert.actionLabel}
                onActionPress={() => {}}
              />

              <Section title="Pontuação preventiva" subtitle="Leitura sintetica do momento atual.">
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
                    icon="🩺"
                    title="Nenhum item preventivo pendente"
                    description="Quando surgirem novos acompanhamentos, eles aparecerao aqui."
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
});

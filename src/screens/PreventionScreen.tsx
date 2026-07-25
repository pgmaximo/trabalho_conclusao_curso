import React from 'react';
import { ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

import { EmptyState } from '@/components/EmptyState';
import { RecommendationCard } from '@/components/RecommendationCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import type { RecommendationView } from '@/types/models';

type PreventionScreenProps = {
  recommendations: RecommendationView[];
  lastUpdated: string;
  profileComplete: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onToggleReminder: (recommendationId: number) => void;
  onCompleteProfile: () => void;
  pendingReminderId: number | null;
};

export function PreventionScreen({
  recommendations,
  lastUpdated,
  profileComplete,
  isLoading,
  errorMessage,
  onRetry,
  onToggleReminder,
  onCompleteProfile,
  pendingReminderId,
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
              title="Não foi possível carregar as recomendações"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : !profileComplete ? (
            <EmptyState
              icon="person-outline"
              title="Complete seu perfil de saúde"
              description="Precisamos de algumas informações do seu perfil para calcular as recomendações preventivas certas para você."
              actionLabel="Completar perfil"
              onActionPress={onCompleteProfile}
            />
          ) : (
            <>
              <ScreenHeader
                title="Prevenção & Alertas"
                subtitle={`Recomendações da USPSTF para o seu perfil${lastUpdated ? ` · base de ${lastUpdated}` : ''}.`}
                badgeLabel={`${recommendations.length} recomendaç${recommendations.length === 1 ? 'ão' : 'ões'}`}
                badgeVariant={recommendations.length > 0 ? 'primary' : 'neutral'}
              />

              <Section
                title="Recomendações preventivas"
                subtitle="Toque no sino para ser lembrado de agendar cada exame."
              >
                {recommendations.length > 0 ? (
                  recommendations.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      grade={recommendation.grade}
                      gradeText={recommendation.gradeText}
                      title={recommendation.title}
                      text={recommendation.text}
                      citation={recommendation.citationYear ?? recommendation.topic ?? 'USPSTF'}
                      isReminderOn={recommendation.isReminderOn}
                      onToggleReminder={() => onToggleReminder(recommendation.id)}
                      reminderDisabled={pendingReminderId === recommendation.id}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="shield-checkmark-outline"
                    title="Nenhuma recomendação pendente"
                    description="Não encontramos recomendações preventivas específicas para o seu perfil no momento."
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

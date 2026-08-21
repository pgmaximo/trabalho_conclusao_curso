import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FilterChips } from '@/components/FilterChips';
import { RecommendationCard } from '@/components/RecommendationCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type { RecommendationView, UspstfGrade } from '@/types/models';

type PreventionScreenProps = {
  recommendations: RecommendationView[];
  lastUpdated: string;
  profileComplete: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onToggleReminder: (recommendationId: number) => void;
  onEnableRemindersForIds: (recommendationIds: number[]) => void;
  onCompleteProfile: () => void;
  pendingReminderIds: Set<number>;
};

const ALL_FILTER = 'Todos';
const GRADE_ORDER: UspstfGrade[] = ['A', 'B', 'C', 'D', 'I'];

export function PreventionScreen({
  recommendations,
  lastUpdated,
  profileComplete,
  isLoading,
  errorMessage,
  onRetry,
  onToggleReminder,
  onEnableRemindersForIds,
  onCompleteProfile,
  pendingReminderIds,
}: PreventionScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>(ALL_FILTER);

  const availableGrades = useMemo(() => {
    const present = new Set(recommendations.map((rec) => rec.grade));
    return GRADE_ORDER.filter((grade) => present.has(grade));
  }, [recommendations]);

  const filterOptions = useMemo(() => [ALL_FILTER, ...availableGrades], [availableGrades]);

  const filteredRecommendations = useMemo(
    () =>
      selectedGradeFilter === ALL_FILTER
        ? recommendations
        : recommendations.filter((rec) => rec.grade === selectedGradeFilter),
    [recommendations, selectedGradeFilter],
  );

  const filteredIdsWithReminderOff = filteredRecommendations.flatMap((rec) =>
    rec.isReminderOn ? [] : [rec.id],
  );

  // lastUpdated e exibido no rodape do banner de contexto quando disponivel —
  // a API do USPSTF pode retornar vazio, entao a linha e omitida nesse caso.
  const lastUpdatedLabel = lastUpdated ? `Dataset atualizado em ${lastUpdated}.` : null;

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
                badgeLabel={`${recommendations.length} recomendaç${recommendations.length === 1 ? 'ão' : 'ões'}`}
                badgeVariant={recommendations.length > 0 ? 'primary' : 'neutral'}
              />

              {recommendations.length > 0 ? (
                <Card variant="soft" padding="compact" style={{ marginBottom: 16 }}>
                  <Text className="text-[13px] leading-5 text-app-textSecondary dark:text-app-dark-textSecondary">
                    O texto oficial de cada recomendação vem do USPSTF (agência de saúde dos EUA) e
                    precisa continuar em inglês, sem alterações, por exigência de direitos autorais.
                    Adicionamos uma explicação do grau em português para ajudar na leitura.
                    {lastUpdatedLabel ? ` ${lastUpdatedLabel}` : ''}
                  </Text>
                </Card>
              ) : null}

              {filterOptions.length > 1 ? (
                <FilterChips
                  options={filterOptions}
                  activeFilter={selectedGradeFilter}
                  onFilterChange={setSelectedGradeFilter}
                />
              ) : null}

              <Section
                title="Recomendações preventivas"
                subtitle="Toque no sino para ser lembrado de agendar cada exame."
                action={
                  filteredIdsWithReminderOff.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ativar lembretes para todos os exames filtrados"
                      onPress={() => onEnableRemindersForIds(filteredIdsWithReminderOff)}
                      className="flex-row items-center gap-1 rounded-full border border-app-primary px-3 py-1.5 dark:border-app-dark-primary"
                    >
                      <Ionicons name="notifications-outline" size={14} color={colors.primary} />
                      <Text className="text-[12px] font-bold text-app-primary dark:text-app-dark-primary">
                        Ativar todos ({filteredIdsWithReminderOff.length})
                      </Text>
                    </Pressable>
                  ) : undefined
                }
              >
                {filteredRecommendations.length > 0 ? (
                  filteredRecommendations.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      grade={recommendation.grade}
                      gradeText={recommendation.gradeText}
                      title={recommendation.title}
                      text={recommendation.text}
                      citation={recommendation.citationYear ?? recommendation.topic ?? 'USPSTF'}
                      isReminderOn={recommendation.isReminderOn}
                      onToggleReminder={() => onToggleReminder(recommendation.id)}
                      reminderDisabled={pendingReminderIds.has(recommendation.id)}
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

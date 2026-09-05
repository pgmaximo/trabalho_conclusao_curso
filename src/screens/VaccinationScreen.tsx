/**
 * Resumo do arquivo:
 * Tela "Carteira de vacinação" (4e) — próximas doses recomendadas (Pendente/
 * Atrasada), histórico de doses aplicadas e banner de campanha institucional.
 * Segunda-nível (acessada via "Mais"), com cabeçalho próprio de voltar.
 */
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type { VaccineDoseItem } from '@/types/models';

type VaccinationScreenProps = {
  upcoming: VaccineDoseItem[];
  history: VaccineDoseItem[];
  activeCampaignMessage: string | null;
  isEmpty: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onAddVaccine: () => void;
};

function DoseCard({ item }: { item: VaccineDoseItem }) {
  const badge =
    item.status === 'aplicada'
      ? { label: 'Aplicada', variant: 'success' as const }
      : item.status === 'atrasada'
        ? { label: 'Atrasada', variant: 'danger' as const }
        : { label: 'Pendente', variant: 'warning' as const };

  const supportLine =
    item.status === 'aplicada' && item.appliedDate
      ? `Aplicada em ${item.appliedDate.split('-').reverse().join('/')}${item.location ? ` · ${item.location}` : ''}`
      : item.description;

  return (
    <Card padding="compact" style={{ marginBottom: 10 }}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            {item.name}
          </Text>
          <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {supportLine}
          </Text>
        </View>
        <Badge label={badge.label} variant={badge.variant} />
      </View>
    </Card>
  );
}

export function VaccinationScreen({
  upcoming,
  history,
  activeCampaignMessage,
  isEmpty,
  isLoading,
  errorMessage,
  onRetry,
  onAddVaccine,
}: VaccinationScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background" edges={['top']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-border dark:border-app-dark-border"
          >
            <Ionicons color={colors.text} name="chevron-back" size={22} />
          </Pressable>
          <Text className="flex-1 text-[20px] font-semibold text-app-text dark:text-app-dark-text">
            Carteira de vacinação
          </Text>
          <Pressable
            accessibilityLabel="Adicionar vacina"
            accessibilityRole="button"
            onPress={onAddVaccine}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft"
          >
            <Ionicons color={colors.primary} name="add" size={22} />
          </Pressable>
        </View>

        {activeCampaignMessage ? (
          <View className="mb-6 flex-row items-start gap-3 rounded-app border border-app-successBadgeBorder bg-app-successSoft px-4 py-3 dark:border-app-dark-successBadgeBorder dark:bg-app-dark-successSoft">
            <View className="size-6 items-center justify-center rounded-full bg-app-successIconBg dark:bg-app-dark-successIconBg">
              <Ionicons color="#FFFFFF" name="medical" size={14} />
            </View>
            <Text className="flex-1 text-[15px] leading-[20px] text-app-primaryDark dark:text-app-dark-primaryDark">
              {activeCampaignMessage}
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <ScreenSkeleton blocks={3} />
        ) : errorMessage ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar sua carteira"
            description={errorMessage}
            tone="error"
            actionLabel="Tentar novamente"
            onActionPress={onRetry}
          />
        ) : isEmpty ? (
          <EmptyState
            icon="medical-outline"
            title="Você ainda não tem vacinas registradas."
            description="Adicione uma dose já aplicada ou uma recomendação futura para começar sua carteira."
            actionLabel="Adicionar vacina"
            onActionPress={onAddVaccine}
          />
        ) : (
          <>
            {upcoming.length > 0 ? (
              <Section title="Próximas recomendadas">
                {upcoming.map((item) => (
                  <DoseCard key={item.id} item={item} />
                ))}
              </Section>
            ) : null}

            {history.length > 0 ? (
              <Section title="Histórico de doses">
                {history.map((item) => (
                  <DoseCard key={item.id} item={item} />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

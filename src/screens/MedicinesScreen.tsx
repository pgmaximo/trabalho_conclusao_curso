// =============================================================================
// Arquivo: MedicinesScreen.tsx
// Descrição: Tela 3d do Canvas — "Medicamentos — doses e estoque". Banner de
// lembretes ativos (contagem real), lista de doses de hoje e estoques.
//
// O título é "Remédios", o nome da aba e do atalho do Início que trazem aqui
// (specs/00-fundacao/consistencia-e-textos/spec.md, D2). Cada item continua
// sendo um "medicamento".
// =============================================================================

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AlertBanner } from '@/components/AlertBanner';
import { EmptyState } from '@/components/EmptyState';
import { MedicineCard } from '@/components/MedicineCard';
import { MedicineStock } from '@/components/MedicineStock';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { InlineError } from '@/components/InlineError';
import { useThemeColors } from '@/constants/theme';
import type { DrugInteractionMatch } from '@/services/drugInteractionService';
import type { MedicineDose, MedicineInventoryItem } from '@/types/models';

type MedicinesScreenProps = {
  medicines: MedicineDose[];
  stocks: MedicineInventoryItem[];
  interactions: DrugInteractionMatch[];
  hasMedicines: boolean;
  pendingCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onToggleMedicineStatus: (doseId: string) => Promise<void>;
};

export function MedicinesScreen({
  medicines,
  stocks,
  interactions,
  hasMedicines,
  pendingCount,
  isLoading,
  errorMessage,
  onRetry,
  onToggleMedicineStatus,
}: MedicinesScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [togglingDoseId, setTogglingDoseId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  function goToAddMedicine() {
    router.push('/add-medicine');
  }

  function goToEditMedicine(id: string) {
    router.push({ pathname: '/edit-medicine', params: { id } });
  }

  async function toggleDose(doseId: string) {
    if (togglingDoseId) return;
    setTogglingDoseId(doseId);
    setToggleError(null);
    try {
      await onToggleMedicineStatus(doseId);
    } catch (error) {
      setToggleError(error instanceof Error ? error.message : 'Não foi possível atualizar a dose.');
    } finally {
      setTogglingDoseId(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Remédios"
          action={
            <Pressable
              accessibilityLabel="Adicionar medicamento"
              accessibilityRole="button"
              onPress={goToAddMedicine}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              className="size-12 items-center justify-center rounded-full bg-app-primary dark:bg-app-dark-primary"
            >
              <Ionicons color={colors.onPrimary} name="add" size={24} />
            </Pressable>
          }
        />

        {isLoading ? (
          <ScreenSkeleton blocks={3} />
        ) : errorMessage ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar os medicamentos"
            description={errorMessage}
            tone="error"
            actionLabel="Tentar novamente"
            onActionPress={onRetry}
          />
        ) : !hasMedicines ? (
          <EmptyState
            icon="medkit-outline"
            title="Você ainda não tem medicamentos cadastrados"
            description="Adicione um lembrete de medicamento para controlar doses e estoque."
            actionLabel="Adicionar medicamento"
            onActionPress={goToAddMedicine}
          />
        ) : (
          <>
            {toggleError ? <InlineError message={toggleError} /> : null}
            <View className="mb-6 flex-row items-center gap-3 rounded-app border border-app-infoBadgeBorder bg-app-infoSoft px-4 py-3 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft">
              <View className="size-8 items-center justify-center rounded-full bg-app-infoIconBg dark:bg-app-dark-infoIconBg">
                <Ionicons color={colors.onPrimary} name="notifications" size={16} />
              </View>
              <Text className="flex-1 text-[15px] leading-[20px] text-app-text dark:text-app-dark-text">
                {pendingCount > 0
                  ? `Você tem ${pendingCount} lembrete${pendingCount !== 1 ? 's' : ''} ativo${pendingCount !== 1 ? 's' : ''} para hoje.`
                  : 'Nenhum lembrete pendente para hoje.'}
              </Text>
            </View>

            {interactions.length > 0 ? (
              <View className="mb-4">
                {interactions.map((match) => (
                  // O ícone é o do tipo do aviso: triângulo na interação grave,
                  // exclamação na leve. Era um emoji, igual nas duas.
                  <AlertBanner
                    key={match.pair.id}
                    type={match.severity === 'danger' ? 'danger' : 'warning'}
                    title={`${match.medicineA.name} + ${match.medicineB.name}`}
                    message={match.riskPt}
                  />
                ))}
              </View>
            ) : null}

            <Section title="Próximas doses" subtitle="Marque cada item conforme a administração.">
              {medicines.length > 0 ? (
                medicines.map((medicine) => (
                  <MedicineCard
                    key={medicine.id}
                    name={medicine.name}
                    dosage={medicine.dosage}
                    time={medicine.time}
                    status={medicine.status}
                    onPress={() => goToEditMedicine(medicine.medicineId)}
                    onToggle={() => void toggleDose(medicine.id)}
                    toggleDisabled={togglingDoseId === medicine.id}
                  />
                ))
              ) : (
                // Esta lista vazia quer dizer que NÃO HÁ dose prevista para hoje
                // (as já tomadas continuam na lista). O texto antigo dizia que
                // todas já tinham sido registradas, o que aqui nunca é o caso.
                <EmptyState
                  icon="checkmark-circle-outline"
                  title="Nenhuma dose para hoje"
                  description="Você não tem doses previstas para hoje."
                />
              )}
            </Section>

            <Section title="Estoques" subtitle="Visão rápida dos medicamentos que podem acabar em breve.">
              {stocks.length > 0 ? (
                stocks.map((stock) => (
                  <MedicineStock
                    key={stock.id}
                    name={stock.name}
                    quantity={stock.quantity}
                    unit={stock.unit}
                    status={stock.status}
                    percentage={stock.percentage}
                    onPress={() => goToEditMedicine(stock.id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="cube-outline"
                  title="Nenhum estoque cadastrado"
                  description="Os estoques aparecerão aqui quando um medicamento for adicionado."
                />
              )}
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

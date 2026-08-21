// =============================================================================
// Arquivo: MedicinesScreen.tsx
// Descrição: Tela 3d do Canvas — "Medicamentos — doses e estoque". Banner de
// lembretes ativos (contagem real), lista de doses de hoje e estoques.
// =============================================================================

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyState } from '@/components/EmptyState';
import { MedicineCard } from '@/components/MedicineCard';
import { MedicineStock } from '@/components/MedicineStock';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type { MedicineDose, MedicineInventoryItem } from '@/types/models';

type MedicinesScreenProps = {
  medicines: MedicineDose[];
  stocks: MedicineInventoryItem[];
  hasMedicines: boolean;
  pendingCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onToggleMedicineStatus: (doseId: string) => void;
};

export function MedicinesScreen({
  medicines,
  stocks,
  hasMedicines,
  pendingCount,
  isLoading,
  errorMessage,
  onRetry,
  onToggleMedicineStatus,
}: MedicinesScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();

  function goToAddMedicine() {
    router.push('/add-medicine');
  }

  function goToEditMedicine(id: string) {
    router.push({ pathname: '/edit-medicine', params: { id } });
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center justify-between gap-3">
          <Text className="text-[26px] font-semibold text-app-text dark:text-app-dark-text">
            Medicamentos
          </Text>
          <Pressable
            accessibilityLabel="Adicionar medicamento"
            accessibilityRole="button"
            onPress={goToAddMedicine}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            className="size-12 items-center justify-center rounded-full bg-app-primary dark:bg-app-dark-primary"
          >
            <Ionicons color={colors.onPrimary} name="add" size={24} />
          </Pressable>
        </View>

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
            <View className="mb-6 flex-row items-center gap-3 rounded-app border border-app-infoBadgeBorder bg-app-infoSoft px-4 py-3 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft">
              <View className="size-8 items-center justify-center rounded-full bg-app-infoIconBg dark:bg-app-dark-infoIconBg">
                <Ionicons color="#FFFFFF" name="notifications" size={16} />
              </View>
              <Text className="flex-1 text-[15px] leading-[20px] text-app-text dark:text-app-dark-text">
                Você tem {pendingCount} lembrete{pendingCount !== 1 ? 's' : ''} ativo{pendingCount !== 1 ? 's' : ''} para hoje.
              </Text>
            </View>

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
                    onToggle={() => onToggleMedicineStatus(medicine.id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="checkmark-circle-outline"
                  title="Nenhuma dose pendente"
                  description="Todas as medicações previstas para hoje já foram registradas."
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

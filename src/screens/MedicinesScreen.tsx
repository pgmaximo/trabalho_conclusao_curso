import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { MedicineCard } from '@/components/MedicineCard';
import { MedicineStock } from '@/components/MedicineStock';
import { ReminderBanner } from '@/components/ReminderBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { COLORS, SIZES } from '@/constants/theme';
import type { MedicineDose, MedicineInventoryItem, ReminderInfo } from '@/types/models';

type MedicinesScreenProps = {
  medicines: MedicineDose[];
  stocks: MedicineInventoryItem[];
  reminder: ReminderInfo;
  pendingCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onToggleMedicineStatus: (medicineId: number) => void;
};

export function MedicinesScreen({
  medicines,
  stocks,
  reminder,
  pendingCount,
  isLoading,
  errorMessage,
  onRetry,
  onToggleMedicineStatus,
}: MedicinesScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="💊"
              title="Nao foi possivel carregar os medicamentos"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader
                title="Medicamentos"
                subtitle="Controle de doses, estoque e lembretes em um unico lugar."
                badgeLabel={`${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
                badgeVariant={pendingCount > 0 ? 'accent' : 'success'}
                action={
                  <Pressable
                    style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                    onPress={() => {}}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </Pressable>
                }
              />

              <Section title="Próximas doses" subtitle="Marque cada item conforme a administracao.">
                {medicines.length > 0 ? (
                  medicines.map((medicine) => (
                    <MedicineCard
                      key={medicine.id}
                      name={medicine.name}
                      dosage={medicine.dosage}
                      time={medicine.time}
                      status={medicine.status}
                      onToggle={() => onToggleMedicineStatus(medicine.id)}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="✅"
                    title="Nenhuma dose pendente"
                    description="Todas as medicacoes previstas para hoje ja foram registradas."
                  />
                )}
              </Section>

              <Section title="Estoques" subtitle="Visao rapida dos medicamentos que podem acabar em breve.">
                {stocks.length > 0 ? (
                  stocks.map((stock) => (
                    <MedicineStock
                      key={stock.id}
                      name={stock.name}
                      quantity={stock.quantity}
                      unit={stock.unit}
                      status={stock.status}
                      percentage={stock.percentage}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="📦"
                    title="Nenhum estoque cadastrado"
                    description="Os estoques aparecerao aqui quando a integracao estiver conectada."
                  />
                )}
              </Section>

              <Section title="Lembretes ativados" subtitle="Regra atual configurada para o usuario.">
                <ReminderBanner title={reminder.title} description={reminder.description} />
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});

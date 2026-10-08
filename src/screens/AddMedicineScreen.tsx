// =============================================================================
// Arquivo: AddMedicineScreen.tsx
// Descrição: Tela 3f do Canvas — "Novo lembrete de medicamento". Criação pura,
// todos os campos começam vazios.
// =============================================================================

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { DrugInteractionSheet } from '@/components/DrugInteractionSheet';
import { InlineError } from '@/components/InlineError';
import {
  EMPTY_MEDICINE_FORM,
  MedicineFormFields,
  toMedicineInput,
  validateMedicineForm,
  type MedicineFormState,
} from '@/components/MedicineFormFields';
import { useThemeColors } from '@/constants/theme';
import { createMedicine, listMedicinesForUser } from '@/services/medicineService';
import { syncMedicineReminders } from '@/services/medicineReminderService';
import { findInteractionsForCandidate, type DrugInteractionMatch } from '@/services/drugInteractionService';

export function AddMedicineScreen() {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();

  const [form, setForm] = useState<MedicineFormState>(EMPTY_MEDICINE_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [interactionMatches, setInteractionMatches] = useState<DrugInteractionMatch[]>([]);
  const [isInteractionSheetVisible, setIsInteractionSheetVisible] = useState(false);

  function update(patch: Partial<MedicineFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const fieldErrors = validateMedicineForm(form);
  const isFormValid = Object.keys(fieldErrors).length === 0;

  async function handleSubmit() {
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const currentStock = form.currentStock ? Number(form.currentStock) : 0;
      const record = await createMedicine(toMedicineInput(form, currentStock));

      try {
        await syncMedicineReminders(record);
      } catch (reminderError) {
        console.error('Erro ao agendar lembretes do medicamento:', reminderError);
      }

      // O medicamento já foi salvo com sucesso neste ponto — o aviso de
      // interação abaixo nunca bloqueia nem desfaz o salvamento, apenas
      // adia a navegação até o usuário confirmar que leu o alerta.
      try {
        const others = (await listMedicinesForUser()).filter((other) => other.id !== record.id);
        const matches = findInteractionsForCandidate(record, others);
        if (matches.length > 0) {
          setInteractionMatches(matches);
          setIsInteractionSheetVisible(true);
          return;
        }
      } catch (interactionError) {
        console.error('Erro ao verificar interações medicamentosas:', interactionError);
      }

      router.replace('/medicines');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar o lembrete.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCloseInteractionSheet() {
    setIsInteractionSheetVisible(false);
    router.replace('/medicines');
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerClassName="px-6 pt-6 pb-32"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              Novo lembrete
            </Text>
          </View>

          {submitError ? <InlineError message={submitError} /> : null}

          <MedicineFormFields fieldErrors={fieldErrors} form={form} onChange={update} />

          <View className="mt-8">
            <Button
              title="Salvar"
              onPress={handleSubmit}
              disabled={!isFormValid}
              disabledReason={!isFormValid ? 'Complete os campos obrigatórios para continuar.' : undefined}
              loading={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DrugInteractionSheet
        visible={isInteractionSheetVisible}
        matches={interactionMatches}
        onClose={handleCloseInteractionSheet}
      />
    </SafeAreaView>
  );
}

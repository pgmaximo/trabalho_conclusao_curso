// =============================================================================
// Arquivo: AddMedicineScreen.tsx
// Descrição: Tela 3f do Canvas — "Novo lembrete de medicamento". Criação pura,
// todos os campos começam vazios.
// =============================================================================

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { InlineError } from '@/components/InlineError';
import {
  EMPTY_MEDICINE_FORM,
  MedicineFormFields,
  toMedicineInput,
  validateMedicineForm,
  type MedicineFormState,
} from '@/components/MedicineFormFields';
import { useThemeColors } from '@/constants/theme';
import { createMedicine } from '@/services/medicineService';

export function AddMedicineScreen() {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();

  const [form, setForm] = useState<MedicineFormState>(EMPTY_MEDICINE_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      await createMedicine(toMedicineInput(form, currentStock));
      router.replace('/medicines');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar o lembrete.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-6 pb-32" showsVerticalScrollIndicator={false}>
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

          <MedicineFormFields form={form} onChange={update} />

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
      </View>
    </SafeAreaView>
  );
}

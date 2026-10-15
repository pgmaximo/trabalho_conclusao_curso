// =============================================================================
// Arquivo: AddMedicineScreen.tsx
// Descrição: Tela 3f do Canvas — "Novo lembrete de medicamento". Criação pura,
// todos os campos começam vazios.
//
// O título é "Adicionar medicamento": é o nome do botão que abre a tela, e faz
// par com "Editar medicamento"
// (specs/00-fundacao/consistencia-e-textos/spec.md, D2).
// =============================================================================

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { DetailHeader } from '@/components/DetailHeader';
import { DrugInteractionSheet } from '@/components/DrugInteractionSheet';
import { InlineError } from '@/components/InlineError';
import {
  EMPTY_MEDICINE_FORM,
  MedicineFormFields,
  toMedicineInput,
  validateMedicineForm,
  type MedicineFormState,
} from '@/components/MedicineFormFields';
import { avisarSucesso } from '@/hooks/avisoDeSucesso';
import { createMedicine, listMedicinesForUser } from '@/services/medicineService';
import { syncMedicineReminders } from '@/services/medicineReminderService';
import { findInteractionsForCandidate, type DrugInteractionMatch } from '@/services/drugInteractionService';

export function AddMedicineScreen() {
  const { colorScheme } = useColorScheme();

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

      voltarParaRemedios();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o medicamento.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // O medicamento já está salvo nos dois caminhos que chegam aqui: direto, ou
  // depois de a pessoa fechar o aviso de interação.
  function voltarParaRemedios() {
    avisarSucesso('Medicamento salvo.');
    router.replace('/medicines');
  }

  function handleCloseInteractionSheet() {
    setIsInteractionSheetVisible(false);
    voltarParaRemedios();
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
          <DetailHeader onBack={() => router.back()} title="Adicionar medicamento" />

          {submitError ? <InlineError message={submitError} /> : null}

          <MedicineFormFields fieldErrors={fieldErrors} form={form} onChange={update} />

          <View className="mt-8">
            <Button
              title="Salvar"
              onPress={handleSubmit}
              disabled={!isFormValid}
              // O motivo diz QUAL é a próxima coisa que falta. Os erros de cada
                  // campo só aparecem depois que a pessoa passa por ele.
                  disabledReason={Object.values(fieldErrors)[0]}
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

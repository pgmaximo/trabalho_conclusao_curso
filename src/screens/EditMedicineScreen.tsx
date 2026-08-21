// =============================================================================
// Arquivo: EditMedicineScreen.tsx
// Descrição: Tela 3g do Canvas — "Editar medicamento" (com exclusão confirmada).
// Estados: carregando, não encontrado, formulário preenchido, exclusão inline.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { InlineError } from '@/components/InlineError';
import {
  EMPTY_MEDICINE_FORM,
  MedicineFormFields,
  toMedicineInput,
  validateMedicineForm,
  type MedicineFormState,
} from '@/components/MedicineFormFields';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useThemeColors } from '@/constants/theme';
import {
  deleteMedicine,
  getMedicineById,
  updateMedicine,
  type MedicineRecord,
} from '@/services/medicineService';

export interface EditMedicineScreenProps {
  id: string;
}

function recordToForm(record: MedicineRecord): MedicineFormState {
  return {
    name: record.name,
    dosage: record.dosage,
    form: record.form ?? null,
    times: record.times.length > 0 ? record.times : [''],
    frequencyType: record.frequencyType ?? null,
    weekDays: record.weekDays ?? [],
    intervalHours: record.intervalHours ? String(record.intervalHours) : '',
    startDate: record.startDate,
    endDate: record.endDate ?? '',
    hasNoEndDate: !record.endDate,
    currentStock: String(record.currentStock),
    unit: record.unit ?? null,
    lowStockThreshold: record.lowStockThreshold !== undefined ? String(record.lowStockThreshold) : '',
    notes: record.notes ?? '',
    active: record.active ?? true,
  };
}

export function EditMedicineScreen({ id }: EditMedicineScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();

  const [medicine, setMedicine] = useState<MedicineRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<MedicineFormState>(EMPTY_MEDICINE_FORM);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const record = await getMedicineById(id);
      if (!mounted) return;
      if (!record) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setMedicine(record);
      setForm(recordToForm(record));
      setIsLoading(false);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  function update(patch: Partial<MedicineFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const fieldErrors = validateMedicineForm(form);
  const isFormValid = Object.keys(fieldErrors).length === 0;

  async function handleSave() {
    if (!medicine || !isFormValid) return;

    setIsSubmitting(true);
    setSaveError(null);

    try {
      const nextStock = form.currentStock ? Number(form.currentStock) : 0;
      // Reposição: se o novo estoque atual superar o inicial registrado, o inicial sobe
      // junto (mantém o percentual da barra coerente) — nunca diminui silenciosamente.
      const nextInitialStock = Math.max(medicine.initialStock, nextStock);
      await updateMedicine(medicine.id, toMedicineInput(form, nextInitialStock));
      router.replace('/medicines');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar o medicamento.';
      setSaveError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!medicine) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteMedicine(medicine.id);
      router.replace('/medicines');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir o medicamento.';
      setDeleteError(message);
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
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
              Editar medicamento
            </Text>
          </View>

          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : notFound ? (
            <View className="items-center py-12">
              <Text className="mb-4 text-center text-[17px] text-app-textSecondary dark:text-app-dark-textSecondary">
                Medicamento não encontrado.
              </Text>
              <Button title="Voltar para Medicamentos" onPress={() => router.replace('/medicines')} />
            </View>
          ) : (
            <>
              {saveError ? <InlineError message={saveError} /> : null}

              <MedicineFormFields form={form} onChange={update} />

              <View className="mt-8">
                <Button
                  title="Salvar alterações"
                  onPress={handleSave}
                  disabled={!isFormValid}
                  disabledReason={!isFormValid ? 'Complete os campos obrigatórios para continuar.' : undefined}
                  loading={isSubmitting}
                />
              </View>

              <View className="mt-6">
                {deleteError ? <InlineError message={deleteError} /> : null}

                {isConfirmingDelete ? (
                  <DeleteConfirmPanel
                    isDeleting={isDeleting}
                    onCancel={() => setIsConfirmingDelete(false)}
                    onConfirm={handleConfirmDelete}
                  />
                ) : (
                  <Button
                    onPress={() => setIsConfirmingDelete(true)}
                    title="Excluir medicamento"
                    variant="destructive"
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

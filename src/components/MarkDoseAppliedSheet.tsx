/**
 * Resumo do arquivo:
 * Bottom sheet para marcar uma dose PENDENTE/ATRASADA como aplicada, sem
 * precisar cadastrar uma vacina do zero — acionado ao tocar o badge
 * "Pendente"/"Atrasada" na Carteira de vacinação (VaccinationScreen.tsx).
 * Campos mínimos (data + local/lote/fabricante opcionais), mesmo espírito do
 * antigo AddVaccineSheet.tsx (removido) para o subconjunto "já aplicada".
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { FormField } from '@/components/FormField';
import { getTodayDate } from '@/utils/date';
import type { VaccineDoseItem } from '@/types/models';

export type MarkDoseAppliedInput = {
  appliedDate: string;
  location?: string;
  lot?: string;
  manufacturer?: string;
};

type MarkDoseAppliedSheetProps = {
  visible: boolean;
  dose: VaccineDoseItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: MarkDoseAppliedInput) => void | Promise<void>;
};

const EMPTY_FORM = { date: getTodayDate(), location: '', lot: '', manufacturer: '' };

export function MarkDoseAppliedSheet({ visible, dose, isSaving, onClose, onSubmit }: MarkDoseAppliedSheetProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(EMPTY_FORM);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!form.date) {
      Alert.alert('Informe a data', 'Selecione a data em que a dose foi aplicada.');
      return;
    }

    if (form.date > getTodayDate()) {
      Alert.alert('Data inválida', 'A data de aplicação não pode estar no futuro.');
      return;
    }

    await onSubmit({
      appliedDate: form.date,
      location: form.location.trim() || undefined,
      lot: form.lot.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
    });

    reset();
  }

  if (!dose) {
    return null;
  }

  const doseLabel = `${dose.name}${dose.doseNumber ? ` · ${dose.doseNumber}ª dose` : ''}`;

  return (
    <BottomSheet visible={visible} title="Marcar como aplicada" description={doseLabel} onClose={handleClose}>
      {/* Usa o prop `description` do BottomSheet (não um <Text> solto) — ele
          já resolve o espaçamento título/subtítulo corretamente (marginBottom:
          SPACING.md); um <Text> como primeiro filho do `content` só herdava o
          marginBottom: SPACING.xs do título, ficando visualmente colado nele
          enquanto os campos abaixo tinham ~36px de respiro entre si (achado
          visual via scripts/preview-screenshot.mjs). */}
      <DateInput label="Data de aplicação" value={form.date} onChange={(value) => update('date', value)} maxDate={getTodayDate()} />

      <FormField
        label="Local (opcional)"
        placeholder="Ex.: UBS Jardim América"
        value={form.location}
        onChangeText={(text) => update('location', text)}
      />
      <FormField
        label="Lote (opcional)"
        placeholder="Ex.: L12345"
        value={form.lot}
        onChangeText={(text) => update('lot', text)}
      />
      <FormField
        label="Fabricante (opcional)"
        placeholder="Ex.: Fundação Butantan"
        value={form.manufacturer}
        onChangeText={(text) => update('manufacturer', text)}
      />

      <Button loading={isSaving} onPress={handleSubmit} title="Salvar" />
    </BottomSheet>
  );
}

/**
 * Resumo do arquivo:
 * Bottom sheet para marcar uma dose PENDENTE/ATRASADA como aplicada, sem
 * precisar cadastrar uma vacina do zero — acionado ao tocar o badge
 * "Pendente"/"Atrasada" na Carteira de vacinação (VaccinationScreen.tsx).
 * Campos mínimos (data + local/lote/fabricante opcionais), mesmo espírito do
 * antigo AddVaccineSheet.tsx (removido) para o subconjunto "já aplicada".
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { FormField } from '@/components/FormField';
import { InlineError } from '@/components/InlineError';
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
  /** A falha da última tentativa de salvar, mostrada dentro da folha. */
  errorMessage?: string | null;
  onClose: () => void;
  /** Devolver `false` diz que não salvou: a folha fica aberta, com o que a
   *  pessoa digitou. */
  onSubmit: (input: MarkDoseAppliedInput) => void | boolean | Promise<void | boolean>;
};

const EMPTY_FORM = { date: getTodayDate(), location: '', lot: '', manufacturer: '' };

export function MarkDoseAppliedSheet({
  visible,
  dose,
  isSaving,
  errorMessage,
  onClose,
  onSubmit,
}: MarkDoseAppliedSheetProps) {
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

  // O que falta aparece embaixo do botão, e não num pop-up do sistema
  // (specs/00-fundacao/consistencia-e-textos/spec.md, D4).
  const disabledReason = !form.date
    ? 'Informe a data em que a dose foi aplicada.'
    : form.date > getTodayDate()
      ? 'A data de aplicação não pode estar no futuro.'
      : undefined;

  async function handleSubmit() {
    if (disabledReason) {
      return;
    }

    const saved = await onSubmit({
      appliedDate: form.date,
      location: form.location.trim() || undefined,
      lot: form.lot.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
    });

    // Se não salvou, o que a pessoa digitou fica onde está.
    if (saved !== false) {
      reset();
    }
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

      {errorMessage ? (
        <View style={{ marginTop: 16 }}>
          <InlineError message={errorMessage} />
        </View>
      ) : null}

      <Button
        disabled={Boolean(disabledReason)}
        disabledReason={disabledReason}
        loading={isSaving}
        onPress={handleSubmit}
        title="Salvar"
      />
    </BottomSheet>
  );
}

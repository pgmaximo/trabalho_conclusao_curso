// =============================================================================
// Arquivo: MedicineFormFields.tsx
// Descrição: Campos de formulário compartilhados entre "Novo lembrete de
// medicamento" (3f) e "Editar medicamento" (3g) — nome, dosagem, forma,
// horários dinâmicos, frequência (com sub-blocos condicionais), datas,
// estoque/unidade, aviso de estoque baixo, observações e lembretes ativos.
// =============================================================================

import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { DateInput } from '@/components/DateInput';
import { DoseTimeRow } from '@/components/DoseTimeRow';
import { FormField } from '@/components/FormField';
import { SelectableChip } from '@/components/SelectableChip';
import {
  validateMedicineReminder,
  type MedicineForm,
  type MedicineFrequencyType,
  type MedicineInput,
  type MedicineUnit,
} from '@/services/medicineService';

export type MedicineFormState = {
  name: string;
  dosage: string;
  form: MedicineForm | null;
  times: string[];
  frequencyType: MedicineFrequencyType | null;
  weekDays: string[];
  intervalHours: string;
  startDate: string;
  endDate: string;
  hasNoEndDate: boolean;
  currentStock: string;
  unit: MedicineUnit | null;
  lowStockThreshold: string;
  notes: string;
  active: boolean;
};

export const EMPTY_MEDICINE_FORM: MedicineFormState = {
  name: '',
  dosage: '',
  form: null,
  times: [''],
  frequencyType: null,
  weekDays: [],
  intervalHours: '',
  startDate: '',
  endDate: '',
  hasNoEndDate: false,
  currentStock: '',
  unit: null,
  lowStockThreshold: '',
  notes: '',
  active: true,
};

const FORM_OPTIONS: { value: MedicineForm; label: string }[] = [
  { value: 'PILL', label: 'Comprimido' },
  { value: 'DROPS', label: 'Gotas' },
  { value: 'INJECTION', label: 'Injeção' },
  { value: 'OTHER', label: 'Outro' },
];

const FREQUENCY_OPTIONS: { value: MedicineFrequencyType; label: string }[] = [
  { value: 'DAILY', label: 'Todos os dias' },
  { value: 'SPECIFIC_DAYS', label: 'Dias específicos' },
  { value: 'EVERY_X_HOURS', label: 'A cada X horas' },
];

const WEEKDAY_OPTIONS: { value: string; label: string }[] = [
  { value: 'MON', label: 'Seg' },
  { value: 'TUE', label: 'Ter' },
  { value: 'WED', label: 'Qua' },
  { value: 'THU', label: 'Qui' },
  { value: 'FRI', label: 'Sex' },
  { value: 'SAT', label: 'Sáb' },
  { value: 'SUN', label: 'Dom' },
];

const UNIT_OPTIONS: { value: MedicineUnit; label: string }[] = [
  { value: 'COMP', label: 'Comp.' },
  { value: 'ML', label: 'ml' },
  { value: 'CAPS', label: 'Cáps.' },
];

/** Converte o estado do formulário (datas DD/MM/AAAA, números como texto) para o
 * `MedicineInput` consumido por `createMedicine`/`updateMedicine`. `initialStock` não é um
 * campo do formulário (não existe no Canvas) — quem chama decide o valor
 * (criação: igual a `currentStock`; edição: preservado, exceto reposição — ver
 * EditMedicineScreen). */
export function toMedicineInput(form: MedicineFormState, initialStock: number): MedicineInput {
  return {
    name: form.name.trim(),
    dosage: form.dosage.trim(),
    form: form.form ?? undefined,
    times: form.times.map((t) => t.trim()).filter(Boolean),
    frequencyType: form.frequencyType ?? undefined,
    weekDays: form.frequencyType === 'SPECIFIC_DAYS' ? form.weekDays : [],
    intervalHours: form.frequencyType === 'EVERY_X_HOURS' && form.intervalHours ? Number(form.intervalHours) : undefined,
    startDate: form.startDate,
    endDate: form.hasNoEndDate ? null : form.endDate || null,
    currentStock: form.currentStock ? Number(form.currentStock) : 0,
    initialStock,
    unit: form.unit ?? undefined,
    lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : undefined,
    notes: form.notes.trim() || undefined,
    active: form.active,
  };
}

export function validateMedicineForm(form: MedicineFormState): Record<string, string> {
  const input = toMedicineInput(form, form.currentStock ? Number(form.currentStock) : 0);
  const errors = validateMedicineReminder(input);
  const byField: Record<string, string> = {};
  errors.forEach((error) => {
    if (!byField[error.field]) byField[error.field] = error.message;
  });
  return byField;
}

// Erro de um grupo de opções ou de uma data, que não passa pelo `FormField`.
function GroupError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <Text className="mt-2 text-[13px] text-app-danger dark:text-app-dark-danger">{message}</Text>
  );
}

type MedicineFormFieldsProps = {
  form: MedicineFormState;
  onChange: (patch: Partial<MedicineFormState>) => void;
  fieldErrors?: Record<string, string>;
};

export function MedicineFormFields({ form, onChange, fieldErrors = {} }: MedicineFormFieldsProps) {
  // Quem chama valida o formulário inteiro a cada renderização (é o que
  // habilita o botão de salvar). Mostrar tudo o que vem em `fieldErrors` fazia
  // a tela ABRIR com sete campos em vermelho. Aqui o erro de um campo só
  // aparece depois que a pessoa passou por ele: ao sair de um campo de texto,
  // ou ao mexer num grupo de opções ou numa data.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());

  function touch(field: string) {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  }

  function errorOf(field: string): string | undefined {
    return touched.has(field) ? fieldErrors[field] : undefined;
  }

  function updateTime(index: number, value: string) {
    const next = [...form.times];
    next[index] = value;
    onChange({ times: next });
  }

  function addTime() {
    onChange({ times: [...form.times, ''] });
  }

  function removeTime(index: number) {
    const next = form.times.filter((_, i) => i !== index);
    onChange({ times: next.length > 0 ? next : [''] });
    touch('times');
  }

  function toggleWeekDay(day: string) {
    const next = form.weekDays.includes(day)
      ? form.weekDays.filter((d) => d !== day)
      : [...form.weekDays, day];
    onChange({ weekDays: next });
    touch('weekDays');
  }

  return (
    <View>
      <FormField
        label="Nome do medicamento"
        placeholder="Ex.: Losartana"
        value={form.name}
        onChangeText={(text) => onChange({ name: text })}
        onBlur={() => touch('name')}
        errorMessage={errorOf('name')}
      />

      <FormField
        label="Dosagem"
        placeholder="Ex.: 50mg"
        value={form.dosage}
        onChangeText={(text) => onChange({ dosage: text })}
        onBlur={() => touch('dosage')}
        errorMessage={errorOf('dosage')}
      />

      <View className="mt-6">
        <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          Forma
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {FORM_OPTIONS.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.form === option.value}
              onPress={() => {
                onChange({ form: option.value });
                touch('form');
              }}
            />
          ))}
        </View>
        <GroupError message={errorOf('form')} />
      </View>

      <View className="mt-6">
        <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          Horário(s) da dose
        </Text>
        {form.times.map((time, index) => (
          <DoseTimeRow
            key={index}
            value={time}
            onBlur={() => touch('times')}
            onChange={(value) => updateTime(index, value)}
            onRemove={form.times.length > 1 ? () => removeTime(index) : undefined}
          />
        ))}
        <Text
          accessibilityRole="button"
          onPress={addTime}
          className="mt-1 text-[15px] font-semibold text-app-primary dark:text-app-dark-primary"
        >
          + Adicionar horário
        </Text>
        <GroupError message={errorOf('times')} />
      </View>

      <View className="mt-6">
        <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          Frequência
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.frequencyType === option.value}
              onPress={() => {
                onChange({ frequencyType: option.value });
                touch('frequencyType');
              }}
            />
          ))}
        </View>
        <GroupError message={errorOf('frequencyType')} />
      </View>

      {form.frequencyType === 'SPECIFIC_DAYS' ? (
        <View className="mt-4">
          <View className="flex-row flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((option) => (
              <SelectableChip
                key={option.value}
                label={option.label}
                selected={form.weekDays.includes(option.value)}
                onPress={() => toggleWeekDay(option.value)}
              />
            ))}
          </View>
          <GroupError message={errorOf('weekDays')} />
        </View>
      ) : null}

      {form.frequencyType === 'EVERY_X_HOURS' ? (
        <FormField
          label="A cada quantas horas"
          inputMode="numeric"
          placeholder="Ex.: 8"
          value={form.intervalHours}
          onChangeText={(text) => onChange({ intervalHours: text.replace(/\D/g, '') })}
          onBlur={() => touch('intervalHours')}
          errorMessage={errorOf('intervalHours')}
        />
      ) : null}

      <DateInput
        label="Data de início"
        value={form.startDate}
        onChange={(value) => {
          onChange({ startDate: value });
          touch('startDate');
        }}
        placeholder="DD/MM/AAAA"
      />
      <GroupError message={errorOf('startDate')} />

      {!form.hasNoEndDate ? (
        <DateInput
          label="Data de término"
          value={form.endDate}
          onChange={(value) => {
            onChange({ endDate: value });
            touch('endDate');
          }}
          placeholder="DD/MM/AAAA"
        />
      ) : null}
      <GroupError message={errorOf('endDate')} />

      <View className="mt-4 flex-row items-center gap-2">
        <SelectableChip
          label={form.hasNoEndDate ? 'Sem data de término ✓' : 'Sem data de término'}
          selected={form.hasNoEndDate}
          onPress={() => onChange({ hasNoEndDate: !form.hasNoEndDate, endDate: '' })}
        />
      </View>

      <FormField
        label="Estoque atual"
        inputMode="numeric"
        placeholder="Ex.: 30"
        value={form.currentStock}
        onChangeText={(text) => onChange({ currentStock: text.replace(/\D/g, '') })}
        onBlur={() => touch('currentStock')}
        errorMessage={errorOf('currentStock')}
      />

      <View className="mt-6">
        <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          Unidade
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {UNIT_OPTIONS.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.unit === option.value}
              onPress={() => {
                onChange({ unit: option.value });
                touch('unit');
              }}
            />
          ))}
        </View>
        <GroupError message={errorOf('unit')} />
      </View>

      <FormField
        label="Avisar quando restar menos de (opcional)"
        inputMode="numeric"
        placeholder="Ex.: 10"
        value={form.lowStockThreshold}
        onChangeText={(text) => onChange({ lowStockThreshold: text.replace(/\D/g, '') })}
      />

      <FormField
        label="Observações (opcional)"
        multiline
        numberOfLines={4}
        placeholder="Anotações sobre este medicamento"
        style={{ minHeight: 100, textAlignVertical: 'top' }}
        value={form.notes}
        onChangeText={(text) => onChange({ notes: text })}
      />

      <View className="mt-6">
        <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          Lembretes
        </Text>
        <View className="flex-row gap-2">
          <SelectableChip label="Ativos" selected={form.active} onPress={() => onChange({ active: true })} />
          <SelectableChip label="Inativos" selected={!form.active} onPress={() => onChange({ active: false })} />
        </View>
      </View>
    </View>
  );
}

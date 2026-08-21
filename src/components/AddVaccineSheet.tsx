/**
 * Resumo do arquivo:
 * Bottom sheet de cadastro manual de dose de vacina (tela 4e). Extensão
 * necessária não desenhada no Canvas (specs/04-ia-perfil-vacinacao/
 * carteira-vacinacao/plan.md §6) — sem ela a tela nunca teria conteúdo real
 * para um usuário novo, já que não há integração de calendário vacinal público.
 */
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { FormField } from '@/components/FormField';
import type { CreateVaccineDoseInput } from '@/services/vaccinationService';

type AddVaccineSheetProps = {
  visible: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateVaccineDoseInput) => void | Promise<void>;
};

type FormState = {
  name: string;
  wasApplied: boolean | null;
  date: string; // YYYY-MM-DD, vazio quando não preenchido
  location: string;
};

const EMPTY_FORM: FormState = { name: '', wasApplied: null, date: '', location: '' };

export function AddVaccineSheet({ visible, isSaving, onClose, onSubmit }: AddVaccineSheetProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | undefined>();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(EMPTY_FORM);
    setNameError(undefined);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setNameError('Informe o nome da vacina.');
      return;
    }
    setNameError(undefined);

    if (form.wasApplied === null) {
      Alert.alert('Já foi aplicada?', 'Selecione "Sim" ou "Não" para continuar.');
      return;
    }

    const isoDate = form.date.trim() || undefined;

    await onSubmit({
      name: form.name.trim(),
      appliedDate: form.wasApplied ? isoDate : undefined,
      dueDate: form.wasApplied ? undefined : isoDate,
      location: form.wasApplied ? form.location.trim() || undefined : undefined,
    });

    reset();
  }

  return (
    <BottomSheet visible={visible} title="Adicionar vacina" onClose={handleClose}>
      <FormField
        label="Nome da vacina"
        placeholder="Ex.: Hepatite B"
        value={form.name}
        onChangeText={(text) => update('name', text)}
        errorMessage={nameError}
        containerClassName="mt-0"
      />

      <View className="mt-6">
        <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          Já foi aplicada?
        </Text>
        <View className="flex-row gap-2">
          {[
            { label: 'Sim', value: true },
            { label: 'Não', value: false },
          ].map((option) => {
            const isActive = form.wasApplied === option.value;
            return (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => update('wasApplied', option.value)}
                className={[
                  'grow items-center justify-center rounded-app border px-4 py-3',
                  isActive
                    ? 'border-app-primary bg-app-primary dark:border-app-dark-primary dark:bg-app-dark-primary'
                    : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-[14px] font-semibold',
                    isActive
                      ? 'text-app-onPrimary dark:text-app-dark-onPrimary'
                      : 'text-app-textSecondary dark:text-app-dark-textSecondary',
                  ].join(' ')}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <DateInput
        label={form.wasApplied ? 'Data de aplicação' : 'Data recomendada (opcional)'}
        value={form.date}
        onChange={(value) => update('date', value)}
      />

      {form.wasApplied ? (
        <FormField
          label="Local"
          placeholder="Ex.: UBS Jardim América"
          value={form.location}
          onChangeText={(text) => update('location', text)}
        />
      ) : null}

      <Button loading={isSaving} onPress={handleSubmit} title="Salvar" />
    </BottomSheet>
  );
}

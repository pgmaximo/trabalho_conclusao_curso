/**
 * Resumo do arquivo:
 * Tela "Adicionar vacina" (feat_vacina) — substitui o antigo bottom sheet
 * (src/components/AddVaccineSheet.tsx, removido) por uma tela cheia, seguindo
 * o mesmo padrão de AddMedicineScreen.tsx/AddAppointmentScreen.tsx, já que o
 * formulário cresceu (seleção de vacina do catálogo, número da dose, lote,
 * fabricante) além do que cabe confortavelmente em um sheet curto.
 *
 * Vacina é escolhida do Calendário Nacional (src/data/calendarioNacionalVacinacao.ts),
 * nunca texto livre — exceto a entrada "Outras vacinas", que abre um campo de
 * nome livre para o caso não coberto pelo catálogo (decisão documentada:
 * regra 8 da constituição, ambiguidade tratada em vez de bloqueada).
 *
 * Ao registrar uma dose aplicada de uma vacina com série de N doses, as
 * doses futuras da série são criadas em cascata com lembrete agendado
 * automaticamente (decisão do usuário) — ver
 * src/services/vaccinationService.ts#registerAppliedDoseWithSeries.
 */
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { DetailHeader } from '@/components/DetailHeader';
import { FormField } from '@/components/FormField';
import { InlineError } from '@/components/InlineError';
import { SelectableChip } from '@/components/SelectableChip';
import { useUserContext } from '@/contexts/UserContext';
import { CALENDARIO_NACIONAL_VACINACAO, findVacinaCatalogo } from '@/data/calendarioNacionalVacinacao';
import { avisarSucesso } from '@/hooks/avisoDeSucesso';
import { createVaccineDose, registerAppliedDoseWithSeries } from '@/services/vaccinationService';
import { syncVaccineReminder } from '@/services/vaccineReminderService';
import { getTodayDate } from '@/utils/date';

type FormState = {
  catalogId: string | null;
  customName: string;
  doseNumber: number;
  wasApplied: boolean | null;
  date: string; // YYYY-MM-DD
  location: string;
  lot: string;
  manufacturer: string;
};

const EMPTY_FORM: FormState = {
  catalogId: null,
  customName: '',
  doseNumber: 1,
  wasApplied: null,
  date: '',
  location: '',
  lot: '',
  manufacturer: '',
};

export function AddVaccineScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useUserContext();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedCatalogo = form.catalogId ? findVacinaCatalogo(form.catalogId) : undefined;
  const hasMultipleDoses = (selectedCatalogo?.doses.length ?? 0) > 1;
  const isOutras = form.catalogId === 'outras';

  const filteredCatalogo = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return CALENDARIO_NACIONAL_VACINACAO;
    return CALENDARIO_NACIONAL_VACINACAO.filter((vacina) => vacina.nome.toLowerCase().includes(query));
  }, [search]);

  const isNameMissing = isOutras && !form.customName.trim();
  // Uma dose "já aplicada" não pode ter data no futuro — o seletor de data já
  // bloqueia isso (maxDate abaixo), esta é uma segunda barreira caso o campo
  // tenha sido preenchido antes de alternar "Já foi aplicada?" para "Sim".
  const isAppliedInTheFuture = form.wasApplied === true && Boolean(form.date) && form.date > getTodayDate();

  // DECISION (specs/00-fundacao/consistencia-e-textos/spec.md, D4): o que
  // falta aparece embaixo do botão, uma coisa de cada vez, como nos outros
  // formulários. Antes o botão ficava sempre aceso, e o toque abria um pop-up
  // do sistema dizendo o que faltava.
  const disabledReason = !form.catalogId
    ? 'Escolha uma vacina da lista.'
    : isNameMissing
      ? 'Informe o nome da vacina.'
      : form.wasApplied === null
        ? 'Responda se a vacina já foi aplicada.'
        : isAppliedInTheFuture
          ? 'A data de aplicação não pode estar no futuro.'
          : undefined;

  async function handleSubmit() {
    if (disabledReason || !form.catalogId) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isoDate = form.date.trim() || undefined;
      const vaccineName = isOutras ? form.customName.trim() : selectedCatalogo?.nome ?? form.catalogId;

      if (form.wasApplied && isoDate && !isOutras && selectedCatalogo) {
        // Vacina do catálogo com data de aplicação — usa o fluxo de cascata
        // (cria as próximas doses da série automaticamente, com lembrete).
        await registerAppliedDoseWithSeries({
          catalogId: form.catalogId,
          ordem: hasMultipleDoses ? form.doseNumber : 1,
          appliedDate: isoDate,
          location: form.location.trim() || undefined,
          lot: form.lot.trim() || undefined,
          manufacturer: form.manufacturer.trim() || undefined,
          birthDate: user?.birthDate,
        });
      } else {
        // "Outras vacinas", ou aplicada sem data, ou recomendação futura —
        // registro simples, sem cascata de série.
        const record = await createVaccineDose({
          name: vaccineName,
          doseNumber: hasMultipleDoses ? form.doseNumber : undefined,
          appliedDate: form.wasApplied ? isoDate : undefined,
          dueDate: form.wasApplied ? undefined : isoDate,
          location: form.wasApplied ? form.location.trim() || undefined : undefined,
          lot: form.wasApplied ? form.lot.trim() || undefined : undefined,
          manufacturer: form.wasApplied ? form.manufacturer.trim() || undefined : undefined,
          catalogId: isOutras ? undefined : form.catalogId,
          seriesTotal: selectedCatalogo?.doses.length,
        });

        if (!form.wasApplied && isoDate) {
          try {
            await syncVaccineReminder({ id: record.id, name: vaccineName, dueDate: isoDate });
          } catch (reminderError) {
            console.error('Erro ao agendar lembrete de vacina:', reminderError);
          }
        }
      }

      avisarSucesso('Vacina salva.');
      router.replace('/vaccination');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a vacina.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
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
        <DetailHeader onBack={() => router.back()} title="Adicionar vacina" />

        {submitError ? <InlineError message={submitError} /> : null}

        <FormField
          label="Buscar vacina"
          placeholder="Ex.: Hepatite, Influenza, dT..."
          value={search}
          onChangeText={setSearch}
          containerClassName="mt-0"
        />

        <View className="mt-3 flex-row flex-wrap gap-2">
          {filteredCatalogo.map((vacina) => (
            <SelectableChip
              key={vacina.id}
              label={vacina.nome}
              selected={form.catalogId === vacina.id}
              onPress={() => update('catalogId', vacina.id)}
            />
          ))}
        </View>

        {isOutras ? (
          <FormField
            label="Nome da vacina"
            placeholder="Ex.: Vacina de viagem"
            value={form.customName}
            onChangeText={(text) => update('customName', text)}
            onBlur={() => setNameTouched(true)}
            // O erro do campo só aparece depois que a pessoa passa por ele.
            errorMessage={nameTouched && isNameMissing ? 'Informe o nome da vacina.' : undefined}
          />
        ) : null}

        {hasMultipleDoses ? (
          <View className="mt-6">
            <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
              Qual dose?
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {selectedCatalogo!.doses.map((dose) => (
                <SelectableChip
                  key={dose.ordem}
                  label={dose.rotulo}
                  selected={form.doseNumber === dose.ordem}
                  onPress={() => update('doseNumber', dose.ordem)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="mt-6">
          <Text className="mb-3 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
            Já foi aplicada?
          </Text>
          <View className="flex-row gap-2">
            {[
              { label: 'Sim', value: true },
              { label: 'Não', value: false },
            ].map((option) => (
              <View key={option.label} className="grow">
                <SelectableChip
                  label={option.label}
                  selected={form.wasApplied === option.value}
                  onPress={() => {
                    update('wasApplied', option.value);
                    // Alternar para "Sim" com uma data futura já preenchida (do
                    // modo "recomendação futura") deixaria uma dose aplicada
                    // com data no futuro — mais seguro limpar do que arriscar.
                    if (option.value === true && form.date > getTodayDate()) {
                      update('date', '');
                    }
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        <DateInput
          label={form.wasApplied ? 'Data de aplicação' : 'Data recomendada (opcional)'}
          value={form.date}
          onChange={(value) => update('date', value)}
          maxDate={form.wasApplied ? getTodayDate() : undefined}
        />

        {form.wasApplied ? (
          <>
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
          </>
        ) : null}

        {form.wasApplied && hasMultipleDoses && form.doseNumber < (selectedCatalogo?.doses.length ?? 0) ? (
          <View className="mt-4 rounded-app border border-app-infoBadgeBorder bg-app-infoSoft px-4 py-3 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft">
            <Text className="text-[13px] leading-[18px] text-app-text dark:text-app-dark-text">
              As próximas doses desta vacina serão adicionadas automaticamente à sua carteira como
              pendentes, com lembrete agendado.
            </Text>
          </View>
        ) : null}

        <View className="mt-8">
          <Button
            title="Salvar"
            onPress={handleSubmit}
            disabled={Boolean(disabledReason)}
            disabledReason={disabledReason}
            loading={isSubmitting}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

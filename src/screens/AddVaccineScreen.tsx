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
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { FormField } from '@/components/FormField';
import { InlineError } from '@/components/InlineError';
import { SelectableChip } from '@/components/SelectableChip';
import { useThemeColors } from '@/constants/theme';
import { useUserContext } from '@/contexts/UserContext';
import { CALENDARIO_NACIONAL_VACINACAO, findVacinaCatalogo } from '@/data/calendarioNacionalVacinacao';
import { createVaccineDose, registerAppliedDoseWithSeries } from '@/services/vaccinationService';
import { syncVaccineReminder } from '@/services/vaccineReminderService';

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
  const colors = useThemeColors();
  const { user } = useUserContext();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

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

  async function handleSubmit() {
    if (!form.catalogId) {
      Alert.alert('Selecione uma vacina', 'Escolha uma vacina da lista para continuar.');
      return;
    }

    if (isOutras && !form.customName.trim()) {
      setNameError('Informe o nome da vacina.');
      return;
    }
    setNameError(undefined);

    if (form.wasApplied === null) {
      Alert.alert('Já foi aplicada?', 'Selecione "Sim" ou "Não" para continuar.');
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

      router.replace('/vaccination');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar a vacina.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
            Adicionar vacina
          </Text>
        </View>

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
            errorMessage={nameError}
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
                  onPress={() => update('wasApplied', option.value)}
                />
              </View>
            ))}
          </View>
        </View>

        <DateInput
          label={form.wasApplied ? 'Data de aplicação' : 'Data recomendada (opcional)'}
          value={form.date}
          onChange={(value) => update('date', value)}
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
          <Button title="Salvar" onPress={handleSubmit} loading={isSubmitting} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

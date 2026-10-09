import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { DetailHeader } from '@/components/DetailHeader';
import { FormField } from '@/components/FormField';
import { InlineError } from '@/components/InlineError';
import { FONTS, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';
import { avisarSucesso } from '@/hooks/avisoDeSucesso';
import { createAppointment, type AppointmentType } from '@/services/appointmentService';
import { maskTimeInput } from '@/utils/timeMask';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// DECISION (specs/02-perfil-home-agenda/novo-agendamento/tasks.md): emojis
// substituidos por icones vetoriais Ionicons, consistente com o resto do app
// (nenhuma outra tela usa emoji como icone de UI).
const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string; icon: IoniconName }[] = [
  { value: 'CONSULTA', label: 'Consulta', icon: 'medical-outline' },
  { value: 'EXAME', label: 'Exame', icon: 'flask-outline' },
  { value: 'CIRURGIA', label: 'Cirurgia', icon: 'cut-outline' },
];

export function AddAppointmentScreen() {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // DECISION (spec.md §8, ambiguidade documentada): nenhum tipo vem
  // pre-selecionado ao abrir a tela — nfInvalid do Canvas so cita nome/data/hora,
  // nao tipo, entao um fallback silencioso ('CONSULTA') e usado so no payload
  // se o usuario nunca tocar em um chip.
  const [appointmentType, setAppointmentType] = useState<AppointmentType | null>(null);
  const [appointmentName, setAppointmentName] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isFormInvalid = !appointmentName.trim() || !scheduledDate.trim() || !scheduledTime.trim();
  const disabledReason = isFormInvalid ? 'Preencha nome, data e hora para salvar.' : undefined;

  async function handleSubmit() {
    if (isFormInvalid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const scheduledAtIso = `${scheduledDate}T${scheduledTime}`;
      await createAppointment({
        appointmentType: appointmentType ?? 'CONSULTA',
        appointmentName: appointmentName.trim(),
        professionalName: professionalName.trim(),
        scheduledAt: scheduledAtIso,
        address: address.trim(),
        observations: observations.trim() || undefined,
      });

      avisarSucesso('Compromisso salvo.');
      router.back();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o compromisso.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* "Novo compromisso", e não "Novo agendamento": é a palavra da
              Agenda e do Início para a mesma coisa (consistencia-e-textos, D2). */}
          <DetailHeader onBack={() => router.back()} title="Novo compromisso" />

          <View>
            <Text style={styles.sectionTitle}>Tipo</Text>
            <View style={styles.typeRow}>
              {APPOINTMENT_TYPE_OPTIONS.map((option) => {
                const isSelected = appointmentType === option.value;

                return (
                  <Pressable
                    accessibilityLabel={`Tipo: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={option.value}
                    onPress={() => setAppointmentType(option.value)}
                    style={[styles.typeChip, isSelected ? styles.typeChipSelected : null]}
                  >
                    <Ionicons
                      color={isSelected ? colors.primaryDark : colors.textSecondary}
                      name={option.icon}
                      size={22}
                    />
                    <Text style={[styles.typeChipLabel, isSelected ? styles.typeChipLabelSelected : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <FormField
              label="Nome do compromisso"
              onChangeText={setAppointmentName}
              placeholder="Ex.: Consulta cardiologista"
              value={appointmentName}
            />

            <FormField
              label="Profissional"
              onChangeText={setProfessionalName}
              placeholder="Ex.: Dr. Ricardo Alves"
              value={professionalName}
            />

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeField}>
                <DateInput
                  containerStyle={styles.dateTimeFieldNoMargin}
                  label="Data"
                  onChange={setScheduledDate}
                  placeholder="DD/MM/AAAA"
                  value={scheduledDate}
                />
              </View>
              <View style={styles.dateTimeField}>
                <FormField
                  containerStyle={styles.dateTimeFieldNoMargin}
                  inputMode="numeric"
                  inputWrapperStyle={styles.dateTimeInputWrapper}
                  keyboardType="number-pad"
                  label="Hora"
                  maxLength={5}
                  onChangeText={(text) => setScheduledTime(maskTimeInput(text))}
                  placeholder="hh:mm"
                  value={scheduledTime}
                />
              </View>
            </View>

            <FormField
              label="Endereço"
              onChangeText={setAddress}
              placeholder="Ex.: Av. Paulista, 1000 - São Paulo/SP"
              value={address}
            />

            <FormField
              label="Observações (opcional)"
              multiline
              numberOfLines={3}
              onChangeText={setObservations}
              placeholder="Ex.: levar exames anteriores"
              style={styles.textArea}
              value={observations}
            />
          </View>

          {submitError ? <InlineError message={submitError} /> : null}

          <Button
            disabled={isFormInvalid}
            disabledReason={disabledReason}
            loading={isSubmitting}
            onPress={handleSubmit}
            title="Salvar compromisso"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: SIZES.large,
      paddingTop: SIZES.large,
      paddingBottom: SIZES.large * 2,
    },
    section: {
      marginTop: SIZES.large,
    },
    sectionTitle: {
      ...FONTS.body,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: SIZES.small,
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    typeChip: {
      flex: 1,
      height: 64,
      borderRadius: 14,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    typeChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    typeChipLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeChipLabelSelected: {
      color: colors.primaryDark,
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: 12,
      // marginTop fica aqui (e não em cada campo) para garantir que "Data"
      // (DateInput, StyleSheet) e "Hora" (FormField, NativeWind) partam
      // exatamente da mesma linha — ver dateTimeFieldNoMargin.
      marginTop: SIZES.large,
    },
    dateTimeField: {
      flex: 1,
    },
    dateTimeFieldNoMargin: {
      marginTop: 0,
    },
    // O wrapper de FormField renderiza mais baixo que o `h-14` (56px)
    // nominal — trava a altura explicitamente para bater com o Pressable
    // de 56px do DateInput ao lado.
    dateTimeInputWrapper: {
      height: 56,
    },
    textArea: {
      minHeight: 76,
      textAlignVertical: 'top',
      paddingTop: 14,
    },
  });

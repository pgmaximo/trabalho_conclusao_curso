import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { FormField } from '@/components/FormField';
import { InlineError } from '@/components/InlineError';
import { FONTS, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';
import { createAppointment, type AppointmentType } from '@/services/appointmentService';

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

      router.back();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={colors.background} style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Voltar"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons color={colors.text} name="chevron-back" size={22} />
            </Pressable>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Novo agendamento</Text>
            </View>
          </View>

          <View style={styles.section}>
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
              label="Nome do agendamento"
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
                  label="Data"
                  onChange={setScheduledDate}
                  placeholder="DD/MM/AAAA"
                  value={scheduledDate}
                />
              </View>
              <View style={styles.dateTimeField}>
                <FormField
                  inputMode="numeric"
                  label="Hora"
                  onChangeText={setScheduledTime}
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
            title="Salvar agendamento"
          />
        </ScrollView>
      </View>
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
      paddingTop: SIZES.base,
      paddingBottom: SIZES.large * 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SIZES.large,
      gap: SIZES.base,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: 14,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      ...FONTS.title,
      color: colors.text,
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
    },
    dateTimeField: {
      flex: 1,
    },
    textArea: {
      minHeight: 76,
      textAlignVertical: 'top',
      paddingTop: 14,
    },
  });

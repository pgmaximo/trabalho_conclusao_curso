import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { DetailHeader } from '@/components/DetailHeader';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { InlineError } from '@/components/InlineError';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { FONTS, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';
import { avisarSucesso } from '@/hooks/avisoDeSucesso';
import {
  deleteAppointment,
  getAppointmentById,
  updateAppointment,
  type AppointmentRecord,
  type AppointmentType,
} from '@/services/appointmentService';
import { maskTimeInput } from '@/utils/timeMask';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string; icon: IoniconName }[] = [
  { value: 'CONSULTA', label: 'Consulta', icon: 'medical-outline' },
  { value: 'EXAME', label: 'Exame', icon: 'flask-outline' },
  { value: 'CIRURGIA', label: 'Cirurgia', icon: 'cut-outline' },
];

type LoadStatus = 'loading' | 'ready' | 'notFound' | 'error';

export function EditAppointmentScreen({ id }: { id: string }) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus] = useState<LoadStatus>('loading');
  // Lido só dentro de handlers (id/guard) — nunca no render, então não precisa
  // disparar re-render (quem controla a UI é `status`, ver useEffect abaixo).
  const appointmentRef = useRef<AppointmentRecord | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('CONSULTA');
  const [appointmentName, setAppointmentName] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setStatus('loading');

      try {
        const data = await getAppointmentById(id);
        if (!mounted) return;

        if (!data) {
          setStatus('notFound');
          return;
        }

        appointmentRef.current = data;
        setAppointmentType(data.appointmentType);
        setAppointmentName(data.appointmentName);
        setProfessionalName(data.professionalName ?? '');
        const [datePart, timePart] = data.scheduledAt.split('T');
        setScheduledDate(datePart || '');
        setScheduledTime((timePart || '').slice(0, 5));
        setAddress(data.address ?? '');
        setObservations(data.observations ?? '');
        setStatus('ready');
      } catch (error) {
        if (!mounted) return;
        setSubmitError(error instanceof Error ? error.message : 'Não foi possível carregar o compromisso.');
        setStatus('error');
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const isFormInvalid = !appointmentName.trim() || !scheduledDate.trim() || !scheduledTime.trim();
  const disabledReason = isFormInvalid ? 'Preencha nome, data e hora para salvar.' : undefined;

  async function handleSave() {
    const appointment = appointmentRef.current;
    if (!appointment || isFormInvalid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const scheduledAtIso = `${scheduledDate}T${scheduledTime}`;
      await updateAppointment(appointment.id, {
        appointmentType,
        appointmentName: appointmentName.trim(),
        professionalName: professionalName.trim(),
        scheduledAt: scheduledAtIso,
        address: address.trim(),
        observations: observations.trim() || undefined,
      });

      // A tela fecha, e a Agenda diz que salvou (consistencia-e-textos, D5).
      avisarSucesso('Compromisso salvo.');
      router.back();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível atualizar o compromisso.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    const appointment = appointmentRef.current;
    if (!appointment) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAppointment(appointment.id);
      avisarSucesso('Compromisso excluído.');
      router.back();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Não foi possível excluir o compromisso.');
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  // O mesmo cabeçalho nos três estados da tela (carregando, erro e pronto):
  // carregando, ela era só o esqueleto, sem título e sem como sair.
  const header = <DetailHeader onBack={() => router.back()} title="Editar compromisso" />;

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {header}
            <ScreenSkeleton blocks={3} />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'notFound' || status === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {header}
            <EmptyState
              actionLabel="Voltar para a Agenda"
              description={
                status === 'notFound'
                  ? 'Este compromisso não existe mais ou já foi excluído.'
                  : submitError ?? 'Não foi possível carregar o compromisso.'
              }
              icon="alert-circle-outline"
              onActionPress={() => router.replace('/appointments')}
              title={status === 'notFound' ? 'Compromisso não encontrado' : 'Não foi possível carregar'}
              tone="error"
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
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
          {header}

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
              value={appointmentName}
            />

            <FormField
              label="Profissional"
              onChangeText={setProfessionalName}
              value={professionalName}
            />

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeField}>
                <DateInput
                  containerStyle={styles.dateTimeFieldNoMargin}
                  label="Data"
                  onChange={setScheduledDate}
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

            <FormField label="Endereço" onChangeText={setAddress} value={address} />

            <FormField
              inputWrapperClassName="h-auto min-h-[76px] items-start py-3"
              label="Observações (opcional)"
              multiline
              numberOfLines={3}
              onChangeText={setObservations}
              style={styles.textArea}
              value={observations}
            />
          </View>

          {submitError && status === 'ready' ? <InlineError message={submitError} /> : null}
          {deleteError ? <InlineError message={deleteError} /> : null}

          {isConfirmingDelete ? (
            <DeleteConfirmPanel
              isDeleting={isDeleting}
              onCancel={() => setIsConfirmingDelete(false)}
              onConfirm={handleConfirmDelete}
            />
          ) : (
            <>
              <Button
                disabled={isFormInvalid}
                disabledReason={disabledReason}
                loading={isSubmitting}
                onPress={handleSave}
                title="Salvar alterações"
              />
              <Button
                onPress={() => setIsConfirmingDelete(true)}
                style={styles.deleteButton}
                title="Excluir compromisso"
                variant="destructive"
              />
            </>
          )}
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
    deleteButton: {
      marginTop: 10,
    },
  });

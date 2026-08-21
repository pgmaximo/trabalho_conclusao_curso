import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateInput } from '@/components/DateInput';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { getAppointmentById, updateAppointment, deleteAppointment, type AppointmentRecord, type AppointmentType } from '@/services/appointmentService';

export function EditAppointmentScreen({ id }: { id: string }) {
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('CONSULTA');
  const [appointmentName, setAppointmentName] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await getAppointmentById(id);
      if (!mounted) return;
      if (!data) return;
      setAppointment(data);
      setAppointmentType(data.appointmentType);
      setAppointmentName(data.appointmentName);
      setProfessionalName(data.professionalName ?? '');
      // scheduledAt expected like YYYY-MM-DDTHH:MM
      const [datePart, timePart] = data.scheduledAt.split('T');
      setScheduledDate(datePart || '');
      setScheduledTime((timePart || '14:00').slice(0,5));
      setAddress(data.address ?? '');
      setObservations(data.observations ?? '');
    }
    void load();
    return () => { mounted = false; };
  }, [id]);

  async function handleSave() {
    if (!appointment) return;
    setIsSubmitting(true);
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
      alert('Agendamento atualizado com sucesso!');
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar agendamento';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!appointment) return;
    const confirmed = confirm('Tem certeza que deseja deletar este agendamento?');
    if (!confirmed) return;
    try {
      await deleteAppointment(appointment.id);
      alert('Agendamento deletado.');
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao deletar agendamento';
      alert(message);
    }
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" backgroundColor={COLORS.background} />
        <View style={styles.container}>
          <Text style={{ padding: 20 }}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Editar agendamento</Text>
              <Text style={styles.subtitle}>Altere os detalhes e salve ou exclua o agendamento.</Text>
            </View>
          </View>

          <Card variant="outlined" style={styles.card}>
            <Text style={styles.sectionTitle}>Tipo de agendamento</Text>
            <View style={styles.typeButtonContainer}>
              {['CONSULTA', 'EXAME', 'CIRURGIA'].map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.typeButton, appointmentType === (opt as AppointmentType) && styles.typeButtonActive]}
                  onPress={() => setAppointmentType(opt as AppointmentType)}
                >
                  <Text style={styles.typeButtonLabel}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Nome do agendamento</Text>
            <TextInput style={styles.input} value={appointmentName} onChangeText={setAppointmentName} />

            <Text style={styles.fieldLabel}>Nome do profissional</Text>
            <TextInput style={styles.input} value={professionalName} onChangeText={setProfessionalName} />

            <DateInput label="Data" value={scheduledDate} onChange={setScheduledDate} placeholder="DD/MM/YYYY" />
            <Text style={styles.fieldLabel}>Hora</Text>
            <TextInput style={styles.input} value={scheduledTime} onChangeText={setScheduledTime} />

            <Text style={styles.fieldLabel}>Endereço</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} />

            <Text style={styles.fieldLabel}>Observações</Text>
            <TextInput style={[styles.input, styles.textArea]} value={observations} onChangeText={setObservations} multiline numberOfLines={4} />
          </View>

          <Button title="Salvar" onPress={handleSave} disabled={isSubmitting} />
          <Button title="Cancelar" onPress={() => router.back()} variant="secondary" />
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>Deletar agendamento</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { paddingHorizontal: SIZES.large, paddingTop: SIZES.base, paddingBottom: SIZES.large * 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SIZES.large, gap: SIZES.base },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 20, color: COLORS.text, fontWeight: '600' },
  titleContainer: { flex: 1 },
  title: { ...FONTS.title, color: COLORS.text, marginBottom: SIZES.small },
  subtitle: { ...FONTS.caption, color: COLORS.textSecondary },
  card: { marginBottom: SIZES.large },
  sectionTitle: { ...FONTS.subtitle, color: COLORS.text, marginBottom: SIZES.base },
  typeButtonContainer: { flexDirection: 'row', gap: SIZES.small },
  typeButton: { paddingVertical: SIZES.base, paddingHorizontal: SIZES.small, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface },
  typeButtonActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  typeButtonLabel: { ...FONTS.caption, color: COLORS.textSecondary },
  formSection: { marginBottom: SIZES.large },
  fieldLabel: { ...FONTS.body, color: COLORS.text, fontWeight: '600', marginTop: SIZES.base, marginBottom: SIZES.small },
  input: { backgroundColor: COLORS.inputBackground, borderColor: COLORS.border, borderWidth: 1, borderRadius: SIZES.radius, paddingHorizontal: SIZES.base, paddingVertical: SIZES.base, color: COLORS.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  deleteButton: { marginTop: SIZES.large, backgroundColor: '#EF4444', padding: SIZES.base, borderRadius: SIZES.radius },
});

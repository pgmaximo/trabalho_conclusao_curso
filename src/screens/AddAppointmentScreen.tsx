import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { createAppointment, type AppointmentType } from '@/services/appointmentService';

const appointmentTypeOptions: Array<{ value: AppointmentType; label: string; icon: string }> = [
  { value: 'CONSULTA', label: 'Consulta', icon: '🩺' },
  { value: 'EXAME', label: 'Exame', icon: '🧪' },
  { value: 'CIRURGIA', label: 'Cirurgia', icon: '🔪' },
];

export function AddAppointmentScreen() {
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('CONSULTA');
  const [appointmentName, setAppointmentName] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!appointmentName.trim() || !professionalName.trim() || !scheduledAt.trim() || !address.trim()) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createAppointment({
        appointmentType,
        appointmentName: appointmentName.trim(),
        professionalName: professionalName.trim(),
        scheduledAt: scheduledAt.trim(),
        address: address.trim(),
        observations: observations.trim() || undefined,
      });

      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar agendamento';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
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
              <Text style={styles.title}>Novo agendamento</Text>
              <Text style={styles.subtitle}>Cadastre um compromisso para sua agenda.</Text>
            </View>
          </View>

          <Card variant="outlined" style={styles.card}>
            <Text style={styles.sectionTitle}>Tipo de agendamento</Text>
            <View style={styles.typeButtonContainer}>
              {appointmentTypeOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.typeButton, appointmentType === option.value && styles.typeButtonActive]}
                  onPress={() => setAppointmentType(option.value)}
                >
                  <Text style={styles.typeButtonIcon}>{option.icon}</Text>
                  <Text style={[styles.typeButtonLabel, appointmentType === option.value && styles.typeButtonLabelActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Nome do agendamento</Text>
            <TextInput
              style={styles.input}
              value={appointmentName}
              onChangeText={setAppointmentName}
              placeholder="Ex: Consulta cardiológica"
            />

            <Text style={styles.fieldLabel}>Nome do profissional</Text>
            <TextInput
              style={styles.input}
              value={professionalName}
              onChangeText={setProfessionalName}
              placeholder="Ex: Dra. Carla"
            />

            <Text style={styles.fieldLabel}>Data e hora</Text>
            <TextInput
              style={styles.input}
              value={scheduledAt}
              onChangeText={setScheduledAt}
              placeholder="2026-08-20T14:30"
            />

            <Text style={styles.fieldLabel}>Endereço</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Rua X, 123"
            />

            <Text style={styles.fieldLabel}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observations}
              onChangeText={setObservations}
              placeholder="Informe detalhes adicionais"
              multiline
              numberOfLines={4}
            />
          </View>

          <Button title="Salvar agendamento" onPress={handleSubmit} disabled={isSubmitting} />
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
  typeButtonContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.small },
  typeButton: { flexBasis: '31%', paddingVertical: SIZES.base, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface },
  typeButtonActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  typeButtonIcon: { fontSize: 22, marginBottom: 4 },
  typeButtonLabel: { ...FONTS.caption, color: COLORS.textSecondary },
  typeButtonLabelActive: { color: COLORS.primary, fontWeight: '700' },
  formSection: { marginBottom: SIZES.large },
  fieldLabel: { ...FONTS.body, color: COLORS.text, fontWeight: '600', marginTop: SIZES.base, marginBottom: SIZES.small },
  input: { backgroundColor: COLORS.inputBackground, borderColor: COLORS.border, borderWidth: 1, borderRadius: SIZES.radius, paddingHorizontal: SIZES.base, paddingVertical: SIZES.base, color: COLORS.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
});

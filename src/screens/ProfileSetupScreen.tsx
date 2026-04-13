import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { CheckboxOption } from '@/components/CheckboxOption';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type ProfileSetupScreenProps = {
  onBack: () => void;
  onComplete: () => void;
};

export function ProfileSetupScreen({ onBack, onComplete }: ProfileSetupScreenProps) {
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isSmoker, setIsSmoker] = useState(false);
  const [doesExercise, setDoesExercise] = useState(false);
  const [drinksAlcohol, setDrinksAlcohol] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View>
              <Text style={styles.screenTitle}>Perfil de Saúde</Text>
              <Text style={styles.stepText}>Etapa 1 de 4 — Dados Pessoais</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Novo</Text>
            </View>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={styles.progressBarFill} />
          </View>
          <Text style={styles.description}>Preencha seus dados básicos de saúde</Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dados pessoais</Text>
            <AuthInput
              label="Nome completo"
              placeholder="Digite seu nome completo"
              value={fullName}
              onChangeText={setFullName}
            />
            <View style={styles.row}>
              <View style={styles.column}>
                <AuthInput
                  label="Data de nascimento"
                  placeholder="DD/MM/AAAA"
                  value={birthDate}
                  onChangeText={setBirthDate}
                />
              </View>
              <View style={[styles.column, styles.columnSpacing]}>
                <AuthInput
                  label="Sexo biológico"
                  placeholder="Masculino/Feminino"
                  value={sex}
                  onChangeText={setSex}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.column}>
                <AuthInput
                  label="Peso (kg)"
                  placeholder="Ex: 72"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
              <View style={[styles.column, styles.columnSpacing]}>
                <AuthInput
                  label="Altura (cm)"
                  placeholder="Ex: 175"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Histórico clínico</Text>
            <AuthInput
              label="Doenças crônicas"
              placeholder="Diabetes, HAS..."
              value={chronicDiseases}
              onChangeText={setChronicDiseases}
            />
            <AuthInput
              label="Medicamentos em uso atual"
              placeholder="Informe os medicamentos"
              value={medications}
              onChangeText={setMedications}
            />
            <AuthInput
              label="Alergias conhecidas"
              placeholder="Informe alergias"
              value={allergies}
              onChangeText={setAllergies}
            />

            <Text style={styles.sectionTitle}>Hábitos de vida</Text>
            <CheckboxOption label="Fumante" checked={isSmoker} onPress={() => setIsSmoker((prev) => !prev)} />
            <CheckboxOption label="Pratica atividade física" checked={doesExercise} onPress={() => setDoesExercise((prev) => !prev)} />
            <CheckboxOption label="Consome álcool" checked={drinksAlcohol} onPress={() => setDrinksAlcohol((prev) => !prev)} />

            <Button title="Próxima etapa →" onPress={onComplete} style={styles.primaryButton} />
            <Button title="← Voltar" variant="secondary" onPress={onBack} style={styles.secondaryButton} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SIZES.large,
    paddingTop: SIZES.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  screenTitle: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
  },
  stepText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#E5F8EC',
    paddingHorizontal: SIZES.base,
    paddingVertical: 6,
    borderRadius: SIZES.radius,
  },
  statusBadgeText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: SIZES.medium,
  },
  progressBarFill: {
    width: '25%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  description: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.large,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.cardRadius,
    padding: SIZES.large,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 5,
  },
  sectionTitle: {
    ...FONTS.heading,
    fontSize: 16,
    marginBottom: SIZES.small,
    marginTop: SIZES.large,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  columnSpacing: {
    marginLeft: SIZES.small,
  },
  primaryButton: {
    marginTop: SIZES.large,
  },
  secondaryButton: {
    marginTop: SIZES.small,
  },
});

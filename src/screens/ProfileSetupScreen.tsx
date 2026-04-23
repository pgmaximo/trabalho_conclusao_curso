import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CheckboxOption } from '@/components/CheckboxOption';
import { FormField } from '@/components/FormField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Section } from '@/components/Section';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import {
  profileSetupSchema,
  type ProfileSetupFormValues,
} from '@/validation/forms';

type ProfileSetupScreenProps = {
  onBack: () => void;
  onComplete: (values: ProfileSetupFormValues) => void | Promise<void>;
};

export function ProfileSetupScreen({ onBack, onComplete }: ProfileSetupScreenProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSetupFormValues>({
    defaultValues: {
      fullName: '',
      birthDate: '',
      sex: '',
      weight: '',
      height: '',
      chronicDiseases: '',
      medications: '',
      allergies: '',
      isSmoker: false,
      doesExercise: false,
      drinksAlcohol: false,
    },
    resolver: zodResolver(profileSetupSchema),
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            title="Perfil de Saúde"
            subtitle="Preencha os dados basicos que vao sustentar recomendacoes, alertas e futuras integracoes com servicos reais."
            badgeLabel="Etapa 1 de 4"
            badgeVariant="secondary"
          />
          <View style={styles.progressBarBackground}>
            <View style={styles.progressBarFill} />
          </View>
          <Text style={styles.description}>Preencha seus dados básicos de saúde</Text>

          <Card padding="spacious" style={styles.card}>
            <Section title="Dados pessoais" subtitle="Campos obrigatorios para identificar seu perfil.">
              <Controller
                control={control}
                name="fullName"
                render={({ field }) => (
                  <FormField
                    label="Nome completo"
                    placeholder="Digite seu nome completo"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    errorMessage={errors.fullName?.message}
                  />
                )}
              />
            <View style={styles.row}>
              <View style={styles.column}>
                  <Controller
                    control={control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormField
                        label="Data de nascimento"
                        placeholder="DD/MM/AAAA"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        errorMessage={errors.birthDate?.message}
                      />
                    )}
                  />
              </View>
              <View style={[styles.column, styles.columnSpacing]}>
                  <Controller
                    control={control}
                    name="sex"
                    render={({ field }) => (
                      <FormField
                        label="Sexo biológico"
                        placeholder="Masculino/Feminino"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        errorMessage={errors.sex?.message}
                      />
                    )}
                  />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.column}>
                  <Controller
                    control={control}
                    name="weight"
                    render={({ field }) => (
                      <FormField
                        label="Peso (kg)"
                        placeholder="Ex: 72"
                        keyboardType="numeric"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        errorMessage={errors.weight?.message}
                      />
                    )}
                  />
              </View>
              <View style={[styles.column, styles.columnSpacing]}>
                  <Controller
                    control={control}
                    name="height"
                    render={({ field }) => (
                      <FormField
                        label="Altura (cm)"
                        placeholder="Ex: 175"
                        keyboardType="numeric"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        errorMessage={errors.height?.message}
                      />
                    )}
                  />
                </View>
              </View>
            </Section>

            <Section
              title="Historico clinico"
              subtitle='Se nao houver algo a declarar, preencha com "Nenhuma" ou "Nenhum".'
            >
              <Controller
                control={control}
                name="chronicDiseases"
                render={({ field }) => (
                  <FormField
                    label="Doenças crônicas"
                    placeholder="Diabetes, HAS..."
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    errorMessage={errors.chronicDiseases?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="medications"
                render={({ field }) => (
                  <FormField
                    label="Medicamentos em uso atual"
                    placeholder="Informe os medicamentos"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    errorMessage={errors.medications?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="allergies"
                render={({ field }) => (
                  <FormField
                    label="Alergias conhecidas"
                    placeholder="Informe alergias"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    errorMessage={errors.allergies?.message}
                  />
                )}
              />
            </Section>

            <Section title="Habitos de vida" subtitle="Essas escolhas ajudam a calibrar alertas e recomendacoes.">
              <Controller
                control={control}
                name="isSmoker"
                render={({ field }) => (
                  <CheckboxOption
                    label="Fumante"
                    checked={field.value}
                    onPress={() => field.onChange(!field.value)}
                  />
                )}
              />
              <Controller
                control={control}
                name="doesExercise"
                render={({ field }) => (
                  <CheckboxOption
                    label="Pratica atividade física"
                    checked={field.value}
                    onPress={() => field.onChange(!field.value)}
                  />
                )}
              />
              <Controller
                control={control}
                name="drinksAlcohol"
                render={({ field }) => (
                  <CheckboxOption
                    label="Consome álcool"
                    checked={field.value}
                    onPress={() => field.onChange(!field.value)}
                  />
                )}
              />
            </Section>

            <Button
              title={isSubmitting ? 'Salvando perfil...' : 'Próxima etapa →'}
              onPress={handleSubmit(onComplete)}
              style={styles.primaryButton}
              disabled={isSubmitting}
            />
            <Button title="← Voltar" variant="secondary" onPress={onBack} style={styles.secondaryButton} />
          </Card>
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
    borderRadius: SIZES.cardRadius,
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

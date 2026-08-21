// =============================================================================
// Arquivo: EditProfileScreen.tsx
// Descrição: Tela de edição do Perfil de Saúde (nome, medidas, hábitos).
// =============================================================================
//
// Formulário focado e moderno em scroll único. Diferente do OnboardingScreen
// (wizard de 4 etapas), aqui o usuário ajusta rapidamente apenas os dados que
// são realmente persistidos no UserProfile do Amplify.
//
// =============================================================================

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/Avatar';
import { FormField } from '@/components/FormField';
import { Section } from '@/components/Section';

export type OptionalAnswerValue = 'yes' | 'no' | 'unknown';
export type BiologicalSexValue = 'female' | 'male' | 'prefer_not_to_say' | '';

export type EditProfileFormState = {
  fullName: string;
  birthDate: string; // DD/MM/AAAA
  biologicalSex: BiologicalSexValue;
  heightCm: string; // centímetros inteiros (ex.: 165)
  weightKg: string; // kg
  tobaccoUse: OptionalAnswerValue;
  sexuallyActive: OptionalAnswerValue;
  physicalActivity: OptionalAnswerValue;
  alcoholUse: OptionalAnswerValue;
  pregnancyStatus: OptionalAnswerValue;
};

type EditProfileScreenProps = {
  initialValues: EditProfileFormState;
  displayName?: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | undefined;
  photoUrl?: string;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: EditProfileFormState) => void | Promise<void>;
  /** Faz upload real da foto (URI local) e persiste a key no UserProfile. */
  onUploadPhoto: (localUri: string) => Promise<void>;
};

const SEX_OPTIONS: { label: string; value: Exclude<BiologicalSexValue, ''> }[] = [
  { label: 'Masculino', value: 'male' },
  { label: 'Feminino', value: 'female' },
  { label: 'Outro', value: 'prefer_not_to_say' },
];

const ANSWER_OPTIONS: { label: string; value: OptionalAnswerValue }[] = [
  { label: 'Sim', value: 'yes' },
  { label: 'Não', value: 'no' },
  { label: 'Prefiro não informar', value: 'unknown' },
];

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
}

function formatHeightInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 3);
}

function formatWeightInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 3);
}

export function EditProfileScreen({
  initialValues,
  displayName,
  email,
  gender,
  photoUrl,
  isSaving,
  onCancel,
  onSubmit,
  onUploadPhoto,
}: EditProfileScreenProps) {
  const { colorScheme } = useColorScheme();
  const [values, setValues] = useState<EditProfileFormState>(initialValues);
  const [errors, setErrors] = useState<{ fullName?: string; birthDate?: string }>({});
  const [previewPhotoUri, setPreviewPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  function update<K extends keyof EditProfileFormState>(key: K, value: EditProfileFormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const nextErrors: { fullName?: string; birthDate?: string } = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = 'Informe seu nome completo.';
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(values.birthDate.trim())) {
      nextErrors.birthDate = 'Use o formato DD/MM/AAAA.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSubmit(values);
  }

  async function handleChangePhoto() {
    if (isUploadingPhoto) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Habilite o acesso às fotos nas configurações do dispositivo para trocar sua foto de perfil.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets?.length) return;

      const localUri = result.assets[0].uri;
      // Preview otimista: some se o upload falhar (nunca finge sucesso — regra 2).
      setPreviewPhotoUri(localUri);
      setIsUploadingPhoto(true);

      await onUploadPhoto(localUri);
    } catch (error) {
      setPreviewPhotoUri(null);
      const message =
        error instanceof Error ? error.message : 'Não foi possível enviar sua foto agora.';
      Alert.alert('Erro ao trocar foto', message);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  const showPregnancy = values.biologicalSex === 'female';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-1">
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          onPress={onCancel}
          className="size-11 items-center justify-center rounded-full"
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Ionicons color={colorScheme === 'dark' ? '#F8FAFC' : '#0F172A'} name="chevron-back" size={26} />
        </Pressable>
        <Text className="text-[17px] font-bold text-app-text dark:text-app-dark-text">
          Editar perfil
        </Text>
        <View className="size-11" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-6 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8 items-center">
            <Avatar
              name={displayName}
              gender={gender}
              photoUrl={previewPhotoUri ?? photoUrl}
              size="lg"
            />
            <Pressable
              accessibilityLabel="Alterar foto"
              accessibilityRole="button"
              disabled={isUploadingPhoto}
              onPress={handleChangePhoto}
              style={({ pressed }) => [(pressed || isUploadingPhoto) && { opacity: 0.6 }]}
            >
              <View className="mt-3 flex-row items-center gap-2">
                {isUploadingPhoto ? <ActivityIndicator color="#10794E" size="small" /> : null}
                <Text className="text-[16px] font-semibold text-app-primary dark:text-app-dark-primary">
                  {isUploadingPhoto ? 'Enviando foto...' : 'Alterar foto'}
                </Text>
              </View>
            </Pressable>
            {email ? (
              <Text className="mt-3 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
                {email}
              </Text>
            ) : null}
          </View>

          <Section title="Dados pessoais" subtitle="Como você é identificado no app.">
            <FormField
              label="Nome completo"
              autoCapitalize="words"
              placeholder="Digite seu nome completo"
              value={values.fullName}
              onChangeText={(text) => update('fullName', text)}
              errorMessage={errors.fullName}
              containerClassName="mt-0"
            />
            <FormField
              label="Data de nascimento"
              inputMode="numeric"
              maxLength={10}
              placeholder="DD/MM/AAAA"
              value={values.birthDate}
              onChangeText={(text) => update('birthDate', formatBirthDateInput(text))}
              errorMessage={errors.birthDate}
            />

            <View className="mt-6">
              <Text className="mb-3 text-sm font-semibold text-app-text dark:text-app-dark-text">
                Sexo biológico
              </Text>
              <PillGroup
                options={SEX_OPTIONS}
                value={values.biologicalSex}
                onChange={(value) => {
                  update('biologicalSex', value);
                  if (value !== 'female') {
                    update('pregnancyStatus', 'unknown');
                  }
                }}
              />
            </View>
          </Section>

          <Section title="Medidas" subtitle="Usadas para calcular seu IMC.">
            <View className="flex-row gap-3">
              <FormField
                label="Altura"
                inputMode="numeric"
                maxLength={3}
                placeholder="165"
                helperText="Em cm"
                value={values.heightCm}
                onChangeText={(text) => update('heightCm', formatHeightInput(text))}
                containerClassName="mt-0 flex-1"
              />
              <FormField
                label="Peso"
                inputMode="numeric"
                maxLength={3}
                placeholder="68"
                helperText="Em kg"
                value={values.weightKg}
                onChangeText={(text) => update('weightKg', formatWeightInput(text))}
                containerClassName="mt-0 flex-1"
              />
            </View>
          </Section>

          <Section title="Hábitos" subtitle="Ajudam nas recomendações de prevenção.">
            <View>
              <Text className="mb-3 text-sm font-semibold text-app-text dark:text-app-dark-text">
                Tabagismo
              </Text>
              <PillGroup
                options={ANSWER_OPTIONS}
                value={values.tobaccoUse}
                onChange={(value) => update('tobaccoUse', value)}
              />
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-sm font-semibold text-app-text dark:text-app-dark-text">
                Atividade sexual
              </Text>
              <PillGroup
                options={ANSWER_OPTIONS}
                value={values.sexuallyActive}
                onChange={(value) => update('sexuallyActive', value)}
              />
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-sm font-semibold text-app-text dark:text-app-dark-text">
                Atividade física
              </Text>
              <PillGroup
                options={ANSWER_OPTIONS}
                value={values.physicalActivity}
                onChange={(value) => update('physicalActivity', value)}
              />
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-sm font-semibold text-app-text dark:text-app-dark-text">
                Consumo de álcool
              </Text>
              <PillGroup
                options={ANSWER_OPTIONS}
                value={values.alcoholUse}
                onChange={(value) => update('alcoholUse', value)}
              />
            </View>

            {showPregnancy ? (
              <View className="mt-6">
                <Text className="mb-3 text-sm font-semibold text-app-text dark:text-app-dark-text">
                  Você está grávida?
                </Text>
                <PillGroup
                  options={ANSWER_OPTIONS}
                  value={values.pregnancyStatus}
                  onChange={(value) => update('pregnancyStatus', value)}
                />
              </View>
            ) : null}
          </Section>

          <Pressable
            accessibilityLabel="Salvar alterações"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={handleSave}
            className="mt-2 h-14 flex-row items-center justify-center rounded-app bg-app-primary dark:bg-app-dark-primary"
            style={({ pressed }) => [(pressed || isSaving) && { opacity: 0.85 }]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-[16px] font-bold text-app-onPrimary dark:text-app-dark-onPrimary">
                Salvar alterações
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type PillGroupProps<T extends string> = {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

function PillGroup<T extends string>({ options, value, onChange }: PillGroupProps<T>) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
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
  );
}

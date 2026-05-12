// =============================================================================
// Arquivo: ProfileSetupScreen.tsx
// Descricao: Formulario "Perfil de Saude" em wizard visual para onboarding.
// =============================================================================
//
// A tela coleta dados essenciais para futuras recomendacoes preventivas sem
// persistir informacoes sensiveis localmente enquanto o backend Amplify nao
// estiver conectado.
//
// =============================================================================

import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PROFILE_SETUP_NOTICE_TEXT,
} from '@/components/profileSetup/ProfileSetupNotice';
import { ProfileSetupReview } from '@/components/profileSetup/ProfileSetupReview';
import { RADII, SHADOWS, SPACING, type ThemeColors, useThemeColors } from '@/constants/theme';
import {
  profileSetupSchema,
  type OptionalAnswer,
  type ProfileSetupFormValues,
} from '@/validation/forms_profile_setup';

type ProfileSetupScreenProps = {
  onBack: () => void;
  onComplete: (values: ProfileSetupFormValues) => void | Promise<void>;
};

type StepKey = 'personal' | 'clinical' | 'habits' | 'review';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type StepDefinition = {
  key: StepKey;
  label: string;
  icon: IoniconName;
};

const STEPS: StepDefinition[] = [
  { key: 'personal', label: 'Pessoais', icon: 'person' },
  { key: 'clinical', label: 'Clínico', icon: 'pulse-outline' },
  { key: 'habits', label: 'Hábitos', icon: 'nutrition-outline' },
  { key: 'review', label: 'Revisão', icon: 'clipboard-outline' },
];

const DEFAULT_VALUES: ProfileSetupFormValues = {
  fullName: '',
  birthDate: '',
  biologicalSex: '',
  pregnancyStatus: 'unknown',
  heightCm: '',
  weightKg: '',
  chronicConditions: '',
  medications: '',
  allergies: '',
  tobaccoUse: 'unknown',
  alcoholUse: 'unknown',
  physicalActivity: 'unknown',
  sexuallyActive: 'unknown',
};

const ANSWER_OPTIONS: { label: string; value: OptionalAnswer }[] = [
  { label: 'Sim', value: 'yes' },
  { label: 'Não', value: 'no' },
  { label: 'Prefiro não informar', value: 'unknown' },
];

type ProfileSetupStyles = ReturnType<typeof createProfileSetupStyles>;

const ProfileSetupStylesContext = React.createContext<ProfileSetupStyles | null>(null);

function useProfileSetupStyles() {
  const styles = React.useContext(ProfileSetupStylesContext);

  if (!styles) {
    throw new Error('ProfileSetup styles must be used inside ProfileSetupScreen.');
  }

  return styles;
}

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

  return parts.join('/');
}

export function ProfileSetupScreen({ onBack, onComplete }: ProfileSetupScreenProps) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createProfileSetupStyles(colors), [colors]);
  const [currentStep, setCurrentStep] = useState(0);
  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSetupFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(profileSetupSchema),
  });

  const values = watch();
  const activeStep = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  async function goNext() {
    if (activeStep.key === 'personal') {
      const isValid = await trigger(['fullName', 'birthDate']);

      if (!isValid) {
        return;
      }
    }

    if (isLastStep) {
      await handleSubmit(onComplete)();
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  }

  function goBack() {
    if (currentStep === 0) {
      onBack();
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function selectStep(index: number) {
    if (index <= currentStep) {
      setCurrentStep(index);
    }
  }

  return (
    <ProfileSetupStylesContext.Provider value={styles}>
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[colors.background, colors.surfaceMuted, colors.accentSoft]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header currentStep={currentStep} onBack={goBack} />

          <View style={styles.hero}>
            <Text style={styles.title}>Perfil de Saúde</Text>
            <Text style={styles.subtitle}>
              Conte-nos sobre você para personalizar suas recomendações de prevenção.
            </Text>
          </View>

          <StepNavigation currentStep={currentStep} onSelect={selectStep} />

          <View style={styles.formContent}>
            {activeStep.key === 'personal' ? (
              <PersonalStep
                control={control}
                errors={errors}
                setValue={setValue}
                values={values}
              />
            ) : null}

            {activeStep.key === 'clinical' ? (
              <ClinicalStep control={control} />
            ) : null}

            {activeStep.key === 'habits' ? (
              <HabitsStep control={control} />
            ) : null}

            {activeStep.key === 'review' ? (
              <ReviewStep values={values} />
            ) : null}
          </View>
        </ScrollView>

        <Footer
          currentStep={currentStep}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          onBack={goBack}
          onNext={goNext}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ProfileSetupStylesContext.Provider>
  );
}

type StepProps = Pick<
  ReturnType<typeof useForm<ProfileSetupFormValues>>,
  'control'
>;

type PersonalStepProps = StepProps & {
  errors: ReturnType<typeof useForm<ProfileSetupFormValues>>['formState']['errors'];
  setValue: ReturnType<typeof useForm<ProfileSetupFormValues>>['setValue'];
  values: ProfileSetupFormValues;
};

function Header({ currentStep, onBack }: { currentStep: number; onBack: () => void }) {
  const colors = useThemeColors();
  const styles = useProfileSetupStyles();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        onPress={onBack}
        style={styles.backButton}
      >
        <Ionicons color={colors.primary} name="chevron-back" size={28} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.stepCounter}>Etapa {currentStep + 1} de {STEPS.length}</Text>
        <View style={styles.progressSegments}>
          {STEPS.map((step, index) => (
            <View
              key={step.key}
              style={[
                styles.progressSegment,
                index <= currentStep ? styles.progressSegmentActive : null,
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function StepNavigation({
  currentStep,
  onSelect,
}: {
  currentStep: number;
  onSelect: (index: number) => void;
}) {
  const colors = useThemeColors();
  const styles = useProfileSetupStyles();

  return (
    <View style={styles.stepNavigation}>
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isVisited = index < currentStep;

        return (
          <React.Fragment key={step.key}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelect(index)}
              style={styles.stepTab}
            >
              <View style={[styles.stepIconWrap, isActive ? styles.stepIconWrapActive : null]}>
                <Ionicons
                  color={isActive ? colors.onPrimary : colors.iconMuted}
                  name={isActive && step.key === 'personal' ? 'person' : step.icon}
                  size={isActive ? 22 : 27}
                />
              </View>
              <Text
                style={[
                  styles.stepTabText,
                  isActive || isVisited ? styles.stepTabTextActive : null,
                ]}
              >
                {step.label}
              </Text>
              <View style={[styles.stepUnderline, isActive ? styles.stepUnderlineActive : null]} />
            </Pressable>
            {index < STEPS.length - 1 ? <View style={styles.stepSeparator} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function PersonalStep({ control, errors, setValue, values }: PersonalStepProps) {
  const styles = useProfileSetupStyles();

  return (
    <View>
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <FieldBlock
            errorMessage={errors.fullName?.message}
            icon="person-outline"
            label="Nome Completo"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Digite seu nome completo"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="birthDate"
        render={({ field }) => (
          <FieldBlock
            spaced
            errorMessage={errors.birthDate?.message}
            icon="calendar-outline"
            inputMode="numeric"
            label="Data de nascimento"
            maxLength={10}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(formatBirthDateInput(value))}
            placeholder="DD/MM/AAAA"
            value={field.value}
          />
        )}
      />

      <View style={styles.sectionBlock}>
        <Text style={styles.label}>Sexo biológico</Text>
        <View style={styles.sexGrid}>
          <SexCard
            icon="woman"
            label="Feminino"
            onPress={() => setValue('biologicalSex', 'female')}
            selected={values.biologicalSex === 'female'}
            tone="female"
          />
          <SexCard
            icon="man"
            label="Masculino"
            onPress={() => {
              setValue('biologicalSex', 'male');
              setValue('pregnancyStatus', 'unknown');
            }}
            selected={values.biologicalSex === 'male'}
            tone="male"
          />
        </View>
        <Pressable
          accessibilityLabel="Sexo biológico: Desejo não informar"
          accessibilityRole="button"
          accessibilityState={{ selected: values.biologicalSex === 'prefer_not_to_say' }}
          onPress={() => {
            setValue('biologicalSex', 'prefer_not_to_say');
            setValue('pregnancyStatus', 'unknown');
          }}
          style={[
            styles.preferNotCard,
            values.biologicalSex === 'prefer_not_to_say' ? styles.preferNotCardSelected : null,
          ]}
        >
          <Text
            style={[
              styles.preferNotText,
              values.biologicalSex === 'prefer_not_to_say' ? styles.preferNotTextSelected : null,
            ]}
          >
            Desejo não informar
          </Text>
        </Pressable>
      </View>

      {values.biologicalSex === 'female' ? (
        <Controller
          control={control}
          name="pregnancyStatus"
          render={({ field }) => (
            <AnswerCards
              helperText="Selecione apenas se aplicável."
              onChange={field.onChange}
              title="Você está grávida?"
              value={field.value}
            />
          )}
        />
      ) : null}

      <View style={styles.measureRow}>
        <Controller
          control={control}
          name="heightCm"
          render={({ field }) => (
            <FieldBlock
              compact
              errorMessage={errors.heightCm?.message}
              helperText="Use vírgula decimal (ex.: 1,65)"
              icon="resize-outline"
              inputMode="decimal"
              label="Altura"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Ex.: 1,65"
              unit="m"
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="weightKg"
          render={({ field }) => (
            <FieldBlock
              compact
              errorMessage={errors.weightKg?.message}
              helperText="Em quilogramas (kg)"
              icon="scale-outline"
              inputMode="numeric"
              label="Peso"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Ex.: 68"
              unit="kg"
              value={field.value}
            />
          )}
        />
      </View>

      <SecurityCard />
    </View>
  );
}

function ClinicalStep({ control }: StepProps) {
  const styles = useProfileSetupStyles();

  return (
    <View>
      <Text style={styles.stepHeading}>Histórico clínico</Text>
      <Controller
        control={control}
        name="chronicConditions"
        render={({ field }) => (
          <FieldBlock
            helperText="Ex.: hipertensão, diabetes, asma."
            label="Condições crônicas"
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Opcional"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="medications"
        render={({ field }) => (
          <FieldBlock
            helperText="Pode ficar em branco se não houver medicamentos em uso."
            label="Medicamentos em uso"
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Opcional"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="allergies"
        render={({ field }) => (
          <FieldBlock
            helperText="Pode ficar em branco se não houver alergias."
            label="Alergias conhecidas"
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="Opcional"
            value={field.value}
          />
        )}
      />
      <PrivacyNotice />
    </View>
  );
}

function HabitsStep({ control }: StepProps) {
  const styles = useProfileSetupStyles();

  return (
    <View>
      <Text style={styles.stepHeading}>Hábitos de vida</Text>
      <Controller
        control={control}
        name="tobaccoUse"
        render={({ field }) => (
          <AnswerCards
            onChange={field.onChange}
            title="Tabagismo"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="sexuallyActive"
        render={({ field }) => (
          <AnswerCards
            onChange={field.onChange}
            title="Atividade sexual"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="physicalActivity"
        render={({ field }) => (
          <AnswerCards
            onChange={field.onChange}
            title="Pratica atividade física?"
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="alcoholUse"
        render={({ field }) => (
          <AnswerCards
            onChange={field.onChange}
            title="Consumo de álcool"
            value={field.value}
          />
        )}
      />
      <PrivacyNotice />
    </View>
  );
}

function ReviewStep({ values }: { values: ProfileSetupFormValues }) {
  const styles = useProfileSetupStyles();

  return (
    <View>
      <Text style={styles.stepHeading}>Revisão</Text>
      <Text style={styles.stepCopy}>
        Confira as respostas principais antes de concluir o Perfil de Saúde.
      </Text>
      <PrivacyNotice />
      <ProfileSetupReview values={values} />
    </View>
  );
}

type FieldBlockProps = {
  compact?: boolean;
  errorMessage?: string;
  helperText?: string;
  icon?: IoniconName;
  inputMode?: 'decimal' | 'numeric';
  label: string;
  maxLength?: number;
  multiline?: boolean;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  placeholder: string;
  spaced?: boolean;
  unit?: string;
  value: string;
};

function FieldBlock({
  compact,
  errorMessage,
  helperText,
  icon,
  inputMode,
  label,
  maxLength,
  multiline,
  onBlur,
  onChangeText,
  placeholder,
  spaced,
  unit,
  value,
}: FieldBlockProps) {
  const colors = useThemeColors();
  const styles = useProfileSetupStyles();

  return (
    <View
      style={[
        styles.fieldBlock,
        spaced ? styles.fieldBlockSpaced : null,
        compact ? styles.fieldBlockCompact : null,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, multiline ? styles.inputShellMultiline : null]}>
        {icon ? (
          <Ionicons color={compact ? colors.primary : colors.placeholder} name={icon} size={22} />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          inputMode={inputMode}
          maxLength={maxLength}
          multiline={multiline}
          onBlur={onBlur}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          value={value}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

function SexCard({
  icon,
  label,
  onPress,
  selected,
  tone,
}: {
  icon: 'woman' | 'man';
  label: string;
  onPress: () => void;
  selected: boolean;
  tone: 'female' | 'male';
}) {
  const colors = useThemeColors();
  const styles = useProfileSetupStyles();
  const toneColor = tone === 'female' ? colors.female : colors.info;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sexo biológico: ${label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.sexCard,
        selected && tone === 'female' ? styles.sexCardFemaleSelected : null,
        selected && tone === 'male' ? styles.sexCardMaleSelected : null,
        !selected ? styles.sexCardInactive : null,
      ]}
    >
      <Ionicons color={toneColor} name={icon} size={42} />
      <Text style={[styles.sexCardText, { color: toneColor }]}>{label}</Text>
    </Pressable>
  );
}

function AnswerCards({
  helperText,
  onChange,
  title,
  value,
}: {
  helperText?: string;
  onChange: (value: OptionalAnswer) => void;
  title: string;
  value: OptionalAnswer;
}) {
  const styles = useProfileSetupStyles();

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.label}>{title}</Text>
      {helperText ? <Text style={styles.questionHelper}>{helperText}</Text> : null}
      <View style={styles.answerGrid}>
        {ANSWER_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.answerCard,
                selected && option.value === 'yes' ? styles.answerCardYesSelected : null,
                selected && option.value === 'no' ? styles.answerCardNoSelected : null,
                selected && option.value === 'unknown' ? styles.answerCardUnknownSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.answerText,
                  selected && option.value === 'yes' ? styles.answerTextYes : null,
                  selected && option.value === 'no' ? styles.answerTextNo : null,
                  selected && option.value === 'unknown' ? styles.answerTextUnknown : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SecurityCard() {
  const colors = useThemeColors();
  const styles = useProfileSetupStyles();

  return (
    <View style={styles.securityCard}>
      <Ionicons color={colors.primary} name="shield-checkmark-outline" size={30} />
      <Text style={styles.securityText}>
        Suas informações são seguras e nos ajudam a preparar recomendações de prevenção mais
        relevantes para você no futuro.
      </Text>
    </View>
  );
}

function PrivacyNotice() {
  const colors = useThemeColors();
  const styles = useProfileSetupStyles();

  return (
    <View style={styles.privacyNotice}>
      <Ionicons color={colors.primary} name="shield-checkmark-outline" size={24} />
      <Text style={styles.privacyNoticeText}>{PROFILE_SETUP_NOTICE_TEXT}</Text>
    </View>
  );
}

function Footer({
  currentStep,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
}: {
  currentStep: number;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const colors = useThemeColors();
  const styles = useProfileSetupStyles();

  return (
    <View style={styles.footer}>
      <View style={styles.footerButtons}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backFooterButton}
        >
          <Text style={styles.backFooterText}>
            {currentStep === 0 ? 'Voltar' : 'Voltar'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onNext}
          style={({ pressed }) => [
            styles.continueButton,
            pressed || isSubmitting ? styles.buttonPressed : null,
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>
              {isLastStep ? (isSubmitting ? 'Concluindo...' : 'Concluir perfil') : 'Continuar'}
            </Text>
            <Ionicons color={colors.onPrimary} name="chevron-forward" size={24} />
          </LinearGradient>
        </Pressable>
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
}

function createProfileSetupStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 142,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingTop: 8,
  },
  headerSpacer: {
    width: 44,
  },
  stepCounter: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  progressSegments: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  progressSegment: {
    backgroundColor: colors.progressTrack,
    borderRadius: 999,
    height: 5,
    width: 56,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 29,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 44,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 26,
    marginTop: 12,
    maxWidth: 342,
    textAlign: 'center',
  },
  stepNavigation: {
    alignItems: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 30,
  },
  stepTab: {
    alignItems: 'center',
    flex: 1,
    minHeight: 82,
  },
  stepIconWrap: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  stepIconWrapActive: {
    backgroundColor: colors.primary,
    borderRadius: 19,
  },
  stepTabText: {
    color: colors.iconMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
  },
  stepTabTextActive: {
    color: colors.primary,
  },
  stepUnderline: {
    borderRadius: 999,
    height: 4,
    marginTop: 9,
    width: 50,
  },
  stepUnderlineActive: {
    backgroundColor: colors.primary,
  },
  stepSeparator: {
    alignSelf: 'center',
    backgroundColor: colors.borderLight,
    height: 39,
    marginBottom: 24,
    width: 1,
  },
  formContent: {
    paddingHorizontal: 28,
    paddingTop: 21,
  },
  fieldBlock: {
    marginTop: 0,
  },
  fieldBlockSpaced: {
    marginTop: 22,
  },
  fieldBlockCompact: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 48,
    marginTop: 10,
    paddingHorizontal: 14,
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
    height: 96,
    paddingTop: 12,
  },
  input: {
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 21,
    minWidth: 0,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 0,
    minWidth: 20,
    textAlign: 'right',
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 7,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 7,
  },
  sectionBlock: {
    marginTop: 28,
  },
  sexGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  sexCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    height: 116,
    justifyContent: 'center',
  },
  sexCardFemaleSelected: {
    backgroundColor: colors.femaleSoft,
    borderColor: colors.female,
  },
  sexCardMaleSelected: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
  },
  sexCardInactive: {
    borderColor: colors.border,
  },
  sexCardText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 10,
  },
  preferNotCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    marginTop: 12,
  },
  preferNotCardSelected: {
    backgroundColor: colors.neutralSoft,
    borderColor: colors.neutralBorder,
  },
  preferNotText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800',
  },
  preferNotTextSelected: {
    color: colors.neutral,
  },
  questionHelper: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  answerCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 47,
    minWidth: 94,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  answerCardYesSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  answerCardNoSelected: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  answerCardUnknownSelected: {
    backgroundColor: colors.neutralSoft,
    borderColor: colors.neutralBorder,
  },
  answerText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  answerTextYes: {
    color: colors.primary,
  },
  answerTextNo: {
    color: colors.danger,
  },
  answerTextUnknown: {
    color: colors.neutral,
  },
  measureRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 27,
    width: '100%',
  },
  securityCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.noticeSoft,
    borderColor: colors.noticeBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    marginTop: 28,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  securityText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  stepHeading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  stepCopy: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 22,
    marginTop: 8,
  },
  privacyNotice: {
    alignItems: 'flex-start',
    backgroundColor: colors.noticeSoft,
    borderColor: colors.noticeBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 22,
    padding: SPACING.md,
  },
  privacyNoticeText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    ...SHADOWS.subtle,
    backgroundColor: colors.footer,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    bottom: 0,
    left: 0,
    paddingBottom: 8,
    paddingHorizontal: 28,
    paddingTop: 18,
    position: 'absolute',
    right: 0,
  },
  footerButtons: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  backFooterButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: RADII.pill,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 112,
  },
  backFooterText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  continueButton: {
    borderRadius: RADII.pill,
    flex: 1,
    height: 56,
    overflow: 'hidden',
  },
  continueGradient: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  continueText: {
    color: colors.onPrimary,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.86,
  },
  homeIndicator: {
    alignSelf: 'center',
    backgroundColor: colors.homeIndicator,
    borderRadius: 999,
    height: 5,
    marginTop: 13,
    width: 134,
  },
  });
}

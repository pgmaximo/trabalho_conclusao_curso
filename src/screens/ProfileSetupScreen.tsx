import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { CheckboxOption } from '@/components/CheckboxOption';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type ProfileSetupScreenProps = {
  onBack: () => void;
  onComplete: () => void;
};

type SexOption = 'Masculino' | 'Feminino';

const sexOptions: SexOption[] = ['Masculino', 'Feminino'];

export function ProfileSetupScreen({ onBack, onComplete }: ProfileSetupScreenProps) {
  const { width } = useWindowDimensions();
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [isBirthDatePickerVisible, setIsBirthDatePickerVisible] = useState(false);
  const [sex, setSex] = useState<SexOption | ''>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [isSmoker, setIsSmoker] = useState(false);
  const [sexuallyActive, setSexuallyActive] = useState(false);
  const [pregnancy, setPregnancy] = useState(false);

  const isCompactLayout = width < 430;
  const formattedBirthDate = birthDate ? new Intl.DateTimeFormat('pt-BR').format(birthDate) : '';

  const handleBirthDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setIsBirthDatePickerVisible(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setBirthDate(selectedDate);
  };

  const openBirthDatePicker = () => {
    const currentValue = birthDate ?? new Date(2000, 0, 1);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode: 'date',
        maximumDate: new Date(),
        onChange: handleBirthDateChange,
      });
      return;
    }

    setIsBirthDatePickerVisible((prev) => !prev);
  };

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
            </View>
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
            <View style={[styles.row, isCompactLayout && styles.stackedRow]}>
              <View style={styles.column}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Data de nascimento</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={openBirthDatePicker}
                    style={styles.selectField}
                  >
                    <Text style={[styles.selectFieldText, !formattedBirthDate && styles.placeholderText]}>
                      {formattedBirthDate || 'Selecionar data'}
                    </Text>
                  </Pressable>
                  {Platform.OS === 'ios' && isBirthDatePickerVisible ? (
                    <DateTimePicker
                      value={birthDate ?? new Date(2000, 0, 1)}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onChange={handleBirthDateChange}
                      style={styles.iosDatePicker}
                    />
                  ) : null}
                </View>
              </View>
              <View style={[styles.column, !isCompactLayout && styles.columnSpacing]}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Sexo biológico</Text>
                  <View style={styles.segmentedControl}>
                    {sexOptions.map((option) => {
                      const isSelected = sex === option;

                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => setSex(option)}
                          style={[styles.segmentOption, isSelected && styles.segmentOptionSelected]}
                        >
                          <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
            <View style={[styles.row, isCompactLayout && styles.stackedRow]}>
              <View style={styles.column}>
                <AuthInput
                  label="Peso (kg)"
                  placeholder="Ex: 72"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
              <View style={[styles.column, !isCompactLayout && styles.columnSpacing]}>
                <AuthInput
                  label="Altura (cm)"
                  placeholder="Ex: 175"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Hábitos de vida</Text>
            <CheckboxOption label="Fumante" checked={isSmoker} onPress={() => setIsSmoker((prev) => !prev)} />
            <CheckboxOption label="Pratica atividade sexual" checked={sexuallyActive} onPress={() => setSexuallyActive((prev) => !prev)} />
            <CheckboxOption label="Gravidez" checked={pregnancy} onPress={() => setPregnancy((prev) => !prev)} />

            <Button title="Próxima etapa ->" onPress={onComplete} style={styles.primaryButton} />
            <Button title="<- Voltar" variant="secondary" onPress={onBack} style={styles.secondaryButton} />
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
  stackedRow: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  columnSpacing: {
    marginLeft: SIZES.small,
  },
  fieldContainer: {
    marginTop: SIZES.large,
  },
  label: {
    ...FONTS.body,
    marginBottom: 8,
  },
  selectField: {
    minHeight: 50,
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.base,
    paddingVertical: 14,
  },
  selectFieldText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.placeholder,
  },
  iosDatePicker: {
    marginTop: SIZES.small,
  },
  segmentedControl: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 5,
  },
  segmentOption: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: SIZES.small,
  },
  segmentOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: COLORS.surface,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: SIZES.large,
  },
  secondaryButton: {
    marginTop: SIZES.small,
  },
});

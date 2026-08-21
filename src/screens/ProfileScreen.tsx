import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import { useThemeContext, type ThemeMode } from '@/contexts/ThemeContext';
import type { UserProfile } from '@/contexts/UserContext';
import { requestDataExport } from '@/services/export/dataExportService';
import { getHealthConnectStatus } from '@/services/health/healthAppConnectService';
import {
  REMINDER_INTERVAL_OPTIONS,
  type ReminderIntervalsByGrade,
} from '@/services/reminderService';
import type { UspstfGrade } from '@/types/models';

type ProfileScreenProps = {
  user: UserProfile | null;
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
  reminderIntervals: ReminderIntervalsByGrade;
  onSetReminderInterval: (grade: UspstfGrade, days: number) => void;
  onLogout: () => void;
  onEditProfile: () => void;
};

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'Claro', value: 'light' },
  { label: 'Automático', value: 'system' },
  { label: 'Escuro', value: 'dark' },
];

const REMINDER_GRADE_ORDER: UspstfGrade[] = ['A', 'B', 'C', 'D', 'I'];

// Converte dias em uma unidade mais legivel (meses/anos) quando fizer sentido —
// intervalos recorrentes de 30+ dias ficam mais claros como "1 mês"/"1 ano".
function formatIntervalLabel(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return `${years} ano${years === 1 ? '' : 's'}`;
  }

  if (days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }

  return `${days} dias`;
}

function calculateBMI(weightKg?: number, heightCm?: number): string | null {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
}

function classifyBMI(bmi: string): string {
  const value = parseFloat(bmi);
  if (value < 18.5) return 'Abaixo do peso';
  if (value < 25) return 'Peso normal';
  if (value < 30) return 'Sobrepeso';
  return 'Obesidade';
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function ProfileScreen({
  user,
  theme,
  onSetTheme,
  reminderIntervals,
  onSetReminderInterval,
  onLogout,
  onEditProfile,
}: ProfileScreenProps) {
  const { colorScheme } = useThemeContext();
  const colors = useThemeColors();
  const bmi = calculateBMI(user?.weightKg, user?.heightCm);
  const age = user?.birthDate ? calculateAge(user.birthDate) : null;
  const healthConnectStatus = getHealthConnectStatus();
  const [activeIntervalGrade, setActiveIntervalGrade] = useState<UspstfGrade | null>(null);

  const handleExportData = async () => {
    await requestDataExport();
    Alert.alert(
      'Exportar meus dados',
      'Em breve. Para solicitar seus dados agora, contate o suporte.',
    );
  };

  const handleHealthConnectPress = () => {
    Alert.alert(
      'App de Saúde do celular',
      'Em breve você poderá conectar o Apple Health ou Google Fit por aqui.',
    );
  };

  const healthItems = [
    { label: 'Peso', value: user?.weightKg ? `${user.weightKg} kg` : '—' },
    { label: 'Altura', value: user?.heightCm ? `${user.heightCm} cm` : '—' },
    { label: 'IMC', value: bmi ? `${bmi} · ${classifyBMI(bmi)}` : '—' },
    { label: 'Idade', value: age ? `${age} anos` : '—' },
    {
      label: 'Sexo',
      value: user?.gender === 'male' ? 'Masculino' : user?.gender === 'female' ? 'Feminino' : '—',
    },
    {
      label: 'Tabagismo',
      value: user?.isSmoker === true ? 'Sim' : user?.isSmoker === false ? 'Não' : '—',
    },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <Avatar name={user?.name} gender={user?.gender} photoUrl={user?.photoUrl} size="lg" />
          <Text className="mt-4 text-xl font-bold text-app-text dark:text-app-dark-text">
            {user?.name ?? '—'}
          </Text>
          <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {user?.email ?? ''}
          </Text>

          <Pressable
            accessibilityLabel="Editar perfil"
            accessibilityRole="button"
            onPress={onEditProfile}
            className="mt-4 flex-row items-center gap-2 rounded-full border border-app-primary bg-app-primarySoft px-5 py-2.5 dark:border-app-dark-primary dark:bg-app-dark-primarySoft"
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
          >
            <Ionicons color={colors.primary} name="create-outline" size={18} />
            <Text className="text-[14px] font-semibold text-app-primary dark:text-app-dark-primary">
              Editar perfil
            </Text>
          </Pressable>
        </View>

        <View className="mt-8">
          <Section title="Dados de saúde" subtitle="Informações do seu perfil.">
            <View className="rounded-card border border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface">
              {healthItems.map((item, index) => (
                <View
                  key={item.label}
                  className={[
                    'flex-row items-center justify-between px-4 py-3',
                    index < healthItems.length - 1
                      ? 'border-b border-app-border dark:border-app-dark-border'
                      : '',
                  ].join(' ')}
                >
                  <Text className="text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    {item.label}
                  </Text>
                  <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Aparência" subtitle="Escolha como o app deve ser exibido.">
            <View className="flex-row overflow-hidden rounded-app border border-app-border dark:border-app-dark-border">
              {THEME_OPTIONS.map((option) => {
                const isActive = theme === option.value;
                return (
                  <Pressable
                    key={option.value}
                    className={[
                      'flex-1 items-center py-3',
                      isActive
                        ? 'bg-app-primary dark:bg-app-dark-primary'
                        : 'bg-app-surface dark:bg-app-dark-surface',
                    ].join(' ')}
                    onPress={() => onSetTheme(option.value)}
                  >
                    <Text
                      className={[
                        'text-sm font-semibold',
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
          </Section>

          <Section
            title="Lembretes de prevenção"
            subtitle="Toque em um grau para escolher de quanto em quanto tempo repetir o lembrete."
          >
            <View className="overflow-hidden rounded-card border border-app-border dark:border-app-dark-border">
              {REMINDER_GRADE_ORDER.map((grade, index) => (
                <Pressable
                  key={grade}
                  accessibilityRole="button"
                  accessibilityLabel={`Intervalo de lembrete para grau ${grade}`}
                  onPress={() => setActiveIntervalGrade(grade)}
                  className={[
                    'flex-row items-center justify-between bg-app-surface px-4 py-4 dark:bg-app-dark-surface',
                    index < REMINDER_GRADE_ORDER.length - 1
                      ? 'border-b border-app-border dark:border-app-dark-border'
                      : '',
                  ].join(' ')}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text className="text-[15px] text-app-text dark:text-app-dark-text">
                    Grau {grade}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[15px] font-semibold text-app-primary dark:text-app-dark-primary">
                      {formatIntervalLabel(reminderIntervals[grade])}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.iconMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </Section>

          <BottomSheet
            visible={activeIntervalGrade !== null}
            title={activeIntervalGrade ? `Grau ${activeIntervalGrade}` : ''}
            description="Escolha de quanto em quanto tempo repetir o lembrete para este grau."
            onClose={() => setActiveIntervalGrade(null)}
          >
            {REMINDER_INTERVAL_OPTIONS.map((days) => {
              const isSelected =
                activeIntervalGrade !== null && reminderIntervals[activeIntervalGrade] === days;

              return (
                <Pressable
                  key={days}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    if (activeIntervalGrade !== null) {
                      onSetReminderInterval(activeIntervalGrade, days);
                    }
                    setActiveIntervalGrade(null);
                  }}
                  className={[
                    'flex-row items-center justify-between rounded-app px-4 py-3.5',
                    isSelected
                      ? 'bg-app-primarySoft dark:bg-app-dark-primarySoft'
                      : 'bg-app-surfaceMuted dark:bg-app-dark-surfaceMuted',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-[15px]',
                      isSelected
                        ? 'font-bold text-app-primary dark:text-app-dark-primary'
                        : 'text-app-text dark:text-app-dark-text',
                    ].join(' ')}
                  >
                    {formatIntervalLabel(days)}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </BottomSheet>

          <Section title="Configurações" subtitle="Gerencie seus dados e sessão.">
            <View className="mb-3 rounded-card border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface">
              <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
                Dispositivos conectados
              </Text>
              <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
                Conecte o app de Saúde do seu celular (Apple Health ou Google Fit) para o
                Assistente de IA usar esses dados nas respostas. Eles não são exibidos em
                nenhuma outra tela do app.
              </Text>

              <Pressable
                accessibilityLabel="App de Saúde do celular"
                accessibilityRole="button"
                className="mt-3 flex-row items-center justify-between rounded-app border border-app-border p-3 dark:border-app-dark-border"
                onPress={handleHealthConnectPress}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text className="text-[15px] text-app-text dark:text-app-dark-text">
                  App de Saúde do celular
                </Text>
                <View className="rounded-full bg-app-border px-3 py-1 dark:bg-app-dark-border">
                  <Text className="text-[13px] font-semibold text-app-textSecondary dark:text-app-dark-textSecondary">
                    {healthConnectStatus === 'unavailable' ? 'Indisponível' : 'Conectado'}
                  </Text>
                </View>
              </Pressable>
            </View>

            <Pressable
              className="mb-3 flex-row items-center justify-between rounded-app border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface"
              onPress={handleExportData}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-[15px] text-app-text dark:text-app-dark-text">
                Exportar meus dados
              </Text>
              <Ionicons color="#9CA3AF" name="chevron-forward" size={18} />
            </Pressable>

            <Pressable
              className="items-center rounded-app border border-app-danger bg-app-dangerSoft py-4 dark:border-app-dark-danger dark:bg-app-dark-dangerSoft"
              onPress={onLogout}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <Text className="text-[15px] font-semibold text-app-danger dark:text-app-dark-danger">
                Sair da conta
              </Text>
            </Pressable>
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/Avatar';
import { FilterChips } from '@/components/FilterChips';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import { useThemeContext, type ThemeMode } from '@/contexts/ThemeContext';
import type { UserProfile } from '@/contexts/UserContext';
import { REMINDER_LEAD_DAYS_OPTIONS } from '@/services/reminderService';

type ProfileScreenProps = {
  user: UserProfile | null;
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
  reminderLeadDays: number;
  onSetReminderLeadDays: (days: number) => void;
  onLogout: () => void;
  onEditProfile: () => void;
};

function formatLeadDaysLabel(days: number): string {
  return `${days} dia${days === 1 ? '' : 's'}`;
}

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'Claro', value: 'light' },
  { label: 'Automático', value: 'system' },
  { label: 'Escuro', value: 'dark' },
];

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
  reminderLeadDays,
  onSetReminderLeadDays,
  onLogout,
  onEditProfile,
}: ProfileScreenProps) {
  const { colorScheme } = useThemeContext();
  const colors = useThemeColors();
  const bmi = calculateBMI(user?.weightKg, user?.heightCm);
  const age = user?.birthDate ? calculateAge(user.birthDate) : null;

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
            subtitle="Com quantos dias de antecedência avisar sobre um exame recomendado."
          >
            <FilterChips
              options={REMINDER_LEAD_DAYS_OPTIONS.map(formatLeadDaysLabel)}
              activeFilter={formatLeadDaysLabel(reminderLeadDays)}
              onFilterChange={(label) => {
                const match = REMINDER_LEAD_DAYS_OPTIONS.find(
                  (days) => formatLeadDaysLabel(days) === label,
                );
                if (match !== undefined) {
                  onSetReminderLeadDays(match);
                }
              }}
            />
          </Section>

          <Section title="Conta" subtitle="Gerencie seus dados e sessão.">
            <Pressable
              className="mb-3 flex-row items-center justify-between rounded-app border border-app-border bg-app-surface px-4 py-4 dark:border-app-dark-border dark:bg-app-dark-surface"
              onPress={() => Alert.alert('Exportar dados', 'Em desenvolvimento.')}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-[15px] text-app-text dark:text-app-dark-text">Exportar dados</Text>
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

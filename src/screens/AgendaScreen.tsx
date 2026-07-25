import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';

import { AppointmentCard } from '@/components/AppointmentCard';
import { CalendarPicker } from '@/components/CalendarPicker';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type { AppointmentEntry, CalendarDateItem } from '@/types/models';

type AgendaScreenProps = {
  dates: CalendarDateItem[];
  selectedDate: number;
  appointments: AppointmentEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onDateSelect: (date: number) => void;
};

export function AgendaScreen({
  dates,
  selectedDate,
  appointments,
  isLoading,
  errorMessage,
  onRetry,
  onDateSelect,
}: AgendaScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-6 pb-12" showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Não foi possível carregar a agenda"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader
                title="Agenda & Consultas"
                subtitle="Seus compromissos de saúde, com espaço para sincronização futura."
                action={
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-full bg-app-primary dark:bg-app-dark-primary"
                    style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                    onPress={() => {}}
                  >
                    <Ionicons name="add" size={24} color={colors.onPrimary} />
                  </Pressable>
                }
              />

              <CalendarPicker selectedDate={selectedDate} onDateSelect={onDateSelect} dates={dates} />

              <Section title="Próximos compromissos" subtitle="Agenda filtrada pelo dia selecionado.">
                {appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      time={appointment.time}
                      title={appointment.title}
                      location={appointment.location}
                      type={appointment.type}
                      onPress={() => {}}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="calendar-outline"
                    title="Nenhum compromisso neste dia"
                    description="Escolha outra data ou cadastre um novo atendimento."
                  />
                )}
              </Section>

              <Pressable
                className="flex-row items-center rounded-app border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface"
                style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                onPress={() => {}}
              >
                <Ionicons className="mr-4" name="calendar-outline" size={24} color={colors.secondary} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">
                    Sincronizar com Google Calendar
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Exporte seus compromissos automaticamente
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

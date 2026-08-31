import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';

import { AppointmentCard } from '@/components/AppointmentCard';
import { CalendarPicker } from '@/components/CalendarPicker';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useThemeColors } from '@/constants/theme';
import type { AppointmentEntry, CalendarDateItem } from '@/types/models';

type AgendaScreenProps = {
  dates: CalendarDateItem[];
  selectedDate: number;
  selectedDayLabel: string;
  appointments: AppointmentEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onDateSelect: (date: number) => void;
};

export function AgendaScreen({
  dates,
  selectedDate,
  selectedDayLabel,
  appointments,
  isLoading,
  errorMessage,
  onRetry,
  onDateSelect,
}: AgendaScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();

  const buildGoogleCalendarUrl = (appointment: AppointmentEntry) => {
    const [datePart, timePart] = appointment.time.split(' • ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hour = 0, minute = 0] = (timePart ?? '00:00').split(':').map(Number);
    const start = new Date(year, (month || 1) - 1, day || 1, hour, minute);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formatGoogleDate = (date: Date) => {
      const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return utcDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    };

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', appointment.title);
    url.searchParams.set('details', `${appointment.title}${appointment.location ? `\nLocal: ${appointment.location}` : ''}`);
    url.searchParams.set('location', appointment.location || 'Agenda da aplicação');
    url.searchParams.set('dates', `${formatGoogleDate(start)}/${formatGoogleDate(end)}`);

    return url.toString();
  };

  const handleGoogleCalendarSync = async (appointment: AppointmentEntry) => {
    try {
      await Linking.openURL(buildGoogleCalendarUrl(appointment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o Google Calendar.';
      alert(message);
    }
  };

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
                title="Agenda"
                subtitle="Seus compromissos de saúde"
                action={
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-full bg-app-primary dark:bg-app-dark-primary"
                    style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                    onPress={() => router.push('/add-appointment')}
                  >
                    <Ionicons name="add" size={24} color={colors.onPrimary} />
                  </Pressable>
                }
              />

              <CalendarPicker selectedDate={selectedDate} onDateSelect={onDateSelect} dates={dates} />

              <Text className="mb-3 mt-4 text-[18px] font-semibold text-app-text dark:text-app-dark-text">
                {selectedDayLabel}
              </Text>

              {appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    time={appointment.time}
                    title={appointment.title}
                    location={appointment.location}
                    type={appointment.type}
                    onPress={() => router.push(`/edit-appointment?id=${encodeURIComponent(String(appointment.id))}`)}
                    onSyncPress={() => handleGoogleCalendarSync(appointment)}
                  />
                ))
              ) : (
                <EmptyState
                  actionLabel="Agendar consulta"
                  description="Escolha outra data ou cadastre um novo atendimento."
                  icon="calendar-outline"
                  onActionPress={() => router.push('/add-appointment')}
                  title="Nenhum compromisso neste dia"
                />
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

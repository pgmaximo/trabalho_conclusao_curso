import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
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
import { getGoogleCalendarSyncComingSoon } from '@/services/googleCalendarSync';
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
  const [syncNoticeVisible, setSyncNoticeVisible] = useState(false);
  const syncNotice = getGoogleCalendarSyncComingSoon();

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

              <Pressable
                accessibilityRole="button"
                className="mb-4 h-12 flex-row items-center rounded-app border border-app-border bg-app-surface px-4 dark:border-app-dark-border dark:bg-app-dark-surface"
                style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                onPress={() => setSyncNoticeVisible(true)}
              >
                <Ionicons className="mr-3" name="calendar-outline" size={20} color={colors.secondary} />
                <Text className="flex-1 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
                  Sincronizar com Google Agenda
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>

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

      <Modal
        animationType="fade"
        onRequestClose={() => setSyncNoticeVisible(false)}
        transparent
        visible={syncNoticeVisible}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-app-overlay p-6 dark:bg-app-dark-overlay"
          onPress={() => setSyncNoticeVisible(false)}
        >
          <Pressable
            className="w-full max-w-[340px] rounded-2xl bg-app-surface p-6 dark:bg-app-dark-surface"
            onPress={(event) => event.stopPropagation()}
          >
            <Ionicons color={colors.secondary} name="calendar-outline" size={28} />
            <Text className="mt-3 text-[18px] font-bold text-app-text dark:text-app-dark-text">
              {syncNotice.title}
            </Text>
            <Text className="mt-2 text-[15px] leading-[21px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {syncNotice.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-5 h-12 items-center justify-center rounded-app bg-app-primary dark:bg-app-dark-primary"
              onPress={() => setSyncNoticeVisible(false)}
            >
              <Text className="text-[15px] font-semibold text-white">Entendi</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

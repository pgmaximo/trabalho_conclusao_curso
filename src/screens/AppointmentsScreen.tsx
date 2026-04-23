import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppointmentCard } from '@/components/AppointmentCard';
import { CalendarPicker } from '@/components/CalendarPicker';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import type { AppointmentEntry, CalendarDateItem } from '@/types/models';

type AppointmentsScreenProps = {
  dates: CalendarDateItem[];
  selectedDate: number;
  appointments: AppointmentEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onDateSelect: (date: number) => void;
};

export function AppointmentsScreen({
  dates,
  selectedDate,
  appointments,
  isLoading,
  errorMessage,
  onRetry,
  onDateSelect,
}: AppointmentsScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="📆"
              title="Nao foi possivel carregar a agenda"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader
                title="Agenda & Consultas"
                subtitle="Seus compromissos de saude, com espaco para sincronizacao futura."
                action={
                  <Pressable
                    style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                    onPress={() => {}}
                  >
                    <Text style={styles.addButtonText}>+</Text>
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
                    icon="🗓️"
                    title="Nenhum compromisso neste dia"
                    description="Escolha outra data ou cadastre um novo atendimento."
                  />
                )}
              </Section>

              <Pressable
                style={({ pressed }) => [
                  styles.googleSyncButton,
                  pressed && styles.googleSyncButtonPressed,
                ]}
                onPress={() => {}}
              >
                <Text style={styles.googleSyncIcon}>📅</Text>
                <View style={styles.googleSyncContent}>
                  <Text style={styles.googleSyncTitle}>Sincronizar com Google Calendar</Text>
                  <Text style={styles.googleSyncSubtitle}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.large * 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  googleSyncButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.base,
    alignItems: 'center',
  },
  googleSyncButtonPressed: {
    opacity: 0.85,
  },
  googleSyncIcon: {
    fontSize: 24,
    marginRight: SIZES.base,
  },
  googleSyncContent: {
    flex: 1,
  },
  googleSyncTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  googleSyncSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
});

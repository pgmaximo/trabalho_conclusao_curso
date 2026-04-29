import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppointmentCard } from '@/components/AppointmentCard';
import { CalendarPicker } from '@/components/CalendarPicker';
import { BottomTabBar } from '@/components/BottomTabBar';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

const TAB_ITEMS = [
  { icon: '🏠', label: 'Início', id: 'home' },
  { icon: '📋', label: 'Exames', id: 'exams' },
  { icon: '🧠', label: 'IA', id: 'ai' },
  { icon: '⌚', label: 'Watch', id: 'watch' },
  { icon: '👤', label: 'Perfil', id: 'profile' },
];

const CALENDAR_DATES = [
  { day: 22, month: 'abr', hasAppointments: true },
  { day: 23, month: 'abr', hasAppointments: false },
  { day: 24, month: 'abr', hasAppointments: true },
  { day: 25, month: 'abr', hasAppointments: true },
  { day: 26, month: 'abr', hasAppointments: true },
  { day: 27, month: 'abr', hasAppointments: false },
  { day: 28, month: 'abr', hasAppointments: true },
];

const APPOINTMENTS_DATA = {
  25: [
    {
      id: 1,
      time: 'Amanhã - 10h00',
      title: 'Cardiologia — Dr. Gomes',
      location: 'Clínica IMT — Av. Principal, 100',
      type: 'consulta' as const,
    },
    {
      id: 2,
      time: '30 mar - 07h30',
      title: 'Coleta de sangue',
      location: 'Lab Central — Jejum obrigatório',
      type: 'exame' as const,
    },
    {
      id: 3,
      time: '25 abr - 14h00',
      title: 'Retorno Clínico Geral',
      location: 'UBS Central — Dra. Aparecida',
      type: 'retorno' as const,
    },
    {
      id: 4,
      time: '10 abr - 03h00',
      title: 'Dermatologista',
      location: 'Clínica SkinCare',
      type: 'consulta' as const,
    },
  ],
};

export function AppointmentsScreen({
  onTabPress,
}: {
  onTabPress?: (tabId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(25);

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    onTabPress?.(tabId);
  };

  const appointments = APPOINTMENTS_DATA[selectedDate as keyof typeof APPOINTMENTS_DATA] || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>Agenda & Consultas</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.addButtonPressed,
                ]}
                onPress={() => {}}
              >
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>Seus compromissos de saúde</Text>
          </View>

          {/* Calendar Picker */}
          <CalendarPicker
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dates={CALENDAR_DATES}
          />

          {/* Appointments Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximos compromissos</Text>
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhum compromisso neste dia
                </Text>
              </View>
            )}
          </View>

          {/* Add Appointment Button */}
          <Pressable
            style={({ pressed }) => [
              styles.addAppointmentButton,
              pressed && styles.addAppointmentButtonPressed,
            ]}
            onPress={() => {}}
          >
            <Text style={styles.addAppointmentButtonText}>
              + Agendar nova consulta
            </Text>
          </Pressable>

          {/* Google Calendar Sync */}
          <Pressable
            style={({ pressed }) => [
              styles.googleSyncButton,
              pressed && styles.googleSyncButtonPressed,
            ]}
            onPress={() => {}}
          >
            <Text style={styles.googleSyncIcon}>📅</Text>
            <View style={styles.googleSyncContent}>
              <Text style={styles.googleSyncTitle}>
                Sincronizar com Google Calendar
              </Text>
              <Text style={styles.googleSyncSubtitle}>
                Exporte seus compromissos automaticamente
              </Text>
            </View>
          </Pressable>
        </ScrollView>

        <BottomTabBar
          items={TAB_ITEMS}
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
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
    paddingTop: SIZES.large,
    paddingBottom: SIZES.large * 2,
  },
  header: {
    paddingHorizontal: SIZES.large,
    marginBottom: SIZES.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.small,
  },
  title: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
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
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  section: {
    paddingHorizontal: SIZES.large,
    marginTop: SIZES.base,
    marginBottom: SIZES.base,
  },
  sectionTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.base,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.large,
  },
  emptyStateText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  addAppointmentButton: {
    marginHorizontal: SIZES.large,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base,
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  addAppointmentButtonPressed: {
    opacity: 0.85,
  },
  addAppointmentButtonText: {
    ...FONTS.body,
    color: '#fff',
    fontWeight: '600',
  },
  googleSyncButton: {
    marginHorizontal: SIZES.large,
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
    fontSize: 12,
  },
});

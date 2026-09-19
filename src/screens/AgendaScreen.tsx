import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';

import { AgendaPeriodHeader } from '@/components/AgendaPeriodHeader';
import { AgendaScopeSelector } from '@/components/AgendaScopeSelector';
import { AppointmentCard } from '@/components/AppointmentCard';
import { CalendarPicker } from '@/components/CalendarPicker';
import { EmptyState } from '@/components/EmptyState';
import { MonthCalendarGrid } from '@/components/MonthCalendarGrid';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { YearMonthsGrid } from '@/components/YearMonthsGrid';
import { useThemeColors } from '@/constants/theme';
import type { AgendaNavigation } from '@/hooks/useAgendaNavigation';
import {
  buildDayCells,
  buildMonthCells,
  buildWeekCells,
  buildYearCells,
  compareScheduled,
  isPast,
  isWithinRange,
  parseScheduledAt,
  toIsoDate,
  type AgendaScope,
} from '@/services/agendaDateRange';
import type { AppointmentEntry } from '@/types/models';

type AgendaScreenProps = {
  appointments: AppointmentEntry[];
  navigation: AgendaNavigation;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

const EMPTY_TITLE_BY_SCOPE: Record<AgendaScope, string> = {
  dia: 'Nenhum compromisso neste dia',
  semana: 'Nenhum compromisso nesta semana',
  mes: 'Nenhum compromisso neste mês',
  ano: 'Nenhum compromisso neste ano',
};

// Datas invalidas vao SEMPRE para o fim, em qualquer direcao — sao registros
// corrompidos que precisam ser alcancaveis para poderem ser excluidos.
function sortEntries(entries: AppointmentEntry[], direction: 'asc' | 'desc'): AppointmentEntry[] {
  const valid = entries.filter((entry) => parseScheduledAt(entry.scheduledAt) !== null);
  const invalid = entries.filter((entry) => parseScheduledAt(entry.scheduledAt) === null);

  valid.sort((a, b) => {
    const result = compareScheduled(a.scheduledAt, b.scheduledAt);
    return direction === 'asc' ? result : -result;
  });

  return [...valid, ...invalid];
}

function formatDateLabel(scheduledAt: string): string {
  const date = parseScheduledAt(scheduledAt);
  if (!date) return 'Data inválida';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function AgendaScreen({ appointments, navigation, isLoading, errorMessage, onRetry }: AgendaScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();

  const buildGoogleCalendarUrl = (appointment: AppointmentEntry) => {
    const scheduledAt = appointment.scheduledAt ? new Date(appointment.scheduledAt) : null;

    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      throw new Error('Data inválida para sincronização com o Google Calendar.');
    }

    const start = new Date(scheduledAt.getTime());
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formatGoogleDate = (date: Date) => {
      const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return utcDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    };

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', appointment.title);
    const details = [
      appointment.title,
      appointment.location ? `Local: ${appointment.location}` : null,
      appointment.observations ? `Observações: ${appointment.observations}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    url.searchParams.set('details', details);
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

  const scheduledAtList = useMemo(
    () => appointments.map((appointment) => appointment.scheduledAt),
    [appointments],
  );

  const visibleAppointments = useMemo(() => {
    const now = new Date();

    if (navigation.listOverride === 'historico') {
      // `!== false` inclui os passados (true) E os de data invalida (null).
      return sortEntries(appointments.filter((a) => isPast(a.scheduledAt, now) !== false), 'desc');
    }

    if (navigation.listOverride === 'proximos') {
      return sortEntries(appointments.filter((a) => isPast(a.scheduledAt, now) === false), 'asc');
    }

    return sortEntries(appointments.filter((a) => isWithinRange(a.scheduledAt, navigation.range)), 'asc');
  }, [appointments, navigation.listOverride, navigation.range]);

  const selectedIsoDate = toIsoDate(navigation.anchorDate);
  const showCardDate = navigation.scope !== 'dia' || navigation.listOverride !== null;

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

              <AgendaScopeSelector value={navigation.scope} onChange={navigation.setScope} />

              <AgendaPeriodHeader
                canGoToToday={navigation.canGoToToday}
                label={navigation.periodLabel}
                navigationDisabled={navigation.listOverride !== null}
                onNext={navigation.goNext}
                onPrevious={navigation.goPrevious}
                onToday={navigation.goToToday}
              />

              {navigation.scope === 'dia' ? (
                <CalendarPicker
                  dates={buildDayCells(navigation.anchorDate, scheduledAtList, navigation.today)}
                  onDateSelect={navigation.selectDate}
                  selectedDate={selectedIsoDate}
                />
              ) : null}

              {navigation.scope === 'semana' ? (
                <CalendarPicker
                  dates={buildWeekCells(navigation.anchorDate, scheduledAtList, navigation.today)}
                  onDateSelect={navigation.drillDown}
                  selectedDate={selectedIsoDate}
                />
              ) : null}

              {navigation.scope === 'mes' ? (
                <MonthCalendarGrid
                  onSelectDate={navigation.drillDown}
                  selectedIsoDate={selectedIsoDate}
                  weeks={buildMonthCells(navigation.anchorDate, scheduledAtList, navigation.today)}
                />
              ) : null}

              {navigation.scope === 'ano' ? (
                <YearMonthsGrid
                  cells={buildYearCells(navigation.anchorDate, scheduledAtList)}
                  onSelectMonth={navigation.drillDown}
                />
              ) : null}

              <View className="mb-3 flex-row gap-2">
                {(['proximos', 'historico'] as const).map((override) => {
                  const isActive = navigation.listOverride === override;
                  const label = override === 'proximos' ? 'Próximos' : 'Histórico';
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      className={`h-10 flex-row items-center justify-center gap-1 rounded-full border px-4 ${
                        isActive
                          ? 'border-app-secondary bg-app-secondarySoft dark:border-app-dark-secondary dark:bg-app-dark-secondarySoft'
                          : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface'
                      }`}
                      key={override}
                      onPress={() => navigation.setListOverride(isActive ? null : override)}
                      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                    >
                      <Text
                        className={`text-[14px] font-semibold ${
                          isActive
                            ? 'text-app-info dark:text-app-dark-info'
                            : 'text-app-textSecondary dark:text-app-dark-textSecondary'
                        }`}
                      >
                        {label}
                      </Text>
                      {isActive ? <Ionicons color={colors.info} name="close" size={14} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              {visibleAppointments.length > 0 ? (
                visibleAppointments.map((appointment) => (
                  <AppointmentCard
                    dateLabel={showCardDate ? formatDateLabel(appointment.scheduledAt) : undefined}
                    key={appointment.id}
                    location={appointment.location}
                    onPress={() =>
                      router.push(`/edit-appointment?id=${encodeURIComponent(String(appointment.id))}`)
                    }
                    onSyncPress={() => handleGoogleCalendarSync(appointment)}
                    time={appointment.time}
                    title={appointment.title}
                    type={appointment.type}
                  />
                ))
              ) : (
                <EmptyState
                  actionLabel="Agendar consulta"
                  description="Escolha outro período ou cadastre um novo atendimento."
                  icon="calendar-outline"
                  onActionPress={() => router.push('/add-appointment')}
                  title={
                    navigation.listOverride === 'historico'
                      ? 'Nenhum compromisso no histórico'
                      : navigation.listOverride === 'proximos'
                        ? 'Nenhum compromisso futuro'
                        : EMPTY_TITLE_BY_SCOPE[navigation.scope]
                  }
                />
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

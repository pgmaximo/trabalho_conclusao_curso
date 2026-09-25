import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';

import { AgendaMonthLayer } from '@/components/AgendaMonthLayer';
import { AppointmentCard } from '@/components/AppointmentCard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useThemeColors } from '@/constants/theme';
import { parseScheduledAt } from '@/services/agendaDateRange';
import {
  buildTimelineRows,
  findTodayRowIndex,
  type TimelineRow,
} from '@/services/agendaTimeline';
import type { AppointmentEntry } from '@/types/models';
import { buildGoogleCalendarUrl } from '@/utils/googleCalendar';

type AgendaScreenProps = {
  appointments: AppointmentEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

type Row = TimelineRow<AppointmentEntry>;

// Referencia estavel: a FlatList reclama em tempo de execucao se a config de
// viewability muda entre renders.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

function formatCardTime(scheduledAt: string): string {
  const date = parseScheduledAt(scheduledAt);
  if (!date) return '--:--';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function AgendaScreen({ appointments, isLoading, errorMessage, onRetry }: AgendaScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const listRef = useRef<FlatList<Row>>(null);
  const [todayVisible, setTodayVisible] = useState(true);
  const [monthLayerOpen, setMonthLayerOpen] = useState(false);

  const handleGoogleCalendarSync = async (appointment: AppointmentEntry) => {
    try {
      await Linking.openURL(buildGoogleCalendarUrl(appointment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o Google Calendar.';
      alert(message);
    }
  };

  // `new Date()` no corpo do memo, e nao em dependencia: a lista e reconstruida
  // quando os compromissos mudam, nao a cada tique do relogio.
  const rows = useMemo(() => buildTimelineRows(appointments, new Date()), [appointments]);
  const todayIndex = useMemo(() => findTodayRowIndex(rows), [rows]);

  // `todayIndexRef` e declarado ANTES do callback que o le: a FlatList exige que
  // `onViewableItemsChanged` seja uma referencia estavel, entao ele nao pode
  // depender de `todayIndex` por closure — leria um valor congelado na primeira
  // renderizacao. O ref e a ponte entre os dois.
  const todayIndexRef = useRef(todayIndex);
  todayIndexRef.current = todayIndex;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    setTodayVisible(viewableItems.some((item) => item.index === todayIndexRef.current));
  }).current;

  const scrollToToday = useCallback((animated: boolean) => {
    if (todayIndexRef.current >= 0) {
      listRef.current?.scrollToIndex({ index: todayIndexRef.current, animated });
    }
  }, []);

  // A ancoragem em hoje e feita aqui, e nao via `initialScrollIndex`: com
  // `initialScrollIndex` positivo a FlatList so cria as celulas a partir dele
  // pra frente (medido lendo o `VirtualizedList` — `_initialRenderRegion` fixa
  // `first` no indice de ancoragem), entao os compromissos passados nunca
  // chegam a existir na arvore antes de o usuario rolar pra cima. Rolando
  // imperativamente depois do primeiro layout, a lista nasce com TODAS as
  // linhas montadas (`initialNumToRender={rows.length}`, abaixo) e so entao
  // pula visualmente para hoje.
  const hasScrolledToToday = useRef(false);
  const handleLayout = useCallback(() => {
    if (!hasScrolledToToday.current) {
      hasScrolledToToday.current = true;
      scrollToToday(false);
    }
  }, [scrollToToday]);

  useEffect(() => {
    hasScrolledToToday.current = false;
  }, [rows]);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header') {
        return (
          <View accessibilityRole="header" style={{ paddingTop: 16, paddingBottom: 8 }}>
            <Text
              className={`text-[15px] font-semibold ${
                item.isToday
                  ? 'text-app-primaryDark dark:text-app-dark-primaryDark'
                  : 'text-app-textSecondary dark:text-app-dark-textSecondary'
              }`}
            >
              {item.label}
            </Text>
          </View>
        );
      }

      if (item.kind === 'todayEmpty') {
        return (
          <View style={{ paddingVertical: 12 }}>
            <Text className="text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Nada marcado para hoje.
            </Text>
          </View>
        );
      }

      if (item.kind === 'futureEmpty') {
        return (
          <View style={{ paddingVertical: 12 }}>
            <Text className="mb-3 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Nada marcado daqui para frente.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-app bg-app-primary dark:bg-app-dark-primary"
              onPress={() => router.push('/add-appointment')}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <Text className="text-[15px] font-semibold text-white">Agendar consulta</Text>
            </Pressable>
          </View>
        );
      }

      return (
        <View style={{ opacity: item.isPast ? 0.6 : 1 }}>
          <AppointmentCard
            location={item.appointment.location}
            onPress={() =>
              router.push(`/edit-appointment?id=${encodeURIComponent(String(item.appointment.id))}`)
            }
            onSyncPress={() => handleGoogleCalendarSync(item.appointment)}
            time={formatCardTime(item.appointment.scheduledAt)}
            title={item.appointment.title}
            type={item.appointment.type}
          />
        </View>
      );
    },
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1 px-6 pt-6">
        <ScreenHeader
          title="Agenda"
          subtitle="Seus compromissos de saúde"
          action={
            <View className="flex-row gap-2">
              <Pressable
                accessibilityLabel="Ver o mês"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-app border border-app-border dark:border-app-dark-border"
                onPress={() => setMonthLayerOpen(true)}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Ionicons color={colors.text} name="calendar-outline" size={20} />
              </Pressable>
              <Pressable
                accessibilityLabel="Agendar consulta"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-full bg-app-primary dark:bg-app-dark-primary"
                onPress={() => router.push('/add-appointment')}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <Ionicons color={colors.onPrimary} name="add" size={24} />
              </Pressable>
            </View>
          }
        />

        {isLoading ? (
          <ScreenSkeleton blocks={3} />
        ) : errorMessage ? (
          <EmptyState
            actionLabel="Tentar novamente"
            description={errorMessage}
            icon="alert-circle-outline"
            onActionPress={onRetry}
            title="Não foi possível carregar a agenda"
            tone="error"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            actionLabel="Agendar consulta"
            description="Quando você agendar uma consulta ou exame, ela aparecerá aqui."
            icon="calendar-outline"
            onActionPress={() => router.push('/add-appointment')}
            title="Você ainda não tem compromissos"
          />
        ) : (
          <>
            <FlatList
              contentContainerStyle={{ paddingBottom: 48 }}
              data={rows}
              initialNumToRender={rows.length}
              keyExtractor={(item) => item.key}
              onLayout={handleLayout}
              onScrollToIndexFailed={({ index }) => {
                // Sem `getItemLayout`, a lista pode ainda nao ter medido a linha
                // alvo na primeira tentativa. Reagenda uma vez, depois desiste —
                // a pilula "Hoje" continua disponivel como saida manual.
                requestAnimationFrame(() => {
                  listRef.current?.scrollToIndex({ index, animated: false });
                });
              }}
              onViewableItemsChanged={onViewableItemsChanged}
              ref={listRef}
              renderItem={renderRow}
              showsVerticalScrollIndicator={false}
              viewabilityConfig={VIEWABILITY_CONFIG}
            />

            {!todayVisible ? (
              <Pressable
                accessibilityLabel="Voltar para hoje"
                accessibilityRole="button"
                className="absolute bottom-6 self-center h-11 items-center justify-center rounded-full bg-app-primary px-5 dark:bg-app-dark-primary"
                onPress={() => scrollToToday(true)}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <Text className="text-[15px] font-semibold text-white">Hoje</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <AgendaMonthLayer
        appointments={appointments}
        onClose={() => setMonthLayerOpen(false)}
        onSelectAppointment={(id) => {
          setMonthLayerOpen(false);
          router.push(`/edit-appointment?id=${encodeURIComponent(id)}`);
        }}
        visible={monthLayerOpen}
      />
    </SafeAreaView>
  );
}

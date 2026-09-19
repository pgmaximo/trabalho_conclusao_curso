// =============================================================================
// Arquivo: AgendaMonthLayer.tsx
// Descricao: Camada de mes da Agenda — autossuficiente
// =============================================================================
//
// Autossuficiente de proposito: grade do mes MAIS os compromissos daquele mes,
// dentro da propria camada. Uma versao anterior do desenho fazia o toque num dia
// rolar a lista principal; foi descartada porque exige coordenar a posicao de
// rolagem de uma lista com uma camada sobreposta, e nao tem resposta boa quando
// o dia tocado esta vazio.
//
// =============================================================================

import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppointmentCard } from '@/components/AppointmentCard';
import { MonthCalendarGrid } from '@/components/MonthCalendarGrid';
import { useThemeColors } from '@/constants/theme';
import {
  buildMonthCells,
  buildRange,
  compareScheduled,
  formatPeriodLabel,
  isWithinRange,
  parseScheduledAt,
  shiftAnchor,
  toIsoDate,
} from '@/services/agendaDateRange';
import type { AppointmentEntry } from '@/types/models';

type AgendaMonthLayerProps = {
  visible: boolean;
  appointments: AppointmentEntry[];
  onClose: () => void;
  onSelectAppointment: (id: string) => void;
};

function formatCardTime(scheduledAt: string): string {
  const date = parseScheduledAt(scheduledAt);
  if (!date) return '--:--';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function AgendaMonthLayer({
  visible,
  appointments,
  onClose,
  onSelectAppointment,
}: AgendaMonthLayerProps) {
  const colors = useThemeColors();
  const [today] = useState(() => new Date());
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedIsoDate, setSelectedIsoDate] = useState(() => toIsoDate(new Date()));

  const scheduledAtList = useMemo(
    () => appointments.map((appointment) => appointment.scheduledAt),
    [appointments],
  );

  const weeks = useMemo(
    () => buildMonthCells(anchor, scheduledAtList, today),
    [anchor, scheduledAtList, today],
  );

  const doMes = useMemo(() => {
    const range = buildRange('mes', anchor);
    return appointments
      .filter((appointment) => isWithinRange(appointment.scheduledAt, range))
      .sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt));
  }, [appointments, anchor]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent={false} visible={visible}>
      <View className="flex-1 bg-app-background px-6 pt-12 dark:bg-app-dark-background">
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Mês anterior"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center"
            onPress={() => setAnchor((current) => shiftAnchor('mes', current, -1))}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons color={colors.text} name="chevron-back" size={24} />
          </Pressable>

          <Text className="text-[18px] font-semibold text-app-text dark:text-app-dark-text">
            {formatPeriodLabel('mes', anchor, today)}
          </Text>

          <Pressable
            accessibilityLabel="Próximo mês"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center"
            onPress={() => setAnchor((current) => shiftAnchor('mes', current, 1))}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons color={colors.text} name="chevron-forward" size={24} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <MonthCalendarGrid
            onSelectDate={setSelectedIsoDate}
            selectedIsoDate={selectedIsoDate}
            weeks={weeks}
          />

          {doMes.length > 0 ? (
            doMes.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                location={appointment.location}
                onPress={() => onSelectAppointment(String(appointment.id))}
                time={formatCardTime(appointment.scheduledAt)}
                title={appointment.title}
                type={appointment.type}
              />
            ))
          ) : (
            <Text className="py-6 text-center text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Nenhum compromisso neste mês.
            </Text>
          )}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          className="my-4 h-12 items-center justify-center rounded-app border border-app-border dark:border-app-dark-border"
          onPress={onClose}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">Fechar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

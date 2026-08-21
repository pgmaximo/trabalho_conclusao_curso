import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyState } from '@/components/EmptyState';
import { QuickAccessButton } from '@/components/QuickAccessButton';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type { AppointmentEntry, AppointmentType, MedicalDocument } from '@/types/models';

// DECISION (specs/02-perfil-home-agenda/home/spec.md §5): "Prevenção em atraso"
// depende de uma fonte real que ainda nao existe (EPIC de Prevencao, Bloco 3) —
// esta tela apenas consome quando/se essa fonte existir, nunca decide o que
// conta como "atrasado". Prop opcional, sempre ausente por ora.
type PreventionAlert = {
  title: string;
  subtitle: string;
};

type HomeScreenProps = {
  greeting: string;
  todayLabel: string;
  todaySummaryText: string;
  preventionAlert?: PreventionAlert | null;
  recentExams: MedicalDocument[];
  examsLoading: boolean;
  examsError: string | null;
  onRetryExams: () => void;
  upcomingAppointments: AppointmentEntry[];
  appointmentsLoading: boolean;
  appointmentsError: string | null;
  onRetryAppointments: () => void;
  onNavigateToExamDetail: (id: string) => void;
  onNavigateToExams: () => void;
  onNavigateToAppointments?: () => void;
  onNavigateToAi?: () => void;
  onNavigateToMedicines?: () => void;
  onNavigateToPrevention?: () => void;
  onNotificationPress?: () => void;
};

const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  consulta: 'Consulta',
  exame: 'Exame',
  cirurgia: 'Cirurgia',
};

export function HomeScreen({
  greeting,
  todayLabel,
  todaySummaryText,
  preventionAlert,
  recentExams,
  examsLoading,
  examsError,
  onRetryExams,
  upcomingAppointments,
  appointmentsLoading,
  appointmentsError,
  onRetryAppointments,
  onNavigateToExamDetail,
  onNavigateToExams,
  onNavigateToAppointments,
  onNavigateToAi,
  onNavigateToMedicines,
  onNavigateToPrevention,
  onNotificationPress,
}: HomeScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-app-text dark:text-app-dark-text">
              {greeting}
            </Text>
            <Text className="mt-1 text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {todayLabel}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Notificações"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-app border border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface"
            onPress={onNotificationPress}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Ionicons color={colors.textSecondary} name="notifications-outline" size={18} />
          </Pressable>
        </View>

        <TodaySummaryCard text={todaySummaryText} onPress={onNavigateToAppointments} />

        {preventionAlert ? (
          <PreventionAlertCard alert={preventionAlert} onPress={onNavigateToAppointments} />
        ) : null}

        <Section
          action={<SectionLink label="Ver todos" onPress={onNavigateToExams} />}
          title="Últimos exames"
        >
          {examsLoading ? (
            <ScreenSkeleton blocks={2} />
          ) : examsError ? (
            <EmptyState
              actionLabel="Tentar novamente"
              description={examsError}
              icon="alert-circle-outline"
              onActionPress={onRetryExams}
              title="Não foi possível carregar seus exames"
              tone="error"
            />
          ) : recentExams.length > 0 ? (
            recentExams.map((exam) => (
              <Pressable
                key={exam.id}
                className="mb-3 flex-row items-center gap-3 rounded-card border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface"
                onPress={() => onNavigateToExamDetail(exam.id)}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Ionicons color={colors.primary} name="document-text-outline" size={22} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">
                    {exam.title}
                  </Text>
                  <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    {exam.subtitle}
                  </Text>
                </View>
                <Ionicons color={colors.iconMuted} name="chevron-forward" size={18} />
              </Pressable>
            ))
          ) : (
            <EmptyState
              description="Seus exames aparecerão aqui após o upload."
              icon="document-text-outline"
              title="Nenhum exame enviado"
            />
          )}
        </Section>

        <Section
          action={<SectionLink label="Ver agenda" onPress={onNavigateToAppointments} />}
          title="Próximos compromissos"
        >
          {appointmentsLoading ? (
            <ScreenSkeleton blocks={2} />
          ) : appointmentsError ? (
            <EmptyState
              actionLabel="Tentar novamente"
              description={appointmentsError}
              icon="alert-circle-outline"
              onActionPress={onRetryAppointments}
              title="Não foi possível carregar sua agenda"
              tone="error"
            />
          ) : upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => (
              <UpcomingAppointmentCard
                appointment={appointment}
                key={appointment.id}
                onPress={onNavigateToAppointments}
              />
            ))
          ) : (
            <EmptyState
              actionLabel={onNavigateToAppointments ? 'Agendar consulta' : undefined}
              description="Quando você agendar uma consulta ou exame, ela aparecerá aqui."
              icon="calendar-outline"
              onActionPress={onNavigateToAppointments}
              title="Nenhum compromisso agendado"
            />
          )}
        </Section>

        <Section title="Acesso rápido">
          <View className="flex-row justify-between">
            <QuickAccessButton
              icon="calendar-outline"
              label="Agenda"
              onPress={onNavigateToAppointments ?? (() => {})}
            />
            <QuickAccessButton
              icon="bulb-outline"
              label="Análise IA"
              onPress={onNavigateToAi ?? (() => {})}
            />
          </View>
          <View className="mt-2 flex-row justify-between">
            <QuickAccessButton
              icon="medkit-outline"
              label="Remédios"
              onPress={onNavigateToMedicines ?? (() => {})}
            />
            <QuickAccessButton
              icon="shield-checkmark-outline"
              label="Prevenção"
              onPress={onNavigateToPrevention ?? (() => {})}
            />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLink({ label, onPress }: { label: string; onPress?: () => void }) {
  if (!onPress) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <Text className="text-[15px] font-semibold text-app-secondary dark:text-app-dark-secondary">
        {label}
      </Text>
    </Pressable>
  );
}

function TodaySummaryCard({ text, onPress }: { text: string; onPress?: () => void }) {
  return (
    <View className="mb-4 rounded-[18px] bg-app-primaryDark p-[18px] dark:bg-app-dark-primaryDark">
      <Text className="text-[18px] font-semibold text-white">Resumo de hoje</Text>
      <Text className="mt-1.5 text-[16px] text-white/90">{text}</Text>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          className="mt-3 h-10 flex-row items-center justify-center rounded-app bg-white/20 px-4"
          onPress={onPress}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}
        >
          <Text className="text-[15px] font-semibold text-white">Ver agenda de hoje →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PreventionAlertCard({
  alert,
  onPress,
}: {
  alert: PreventionAlert;
  onPress?: () => void;
}) {
  const colors = useThemeColors();

  return (
    <View className="mb-4 gap-3 rounded-2xl border border-app-warningBadgeBorder bg-app-warningSoft p-4 dark:border-app-dark-warningBadgeBorder dark:bg-app-dark-warningSoft">
      <View className="flex-row items-start gap-3">
        <Ionicons color={colors.warning} name="alert-circle" size={26} />
        <View className="flex-1">
          <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            {alert.title}
          </Text>
          <Text className="mt-1 text-[16px] text-app-warning dark:text-app-dark-warning">
            {alert.subtitle}
          </Text>
        </View>
      </View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-app bg-app-warning dark:bg-app-dark-warning"
          onPress={onPress}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <Text className="text-[15px] font-semibold text-white">Agendar agora</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// DECISION (reconciliada com specs/02-perfil-home-agenda/agenda/plan.md item 4,
// fonte canonica do mapeamento de cor por tipo — mesmo par usado em AppointmentCard.tsx):
// consulta -> secundario/azul, exame -> warning/ambar, cirurgia -> primario/verde.
const APPOINTMENT_BAR_CLASS: Record<AppointmentType, string> = {
  consulta: 'bg-app-secondary dark:bg-app-dark-secondary',
  exame: 'bg-app-warning dark:bg-app-dark-warning',
  cirurgia: 'bg-app-primary dark:bg-app-dark-primary',
};

// DECISION: `AppointmentEntry.time` (compartilhado com a Agenda/2c) e so a hora
// (HH:mm) — a Agenda mostra a data completa uma unica vez, no rotulo do dia
// selecionado. A Home lista compromissos de varios dias diferentes ao mesmo
// tempo, entao precisa do proprio "Quando" derivado de `scheduledAt`.
function formatAppointmentWhen(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) {
    return 'Hoje';
  }

  if (isSameDay(date, tomorrow)) {
    return 'Amanhã';
  }

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function UpcomingAppointmentCard({
  appointment,
  onPress,
}: {
  appointment: AppointmentEntry;
  onPress?: () => void;
}) {
  return (
    <Pressable
      className="mb-3 flex-row overflow-hidden rounded-card border border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <View className={`w-1 ${APPOINTMENT_BAR_CLASS[appointment.type]}`} />
      <View className="flex-1 p-4">
        <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
          {APPOINTMENT_TYPE_LABEL[appointment.type]} · {appointment.title}
        </Text>
        <Text className="mt-1 text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {formatAppointmentWhen(appointment.scheduledAt)}, {appointment.time} · {appointment.location}
        </Text>
      </View>
    </Pressable>
  );
}

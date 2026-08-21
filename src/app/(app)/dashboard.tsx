import React from 'react';
import { router } from 'expo-router';

import { HomeScreen } from '@/screens/HomeScreen';
import { useUserContext } from '@/contexts/UserContext';
import { useExamsData } from '@/hooks/useExamsData';
import { useAppointmentsData } from '@/hooks/useAppointmentsData';
import { getDashboardTodayLabel } from '@/mocks/api';

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return `${period}, ${name.split(' ')[0]}`;
}

function isSameCalendarDay(isoDate: string, reference: Date): boolean {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

// DECISION (specs/02-perfil-home-agenda/home/plan.md §2): a frase-modelo do
// Canvas ("1 consulta às 15h · 2 medicamentos pendentes") tem 2 clausulas —
// medicamentos nao tem fonte real ainda (Bloco 3, Medicamentos e 100% mock),
// entao so a clausula de consultas e composta; nunca inventamos o numero de
// medicamentos pendentes.
function buildTodaySummaryText(appointments: { scheduledAt: string; time: string }[]): string {
  const now = new Date();
  const todayAppointments = appointments
    .filter((appointment) => isSameCalendarDay(appointment.scheduledAt, now))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  if (todayAppointments.length === 0) {
    return 'Nenhum compromisso ou pendência para hoje.';
  }

  const [next] = todayAppointments;
  const hour = next.time.split(' • ')[1] ?? next.time;
  const label = todayAppointments.length === 1 ? 'consulta' : 'consultas';

  return `${todayAppointments.length} ${label} às ${hour}`;
}

export default function DashboardRoute() {
  const { user } = useUserContext();
  const {
    documents,
    isLoading: examsLoading,
    errorMessage: examsError,
    retry: retryExams,
  } = useExamsData();
  const {
    appointments,
    isLoading: appointmentsLoading,
    errorMessage: appointmentsError,
    retry: retryAppointments,
  } = useAppointmentsData();

  const greeting = getGreeting(user?.name ?? 'você');
  const todayLabel = getDashboardTodayLabel();

  // DECISION: ordena por documentDate desc e pega os 3 mais recentes para a Home
  const recentExams = [...documents]
    .sort((a, b) => (b.documentDate ?? '').localeCompare(a.documentDate ?? ''))
    .slice(0, 3);

  const now = new Date().toISOString();
  const upcomingAppointments = [...appointments]
    .filter((appointment) => appointment.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 2);

  const todaySummaryText = buildTodaySummaryText(appointments);

  return (
    <HomeScreen
      appointmentsError={appointmentsError}
      appointmentsLoading={appointmentsLoading}
      examsError={examsError}
      examsLoading={examsLoading}
      greeting={greeting}
      onNavigateToAi={() => router.push('/ai')}
      onNavigateToAppointments={() => router.push('/appointments')}
      onNavigateToExamDetail={(id) => router.push(`/document-detail?id=${id}`)}
      onNavigateToExams={() => router.push('/exams')}
      onNavigateToMedicines={() => router.push('/medicines')}
      onNavigateToPrevention={() => router.push('/prevention')}
      onRetryAppointments={retryAppointments}
      onRetryExams={retryExams}
      preventionAlert={null}
      recentExams={recentExams}
      todayLabel={todayLabel}
      todaySummaryText={todaySummaryText}
      upcomingAppointments={upcomingAppointments}
    />
  );
}

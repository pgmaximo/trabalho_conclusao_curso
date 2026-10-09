import React from 'react';
import { router } from 'expo-router';

import { HomeScreen } from '@/screens/HomeScreen';
import { useUserContext } from '@/contexts/UserContext';
import { useExamsData } from '@/hooks/useExamsData';
import { useAppointmentsData } from '@/hooks/useAppointmentsData';
import { useHealthDashboardData } from '@/hooks/useHealthDashboardData';
import { useHomeVaccination } from '@/hooks/useHomeVaccination';
import { useMedicinesData } from '@/hooks/useMedicinesData';
import { buildDashboardTodaySummary, selectUpcomingAppointments } from '@/services/homeAppointments';

function getDashboardTodayLabel(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return `${period}, ${name.split(' ')[0]}`;
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
  const {
    pendingCount: pendingMedicines,
    isLoading: medicinesLoading,
    errorMessage: medicinesError,
  } = useMedicinesData();
  const { alert: vaccinationAlert, doseCounts: vaccineDoseCounts } = useHomeVaccination();
  const {
    healthImport,
    isLoading: healthImportLoading,
    errorMessage: healthImportError,
  } = useHealthDashboardData();

  const greeting = getGreeting(user?.name ?? 'você');
  const todayLabel = getDashboardTodayLabel();

  // DECISION: ordena por documentDate desc e pega os 2 mais recentes para a Home
  // (Canvas 2b: "lista de até 2 cards"). Eram 3; com a grade do Acesso rápido
  // em 2×3, o terceiro só alongava a tela — a lista inteira está em "Ver todos".
  const recentExams = [...documents]
    .sort((a, b) => (b.documentDate ?? '').localeCompare(a.documentDate ?? ''))
    .slice(0, 2);

  // Um Date, nao uma string ISO: comparar "AAAA-MM-DDTHH:mm" (local ingenuo) com
  // `toISOString()` (UTC) escondia da Home todo compromisso das proximas tres
  // horas em UTC-3 (spec.md §2.1, D1).
  const now = new Date();
  const upcomingAppointments = selectUpcomingAppointments(appointments, now, 2);
  const todaySummaryText = buildDashboardTodaySummary(appointments, pendingMedicines, now);

  // `useHealthDashboardData` só devolve a análise que já ficou pronta. Sem ela,
  // o Início diz "sem análise", e não "nenhum dado importado": pode haver uma
  // importação em andamento que este hook não enxerga.
  const smartwatchAnalysisReady =
    healthImportLoading || healthImportError ? null : healthImport?.status === 'READY';

  return (
    <HomeScreen
      appointmentsError={appointmentsError}
      appointmentsLoading={appointmentsLoading}
      examsCount={documents.length}
      examsError={examsError}
      examsLoading={examsLoading}
      greeting={greeting}
      onNavigateToAppointmentDetail={(id) => router.push(`/edit-appointment?id=${encodeURIComponent(id)}`)}
      onNavigateToAppointments={() => router.push('/appointments')}
      onNavigateToExamDetail={(id) => router.push(`/document-detail?id=${id}`)}
      onNavigateToExams={() => router.push('/exams')}
      onNavigateToHealthData={() => router.push('/health-data')}
      onNavigateToMedicines={() => router.push('/medicines')}
      onNavigateToPrevention={() => router.push('/prevention')}
      onNavigateToProfile={() => router.push('/profile')}
      onNavigateToVaccination={() => router.push('/vaccination')}
      onRetryAppointments={retryAppointments}
      onRetryExams={retryExams}
      // `null` enquanto os remédios carregam ou se falharam: "0" seria afirmar
      // que não há dose, sem saber. O atalho mostra a descrição do destino.
      pendingDosesToday={medicinesLoading || medicinesError ? null : pendingMedicines}
      preventionAlert={null}
      profileAvatar={{ gender: user?.gender, name: user?.name, photoUrl: user?.photoUrl }}
      recentExams={recentExams}
      smartwatchAnalysisReady={smartwatchAnalysisReady}
      todayLabel={todayLabel}
      todaySummaryText={todaySummaryText}
      upcomingAppointments={upcomingAppointments}
      vaccinationAlert={vaccinationAlert}
      vaccineDoseCounts={vaccineDoseCounts}
    />
  );
}

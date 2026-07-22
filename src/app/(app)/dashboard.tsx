import React from 'react';
import { router } from 'expo-router';

import { HomeScreen } from '@/screens/HomeScreen';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserContext } from '@/contexts/UserContext';
import { useExamsData } from '@/hooks/useExamsData';

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return `${period}, ${name.split(' ')[0]}`;
}

export default function DashboardRoute() {
  const { dashboard, todayLabel, isLoading, errorMessage, retry } = useDashboardData();
  const { user } = useUserContext();
  const { documents, isLoading: examsLoading } = useExamsData();

  const greeting = getGreeting(user?.name ?? 'você');

  // DECISION: ordena por documentDate desc e pega os 3 mais recentes para a Home
  const recentExams = [...documents]
    .sort((a, b) => (b.documentDate ?? '').localeCompare(a.documentDate ?? ''))
    .slice(0, 3);

  return (
    <HomeScreen
      greeting={greeting}
      todayLabel={todayLabel}
      summary={dashboard?.summary ?? { value: '', status: '' }}
      metrics={dashboard?.metrics ?? []}
      upcomingEvents={dashboard?.upcomingEvents ?? []}
      preventiveAlert={dashboard?.preventiveAlert ?? { icon: '🩺', title: '', subtitle: '' }}
      recentExams={recentExams}
      isLoading={isLoading}
      examsLoading={examsLoading}
      errorMessage={errorMessage}
      onRetry={retry}
      onNavigateToExamDetail={(id) => router.push(`/document-detail?id=${id}`)}
      onNavigateToAi={() => router.push('/ai')}
      onNavigateToMedicines={() => router.push('/medicines')}
      onNavigateToAppointments={() => router.push('/appointments')}
      onNavigateToPrevention={() => router.push('/prevention')}
    />
  );
}

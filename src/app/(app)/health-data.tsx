import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { HealthDashboardScreen } from '@/screens/HealthDashboardScreen';
import { useHealthDashboardData } from '@/hooks/useHealthDashboardData';
import { useHealthImportStatus } from '@/hooks/useHealthImportStatus';
import { deleteHealthImport } from '@/services/healthImportService';
import { invalidateHealthImportCache } from '@/hooks/healthImportCache';

export default function HealthDataRoute() {
  // Quando vem de uma importação recém-criada (ImportHealthDataScreen passa
  // ?importId=...), acompanha ESSA importação especificamente via polling —
  // ela pode estar PENDING/PROCESSING e ainda não é a "última READY".
  // Sem o param, mostra a última importação já concluída (histórico normal).
  const { importId } = useLocalSearchParams<{ importId?: string }>();
  const activeImportId = importId ?? null;

  const active = useHealthImportStatus(activeImportId);
  const latest = useHealthDashboardData();

  const isTrackingActive = Boolean(activeImportId);

  const healthImport = isTrackingActive ? active.data : latest.healthImport;
  const isLoading = isTrackingActive ? active.isLoading : latest.isLoading;
  const errorMessage = isTrackingActive ? active.errorMessage : latest.errorMessage;
  const isTimedOut = isTrackingActive ? active.isTimedOut : false;
  const onRetry = isTrackingActive ? active.refresh : latest.retry;

  async function handleDeleteImport() {
    if (!healthImport) return;
    try {
      await deleteHealthImport(healthImport.id);
      await invalidateHealthImportCache();
      router.replace('/health-data');
    } catch (error) {
      console.error('Erro ao excluir importação:', error);
    }
  }

  return (
    <HealthDashboardScreen
      errorMessage={errorMessage}
      healthImport={healthImport}
      isLoading={isLoading}
      isTimedOut={isTimedOut}
      onDeleteImport={healthImport?.status === 'READY' ? handleDeleteImport : undefined}
      onImportPress={() => router.push('/import-health-data')}
      onRetry={onRetry}
    />
  );
}

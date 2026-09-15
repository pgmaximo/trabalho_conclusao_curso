/**
 * Resumo do arquivo:
 * Hook de dados do dashboard de insights de saúde — busca a importação
 * READY mais recente (cache-first, igual a useExamsData/useVaccinationData),
 * com o mesmo barramento de invalidação usado pelo restante do app.
 */
import { useEffect } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  loadCachedHealthImport,
  registerHealthImportRefetchCallback,
  saveHealthImportCache,
} from '@/hooks/healthImportCache';
import { getLatestReadyHealthImport } from '@/services/healthImportService';
import type { HealthImport } from '@/types/healthInsights';

async function fetchLatestHealthImport(): Promise<HealthImport | null> {
  const cached = await loadCachedHealthImport<HealthImport>();
  if (cached) {
    return cached;
  }

  const latest = await getLatestReadyHealthImport();

  if (latest) {
    await saveHealthImportCache(latest);
  }

  return latest;
}

export function useHealthDashboardData() {
  const { data, status, errorMessage, retry } = useAsyncResource(fetchLatestHealthImport, null);

  useEffect(() => {
    const unregister = registerHealthImportRefetchCallback(() => retry());
    return unregister;
  }, [retry]);

  return {
    healthImport: data ?? null,
    hasAnyImport: data !== null,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}

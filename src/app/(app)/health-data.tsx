import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { HealthDashboardScreen } from '@/screens/HealthDashboardScreen';
import { useHealthDashboardData } from '@/hooks/useHealthDashboardData';
import { useHealthImportStatus } from '@/hooks/useHealthImportStatus';
import { deleteHealthImport, listHealthImports } from '@/services/healthImportService';
import { invalidateHealthImportCache } from '@/hooks/healthImportCache';
import { goBackOr } from '@/utils/goBack';

export default function HealthDataRoute() {
  // Quando vem de uma importação recém-criada (ImportHealthDataScreen passa
  // ?importId=...), acompanha ESSA importação especificamente via polling —
  // ela pode estar PENDING/PROCESSING e ainda não é a "última READY".
  // Sem o param, mostra a última importação já concluída (histórico normal).
  const { importId } = useLocalSearchParams<{ importId?: string }>();
  const latest = useHealthDashboardData();

  // `latest` só enxerga importação READY (getLatestReadyHealthImport). Uma
  // importação que travou em PENDING/PROCESSING ou terminou FAILED enquanto a
  // pessoa não estava olhando (app fechado, ou aberto sem o ?importId da
  // sessão de upload) ficava então indistinguível de "nunca importei nada" —
  // some da tela pra sempre, mesmo a linha existindo no banco. Sem o param,
  // e só depois de confirmar que não há READY, busca a importação mais
  // recente de QUALQUER status para reconectar o polling a ela.
  const [importadaSemAcompanhar, setImportadaSemAcompanhar] = useState<string | null>(null);
  // Só fica true entre "latest terminou sem achar READY" e a busca extra
  // responder — evita mostrar "nunca importei" por um instante antes de
  // trocar para PENDING/PROCESSING/FAILED (isLoading conta com isto).
  const [resolvendoFallback, setResolvendoFallback] = useState(false);
  useEffect(() => {
    let cancelado = false;

    // O `await` abaixo tira os setState das branches desta funcao da mesma
    // passada sincrona do efeito -- sem isso, o lint
    // react-hooks/set-state-in-effect reclama de setState sincrono dentro de
    // efeito. Um microtask de atraso aqui e imperceptivel.
    void Promise.resolve().then(async () => {
      if (cancelado) return;

      if (importId || latest.isLoading || latest.healthImport) {
        setImportadaSemAcompanhar(null);
        setResolvendoFallback(false);
        return;
      }

      setResolvendoFallback(true);
      try {
        const importacoes = await listHealthImports();
        if (cancelado) return;
        const maisRecente = importacoes[0];
        if (maisRecente && maisRecente.status !== 'READY') {
          setImportadaSemAcompanhar(maisRecente.id);
        }
      } catch {
        // Falha nesta busca extra não pode derrubar a tela: o caminho normal
        // (latest) já deu seu próprio retorno, e esta é só uma tentativa a
        // mais de achar o que ficou pra trás.
      } finally {
        if (!cancelado) setResolvendoFallback(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [importId, latest.isLoading, latest.healthImport]);

  const activeImportId = importId ?? importadaSemAcompanhar;

  const active = useHealthImportStatus(activeImportId);

  const isTrackingActive = Boolean(activeImportId);

  const healthImport = isTrackingActive ? active.data : latest.healthImport;
  const isLoading = isTrackingActive ? active.isLoading : latest.isLoading || resolvendoFallback;
  const errorMessage = isTrackingActive ? active.errorMessage : latest.errorMessage;
  const isTimedOut = isTrackingActive ? active.isTimedOut : false;
  const onRetry = isTrackingActive ? active.refresh : latest.retry;

  // A tela pede a confirmação antes de chamar isto, e mostra o erro se a
  // exclusão falhar — por isso a falha sobe, em vez de morrer no console.
  async function handleDeleteImport() {
    if (!healthImport) return;
    try {
      await deleteHealthImport(healthImport.id);
      await invalidateHealthImportCache();
    } catch (error) {
      console.error('Erro ao excluir importação:', error);
      throw error;
    }
    router.replace('/health-data');
  }

  return (
    <HealthDashboardScreen
      errorMessage={errorMessage}
      healthImport={healthImport}
      isLoading={isLoading}
      isTimedOut={isTimedOut}
      onBack={() => goBackOr('/more')}
      onDeleteImport={healthImport?.status === 'READY' ? handleDeleteImport : undefined}
      onImportPress={() => router.push('/import-health-data')}
      onRetry={onRetry}
    />
  );
}

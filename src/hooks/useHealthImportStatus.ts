/**
 * Resumo do arquivo:
 * Polling do status de uma importação de saúde (PENDING/PROCESSING/READY/
 * FAILED) enquanto a análise roda no backend — nunca usa subscription do
 * Amplify Data, porque a Lambda escreve direto no DynamoDB (bypassa o
 * AppSync), e uma subscription nesse caso nunca dispararia (ver plan.md
 * "Por que polling e não subscription").
 *
 * `setTimeout` recursivo (nunca `setInterval`, para uma resposta lenta não
 * empilhar chamadas), com backoff crescente, parada rígida em 6 minutos, e
 * retomada imediata ao voltar do segundo plano (o RN descarta timers de
 * forma imprevisível em background).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getHealthImport } from '@/services/healthImportService';
import type { HealthImport } from '@/types/healthInsights';

const POLL_DELAYS_MS = [2000, 2000, 3000, 3000, 5000, 5000, 8000, 8000, 10000];
const MAX_POLL_DURATION_MS = 6 * 60 * 1000;

export type UseHealthImportStatusResult = {
  data: HealthImport | null;
  /** true só até a primeira resposta chegar — depois disso a UI segue `data.status`. */
  isLoading: boolean;
  errorMessage: string | null;
  /** true quando passou de 6min sem chegar a READY/FAILED — mostrar "tentar novamente". */
  isTimedOut: boolean;
  /** Válvula de escape manual (botão "Atualizar") — reinicia o backoff do zero. */
  refresh: () => void;
};

export function useHealthImportStatus(importId: string | null): UseHealthImportStatusResult {
  const [data, setData] = useState<HealthImport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIndexRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const isActiveRef = useRef(true);
  const importIdRef = useRef(importId);
  importIdRef.current = importId;

  // `pollRef` quebra o ciclo poll -> scheduleNext -> poll sem precisar listar
  // `poll` nas deps de `scheduleNext` (o que recriaria os dois a cada
  // render) -- `scheduleNext` sempre chama a versão mais recente via ref.
  const pollRef = useRef<() => Promise<void>>(async () => {});

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (!isActiveRef.current) return; // app em segundo plano -- o listener de AppState retoma
    const index = Math.min(pollIndexRef.current, POLL_DELAYS_MS.length - 1);
    const delay = POLL_DELAYS_MS[index] ?? 10_000;
    pollIndexRef.current++;
    clearScheduled();
    timeoutRef.current = setTimeout(() => void pollRef.current(), delay);
  }, [clearScheduled]);

  const poll = useCallback(async () => {
    const currentImportId = importIdRef.current;
    if (!currentImportId || !isMountedRef.current) return;

    try {
      const result = await getHealthImport(currentImportId);
      if (!isMountedRef.current) return;

      setData(result);
      setIsLoading(false);
      setErrorMessage(null);

      const isTerminal = result?.status === 'READY' || result?.status === 'FAILED';
      if (isTerminal) {
        clearScheduled();
        return;
      }

      if (Date.now() - startTimeRef.current >= MAX_POLL_DURATION_MS) {
        setIsTimedOut(true);
        clearScheduled();
        return;
      }

      scheduleNext();
    } catch (error) {
      if (!isMountedRef.current) return;
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : 'Ocorreu um erro inesperado.');
      scheduleNext(); // erro de rede pontual não deve travar o polling
    }
  }, [clearScheduled, scheduleNext]);

  pollRef.current = poll;

  const refresh = useCallback(() => {
    pollIndexRef.current = 0;
    startTimeRef.current = Date.now();
    setIsTimedOut(false);
    setIsLoading(true);
    clearScheduled();
    void pollRef.current();
  }, [clearScheduled]);

  useEffect(() => {
    isMountedRef.current = true;
    pollIndexRef.current = 0;
    startTimeRef.current = Date.now();
    setIsTimedOut(false);
    setErrorMessage(null);
    setData(null);

    if (importId) {
      setIsLoading(true);
      void pollRef.current();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMountedRef.current = false;
      clearScheduled();
    };
    // Só queremos reiniciar o ciclo quando o importId observado muda de fato
    // -- clearScheduled é estável (deps vazias) e não precisa entrar aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasActive = isActiveRef.current;
      isActiveRef.current = nextState === 'active';

      if (!wasActive && isActiveRef.current && importIdRef.current) {
        clearScheduled();
        void pollRef.current();
      }
    });

    return () => subscription.remove();
  }, [clearScheduled]);

  return { data, isLoading, errorMessage, isTimedOut, refresh };
}

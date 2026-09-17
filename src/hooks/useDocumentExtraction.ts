/**
 * Resumo do arquivo:
 * Consulta por repeticao o estado da leitura de um documento.
 *
 * Mesmo padrao de useHealthImportStatus, e pela mesma razao tecnica: a Lambda
 * escreve direto no DynamoDB, contornando o AppSync, entao uma subscription do
 * Amplify Data NUNCA dispararia. Nao e preferencia de estilo -- e o unico
 * mecanismo que funciona neste desenho.
 *
 * `setTimeout` recursivo (nunca `setInterval`, para uma resposta lenta nao
 * empilhar chamadas), espera crescente, parada rigida em 6 minutos, e
 * retomada ao voltar do segundo plano, porque o React Native descarta timers
 * de forma imprevisivel em background.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  confirmLabResult,
  fetchExtractionState,
  startExtraction,
  type ExtractionState,
} from '@/services/extractionService';

const POLL_DELAYS_MS = [2000, 2000, 3000, 3000, 5000, 5000, 8000, 8000, 10000];
const MAX_POLL_DURATION_MS = 6 * 60 * 1000;

/** Estados em que nao ha mais nada para esperar. NUNCA_EXTRAIDO entra aqui de
 *  proposito: documento que nunca passou pela leitura nao vai mudar sozinho, e
 *  ficar consultando por 6 minutos gastaria bateria para nada. */
const ESTADOS_FINAIS = ['SUCCEEDED', 'NO_RESULTS', 'FAILED', 'NUNCA_EXTRAIDO'] as const;

export type UseDocumentExtractionResult = {
  /** Nulo ate a primeira resposta chegar. Nulo NAO e "nunca extraido": exibir
   *  um estado antes de saber qual e seria a tela afirmando o que nao sabe. */
  state: ExtractionState | null;
  isLoading: boolean;
  errorMessage: string | null;
  /** Passou de 6 minutos sem chegar a um estado final. */
  isTimedOut: boolean;
  isRetrying: boolean;
  /** Pede a leitura de novo -- serve ao "Tentar de novo" e ao "Ler agora". */
  retry: () => void;
  /** Valvula manual: reinicia a espera do zero, sem pedir leitura nova. */
  refresh: () => void;
  confirm: (id: string) => Promise<void>;
};

export function useDocumentExtraction(documentId: string | null): UseDocumentExtractionResult {
  const [state, setState] = useState<ExtractionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIndexRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const isActiveRef = useRef(true);
  const documentIdRef = useRef(documentId);
  documentIdRef.current = documentId;

  // Quebra o ciclo poll -> scheduleNext -> poll sem recriar as duas funcoes a
  // cada render, do mesmo jeito que useHealthImportStatus faz.
  const pollRef = useRef<() => Promise<void>>(async () => {});

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (!isActiveRef.current) return; // segundo plano -- o listener de AppState retoma
    const index = Math.min(pollIndexRef.current, POLL_DELAYS_MS.length - 1);
    const delay = POLL_DELAYS_MS[index] ?? 10_000;
    pollIndexRef.current++;
    clearScheduled();
    timeoutRef.current = setTimeout(() => void pollRef.current(), delay);
  }, [clearScheduled]);

  const poll = useCallback(async () => {
    const id = documentIdRef.current;
    if (!id || !isMountedRef.current) return;

    try {
      const resultado = await fetchExtractionState(id);
      if (!isMountedRef.current) return;

      setState(resultado);
      setIsLoading(false);
      setErrorMessage(null);

      if ((ESTADOS_FINAIS as readonly string[]).includes(resultado.status)) {
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
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível consultar a leitura.',
      );
      scheduleNext(); // erro de rede pontual nao pode travar a consulta
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

  const retry = useCallback(() => {
    const id = documentIdRef.current;
    if (!id) return;

    setIsRetrying(true);
    setErrorMessage(null);
    startExtraction(id)
      .then(() => {
        if (!isMountedRef.current) return;
        // Zera o relogio: a leitura recomecou agora, e a parada de 6 minutos
        // conta a partir deste pedido, nao do anterior.
        pollIndexRef.current = 0;
        startTimeRef.current = Date.now();
        setIsTimedOut(false);
        void pollRef.current();
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current) return;
        setErrorMessage(
          error instanceof Error ? error.message : 'Não foi possível pedir a leitura agora.',
        );
      })
      .finally(() => {
        if (isMountedRef.current) setIsRetrying(false);
      });
  }, []);

  const confirm = useCallback(
    async (id: string) => {
      await confirmLabResult(id);
      // Relê em vez de mexer no estado local: o que a tela mostra passa a ser
      // o que o banco tem, e nao o que o aplicativo supos que ficou gravado.
      await pollRef.current();
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    pollIndexRef.current = 0;
    startTimeRef.current = Date.now();
    setIsTimedOut(false);
    setErrorMessage(null);
    setState(null);

    if (documentId) {
      setIsLoading(true);
      void pollRef.current();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMountedRef.current = false;
      clearScheduled();
    };
    // Só reiniciamos quando o documento observado muda de fato -- clearScheduled
    // é estável (deps vazias) e não precisa entrar aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasActive = isActiveRef.current;
      isActiveRef.current = nextState === 'active';

      if (!wasActive && isActiveRef.current && documentIdRef.current) {
        clearScheduled();
        void pollRef.current();
      }
    });

    return () => subscription.remove();
  }, [clearScheduled]);

  return { state, isLoading, errorMessage, isTimedOut, isRetrying, retry, refresh, confirm };
}

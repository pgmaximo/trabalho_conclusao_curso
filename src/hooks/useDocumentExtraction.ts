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
  correctLabResult,
  fetchExtractionState,
  startExtraction,
  type ExtractionState,
  type LabResultView,
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
  /**
   * "A leitura esta certa". Quando ja ha um numero lido (so a confianca e
   * baixa), so muda quem responde por ele. Quando NAO ha (`value: null` --
   * numero ilegivel, analito fora do catalogo, faixa ou unidade que nao
   * converteu, ver `paraRevisao` em analyteNormalizer.ts), confirmar SEM
   * digitar nada deixaria o valor nulo pra sempre com a tela dando a entender
   * que a pessoa confirmou uma leitura -- entao usa o `rawValue` (o texto do
   * papel) como o valor, pelo MESMO parseDecimal que corrige uma linha na mao
   * (D23): a pessoa nao precisa redigitar o que o OCR ja leu certo.
   *
   * LANCA quando o `rawValue` nao vira numero (ex.: OCR errou um digito) --
   * quem chama decide o que fazer (abrir o painel de correcao manual).
   */
  confirm: (result: LabResultView) => Promise<void>;
};

export function useDocumentExtraction(documentId: string | null): UseDocumentExtractionResult {
  const [state, setState] = useState<ExtractionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  // Guarda o ultimo documentId visto para "ajustar estado durante a
  // renderizacao" (react.dev/learn/you-might-not-need-an-effect) quando ele
  // muda, em vez de resetar via setState dentro do efeito.
  const [prevDocumentId, setPrevDocumentId] = useState(documentId);

  if (documentId !== prevDocumentId) {
    setPrevDocumentId(documentId);
    setIsTimedOut(false);
    setErrorMessage(null);
    setState(null);
    setIsLoading(Boolean(documentId));
  }

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIndexRef = useRef(0);
  // O valor inicial nunca e lido: o efeito principal sempre o substitui por
  // Date.now() antes da primeira consulta (ver abaixo).
  const startTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const isActiveRef = useRef(true);
  const documentIdRef = useRef(documentId);

  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

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

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

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
    async (result: LabResultView) => {
      if (result.value !== null) {
        await confirmLabResult(result.id);
      } else {
        const unidade = result.unit ?? result.rawUnit ?? '';
        const resposta = await correctLabResult(result.id, result.rawValue, unidade);
        if (!resposta.ok) throw new Error(resposta.message);
      }
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

    if (documentId) {
      void pollRef.current();
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

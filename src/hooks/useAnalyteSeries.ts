/**
 * Resumo do arquivo:
 * Estado da tela de serie. Carrega a lista de analitos uma vez, e as linhas do
 * analito escolhido a cada troca.
 *
 * NAO usa subscription: as linhas sao escritas DIRETO no DynamoDB pela Lambda,
 * contornando o AppSync, e uma subscription nunca dispararia -- o mesmo motivo
 * que o useHealthImportStatus documenta. Aqui nem consulta por repeticao e
 * precisa: a serie e historico, nao trabalho em andamento.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildAnalyteSeries,
  sharedReferenceRange,
  type AnalyteSeries,
} from '@/services/analyteSeries';
import {
  listAnalytesWithResults,
  listLabResultsByAnalyte,
  type AnalyteOption,
} from '@/services/analyteSeriesService';

export type UseAnalyteSeriesResult = {
  options: AnalyteOption[];
  selectedCode: string | null;
  selectCode: (code: string) => void;
  /** As series do analito escolhido -- mais de uma quando ha mais de um momento. */
  series: AnalyteSeries[];
  selectedMoment: string | null;
  selectMoment: (moment: string | null) => void;
  activeSeries: AnalyteSeries | null;
  referenceRange: { low: number | null; high: number | null } | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => void;
};

export function useAnalyteSeries(initialCode?: string | null): UseAnalyteSeriesResult {
  const [options, setOptions] = useState<AnalyteOption[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(initialCode ?? null);
  const [series, setSeries] = useState<AnalyteSeries[]>([]);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const carregar = useCallback(async (codigoPedido: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const lista = await listAnalytesWithResults();
      if (!isMountedRef.current) return;
      setOptions(lista);

      // Sem escolha explicita, abre no que tem mais historico -- que e o que a
      // pessoa provavelmente veio ver.
      const codigo = codigoPedido ?? lista[0]?.analyteCode ?? null;
      setSelectedCode(codigo);

      if (!codigo) {
        setSeries([]);
        return;
      }

      const linhas = await listLabResultsByAnalyte(codigo);
      if (!isMountedRef.current) return;
      const montadas = buildAnalyteSeries(linhas);
      setSeries(montadas);

      // Reposiciona o momento: o que estava escolhido pode nao existir no
      // analito novo.
      setSelectedMoment((atual) =>
        montadas.some((s) => s.collectionMoment === atual)
          ? atual
          : (montadas[0]?.collectionMoment ?? null),
      );
    } catch (erro) {
      if (!isMountedRef.current) return;
      setErrorMessage(
        erro instanceof Error ? erro.message : 'Não foi possível carregar seus resultados.',
      );
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  // `carregar` recebe o codigo por argumento em vez de le-lo do estado: se ele
  // dependesse de `selectedCode`, o efeito abaixo dispararia de novo a cada
  // troca de analito feita DENTRO dele, e a tela recarregaria em laco.
  useEffect(() => {
    void carregar(initialCode ?? null);
    // Só recarrega do zero quando a tela recebe outro analito por parametro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const selectCode = useCallback(
    (code: string) => {
      setSelectedCode(code);
      setSelectedMoment(null);
      void carregar(code);
    },
    [carregar],
  );

  const activeSeries = useMemo(
    () => series.find((s) => s.collectionMoment === selectedMoment) ?? series[0] ?? null,
    [series, selectedMoment],
  );

  const referenceRange = useMemo(
    () => (activeSeries ? sharedReferenceRange(activeSeries.points) : null),
    [activeSeries],
  );

  return {
    options,
    selectedCode,
    selectCode,
    series,
    selectedMoment,
    selectMoment: setSelectedMoment,
    activeSeries,
    referenceRange,
    isLoading,
    errorMessage,
    refresh: () => void carregar(selectedCode),
  };
}

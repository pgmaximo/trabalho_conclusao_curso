/**
 * Resumo do arquivo:
 * Hook da tela "Suas importações" — todas as importações de wearable da
 * pessoa, da enviada por último para a primeira, e a exclusão de uma delas.
 * Escuta o mesmo barramento de invalidação do dashboard (healthImportCache):
 * uma importação nova, ou excluída pelo próprio dashboard, aparece aqui sem
 * a pessoa precisar recarregar.
 */
import { useEffect, useState } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import { invalidateHealthImportCache, registerHealthImportRefetchCallback } from '@/hooks/healthImportCache';
import { deleteHealthImport, listHealthImports } from '@/services/healthImportService';
import type { HealthImport } from '@/types/healthInsights';

export type UseHealthImportsResult = {
  imports: HealthImport[];
  isLoading: boolean;
  errorMessage: string | null;
  retry: () => void;
  /** Exclui a importação e os arquivos dela. Um erro lançado aqui aparece na linha da importação. */
  deleteImport: (importId: string) => Promise<void>;
};

export function useHealthImports(): UseHealthImportsResult {
  const { data, status, errorMessage, retry } = useAsyncResource(listHealthImports, null);
  // A linha some assim que a exclusão volta, sem esperar a releitura que a
  // invalidação dispara — senão ela reaparecia por um instante entre as duas.
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const unregister = registerHealthImportRefetchCallback(() => retry());
    return unregister;
  }, [retry]);

  async function deleteImport(importId: string) {
    await deleteHealthImport(importId);
    setDeletedIds((current) => new Set(current).add(importId));
    await invalidateHealthImportCache();
  }

  return {
    imports: (data ?? []).filter((item) => !deletedIds.has(item.id)),
    // Só a primeira leitura mostra o esqueleto: a releitura depois de uma
    // exclusão ou importação mantém a lista na tela enquanto volta.
    isLoading: status === 'loading' && data === null,
    errorMessage,
    retry,
    deleteImport,
  };
}

/**
 * Rota de "Suas importações". A rota é dona do hook e a tela continua
 * apresentacional, como em health-data.tsx e assistant-memory.tsx.
 */
import React from 'react';
import { router } from 'expo-router';

import { useHealthImports } from '@/hooks/useHealthImports';
import { HealthImportsScreen } from '@/screens/HealthImportsScreen';
import { goBackOr } from '@/utils/goBack';

export default function HealthImportsRoute() {
  const { imports, isLoading, errorMessage, retry, deleteImport } = useHealthImports();

  return (
    <HealthImportsScreen
      errorMessage={errorMessage}
      imports={imports}
      isLoading={isLoading}
      onBack={() => goBackOr('/health-data')}
      onDeleteImport={deleteImport}
      onImportPress={() => router.push('/import-health-data')}
      // O painel já sabe mostrar uma importação específica por `?importId=`
      // (é assim que ele acompanha uma importação recém-criada), em qualquer
      // estado: pronta, em andamento ou com falha.
      onOpenImport={(importId) => router.push({ pathname: '/health-data', params: { importId } })}
      onRetry={retry}
    />
  );
}

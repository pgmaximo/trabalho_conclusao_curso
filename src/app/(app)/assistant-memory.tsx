/**
 * Rota da tela "O que eu lembro" (D34, M9). A rota e dona do hook e a tela
 * continua apresentacional, como em `analyte-series.tsx` e no detalhe do
 * documento.
 */
import React from 'react';

import { useAssistantMemory } from '@/hooks/useAssistantMemory';
import { AssistantMemoryScreen } from '@/screens/AssistantMemoryScreen';
import { goBackOr } from '@/utils/goBack';

export default function AssistantMemoryRoute() {
  const state = useAssistantMemory();

  return <AssistantMemoryScreen onBack={() => goBackOr('/ai')} state={state} />;
}

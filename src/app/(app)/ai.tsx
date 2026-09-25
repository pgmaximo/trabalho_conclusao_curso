// =============================================================================
// Arquivo: (app)/ai.tsx
// Descrição: Rota do Assistente de Saúde (chat conversacional com IA).
// =============================================================================

import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { ChatBotScreen } from '@/screens/ChatBotScreen';

export default function ChatBotRoute() {
  // A conversa de origem de um fato da memoria (M11). Ausente no caminho
  // normal, que e abrir o chat pela barra de navegacao.
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();

  return <ChatBotScreen conversaInicial={conversationId ?? null} />;
}

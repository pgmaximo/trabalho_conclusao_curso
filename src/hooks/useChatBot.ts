/**
 * Resumo do arquivo:
 * Hook que gerencia o estado do chat (mensagens, input, "digitando") e
 * orquestra a chamada ao aiAssistantService. Sem persistencia entre sessoes.
 */
import { useCallback, useState } from 'react';

import { sendMessage as sendChatMessage, type ChatMessage } from '@/services/aiAssistantService';

export type HistoryGroup = {
  group: string;
  items: { title: string; onSelect: () => void }[];
};

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Olá! Sou seu assistente de saúde. Posso ajudar a entender seus exames e orientar próximos passos. Como posso ajudar?',
  timestamp: new Date(),
};

// DECISION: id sequencial + timestamp garante unicidade estavel para keys de lista
let idCounter = 0;
function nextMessageId(): string {
  idCounter += 1;
  return `msg-${idCounter}-${Date.now()}`;
}

export interface UseChatBotReturn {
  messages: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  isTyping: boolean;
  sendMessage: (override?: string) => Promise<void>;
  clearHistory: () => void;
  historyOpen: boolean;
  // DECISION (plan.md §3.2): nenhuma conversa é persistida ainda — historyGroups
  // fica sempre vazio nesta versão, comunicado ao usuário via copy de estado
  // vazio no HistoryDrawer, nunca preenchido com dado inventado.
  historyGroups: HistoryGroup[];
  openHistory: () => void;
  closeHistory: () => void;
  newChat: () => void;
}

export function useChatBot(): UseChatBotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // DECISION: aceita `override` para os prompts rapidos enviarem direto,
  // sem depender da atualizacao assincrona de `inputText`.
  const sendMessage = useCallback(
    async (override?: string) => {
      const text = (override ?? inputText).trim();
      if (!text || isTyping) {
        return;
      }

      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      const history = messages;
      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setIsTyping(true);

      try {
        const reply = await sendChatMessage(text, history);
        setMessages((prev) => [
          ...prev,
          { id: nextMessageId(), role: 'assistant', content: reply, timestamp: new Date() },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro. Tente novamente.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputText, isTyping, messages],
  );

  const clearHistory = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, id: nextMessageId() }]);
    setInputText('');
  }, []);

  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const newChat = useCallback(() => {
    clearHistory();
    setHistoryOpen(false);
  }, [clearHistory]);

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    sendMessage,
    clearHistory,
    historyOpen,
    historyGroups: [],
    openHistory,
    closeHistory,
    newChat,
  };
}

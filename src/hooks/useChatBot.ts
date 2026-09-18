/**
 * Resumo do arquivo:
 * Hook que gerencia o estado do chat (mensagens, input, "digitando") e
 * orquestra a chamada ao aiAssistantService. Sem persistencia entre sessoes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  sendMessageWithSources,
  type ChatMessage,
  type Citation,
} from '@/services/aiAssistantService';
import {
  apagarConversa,
  criarConversa,
  lerMensagens,
  listarConversas,
  salvarTurno,
  type ConversaSalva,
} from '@/services/chatHistoryService';
import { agruparPorPeriodo } from '@/utils/conversationGrouping';

export type HistoryGroup = {
  group: string;
  items: { id: string; title: string; onSelect: () => void }[];
};

/**
 * Uma mensagem do assistente com a origem dos numeros que ela cita. A citacao
 * fica na MENSAGEM, e nao num estado separado da tela: assim ela acompanha a
 * bolha na rolagem e sobrevive a chegada da mensagem seguinte.
 */
export type ChatMessageComOrigem = ChatMessage & { citations?: Citation[] };

/** O anexo pontual em espera: ja esta no bucket, ainda nao foi enviado com
 *  nenhuma pergunta. */
export type AnexoPendente = { key: string; fileName: string };

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
  messages: ChatMessageComOrigem[];
  inputText: string;
  setInputText: (text: string) => void;
  isTyping: boolean;
  sendMessage: (override?: string) => Promise<void>;
  clearHistory: () => void;
  historyOpen: boolean;
  // A gaveta lista conversas REAIS desde a C8/C9, destravadas pela D33. Antes
  // disso ela ficava sempre vazia de propósito, e o comentário aqui dizia
  // isso; a lista vazia continua sendo um estado legítimo, mas agora ela
  // significa "você não conversou ainda", e não "o aplicativo não guarda".
  historyGroups: HistoryGroup[];
  /** Apaga de verdade (D33): as mensagens e depois a conversa. */
  deleteConversation: (id: string) => Promise<void>;
  /** O anexo pontual em espera, ou null. */
  anexo: AnexoPendente | null;
  setAnexo: (anexo: AnexoPendente | null) => void;
  openHistory: () => void;
  closeHistory: () => void;
  newChat: () => void;
}

export function useChatBot(): UseChatBotReturn {
  const [messages, setMessages] = useState<ChatMessageComOrigem[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [anexo, setAnexo] = useState<AnexoPendente | null>(null);
  // A conversa ABERTA. Nula ate a primeira pergunta: uma conversa criada ao
  // abrir a tela encheria a gaveta de linhas vazias que a pessoa nunca teve.
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversas, setConversas] = useState<ConversaSalva[]>([]);

  const recarregarConversas = useCallback(async () => {
    try {
      setConversas(await listarConversas());
    } catch (erro) {
      // A gaveta vazia e um estado legitimo; a conversa em andamento nao para
      // por causa dela.
      console.warn('Nao foi possivel carregar o historico de conversas:', erro);
    }
  }, []);

  useEffect(() => {
    void recarregarConversas();
  }, [recarregarConversas]);

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
        const reply = await sendMessageWithSources(text, history, undefined, anexo?.key);
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'assistant',
            content: reply.text,
            timestamp: new Date(),
            citations: reply.citations,
          },
        ]);

        // A gravacao acontece DEPOIS de a resposta estar na tela, e nunca
        // derruba o turno: `salvarTurno` engole a falha. Perder o registro e
        // ruim; perder a resposta por causa do registro seria pior.
        const id = conversationId ?? (await criarConversa(text));
        if (id) {
          if (!conversationId) setConversationId(id);
          await salvarTurno(id, {
            pergunta: text,
            resposta: reply.text,
            citations: reply.citations,
            ruleCheckStatus: reply.ruleCheckStatus,
          });
          void recarregarConversas();
        }
      } catch (erro) {
        // A camada de servico ja escreve mensagens honestas e DIFERENTES entre
        // si -- "sua sessao expirou", "o assistente esta indisponivel nesta
        // versao". Trocar todas por uma frase fixa aqui apagaria justamente a
        // diferenca, e mandaria a pessoa tentar de novo em casos em que tentar
        // de novo nao resolve.
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'assistant',
            content:
              erro instanceof Error && erro.message
                ? erro.message
                : 'Não consegui responder agora. Tente novamente em instantes.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
        // O anexo vale para UMA pergunta. Mante-lo depois faria a segunda
        // pergunta carregar um documento que a pessoa ja esqueceu que anexou,
        // e pagar a janela do modelo por ele de novo.
        setAnexo(null);
      }
    },
    [anexo, conversationId, inputText, isTyping, messages, recarregarConversas],
  );

  const clearHistory = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, id: nextMessageId() }]);
    setInputText('');
    setAnexo(null);
    // Nova conversa comeca sem id: a proxima pergunta cria a dela.
    setConversationId(null);
  }, []);

  /** Abre uma conversa guardada, com as citacoes de cada resposta. */
  const abrirConversa = useCallback(async (id: string) => {
    try {
      const gravadas = await lerMensagens(id);
      setConversationId(id);
      setMessages(
        gravadas.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
          citations: m.citations,
        })),
      );
      setHistoryOpen(false);
    } catch (erro) {
      console.warn('Nao foi possivel abrir esta conversa:', erro);
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await apagarConversa(id);

      // Se a apagada era a que estava aberta, a tela volta ao inicio -- deixar
      // na frente uma conversa que nao existe mais e pior do que recomecar.
      //
      // A comparacao e feita AQUI, e nao dentro de um `setConversationId(...)`
      // com funcao: um atualizador de estado precisa ser puro, e o React pode
      // executa-lo duas vezes. Uma mensagem nova criada dentro dele apareceria
      // em dobro.
      if (conversationId === id) {
        setConversationId(null);
        setMessages([{ ...WELCOME_MESSAGE, id: nextMessageId() }]);
      }

      await recarregarConversas();
    },
    [conversationId, recarregarConversas],
  );

  const historyGroups = useMemo<HistoryGroup[]>(
    () =>
      agruparPorPeriodo(conversas).map((grupo) => ({
        group: grupo.group,
        items: grupo.items.map((c) => ({
          id: c.id,
          title: c.title,
          onSelect: () => void abrirConversa(c.id),
        })),
      })),
    [abrirConversa, conversas],
  );

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
    historyGroups,
    deleteConversation,
    anexo,
    setAnexo,
    openHistory,
    closeHistory,
    newChat,
  };
}

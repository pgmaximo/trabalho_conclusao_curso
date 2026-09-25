/**
 * Resumo do arquivo:
 * Grava, lista e apaga conversa com o assistente. A política que ele
 * implementa é a **D33**: sem prazo de expiração, exclusão imediata e real.
 *
 * QUEM GRAVA É O APLICATIVO, e não a função do chat. A função é somente
 * leitura por contrato — há um teste que varre os arquivos dela procurando
 * comando de escrita do DynamoDB, e essa garantia é o que torna o laço de
 * ferramentas auditável. Gravando por aqui, a autorização por dono é a do
 * AppSync: a mesma que já protege exame, consulta e medicamento.
 *
 * NADA aqui guarda fato derivado pelo modelo. O que é gravado é o que foi
 * dito, literalmente, mais a origem dos números citados.
 */
import { generateClient } from 'aws-amplify/data';

import type { Schema } from '../../amplify/data/resource';
import type { Citation, RuleCheckStatus } from './aiAssistantService';

/**
 * Criado sob demanda, e nao no carregamento do modulo. Um `generateClient()`
 * no corpo do arquivo constroi o cliente no momento do `import`, antes de
 * qualquer configuracao -- e, no teste, antes de o duplo estar pronto.
 */
let clienteCache: ReturnType<typeof generateClient<Schema>> | null = null;

function cliente() {
  if (!clienteCache) clienteCache = generateClient<Schema>();
  return clienteCache;
}

/** Acima disto o título vira parágrafo e a gaveta deixa de ser uma lista. */
const MAX_TITULO = 60;

const SEM_TITULO = 'Conversa sem pergunta';

export type ConversaSalva = {
  id: string;
  title: string;
  startedAt: string | null;
  lastMessageAt: string | null;
  messageCount: number;
};

export type TurnoParaSalvar = {
  pergunta: string;
  resposta: string;
  citations: Citation[];
  ruleCheckStatus: RuleCheckStatus;
  modelId?: string | null;
};

/**
 * O título sai das primeiras palavras da PESSOA, nunca do modelo.
 *
 * Um título gerado seria mais uma superfície de texto sobre saúde, e teria que
 * passar pelas cinco camadas de regra de linguagem para render uma linha de
 * lista — custo e risco que a lista não justifica. E há uma razão melhor: a
 * pessoa reconhece a própria pergunta mais depressa do que reconhece um resumo
 * dela.
 */
export function tituloDaPergunta(mensagem: string): string {
  const limpo = mensagem.trim().replace(/\s+/g, ' ');
  if (limpo === '') return SEM_TITULO;
  if (limpo.length <= MAX_TITULO) return limpo;

  // Corta no último espaço antes do teto, para não partir palavra ao meio.
  const pedaco = limpo.slice(0, MAX_TITULO);
  const ultimoEspaco = pedaco.lastIndexOf(' ');
  const base = ultimoEspaco > MAX_TITULO / 2 ? pedaco.slice(0, ultimoEspaco) : pedaco;
  return `${base.trimEnd()}…`;
}

export async function criarConversa(primeiraPergunta: string): Promise<string | null> {
  const agora = new Date().toISOString();
  const { data } = await cliente().models.ChatConversation.create({
    title: tituloDaPergunta(primeiraPergunta),
    startedAt: agora,
    lastMessageAt: agora,
    messageCount: 0,
  });
  return data?.id ?? null;
}

/**
 * Grava as duas mensagens do turno, nesta ordem.
 *
 * NUNCA LANÇA. A resposta já está na tela quando esta função roda; perder o
 * registro é ruim, perder a resposta por causa do registro seria pior.
 */
export async function salvarTurno(conversationId: string, turno: TurnoParaSalvar): Promise<void> {
  try {
    await cliente().models.ChatMessage.create({
      conversationId,
      role: 'USER',
      content: turno.pergunta,
    });

    await cliente().models.ChatMessage.create({
      conversationId,
      role: 'ASSISTANT',
      content: turno.resposta,
      // Serializada à mão: é o que permite reabrir o documento de origem de um
      // número semanas depois, que é a R4 verificável depois do fato.
      citations: JSON.stringify(turno.citations),
      ruleCheckStatus: turno.ruleCheckStatus,
      modelId: turno.modelId ?? undefined,
    });

    await cliente().models.ChatConversation.update({
      id: conversationId,
      lastMessageAt: new Date().toISOString(),
    });
  } catch (erro) {
    console.warn('Nao foi possivel guardar esta conversa:', erro);
  }
}

export async function listarConversas(): Promise<ConversaSalva[]> {
  const { data } = await cliente().models.ChatConversation.list();
  return (data ?? [])
    .map((c) => ({
      id: String(c.id),
      title: c.title ?? SEM_TITULO,
      startedAt: c.startedAt ?? null,
      lastMessageAt: c.lastMessageAt ?? null,
      messageCount: c.messageCount ?? 0,
    }))
    // Mais recente primeiro. Conversa sem `lastMessageAt` cai para o fim em
    // vez de sumir: ela existe, e a pessoa precisa poder apagá-la.
    .sort((a, b) => (b.lastMessageAt ?? b.startedAt ?? '').localeCompare(a.lastMessageAt ?? a.startedAt ?? ''));
}

export async function lerMensagens(conversationId: string) {
  const { data } = await cliente().models.ChatMessage.listChatMessageByConversationId({
    conversationId,
  });
  return (data ?? [])
    .map((m) => ({
      id: String(m.id),
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content ?? '',
      createdAt: m.createdAt ?? null,
      citations: lerCitacoesGravadas(m.citations),
    }))
    // Em memória, porque o índice não tem chave de ordenação -- ver o
    // comentário em `amplify/data/schemas/chat.ts`. Mensagem sem data vai para
    // o fim em vez de sumir.
    .sort((a, b) => (a.createdAt ?? '9999').localeCompare(b.createdAt ?? '9999'));
}

function lerCitacoesGravadas(bruto: string | null | undefined): Citation[] {
  if (!bruto) return [];
  try {
    const lido = JSON.parse(bruto);
    return Array.isArray(lido) ? (lido as Citation[]) : [];
  } catch {
    // Citação corrompida some da bolha, mas não derruba a conversa: o texto
    // continua legível, e é ele que a pessoa veio ler.
    return [];
  }
}

/**
 * Apagar significa sumir (D33).
 *
 * As mensagens saem ANTES da conversa, e essa ordem não é detalhe: na ordem
 * inversa, uma falha no meio deixaria mensagens sem conversa a que pertencer, e
 * nada na tela para apagá-las.
 *
 * Não existe marcação lógica de apagado em lugar nenhum — a D33 recusou
 * "apagar depois" porque "apagado" passaria a significar duas coisas ao mesmo
 * tempo.
 */
export async function apagarConversa(conversationId: string): Promise<void> {
  const { data } = await cliente().models.ChatMessage.listChatMessageByConversationId({
    conversationId,
  });

  for (const mensagem of data ?? []) {
    await cliente().models.ChatMessage.delete({ id: String(mensagem.id) });
  }

  await cliente().models.ChatConversation.delete({ id: conversationId });
}

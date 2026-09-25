/**
 * Resumo do arquivo:
 * Agrupa as conversas da gaveta de histórico por período.
 *
 * Os rótulos são de TEMPO, e só. "Conversas importantes" ou "Sobre seus
 * exames" exigiriam ler o conteúdo da conversa e classificá-lo — que é
 * exatamente o que este projeto não faz com dado de saúde. O tempo é um fato
 * sobre a conversa; o assunto seria uma leitura dela.
 *
 * Módulo puro: sem React, sem Amplify. O relógio entra por parâmetro para que
 * os casos de fronteira — a conversa de 23h59 de ontem — sejam testáveis sem
 * congelar o tempo do processo.
 */
import type { ConversaSalva } from '@/services/chatHistoryService';

export type GrupoDeConversas = {
  group: string;
  items: ConversaSalva[];
};

/** A ordem em que os grupos aparecem. Grupo sem conversa não é mostrado. */
const PERIODOS = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias', 'Mais antigas'] as const;

/** Meia-noite do dia da data, no fuso do aparelho. */
function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * O corte é por DIA DE CALENDÁRIO, e não por 24 horas corridas. "Ontem"
 * significa ontem para a pessoa: uma conversa das 23h59 de ontem é de ontem,
 * mesmo tendo menos de 24 horas.
 */
function periodoDe(quando: string | null, agora: Date): (typeof PERIODOS)[number] {
  // Conversa sem data vai para o fim em vez de sumir: ela existe, e a pessoa
  // precisa poder abri-la e apagá-la.
  if (!quando) return 'Mais antigas';

  const data = new Date(quando);
  if (Number.isNaN(data.getTime())) return 'Mais antigas';

  const diasDeDiferenca = Math.round(
    (inicioDoDia(agora).getTime() - inicioDoDia(data).getTime()) / UM_DIA_MS,
  );

  if (diasDeDiferenca <= 0) return 'Hoje';
  if (diasDeDiferenca === 1) return 'Ontem';
  if (diasDeDiferenca <= 7) return 'Últimos 7 dias';
  if (diasDeDiferenca <= 30) return 'Últimos 30 dias';
  return 'Mais antigas';
}

function quandoDe(conversa: ConversaSalva): string | null {
  return conversa.lastMessageAt ?? conversa.startedAt ?? null;
}

export function agruparPorPeriodo(
  conversas: ConversaSalva[],
  agora: Date = new Date(),
): GrupoDeConversas[] {
  const porPeriodo = new Map<string, ConversaSalva[]>();

  for (const conversa of conversas) {
    const periodo = periodoDe(quandoDe(conversa), agora);
    porPeriodo.set(periodo, [...(porPeriodo.get(periodo) ?? []), conversa]);
  }

  return PERIODOS.filter((periodo) => porPeriodo.has(periodo)).map((periodo) => ({
    group: periodo,
    items: [...(porPeriodo.get(periodo) ?? [])].sort((a, b) =>
      // Mais recente primeiro. Conversa sem data vai para o fim do grupo dela.
      (quandoDe(b) ?? '').localeCompare(quandoDe(a) ?? ''),
    ),
  }));
}

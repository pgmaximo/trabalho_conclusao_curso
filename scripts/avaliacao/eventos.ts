/**
 * Resumo do arquivo:
 * Le as linhas de log de UM turno e devolve as metricas dele.
 *
 * A pipeline de avaliacao (G7, Bloco 10) nao instrumenta nada por conta
 * propria: ela le os MESMOS eventos que a funcao deixa no CloudWatch em
 * producao -- `geracao-concluida`, `resposta-reprovada` e
 * `encaminhamento-*`. Se ela contasse de outro jeito, o numero da rodada e o
 * da producao divergiriam em silencio, e nenhum dos dois serviria para
 * calibrar o outro.
 *
 * Modulo PURO.
 */

export type Reprovacao = { etapa: string; regras: string[]; citacoesConferem: boolean };

export type EventosDoTurno = {
  /** Quantas geracoes o turno pagou: 1 (aprovada de primeira) ou 2 (D31). */
  geracoes: number;
  reprovacoes: Reprovacao[];
  /** Quem escreveu o encaminhamento (D38), ou null em pergunta operacional. */
  encaminhamento: 'costurado' | 'do-modelo' | null;
  entrada: number;
  saida: number;
  /** Geracoes que nao viraram resposta, e por que (Bloco 10). Antes deste
   *  evento existir, o turno caia no degradado sem dizer o motivo. */
  falhas: { etapa: string; motivo: string }[];
};

type Evento = Record<string, unknown> & { evento?: unknown };

function comoEvento(linha: string): Evento | null {
  try {
    const objeto: unknown = JSON.parse(linha);
    return objeto && typeof objeto === 'object' && 'evento' in objeto ? (objeto as Evento) : null;
  } catch {
    return null;
  }
}

const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function lerEventos(linhas: string[]): EventosDoTurno {
  const saida: EventosDoTurno = {
    geracoes: 0,
    reprovacoes: [],
    encaminhamento: null,
    entrada: 0,
    saida: 0,
    falhas: [],
  };

  for (const linha of linhas) {
    const e = comoEvento(linha);
    if (!e) continue;

    switch (e.evento) {
      case 'geracao-concluida':
        saida.geracoes += 1;
        saida.entrada += numero(e.entrada);
        saida.saida += numero(e.saida);
        break;
      case 'resposta-reprovada':
        saida.reprovacoes.push({
          etapa: String(e.etapa ?? ''),
          regras: Array.isArray(e.regras) ? e.regras.map(String) : [],
          citacoesConferem: e.citacoes === 'conferem',
        });
        break;
      case 'geracao-falhou':
        saida.falhas.push({ etapa: String(e.etapa ?? ''), motivo: String(e.motivo ?? '') });
        break;
      case 'encaminhamento-costurado':
        saida.encaminhamento = 'costurado';
        break;
      case 'encaminhamento-do-modelo':
        saida.encaminhamento = 'do-modelo';
        break;
      default:
        break;
    }
  }
  return saida;
}

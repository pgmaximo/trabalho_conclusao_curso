/**
 * Resumo do arquivo:
 * Limite de chamadas por dono. A estrutura de arquivos do plano declara este
 * arquivo e a lista de tarefas o exige -- "sem isso, o endereco direto e uma
 * conta de Bedrock aberta" -- mas nenhuma tarefa do plano o especifica. O
 * desenho abaixo e nosso, e esta registrado como achado.
 *
 * ATE ONDE ESTE ARQUIVO PROTEGE, e isto importa mais que o codigo:
 * a contagem vive na MEMORIA DA INSTANCIA. Ela pega o caso comum -- uma
 * pessoa segurando o botao de enviar, um cliente em laco -- porque chamadas
 * seguidas do mesmo dono caem na mesma instancia quente. Ela NAO e um limite
 * de conta: com varias instancias, cada uma tem seu proprio contador.
 *
 * O teto que nao depende de instancia e a concorrencia reservada da funcao,
 * declarada no backend.ts. Sao duas defesas para dois problemas diferentes, e
 * nenhuma das duas substitui a outra. Um limite forte por dono exigiria uma
 * tabela e uma escrita por turno; fica registrado como o proximo passo se a
 * medicao da C10 mostrar que o caso comum nao e o unico.
 */

/** Chamadas por dono dentro da janela. */
export const MAX_POR_JANELA = 20;

/** Tamanho da janela deslizante. */
export const JANELA_MS = 60_000;

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Os instantes das ultimas chamadas de cada dono. Janela DESLIZANTE, e nao
 * balde por periodo: num balde fixo, quem gasta o teto no fim de um periodo
 * recebe o teto inteiro um segundo depois.
 */
const chamadas = new Map<string, number[]>();

function limparAntigos(agora: number): void {
  for (const [dono, instantes] of chamadas) {
    const vivos = instantes.filter((t) => agora - t < JANELA_MS);
    if (vivos.length === 0) chamadas.delete(dono);
    else chamadas.set(dono, vivos);
  }
}

export function checkRateLimit(owner: string, agora: number = Date.now()): RateLimitDecision {
  limparAntigos(agora);

  const instantes = chamadas.get(owner) ?? [];
  if (instantes.length >= MAX_POR_JANELA) {
    // Quando a mais antiga da janela expirar, abre uma vaga. Arredondar para
    // cima evita mandar a pessoa tentar exatamente no instante em que ainda
    // seria recusada.
    const maisAntiga = Math.min(...instantes);
    const faltamMs = JANELA_MS - (agora - maisAntiga);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(faltamMs / 1000)) };
  }

  chamadas.set(owner, [...instantes, agora]);
  return { allowed: true };
}

/** So para teste: zera a contagem entre casos. */
export function resetRateLimit(): void {
  chamadas.clear();
}

/** So para teste: prova que dono inativo e esquecido. */
export function donosEmMemoria(): string[] {
  return [...chamadas.keys()];
}

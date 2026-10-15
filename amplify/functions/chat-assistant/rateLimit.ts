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
 * E NAO HA, HOJE, UM TETO QUE NAO DEPENDA DE INSTANCIA. O desenho previa a
 * concorrencia reservada da funcao para esse papel, e a conta recusou: a cota
 * de concorrencia dela e pequena demais para reservar qualquer fatia sem
 * derrubar as outras funcoes do aplicativo. A razao medida esta no backend.ts,
 * com a mensagem que a AWS devolveu.
 *
 * O que sobra, entao, e este arquivo mais a exigencia de token do `auth.ts` e
 * os tetos por turno do `conversationLoop.ts`. O que NAO esta coberto e uma
 * enxurrada de donos distintos e autenticados ao mesmo tempo. Um limite forte
 * por dono exigiria uma tabela e uma escrita por turno, e e isso -- nao a
 * concorrencia reservada -- que deve ser feito se a medicao da C10 mostrar que
 * o caso comum deixou de ser o unico.
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

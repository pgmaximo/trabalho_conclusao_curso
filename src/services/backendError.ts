/**
 * Resumo do arquivo:
 * Erro do backend -> erro que pode ir para a tela.
 *
 * Os serviços montavam a mensagem do erro com o texto que o backend devolvia
 * ("Unauthorized", "Network error", "The conditional request failed"), e só
 * usavam a frase em português se esse texto viesse vazio. Como as telas
 * mostram `error.message`, a pessoa lia o texto técnico, em inglês.
 *
 * Aqui é o contrário: a pessoa lê a frase em português, e o texto técnico vai
 * para o console e fica em `detail`, para diagnóstico e para o código que
 * precisa reconhecer um erro específico (ver `technicalDetail`).
 */

type BackendErrorItem = { message?: string | null } | null | undefined;

export class BackendError extends Error {
  /** O que o backend disse, sem tradução. Nunca vai para a tela. */
  readonly detail: string;

  constructor(friendlyMessage: string, detail: string) {
    super(friendlyMessage);
    this.name = 'BackendError';
    this.detail = detail;
  }
}

export function backendError(
  errors: readonly BackendErrorItem[] | null | undefined,
  friendlyMessage: string,
): BackendError {
  const detail = (errors ?? [])
    .map((item) => item?.message)
    .filter(Boolean)
    .join('; ');

  if (detail) {
    console.warn(`${friendlyMessage} Detalhe técnico: ${detail}`);
  }

  return new BackendError(friendlyMessage, detail);
}

/**
 * O texto técnico de um erro, para quem precisa RECONHECER o erro (e não
 * mostrá-lo): o detalhe do backend quando houver, senão a própria mensagem.
 */
export function technicalDetail(error: unknown): string {
  if (error instanceof BackendError && error.detail) return error.detail;
  return error instanceof Error ? error.message : String(error);
}

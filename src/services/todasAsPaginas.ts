/**
 * Resumo do arquivo:
 * Le uma consulta do Amplify Data ate a ultima pagina.
 *
 * Existe porque duas leituras deste aplicativo paravam na primeira pagina sem
 * dizer (Bloco 11): a lista de linhas da tela do documento, e -- se tivesse
 * sido escrita do mesmo jeito -- a exclusao em cascata, que deixaria sobrar
 * exatamente as linhas que nao coubessem na primeira pagina.
 *
 * Erro em QUALQUER pagina lanca. Uma lista pela metade tratada como inteira e
 * o defeito que este arquivo existe para fechar.
 */

type Pagina<T> = {
  data: T[] | null | undefined;
  nextToken?: string | null;
  errors?: { message?: string | null }[] | null;
};

export async function todasAsPaginas<T>(
  buscar: (nextToken: string | null) => Promise<Pagina<T>>,
): Promise<T[]> {
  const itens: T[] = [];
  let cursor: string | null = null;
  do {
    const pagina: Pagina<T> = await buscar(cursor);
    if (pagina.errors?.length) {
      const mensagem = pagina.errors.map((e) => e.message).filter(Boolean).join('; ');
      throw new Error(mensagem || 'Não foi possível ler a lista inteira.');
    }
    itens.push(...(pagina.data ?? []));
    cursor = pagina.nextToken ?? null;
  } while (cursor);
  return itens;
}

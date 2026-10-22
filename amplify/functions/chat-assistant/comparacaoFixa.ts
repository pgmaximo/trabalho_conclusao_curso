/**
 * Resumo do arquivo:
 * A frase fixa da comparacao lado a lado (E10, D10.1 = B), escrita pelo
 * APLICATIVO, e nao pelo modelo -- mesmo desenho do encaminhamento da R2
 * (`encaminhamento.ts`). O estudo do E10.2 pediu que a ressalva de que a
 * comparacao nao mostra causa fosse fixa: deixada ao modelo, ela sai so as
 * vezes, e com palavras que ninguem revisou.
 */
import { acrescentarAoFim } from './encaminhamento';

export const TEXTO_DA_COMPARACAO = 'Os dados aparecem lado a lado, e isso não mostra se um influenciou o outro.';

type SaidaDeFerramenta = { name: string; output: unknown };

/** Houve ao menos um par lado a lado neste turno? Sem par, nao ha o que
 *  ressalvar -- a frase solta embaixo de "nao encontrei esse exame" so confunde. */
function houvePar(toolOutputs: SaidaDeFerramenta[]): boolean {
  return toolOutputs.some(({ name, output }) => {
    if (name !== 'consultar_comparacao') return false;
    const saida = output as { disponivel?: unknown; pares?: unknown } | null;
    return saida?.disponivel === true && Array.isArray(saida.pares) && saida.pares.length > 0;
  });
}

/**
 * Acrescenta a frase ao FIM, quando houve par e ela ainda nao esta no texto.
 * Nunca no meio, e nunca duas vezes: pelos mesmos motivos de `costurar`.
 */
export function costurarComparacao(texto: string, toolOutputs: SaidaDeFerramenta[]): string {
  if (!houvePar(toolOutputs) || texto.includes(TEXTO_DA_COMPARACAO)) return texto;
  return acrescentarAoFim(texto, TEXTO_DA_COMPARACAO);
}

/**
 * Resumo do arquivo:
 * O corte da observacao de texto livre que vai ao modelo. Nasceu privado em
 * `medicamentosSaida.ts` (E2) e mora aqui desde o E5, quando consultas e
 * vacinas passaram a devolver observacao: com tres ferramentas, uma copia por
 * ferramenta acabaria cortando em tamanhos diferentes.
 *
 * Observacao e o que a pessoa escreveu, de qualquer tamanho. O teto limita o
 * custo no contexto do modelo, e `observacoesCortadas` existe porque, sem ele,
 * o modelo trataria um trecho como a anotacao inteira.
 */
import { texto } from './ownerScopedRead';

export const MAX_CARACTERES_OBSERVACAO = 300;

export function observacaoComTeto(valor: unknown): { observacoes: string | null; observacoesCortadas: boolean } {
  const nota = texto(valor);
  if (nota === null) return { observacoes: null, observacoesCortadas: false };
  return {
    observacoes: nota.slice(0, MAX_CARACTERES_OBSERVACAO),
    observacoesCortadas: nota.length > MAX_CARACTERES_OBSERVACAO,
  };
}

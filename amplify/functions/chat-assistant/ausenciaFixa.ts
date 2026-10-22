/**
 * Resumo do arquivo:
 * A frase fixa da ausencia (DS14 = C1, E6 #2 da conferencia no sandbox),
 * escrita pelo APLICATIVO, como o encaminhamento (`encaminhamento.ts`) e a
 * ressalva da comparacao (`comparacaoFixa.ts`). O modelo diz que o dia pedido
 * "fica fora desse periodo", com palavras que a R5 nao conhece, e cada
 * correcao por lexico corria atras da proxima parafrase.
 *
 * So costura quando o texto repete a data limite que a ferramenta devolveu
 * (`dadosAte`): e ela que prova que o modelo viu o limite. Sem essa prova,
 * costurar tiraria da R5 o que ela verifica -- "Seu acompanhamento esta em
 * dia" passaria num turno sem dado nenhum.
 */
import { reconheceAusencia } from '../ai-language-rules/languageRules';
import { acrescentarAoFim } from './encaminhamento';
import { formatarData } from './formatoPtBr';

export const TEXTO_DA_AUSENCIA = 'Não há registro no aplicativo para o que foi pedido.';

type SaidaDeFerramenta = { name: string; output: unknown };

/** As datas limite (DD/MM/AAAA e DD/MM) das ferramentas que disseram que nao ha dado. */
function datasLimite(toolOutputs: SaidaDeFerramenta[]): string[] {
  return toolOutputs.flatMap(({ output }) => {
    const saida = output as { disponivel?: unknown; dadosAte?: unknown } | null;
    if (saida?.disponivel !== false || typeof saida.dadosAte !== 'string') return [];
    const completa = formatarData(saida.dadosAte);
    return [completa, completa.slice(0, 5)];
  });
}

export function costurarAusencia(texto: string, toolOutputs: SaidaDeFerramenta[], semDados: boolean): string {
  if (!semDados || reconheceAusencia(texto)) return texto;
  if (!datasLimite(toolOutputs).some((data) => texto.includes(data))) return texto;
  return acrescentarAoFim(texto, TEXTO_DA_AUSENCIA);
}

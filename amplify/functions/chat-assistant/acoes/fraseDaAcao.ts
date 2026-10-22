/**
 * Resumo do arquivo:
 * A frase de que o formulario esta pronto (E11), escrita pelo APLICATIVO e nao
 * pelo modelo -- mesmo desenho do encaminhamento da R2 e da frase da
 * comparacao (`comparacaoFixa.ts`).
 *
 * Por que do aplicativo (revisao do E11, achado 1): a acao e conferida DEPOIS
 * de o texto ser escrito, e e descartada em silencio quando nenhum campo
 * sobrevive. Escrita pelo modelo, "preparei o formulario" saia tambem nesses
 * turnos, e a pessoa lia que havia um formulario sem ver botao nenhum. Aqui a
 * frase so entra quando o cartao sai.
 */
import { acrescentarAoFim } from '../encaminhamento';

export const TEXTO_DA_ACAO =
  'Deixei o formulário preenchido com o que você disse, no botão abaixo. Nada foi salvo: confira e toque em Salvar.';

/** Ao fim, e nunca duas vezes. */
export function costurarAcao(texto: string): string {
  return texto.includes(TEXTO_DA_ACAO) ? texto : acrescentarAoFim(texto, TEXTO_DA_ACAO);
}

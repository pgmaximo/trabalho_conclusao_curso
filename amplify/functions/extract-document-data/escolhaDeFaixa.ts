/**
 * Resumo do arquivo:
 * Conta quantas vezes o modelo ESCOLHEU uma linha da tabela de referencia --
 * por sexo, por idade, por grupo -- em vez de transcrever a tabela.
 *
 * Por que CONTAR e nao REPROVAR: descartar uma extracao boa por causa de uma
 * palavra e o erro que a R2 cometia contra a conversa, e que o Bloco 8
 * consertou. A instrucao de nao escolher esta no prompt; este modulo mede se
 * ela foi obedecida, e o numero e o que decide se a instrucao basta.
 *
 * O achado que o originou e uma frase real da extracao de 2026-09-19:
 * "Vitamina C: intervalo difere por sexo; foi utilizado o intervalo masculino
 * pois o paciente e do sexo masculino." Ela estava em `warnings`, que nenhuma
 * tela le e nenhum teste olhava.
 *
 * Modulo PURO: sem AWS, sem I/O. Quem escreve o log e o handler.
 */

/** O que caracteriza a escolha e o VERBO DE USO perto de "faixa"/"intervalo".
 *  A simples mencao de que a faixa varia ("o laudo apresenta faixa por sexo")
 *  e transcricao, e nao entra na conta -- se entrasse, o numero viraria ruido
 *  e ninguem olharia mais para ele. */
const VERBOS_DE_ESCOLHA =
  'utilizad|utilizamos|usad|usamos|escolhid|escolhemos|adotad|adotamos|consideramos|aplicad';

const ALVO = 'intervalo|faixa';

/** As duas ordens da frase em portugues: "utilizamos o intervalo X" e "a faixa
 *  foi escolhida por Y". Sem as duas, metade dos casos passa batido. */
const VERBO_ANTES = new RegExp(`(${VERBOS_DE_ESCOLHA})[^.;]{0,60}(${ALVO})`, 'i');
const VERBO_DEPOIS = new RegExp(`(${ALVO})[^.;]{0,60}(${VERBOS_DE_ESCOLHA})`, 'i');

export function escolheuFaixa(aviso: string): boolean {
  return VERBO_ANTES.test(aviso) || VERBO_DEPOIS.test(aviso);
}

/**
 * Quantos avisos declaram uma escolha de faixa. Conta AVISOS, e nao
 * ocorrencias: dois analitos escolhidos no mesmo aviso sao um sinal, nao dois.
 */
export function contarEscolhasDeFaixa(avisos: string[]): number {
  return avisos.filter(escolheuFaixa).length;
}

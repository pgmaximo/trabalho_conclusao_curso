/**
 * Resumo do arquivo:
 * O dia de "hoje", em AAAA-MM-DD, no fuso de Sao Paulo. A Lambda roda em UTC:
 * entre 21h e meia-noite em Brasilia o dia do UTC ja e o seguinte, e a tela
 * mostraria campanhas diferentes das do chat (que usa o dia de Brasilia desde
 * o E8, em chat-assistant/formatoPtBr.ts). Copia minima e de proposito: as
 * funcoes nao importam codigo umas das outras.
 */
const FORMATADOR = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** O locale en-CA entrega AAAA-MM-DD direto. */
export function diaDeHoje(instante: Date): string {
  return FORMATADOR.format(instante);
}

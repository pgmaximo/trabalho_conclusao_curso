/**
 * Resumo do arquivo:
 * PROVISORIO da tarefa 7 -- a orquestracao de verdade e a tarefa 10.
 *
 * Existe agora porque `defineFunction` exige um ponto de entrada para a
 * funcao poder ser registrada, receber permissao e ser publicada. O que ele
 * ja garante e a unica garantia que a tarefa 10 nao pode perder: esta funcao
 * NUNCA LANCA. Invocacao assincrona com excecao nao tratada deixaria o
 * documento preso em PROCESSING para sempre.
 */

type ExtractionEvent = { documentId?: string; owner?: string };

export async function handler(event: ExtractionEvent): Promise<{ ok: boolean; motivo: string }> {
  return Promise.resolve({
    ok: false,
    motivo: `Extracao ainda nao implementada (tarefa 10). documentId=${event.documentId ?? 'ausente'}`,
  });
}

/**
 * Resumo do arquivo:
 * O indice das linhas que as ferramentas devolveram neste turno.
 *
 * Ele serve a duas coisas que parecem uma so e nao sao:
 *
 * 1. **Conferir a R4.** Uma citacao que aponta para uma linha que nenhuma tool
 *    devolveu foi inventada, e so da para saber isso aqui -- quem chamou as
 *    ferramentas e quem sabe o que elas entregaram.
 *
 * 2. **Enriquecer a citacao para a tela.** O modelo devolve so os
 *    identificadores (e o que ele consegue copiar sem errar); o rotulo, o
 *    valor e a unidade vem daqui, do dado real. Pedir que ele repita o valor
 *    dentro da citacao seria abrir uma segunda via para o numero divergir do
 *    que esta no banco.
 */
import { formatarDecimal } from './formatoPtBr';
import type { Citation } from './types';

type ColetaDaTool = {
  id?: unknown;
  valor?: unknown;
  unidade?: unknown;
  dataDaColeta?: unknown;
  documentoId?: unknown;
};

/**
 * Le a saida da tool de analitos e monta o indice. As outras tools nao entram:
 * citacao aponta para a LINHA de onde um valor de exame saiu, e nenhuma outra
 * tool devolve linha de exame.
 */
export function indexarLinhasCitaveis(
  toolOutputs: { name: string; output: unknown }[],
): Map<string, Citation> {
  const indice = new Map<string, Citation>();

  for (const { name, output } of toolOutputs) {
    if (name !== 'consultar_analito') continue;

    const saida = output as {
      nome?: unknown;
      series?: { unidade?: unknown; coletas?: ColetaDaTool[] }[];
    };
    if (!Array.isArray(saida?.series)) continue;

    const rotulo = typeof saida.nome === 'string' ? saida.nome : '';

    for (const serie of saida.series) {
      for (const coleta of serie.coletas ?? []) {
        const id = typeof coleta.id === 'string' ? coleta.id : null;
        if (!id) continue;
        indice.set(id, {
          resultId: id,
          documentId: typeof coleta.documentoId === 'string' ? coleta.documentoId : '',
          analyteLabel: rotulo,
          value: typeof coleta.valor === 'number' ? formatarDecimal(coleta.valor) : '—',
          unit: typeof coleta.unidade === 'string' ? coleta.unidade : '',
          collectedAt: typeof coleta.dataDaColeta === 'string' ? coleta.dataDaColeta : null,
        });
      }
    }
  }

  return indice;
}

/**
 * Troca as citacoes do modelo pelas do indice. Citacao que nao esta no indice
 * e DESCARTADA em vez de passar adiante crua: ela ja reprovou a verificacao da
 * R4, e deixa-la na bolha daria a pessoa um atalho para um documento que pode
 * nao existir.
 */
export function enriquecerCitacoes(
  doModelo: { resultId: string }[],
  indice: Map<string, Citation>,
): Citation[] {
  return doModelo
    .map((c) => indice.get(c.resultId))
    .filter((c): c is Citation => c !== undefined);
}

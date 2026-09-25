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

type LinhaDeResultados = {
  id?: unknown;
  analito?: unknown;
  valor?: unknown;
  unidade?: unknown;
  dataDaColeta?: unknown;
  documentoId?: unknown;
};

function comoCitacao(
  id: unknown,
  rotulo: string,
  l: { valor?: unknown; unidade?: unknown; dataDaColeta?: unknown; documentoId?: unknown },
): Citation | null {
  if (typeof id !== 'string' || id === '') return null;
  return {
    resultId: id,
    documentId: typeof l.documentoId === 'string' ? l.documentoId : '',
    analyteLabel: rotulo,
    value: typeof l.valor === 'number' ? formatarDecimal(l.valor) : '—',
    unit: typeof l.unidade === 'string' ? l.unidade : '',
    collectedAt: typeof l.dataDaColeta === 'string' ? l.dataDaColeta : null,
  };
}

/**
 * Le a saida das tools que devolvem LINHA DE EXAME e monta o indice: a
 * `consultar_analito` (serie de um analito) e a `consultar_resultados` (as
 * linhas de um documento, ou as mais recentes). As outras nao entram -- uma
 * consulta agendada nao e uma linha de exame.
 *
 * A `consultar_resultados` so entrou no Bloco 10. Ela nasceu no Bloco 8, e ate
 * aqui o comentario deste arquivo dizia que nenhuma outra tool alem da de
 * analitos devolvia linha: as citacoes das respostas que ela alimentava eram
 * descartadas no enriquecimento, e a pessoa via o numero sem origem.
 */
export function indexarLinhasCitaveis(
  toolOutputs: { name: string; output: unknown }[],
): Map<string, Citation> {
  const indice = new Map<string, Citation>();

  for (const { name, output } of toolOutputs) {
    if (name === 'consultar_resultados') {
      const linhas = (output as { resultados?: unknown } | null)?.resultados;
      if (!Array.isArray(linhas)) continue;
      for (const l of linhas as LinhaDeResultados[]) {
        const c = comoCitacao(l.id, typeof l.analito === 'string' ? l.analito : '', l);
        if (c) indice.set(c.resultId, c);
      }
      continue;
    }
    if (name !== 'consultar_analito') continue;

    const saida = output as {
      nome?: unknown;
      series?: { unidade?: unknown; coletas?: ColetaDaTool[] }[];
    };
    if (!Array.isArray(saida?.series)) continue;

    const rotulo = typeof saida.nome === 'string' ? saida.nome : '';

    for (const serie of saida.series) {
      for (const coleta of serie.coletas ?? []) {
        const c = comoCitacao(coleta.id, rotulo, coleta);
        if (c) indice.set(c.resultId, c);
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

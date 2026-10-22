/**
 * Resumo do arquivo:
 * `consultar_comparacao` (E10, 10.2, D10.1 = B): um resultado de exame ao lado
 * da media de sono ou de passos dos 28 dias antes da coleta. Esta parte so le
 * -- os resultados e as importacoes por `lerDoDono`, a serie diaria do wearable
 * pela porta do dono (E6) --; a serie do exame e a de `consultar_analito`
 * (`serieDoAnalito`), e os pares sao montados em `comparacaoSaida.ts`.
 *
 * Os pares sao FECHADOS no schema (`sono`, `passos`): o estudo do E10.2 so
 * achou defensavel exame com wearable, e outra metrica entraria por decisao,
 * nao por um texto que o modelo escreveu.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno } from '../types';
import { serieDoAnalito } from './analitos';
import {
  datasDasColetasMostradas,
  MAX_SERIES_LIDAS,
  type DadoDoWearable,
  montarComparacao,
  proximasParaLer,
  renderizarComparacao,
} from './comparacaoSaida';
import { comoLinha } from './linhasDeResultado';
import { lerDoDonoComCorte, lerSerieDaImportacao, type LinhaDoBanco } from './ownerScopedRead';
import type { SerieDiaria } from './serieDiaria';
import type { ChatTool } from './tipos';

const entrada = z
  .object({ termo: z.string().min(1).max(60), dadoDoWearable: z.enum(['sono', 'passos']) })
  .strict();

/**
 * As series diarias que as coletas mostradas pedem, em rodadas, ate
 * `MAX_SERIES_LIDAS` arquivos, com o cache do turno. Cada rodada le em
 * paralelo; a seguinte so existe quando uma importacao preferida nao serviu e
 * uma mais antiga da mesma janela pode servir (`proximasParaLer`). So as datas
 * das coletas mais recentes entram: as outras nao viram par.
 */
async function lerSeries(
  datas: string[],
  linhasDeImportacao: LinhaDoBanco[],
  dado: DadoDoWearable,
  contexto?: ContextoDoTurno,
): Promise<Map<string, SerieDiaria | null>> {
  const series = new Map<string, SerieDiaria | null>();

  while (series.size < MAX_SERIES_LIDAS) {
    const proximas = proximasParaLer(linhasDeImportacao, datas, series, dado).slice(0, MAX_SERIES_LIDAS - series.size);
    if (proximas.length === 0) break;
    const lidas = await Promise.all(proximas.map((imp) => lerSerieDaImportacao(imp.linha, contexto?.series)));
    proximas.forEach((imp, i) => series.set(imp.id, lidas[i]));
  }
  return series;
}

export const comparacaoTool: ChatTool = {
  name: 'consultar_comparacao',
  description:
    'Mostra um resultado de exame do usuário ao lado da média de sono ou de passos do wearable nos 28 dias antes da coleta, em dois blocos separados, cada um com sua data. Aceita o nome do exame em português. NÃO relaciona um com o outro, NÃO diz se um influenciou o outro, NÃO interpreta e NÃO grava.',
  inputSchema: entrada,
  readOnly: true,
  async run(input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const pedido = input as z.infer<typeof entrada>;
    const [resultados, importacoes] = await Promise.all([
      lerDoDonoComCorte(process.env.LAB_RESULT_TABLE_NAME, identity, contexto?.leituras),
      lerDoDonoComCorte(process.env.HEALTH_IMPORT_TABLE_NAME, identity, contexto?.leituras),
    ]);
    const serie = serieDoAnalito(resultados.linhas.map(comoLinha), { termo: pedido.termo });
    const series = await lerSeries(datasDasColetasMostradas(serie), importacoes.linhas, pedido.dadoDoWearable, contexto);
    const comparacao = montarComparacao(serie, importacoes.linhas, series, pedido.dadoDoWearable);
    // A leitura parou no teto (D10.4): pode haver coleta ou importacao que nao
    // foi vista, e a ausencia de par nao e certeza.
    return resultados.incompleta || importacoes.incompleta ? { ...comparacao, leituraIncompleta: true } : comparacao;
  },
  renderDegraded: renderizarComparacao,
};

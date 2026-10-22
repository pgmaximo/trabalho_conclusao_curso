/**
 * Resumo do arquivo:
 * `consultar_wearable_dias` (E6): o dia a dia de uma metrica do wearable, ou
 * dois periodos lado a lado. Esta parte so le -- a importacao por `lerDoDono`,
 * a serie por `lerSerieDaImportacao` -- e entrega a `wearableDiasSaida.ts`.
 *
 * A importacao e a de `consultar_wearable` (`ultimaImportacaoPronta`): a mais
 * recente, e so se ela concluiu. As duas ferramentas falam da mesma.
 *
 * As metricas sao FECHADAS no schema: um nome escrito pelo modelo nunca vira o
 * nome de uma serie lida.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno } from '../types';
import { lerDoDono, lerSerieDaImportacao } from './ownerScopedRead';
import { diaValido, METRICAS_DIARIAS, type MetricaDiaria } from './serieDiaria';
import type { ChatTool } from './tipos';
import { SEM_IMPORTACAO_PRONTA, ultimaImportacaoPronta } from './wearable';
import { montarSaidaDeDias, renderizarWearableDias } from './wearableDiasSaida';
import { periodoDaImportacao } from './wearableSaida';

/** Data de calendario que existe: "2026-02-30" passa no formato e nao no `Date`. */
const dia = z
  .string()
  .refine(diaValido, 'Data inexistente ou fora de AAAA-MM-DD.')
  // `runTool` troca o motivo da recusa por uma frase generica, entao o formato
  // precisa estar na descricao do campo: e a unica coisa que o modelo le.
  .describe('Dia no formato AAAA-MM-DD (ex.: 2026-10-15), um dia que existe no calendário.');

const entrada = z
  .object({
    metrica: z.enum(Object.keys(METRICAS_DIARIAS) as [MetricaDiaria, ...MetricaDiaria[]]),
    de: dia.optional(),
    ate: dia.optional(),
    comparar: z.boolean().optional(),
    compararDe: dia.optional().describe('Início do segundo período, AAAA-MM-DD; vai sempre junto de compararAte.'),
    compararAte: dia.optional().describe('Fim do segundo período, AAAA-MM-DD; vai sempre junto de compararDe.'),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.de && p.ate && p.de > p.ate) ctx.addIssue({ code: 'custom', message: '`de` depois de `ate`.' });
    if (Boolean(p.compararDe) !== Boolean(p.compararAte)) {
      ctx.addIssue({ code: 'custom', message: '`compararDe` e `compararAte` vão juntos.' });
    }
    if (p.compararDe && p.compararAte && p.compararDe > p.compararAte) {
      ctx.addIssue({ code: 'custom', message: '`compararDe` depois de `compararAte`.' });
    }
  });

/** Neutra de proposito: a causa pode ser o arquivo grande demais ou a chave
 *  fora da forma, e "importe de novo" prometeria o que nao resolve. */
const SEM_SERIE =
  'A série dia a dia desta importação não está disponível. O resumo continua em consultar_wearable, e a tela de Wearable mostra a análise.';

export const wearableDiasTool: ChatTool = {
  name: 'consultar_wearable_dias',
  description:
    'Mostra dia a dia, ou compara dois períodos, uma métrica do wearable (sono, passos, frequência cardíaca de repouso ou média, estresse), a partir da última importação do usuário, que vai só até o dia em que ele exportou. NÃO é o resumo da importação (consultar_wearable), NÃO relaciona com exames (consultar_comparacao), NÃO interpreta e NÃO grava.',
  inputSchema: entrada,
  readOnly: true,
  async run(input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const pedido = input as z.infer<typeof entrada>;
    const linhas = await lerDoDono(process.env.HEALTH_IMPORT_TABLE_NAME, identity, contexto?.leituras);
    const ultima = ultimaImportacaoPronta(linhas);
    if (!ultima) return { disponivel: false, explicacao: SEM_IMPORTACAO_PRONTA };

    const periodo = periodoDaImportacao(ultima);
    if (!periodo) return { disponivel: false, explicacao: SEM_SERIE };

    const serie = await lerSerieDaImportacao(ultima, contexto?.series);
    if (!serie) return { disponivel: false, explicacao: SEM_SERIE };

    return montarSaidaDeDias(serie, periodo, pedido);
  },
  renderDegraded: renderizarWearableDias,
};

/**
 * A tool de wearable. Ela e o molde de uma coisa que as outras repetem:
 * AUSENCIA DE DADO E RESPOSTA, NAO ERRO.
 *
 * "Nenhuma importacao de wearable" significa que a pessoa nao importou nada --
 * nada falhou. Devolver erro faria o modelo dizer que algo deu errado, e a R5
 * manda ele dizer o que nao sabe, nao inventar uma falha.
 *
 * Ela devolve o RESUMO ja calculado pela feature de wearable (metricsJson), e
 * nao a serie diaria inteira: o resumo cabe na janela do modelo e ja e o
 * recorte que aquela feature decidiu ser honesto.
 *
 * Desde o E6, ela traz tambem ate quando vao os dados (`dadosAte`: a
 * importacao e manual, e o dado nunca e de hoje), a lista das importacoes (6.1)
 * e a analise da tela recortada (D6.2 = A), montadas em `wearableSaida.ts`. O
 * dia a dia e de `consultar_wearable_dias`.
 */
import { z } from 'zod';

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import type { ChatIdentity } from '../auth';
import type { DegradedBlock, ContextoDoTurno } from '../types';
import { lerDoDono, maisRecentePrimeiro, texto, type LinhaDoBanco } from './ownerScopedRead';
import type { ChatTool } from './tipos';
import { analiseDaTela, lerMetricas, listarImportacoes } from './wearableSaida';

/** O texto de quem nao tem importacao pronta, um so para esta ferramenta e o
 *  panorama (E10). */
export const SEM_IMPORTACAO_PRONTA =
  'O usuário ainda não importou dados de wearable, ou a última importação não concluiu.';

/**
 * A importacao mais recente, e so se ela concluiu. NAO volta para uma pronta
 * mais antiga: a tela mostra a ultima, e o chat fala da mesma. Exportada para o
 * panorama do E10 dizer a mesma coisa que esta ferramenta.
 */
export function ultimaImportacaoPronta(linhas: LinhaDoBanco[]): LinhaDoBanco | null {
  const ultima = maisRecentePrimeiro(linhas, 'createdAt')[0];
  return ultima && ultima.status === 'READY' ? ultima : null;
}

/**
 * O resumo e texto de OUTRA IA, que nao passou pelas regras de linguagem do
 * chat, e o modo degradado e justamente o caminho de quando a resposta ja foi
 * reprovada (revisao do E6). Ele so entra se passar nelas; a R2 fica de fora
 * porque o encaminhamento e da montagem do degradado.
 */
function linhaDoResumo(resumo: string | undefined): string[] {
  if (!resumo) return [];
  const r = checkLanguageRules(resumo, { questionKind: 'clinica', temOrigem: true });
  const violacoes = r.ok ? [] : r.violations.filter((v) => v.rule !== 'R2');
  return violacoes.length ? [] : [`Análise da tela: ${resumo}`];
}

export const wearableTool: ChatTool = {
  name: 'consultar_wearable',
  description:
    'Consulta a última importação de dados de wearable do usuário (passos, sono, batimentos, estresse), com o período coberto, o resumo já calculado, o que a tela de análise mostrou e a lista das importações. NÃO mostra dia a dia (para isso, use consultar_wearable_dias), NÃO importa dados novos, NÃO grava e NÃO relaciona esses números com exames (para ver um exame ao lado do sono ou dos passos, use consultar_comparacao).',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const linhas = await lerDoDono(process.env.HEALTH_IMPORT_TABLE_NAME, identity, contexto?.leituras);
    const ultima = ultimaImportacaoPronta(linhas);
    // A lista vai tambem na ausencia: "a ultima falhou, mas ha uma anterior
    // pronta" e o que a pessoa precisa ouvir, e a tela mostra a situacao.
    const historico = listarImportacoes(linhas);

    if (!ultima) {
      return linhas.length
        ? { disponivel: false, explicacao: SEM_IMPORTACAO_PRONTA, ...historico }
        : { disponivel: false, explicacao: SEM_IMPORTACAO_PRONTA };
    }

    // metricsJson e string por decisao registrada em health-import.ts. Se ele
    // vier corrompido, a tool devolve ausencia -- nunca derruba o turno.
    const metricas = lerMetricas(ultima);
    if (!metricas.ok) {
      return {
        disponivel: false,
        explicacao: 'A última importação de wearable não pôde ser lida.',
        ...historico,
      };
    }

    return {
      disponivel: true,
      periodo: {
        inicio: texto(ultima.periodStart),
        fim: texto(ultima.periodEnd),
        dias: typeof ultima.dayCount === 'number' ? ultima.dayCount : null,
      },
      metricas: metricas.valor,
      dadosAte: texto(ultima.periodEnd),
      ...historico,
      analiseDaTela: analiseDaTela(ultima.insightsJson, ultima.warnings),
    };
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as {
      disponivel?: boolean;
      periodo?: { inicio: string | null; fim: string | null };
      analiseDaTela?: { resumo?: string } | null;
    };
    if (!saida?.disponivel || !saida.periodo) return null;
    const inicio = saida.periodo.inicio ?? 'data não informada';
    const fim = saida.periodo.fim ?? 'data não informada';
    return {
      titulo: 'Sua última importação de wearable',
      // Da analise, so o resumo: o modo degradado nao tem como dizer "o resto
      // esta na tela" com o cuidado que a resposta gerada tem.
      linhas: [`Período de ${inicio} a ${fim}`, ...linhaDoResumo(saida.analiseDaTela?.resumo)],
      citacoes: [],
    };
  },
};

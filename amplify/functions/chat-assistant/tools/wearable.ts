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
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock } from '../types';
import { lerDoDono, maisRecentePrimeiro, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

export const wearableTool: ChatTool = {
  name: 'consultar_wearable',
  description:
    'Consulta a última importação de dados de wearable do usuário (passos, sono, batimentos, estresse), com o período coberto e o resumo já calculado. NÃO importa dados novos, NÃO grava e NÃO relaciona esses números com exames.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity) {
    const linhas = await lerDoDono(process.env.HEALTH_IMPORT_TABLE_NAME, identity);
    const ultima = maisRecentePrimeiro(linhas, 'createdAt')[0];

    if (!ultima || ultima.status !== 'READY') {
      return {
        disponivel: false,
        explicacao:
          'O usuário ainda não importou dados de wearable, ou a última importação não concluiu.',
      };
    }

    // metricsJson e string por decisao registrada em health-import.ts. Se ele
    // vier corrompido, a tool devolve ausencia -- nunca derruba o turno.
    let metricas: unknown = null;
    try {
      metricas = JSON.parse(String(ultima.metricsJson ?? '{}'));
    } catch {
      return {
        disponivel: false,
        explicacao: 'A última importação de wearable não pôde ser lida.',
      };
    }

    return {
      disponivel: true,
      periodo: {
        inicio: texto(ultima.periodStart),
        fim: texto(ultima.periodEnd),
        dias: typeof ultima.dayCount === 'number' ? ultima.dayCount : null,
      },
      metricas,
    };
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as {
      disponivel?: boolean;
      periodo?: { inicio: string | null; fim: string | null };
    };
    if (!saida?.disponivel || !saida.periodo) return null;
    const inicio = saida.periodo.inicio ?? 'data não informada';
    const fim = saida.periodo.fim ?? 'data não informada';
    return {
      titulo: 'Sua última importação de wearable',
      linhas: [{ texto: `Período de ${inicio} a ${fim}` }],
    };
  },
};

/**
 * Resumo do arquivo:
 * As campanhas NACIONAIS de vacinacao ativas hoje -- as mesmas da tela de
 * Vacinacao (E8). A lista sai de `getCampanhasAtivas`, o calendario curado que
 * a Lambda da tela usa, e nao do cache de campanhas (P1 = A): o calendario e
 * igual para todas as UFs e nao depende de rede, entao o chat sempre sabe
 * responder, e responde o mesmo que a tela.
 *
 * O que fica de fora de proposito: a contagem amostral de doses que a tela
 * mostra (`dosesNoPeriodo`). Ela conta TODAS as vacinas da amostra na janela,
 * nao as da campanha, e na boca do modelo viraria "N pessoas tomaram esta
 * vacina".
 *
 * O que ela NAO e: indicacao. O calendario nao traz o publico de cada campanha,
 * e quem pode se vacinar e a unidade de saude que diz -- a saida carrega isso
 * como observacao fixa, e a ferramenta e classificada como clinica para a
 * resposta sair com o encaminhamento do aplicativo.
 */
import { z } from 'zod';

import {
  CAMPANHAS_VACINACAO_2026,
  getCampanhasAtivas,
  type CampanhaDefinicao,
} from '../../get-vaccination-campaigns/campaignCalendar';
import type { ChatIdentity } from '../auth';
import { dataEmSaoPaulo, formatarData } from '../formatoPtBr';
import type { ContextoDoTurno, DegradedBlock } from '../types';
import type { ChatTool } from './tipos';

const NENHUMA_ATIVA =
  'Nenhuma campanha nacional de vacinação do calendário que o aplicativo acompanha está ativa hoje.';
const FONTE =
  'Calendário de campanhas nacionais de vacinação do Ministério da Saúde, acompanhado pelo aplicativo.';
const OBSERVACAO =
  'O aplicativo não registra o público de cada campanha. Quem pode se vacinar é informado pela unidade de saúde.';
const AVISO_NORTE =
  'A região Norte tem calendário próprio para a vacinação contra a gripe, que o aplicativo não acompanha. As datas devem ser confirmadas com a unidade de saúde.';

type CampanhaParaOModelo = { nome: string; inicio: string; fim: string };

type SaidaCampanhas =
  | {
      disponivel: true;
      fonte: string;
      observacao: string;
      campanhas: CampanhaParaOModelo[];
      avisoRegiao?: string;
    }
  | { disponivel: false; explicacao: string; fonte: string; avisoRegiao?: string };

export const campanhasTool: ChatTool = {
  name: 'consultar_campanhas',
  description:
    'Diz quais campanhas nacionais de vacinação do calendário que o aplicativo acompanha estão ativas hoje, com nome e período — as mesmas da tela de Vacinação. NÃO diz quem deve se vacinar, NÃO conta doses aplicadas, NÃO lê a carteira do usuário (isso é consultar_vacinas) e NÃO diz onde se vacinar (isso é consultar_postos).',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  /**
   * A janela da gripe cadastrada nao vale para a regiao Norte, que tem
   * calendario proprio no 2o semestre (o calendario marca isso em
   * `ufsForaDaJanela`). Para essas UFs a campanha SAI da lista -- dizer "ativa
   * hoje" a quem mora em Belem seria anunciar campanha onde nao ha -- e o aviso
   * sai com OU sem campanha ativa. Aqui o chat diverge da tela de proposito: a
   * tela ainda nao le esse campo.
   */
  async run(_input: unknown, _identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const uf = contexto?.local?.uf ?? null;
    const valeAqui = (c: CampanhaDefinicao) => uf === null || !c.ufsForaDaJanela?.includes(uf);
    const ativas = getCampanhasAtivas(dataEmSaoPaulo(new Date())).filter(valeAqui);
    const aviso = CAMPANHAS_VACINACAO_2026.every(valeAqui) ? {} : { avisoRegiao: AVISO_NORTE };

    if (ativas.length === 0) {
      return { disponivel: false, explicacao: NENHUMA_ATIVA, fonte: FONTE, ...aviso } satisfies SaidaCampanhas;
    }
    return {
      disponivel: true,
      fonte: FONTE,
      observacao: OBSERVACAO,
      campanhas: ativas.map((c) => ({ nome: c.nome, inicio: c.janelaInicio, fim: c.janelaFim })),
      ...aviso,
    } satisfies SaidaCampanhas;
  },
  /**
   * O aviso do Norte entra no modo degradado tambem, e e por isso que o bloco
   * sai mesmo sem campanha ativa quando ha aviso: sem ele, quem mora no Norte
   * leria a lista nacional como se valesse para si (revisao do E8).
   */
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as Partial<Extract<SaidaCampanhas, { disponivel: true }>> | null;
    const linhas = [
      ...(saida?.disponivel && saida.campanhas
        ? saida.campanhas.map((c) => `${c.nome} · de ${formatarData(c.inicio)} a ${formatarData(c.fim)}`)
        : []),
      ...(saida?.avisoRegiao ? [saida.avisoRegiao] : []),
    ];
    if (linhas.length === 0) return null;
    return { titulo: 'Campanhas de vacinação ativas', linhas, citacoes: [] };
  },
};

/**
 * Resumo do arquivo:
 * As doses que a pessoa MARCOU como tomadas na tela de Medicamentos (E3), hoje e
 * nos ultimos dias. E a unica fonte do chat para "tomei hoje?" (D2.3):
 * `consultar_medicamentos` lista o cadastro e nao diz nada sobre isso.
 *
 * Aqui fica so o que fala com o banco e com o chat. O cadastro vem pela porta
 * do dono; o historico, pela porta por indice (D3.2), uma consulta por remedio,
 * todas ao mesmo tempo. Tudo o que e regra -- horarios esperados, situacao de
 * cada horario, contagens, tetos -- mora em `dosesTomadasSaida.ts`, puro.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno, DegradedBlock } from '../types';
import {
  agoraNoFuso,
  DIAS_MAXIMO,
  DIAS_PADRAO,
  escolherRemedios,
  montarSaida,
  periodoDe,
  type DosesDoRemedio,
  type SaidaDasDoses,
} from './dosesTomadasSaida';
import { lerDoDono, lerDoDonoPorIndice } from './ownerScopedRead';
import type { ChatTool } from './tipos';

const entrada = z
  .object({
    // Parte do nome, como a pessoa escreveu. Nunca um id: o modelo nao
    // conhece ids, e um id na entrada seria um caminho para pedir o
    // historico de um remedio que nao e da pessoa.
    medicamento: z.string().trim().min(2).max(80).optional(),
    dias: z.number().int().min(1).max(DIAS_MAXIMO).optional(),
  })
  .strict();

const AVISO_SEM_MARCACAO = 'Sem marcação não quer dizer que você não tomou: você pode marcar na tela de Medicamentos.';

/** "hoje: 08:00 marcado, 20:00 pendente · sem marcação no período: 3 horários".
 *  Em horarios, nunca em doses: "3 doses" e o que a R3 reprova (D3.3). */
function linhaDoDegradado(m: DosesDoRemedio): string {
  const n = m.contagem.semMarcacao;
  return [
    m.nome,
    m.hoje.length ? `hoje: ${m.hoje.map((h) => `${h.horario} ${h.situacao}`).join(', ')}` : null,
    n > 0 ? `sem marcação no período: ${n} ${n === 1 ? 'horário' : 'horários'}` : null,
  ]
    .filter((p): p is string => Boolean(p))
    .join(' · ');
}

export const dosesTomadasTool: ChatTool = {
  name: 'consultar_doses_tomadas',
  description:
    'Diz quais horários dos remédios em uso foram marcados como tomados no aplicativo, hoje e nos últimos dias, e quais ficaram sem marcação. NÃO lista o cadastro (isso é consultar_medicamentos), NÃO diz se a pessoa tomou de fato (ela pode ter tomado sem marcar) e NÃO orienta o que fazer com um horário esquecido.',
  inputSchema: entrada,
  readOnly: true,
  async run(input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno): Promise<SaidaDasDoses> {
    const { medicamento, dias = DIAS_PADRAO } = input as z.infer<typeof entrada>;
    // O relogio e lido uma vez: o periodo e a situacao de hoje falam do mesmo
    // instante. No fuso da UF que o APLICATIVO mandou (D3.5), nunca do modelo.
    const agora = agoraNoFuso(new Date(), contexto?.local?.uf);
    const periodo = periodoDe(agora, dias);

    const escolha = escolherRemedios(await lerDoDono(process.env.MEDICINE_TABLE_NAME, identity, contexto?.leituras), periodo, medicamento);
    // Em paralelo: as consultas sao independentes, e o teto de remedios limita quantas.
    const marcacoes = await Promise.all(
      escolha.escolhidos.map((r) => lerDoDonoPorIndice('DOSES_POR_REMEDIO', String(r.id), periodo, identity)),
    );
    return montarSaida({ escolha, marcacoes, agora, periodo });
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as Partial<SaidaDasDoses> | null;
    if (!saida?.medicamentos?.length) return null;
    const omitidos = typeof saida.omitidos === 'number' && saida.omitidos > 0 ? saida.omitidos : 0;
    // O texto fixo nao tem o modelo para dizer a ressalva, entao ela vai escrita:
    // "sem marcação" sozinho seria lido como "nao tomou".
    const temSemMarcacao = saida.medicamentos.some((m) => m.contagem?.semMarcacao > 0);
    return {
      titulo: 'Horários marcados no aplicativo',
      linhas: [
        ...saida.medicamentos.map(linhaDoDegradado).filter((l) => l !== ''),
        ...(omitidos ? [`E mais ${omitidos} ${omitidos === 1 ? 'remédio' : 'remédios'} na tela de Medicamentos.`] : []),
        ...(temSemMarcacao ? [AVISO_SEM_MARCACAO] : []),
      ],
      citacoes: [],
    };
  },
};

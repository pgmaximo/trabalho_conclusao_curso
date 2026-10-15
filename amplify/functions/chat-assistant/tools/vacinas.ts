/**
 * A carteira de vacinacao. Duas listas, e a separacao importa: dose aplicada
 * tem data de aplicacao; dose recomendada nao tem, e e so uma previsao que o
 * proprio aplicativo registrou.
 *
 * Misturar as duas faria o modelo dizer que a pessoa tomou o que ela ainda nao
 * tomou.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock } from '../types';
import { lerDoDono, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

type DoseParaOModelo = {
  nome: string | null;
  numeroDaDose: number | null;
  aplicadaEm: string | null;
  local: string | null;
  previstaPara: string | null;
};

export const vacinasTool: ChatTool = {
  name: 'consultar_vacinas',
  description:
    'Lista a carteira de vacinação do usuário, separando as doses já aplicadas (com data e local) das recomendadas ainda não aplicadas. NÃO agenda, NÃO recomenda vacina nova e NÃO diz se a carteira está completa.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity) {
    const linhas = await lerDoDono(process.env.VACCINE_DOSE_TABLE_NAME, identity);

    const doses: DoseParaOModelo[] = linhas.map((d) => ({
      nome: texto(d.name),
      numeroDaDose: typeof d.doseNumber === 'number' ? d.doseNumber : null,
      aplicadaEm: texto(d.appliedDate),
      local: texto(d.location),
      previstaPara: texto(d.dueDate),
    }));

    const aplicadas = doses.filter((d) => d.aplicadaEm !== null);
    const recomendadas = doses.filter((d) => d.aplicadaEm === null);

    return {
      disponivel: doses.length > 0,
      aplicadas,
      recomendadasNaoAplicadas: recomendadas,
      ...(doses.length === 0
        ? { explicacao: 'O usuário não registrou nenhuma dose de vacina no aplicativo.' }
        : {}),
    };
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as { aplicadas?: DoseParaOModelo[] };
    if (!saida?.aplicadas?.length) return null;
    return {
      titulo: 'Doses registradas',
      linhas: saida.aplicadas.map((d) =>
        [d.nome, d.numeroDaDose ? `${d.numeroDaDose}a dose` : null, d.aplicadaEm]
          .filter((parte): parte is string => Boolean(parte))
          .join(' · '),
      ),
      citacoes: [],
    };
  },
};

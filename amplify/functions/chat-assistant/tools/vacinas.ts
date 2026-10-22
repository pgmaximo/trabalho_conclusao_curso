/**
 * A carteira de vacinacao. A saida (as duas listas, os campos do cartao e o
 * reforco previsto pelo registro) e montada em `vacinasSaida.ts`, que explica
 * por que aplicadas e recomendadas nunca se misturam e de onde sai o reforco
 * (D5.1).
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock, ContextoDoTurno } from '../types';
import { lerDoDono } from './ownerScopedRead';
import type { ChatTool } from './tipos';
import { montarSaida, valoresCadastradosDasVacinas, type DoseParaOModelo } from './vacinasSaida';

export const vacinasTool: ChatTool = {
  name: 'consultar_vacinas',
  description:
    'Lista a carteira de vacinação do usuário, separando as doses já aplicadas (com data, local, lote e fabricante) das recomendadas ainda não aplicadas, e o reforço previsto pelo registro. NÃO agenda, NÃO recomenda vacina nova e NÃO diz se a carteira está completa.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  // A serie da carteira e registro, nao quantidade de remedio (A9).
  valoresCadastrados: valoresCadastradosDasVacinas,
  async run(_input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    return montarSaida(await lerDoDono(process.env.VACCINE_DOSE_TABLE_NAME, identity, contexto?.leituras));
  },
  // Lote e observacao ficam de fora de proposito: o degradado (D31) mostra so
  // o que nao reprova, e observacao e texto livre.
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

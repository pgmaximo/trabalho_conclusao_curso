/**
 * Resumo do arquivo:
 * O tipo de uma tool. Fica separado do registro (`index.ts`) porque cada tool
 * importa o tipo, e o registro importa cada tool -- num arquivo so isso seria
 * um ciclo de importacao.
 */
import type { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock } from '../types';

export type ChatTool = {
  name: string;
  /**
   * Vai no prompt. Diz o que a tool faz E o que ela nao faz -- o modelo usa a
   * descricao para decidir, e uma descricao que so promete produz chamada
   * errada.
   */
  description: string;
  inputSchema: z.ZodType;
  /** Literal `true`, sempre. Existe para ser afirmado por teste sobre a lista. */
  readOnly: true;
  /**
   * A identidade vem do TOKEN e e passada aqui. A tool NUNCA le dono de
   * `input` -- e por isso que a identidade e o segundo parametro, separado, em
   * vez de um campo dentro da entrada.
   */
  run: (input: unknown, identity: ChatIdentity) => Promise<unknown>;
  /**
   * Renderiza a propria saida em texto de modelo fixo, para o MODO DEGRADADO
   * (D31, tarefa C5b). Devolve null quando nao ha o que mostrar.
   *
   * Mora na propria tool, e nao num despachante central com um `switch` por
   * formato, porque quem conhece a forma da saida e quem a produz -- um
   * `switch` distante divergiria do formato real assim que esta tool mudasse,
   * e divergiria em silencio.
   */
  renderDegraded?: (output: unknown) => DegradedBlock | null;
};

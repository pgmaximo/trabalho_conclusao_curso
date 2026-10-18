/**
 * Resumo do arquivo:
 * O tipo de uma tool. Fica separado do registro (`index.ts`) porque cada tool
 * importa o tipo, e o registro importa cada tool -- num arquivo so isso seria
 * um ciclo de importacao.
 */
import type { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno, DegradedBlock } from '../types';

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
   *
   * O `contexto` (E8) e o terceiro canal, e o motivo de ser um parametro
   * proprio e o mesmo: cada coisa diz de onde veio. `input` e o que o MODELO
   * escreveu; `identity`, o que o TOKEN diz; `contexto`, o que o APLICATIVO
   * mandou no pedido (hoje, a cidade). A cidade nao pode vir do modelo -- ele a
   * inventaria --, e nao cabe na identidade, que so pode significar o token.
   * Ferramenta que nao precisa dele simplesmente nao o declara.
   *
   * Opcional no tipo porque os testes chamam `run` direto, sem passar pelo
   * despachante; quem le o contexto trata a ausencia como "sem cidade". O
   * despachante (`runTool`) o envia sempre.
   */
  run: (input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) => Promise<unknown>;
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

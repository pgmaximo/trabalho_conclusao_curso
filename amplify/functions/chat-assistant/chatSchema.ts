/**
 * Resumo do arquivo:
 * O schema da resposta. A regra estrutural da D11 aplicada ao chat: CITACAO E
 * CAMPO, nao promessa.
 *
 * A R4 diz "nenhum numero sem origem". Deixar isso so no prompt seria confiar
 * que o modelo lembra. Aqui, a resposta que cita valores e obrigada a trazer
 * de qual linha eles sairam -- e uma citacao que aponta para uma linha que
 * nenhuma tool devolveu e detectavel, porque quem chamou sabe o que as tools
 * devolveram (C5).
 */
import { z } from 'zod';

export const citationSchema = z
  .object({
    /** Id da linha de LabResult de onde o numero saiu. */
    resultId: z.string().min(1),
    documentId: z.string().min(1),
    collectedAt: z.string().min(1),
  })
  .strict();

export const chatAnswerSchema = z
  .object({
    texto: z.string().min(1).max(4000),
    /** Vazio quando a resposta nao cita nenhum valor de exame. */
    citacoes: z.array(citationSchema).max(20),
  })
  .strict();

export type AnswerCitation = z.infer<typeof citationSchema>;
export type ChatAnswer = z.infer<typeof chatAnswerSchema> & { toolsUsadas: string[] };

/**
 * O envelope JSON, tirado do texto que o modelo devolveu.
 *
 * O caminho normal e o texto ser o proprio objeto -- a saida estruturada do
 * Converse impoe isso pelo servidor. A tolerancia a cerca de codigo existe
 * porque, se por qualquer motivo a saida estruturada nao for aplicada, o
 * modelo tende a embrulhar o JSON em ```json -- e uma resposta correta
 * recusada por causa de tres crases seria uma reprovacao sem conteudo.
 *
 * O que NAO e tolerado: texto solto. Sem o envelope nao existe campo de
 * citacao, e sem campo de citacao a R4 nao tem como ser verificada. Aceitar
 * prosa aqui esvaziaria a D11 inteira.
 */
export function extrairResposta(texto: string): unknown {
  const limpo = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(limpo);
  } catch {
    return undefined;
  }
}

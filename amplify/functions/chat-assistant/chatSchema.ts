/**
 * Resumo do arquivo:
 * O schema da resposta. A regra estrutural da D11 aplicada ao chat: CITACAO E
 * CAMPO, nao promessa.
 *
 * A R4 diz "nenhum numero sem origem". Deixar isso so no prompt seria confiar
 * que o modelo lembra. O que este arquivo entrega e o LUGAR onde a origem cabe:
 * sem campo de citacao, a R4 nao teria como ser verificada por ninguem.
 *
 * O QUE ELE NAO FAZ, e a distincao importa porque a redacao anterior deste
 * comentario afirmava o contrario: ele **nao** obriga a resposta com numero a
 * trazer citacao. Nao ha `refine` ligando digito em `texto` a `citacoes`, e a
 * ausencia e deliberada -- reprovar aqui seria reprovar no PARSE, e falha de
 * parse devolve `ok: false` no laco, que `responderComVerificacao` manda direto
 * para o caminho degradado. A omissao de R4 perderia a segunda geracao que a
 * D31 garante (A -> E -> C), e a pessoa receberia o dado cru onde poderia ter
 * recebido uma resposta escrita.
 *
 * Quem cobra a R4, entao, sao dois verificadores, os dois DEPOIS do parse:
 * - a OMISSAO -- numero de exame sem origem -- em `ai-language-rules/languageRules.ts`;
 * - a citacao INVENTADA -- id que nenhuma tool devolveu -- em `verificacao.ts`,
 *   que e o unico lugar que sabe o que as tools entregaram (C5).
 */
import { z } from 'zod';

import { MAX_CARACTERES_FATO, MEMORY_KINDS } from './memoria/regras';

export const citationSchema = z
  .object({
    /** Id da linha de LabResult de onde o numero saiu. */
    resultId: z.string().min(1),
    documentId: z.string().min(1),
    collectedAt: z.string().min(1),
  })
  .strict();

/**
 * A proposta de memoria (D34). OPCIONAL, e a opcionalidade e o contrato: uma
 * resposta sem ela continua valida exatamente como antes desta EPIC.
 *
 * Este campo NAO grava nada. Ele e um texto que o aplicativo vai MOSTRAR a
 * pessoa, com dois botoes. Quem grava e ela, e e por isso que a funcao continua
 * somente leitura -- a base legal do art. 11, I virando caminho de codigo.
 *
 * O `tipo` e a lista fechada do art. 6º, I; o teto do texto vem do mesmo modulo
 * que o aplicativo le, para os dois recusarem exatamente as mesmas coisas.
 */
/**
 * Quantas linhas uma resposta pode citar. O numero mora AQUI e e o mesmo que o
 * prompt diz ao modelo (`chatPrompt.ts`), porque o `maxItems` do schema e
 * retirado do que vai ao Bedrock -- o servico o recusa. Ate o Bloco 10 o limite
 * existia so na validacao, e o modelo, sem saber dele, tentava citar um laudo
 * inteiro de 48 linhas: a resposta era reprovada em silencio, 4 de 4 vezes.
 */
export const MAX_CITACOES = 20;

export const memoryProposalSchema = z
  .object({
    texto: z.string().min(1).max(MAX_CARACTERES_FATO),
    tipo: z.enum(MEMORY_KINDS),
  })
  .strict();

export const chatAnswerSchema = z
  .object({
    texto: z.string().min(1).max(4000),
    /**
     * Vazio quando a resposta nao cita nenhum valor de exame. Vazio COM valor de
     * exame no texto e o que o verificador de R4 reprova -- aqui e campo, la e
     * regra.
     */
    citacoes: z.array(citationSchema).max(MAX_CITACOES),
    /**
     * Ausente na esmagadora maioria dos turnos. Nao existe campo de citacao
     * aqui, e a ausencia e a garantia: um fato nao consegue ser fonte de
     * numero porque nao ha onde escrever a origem dele.
     */
    memoria: memoryProposalSchema.optional(),
  })
  .strict();

export type AnswerCitation = z.infer<typeof citationSchema>;
export type MemoryProposal = z.infer<typeof memoryProposalSchema>;
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

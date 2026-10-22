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
import type { DocumentType } from '@smithy/types';
import { z } from 'zod';

import { TIPOS_DE_ACAO, TIPOS_DE_COMPROMISSO } from '../acoes-propostas-shared/camposDaAcao';
import { toStructuredOutputSchema } from '../extract-document-data/extractionSchema';
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

/**
 * A acao proposta (E11), como o MODELO a manda: textos e expressoes copiados
 * da fala da pessoa, ainda sem conferencia. Quem confere e resolve e
 * `acoes/acaoValida.ts`; quem confere a forma final e
 * `acoes-propostas-shared/camposDaAcao.ts`.
 *
 * SEM `max` NOS CAMPOS, DE PROPOSITO. Um teto aqui reprova o PARSE da resposta
 * inteira, e a falha de parse vai para o caminho degradado: um nome longo
 * demais na proposta derrubaria uma resposta boa (o mesmo motivo de nao haver
 * `refine` da R4 acima). O teto e aplicado depois, e o que passa dele so faz o
 * CAMPO sumir.
 */
export const acaoSchema = z
  .object({
    tipo: z.enum(TIPOS_DE_ACAO),
    nome: z.string().optional(),
    profissional: z.string().optional(),
    endereco: z.string().optional(),
    tipoDeCompromisso: z.enum(TIPOS_DE_COMPROMISSO).optional(),
    /** A expressao de data que a pessoa usou ("sexta", "dia 30"), nao a data. */
    quando: z.string().optional(),
    /** A expressao de hora ("14h", "2 da tarde"). */
    hora: z.string().optional(),
    /** Lembrete: uma expressao de hora por horario. */
    horarios: z.array(z.string()).optional(),
  })
  .strict();

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
    /**
     * A acao proposta (E11). Ausente na maioria dos turnos; nunca grava.
     *
     * O `.catch(undefined)` faz a acao INVALIDA (tipo fora da lista, campo
     * desconhecido) virar ausente em vez de reprovar o parse da resposta
     * inteira. Antes, a recusa dependia de o Bedrock impor o formato; agora e
     * do codigo, e proposta ruim nunca derruba resposta boa (revisao do E11).
     * O esquema que vai ao Bedrock nao muda: `toJSONSchema` le o de dentro.
     */
    acao: acaoSchema.optional().catch(undefined),
  })
  .strict();

export type AnswerCitation = z.infer<typeof citationSchema>;
export type MemoryProposal = z.infer<typeof memoryProposalSchema>;
export type AcaoBruta = z.infer<typeof acaoSchema>;
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
    return doFio(JSON.parse(limpo));
  } catch {
    return undefined;
  }
}

/**
 * A ORDEM NO FIO (A5 da conferencia no sandbox, 2026-10-20). A saida
 * estruturada escreve as chaves em ordem ALFABETICA, e nao na do schema --
 * medido com a saida bruta. "acao" vinha antes de "texto", e o modelo tinha
 * de decidir a acao antes de escrever a resposta: pulava o campo e prometia o
 * formulario no texto. Dentro da acao, "tipo" vinha quase por ultimo, e depois
 * dele "hora", "nome" e "quando" ja tinham passado. O prefixo numerico faz a
 * ordem alfabetica ser a que o envelope quer; so o schema mandado ao modelo e
 * a resposta dele usam esses nomes, e `extrairResposta` os traduz de volta.
 */
const ENVELOPE_NO_FIO: Record<string, string> = {
  citacoes: '1_citacoes',
  texto: '2_texto',
  memoria: '3_memoria',
  acao: '4_acao',
};
const ACAO_NO_FIO: Record<string, string> = {
  tipo: '1_tipo',
  nome: '2_nome',
  profissional: '3_profissional',
  endereco: '4_endereco',
  tipoDeCompromisso: '5_tipoDeCompromisso',
  quando: '6_quando',
  hora: '7_hora',
  horarios: '8_horarios',
};

type NoDoSchema = { properties: Record<string, unknown>; required?: string[] };

function renomear(no: NoDoSchema, nomes: Record<string, string>): NoDoSchema {
  return {
    ...no,
    properties: Object.fromEntries(Object.entries(no.properties).map(([k, v]) => [nomes[k] ?? k, v])),
    ...(no.required && { required: no.required.map((k) => nomes[k] ?? k) }),
  };
}

/** O JSON Schema do `output_config`: o do envelope, com os nomes do fio. */
export function schemaDaResposta(): DocumentType {
  const base = toStructuredOutputSchema(chatAnswerSchema) as unknown as NoDoSchema;
  const acao = base.properties.acao as NoDoSchema;
  return renomear(
    { ...base, properties: { ...base.properties, acao: renomear(acao, ACAO_NO_FIO) } },
    ENVELOPE_NO_FIO,
  ) as unknown as DocumentType;
}

const inverter = (nomes: Record<string, string>) =>
  Object.fromEntries(Object.entries(nomes).map(([k, v]) => [v, k]));
const DO_FIO = inverter(ENVELOPE_NO_FIO);
const ACAO_DO_FIO = inverter(ACAO_NO_FIO);

function traduzir(objeto: Record<string, unknown>, nomes: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(objeto).map(([k, v]) => [nomes[k] ?? k, v]));
}

/** A resposta com os nomes do fio volta com os do envelope. Sem saida
 *  estruturada, o modelo escreve os nomes do prompt, e eles passam intactos. */
function doFio(bruto: unknown): unknown {
  if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) return bruto;
  const envelope = traduzir(bruto as Record<string, unknown>, DO_FIO);
  const acao = envelope.acao;
  if (acao !== null && typeof acao === 'object' && !Array.isArray(acao)) {
    envelope.acao = traduzir(acao as Record<string, unknown>, ACAO_DO_FIO);
  }
  return envelope;
}

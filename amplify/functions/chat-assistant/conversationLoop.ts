/**
 * Resumo do arquivo:
 * O laco de tools. Tres limites, todos NUMEROS e nao nocoes, porque cada um
 * deles sem numero e uma forma de gastar sem teto.
 *
 * A propriedade mais importante deste arquivo nao e o laco: e que a SEGUNDA
 * geracao (D31) reaproveita o que a primeira acumulou, em vez de refazer as
 * consultas. Sem isso, a correcao de uma REDACAO custaria o dobro e veria
 * evidencias possivelmente diferentes.
 *
 * ELE NUNCA LANCA. Toda saida passa por `TurnOutcome`, e o transcript volta
 * inclusive nas falhas -- o modo degradado (C5b) depende dele.
 */
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

import { toStructuredOutputSchema } from '../extract-document-data/extractionSchema';

import { SYSTEM_PROMPT, buildUserMessage } from './chatPrompt';
import { chatAnswerSchema, extrairResposta, type ChatAnswer } from './chatSchema';
import { CHAT_TOOLS, runTool } from './tools';
import type { ChatIdentity } from './auth';
import type { AnexoLido } from './types';

const client = new BedrockRuntimeClient({ maxAttempts: 3, retryMode: 'adaptive' });

/**
 * Um laco sem teto paga o modelo indefinidamente. Seis cobre a pergunta mais
 * composta prevista -- "minha vitamina D e meu sono no mesmo periodo" usa duas
 * tools; uma pergunta que precise de seis ja e uma pergunta que o chat nao
 * deveria tentar responder de uma vez. Calibrado na C10.
 */
export const MAX_TOOL_ITERATIONS = 6;

/** Mandar a conversa inteira cresce sem limite e paga por isso a cada turno. */
export const HISTORY_WINDOW = 12;

/**
 * SEMPRE explicito. Em branco reserva a cota maxima do modelo e e a causa
 * principal de estrangulamento sem motivo aparente -- armadilha ja documentada
 * na feature de wearable.
 */
export const MAX_OUTPUT_TOKENS = 2000;

const TEMPERATURE = 0.3;

/** Menos variacao na segunda tentativa. E uma alavanca A MEDIR (tarefa C10),
 *  nao uma certeza -- o estudo da D31 a registra como tal. */
const TEMPERATURE_RETRY = 0.1;

export type TurnInput = {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  identity: ChatIdentity;
  modelId: string;
  guardrailId: string;
  guardrailVersion: string;
  /** O anexo pontual ja lido. PDF chega em bytes e vai ao modelo no bloco de
   *  documento; o resto chega como texto de OCR (D19). */
  anexo?: AnexoLido | null;
  /**
   * O interruptor da memoria (D34). Vem do aplicativo, que e quem le a linha de
   * `AssistantMemorySetting` -- uma tabela a menos ao alcance da funcao.
   *
   * AUSENTE significa ligada: ausencia e aplicativo anterior a EPIC, ou pessoa
   * que nunca mexeu no interruptor. Ligada nao grava nada sozinha.
   */
  memoriaAtiva?: boolean;
  /**
   * O prompt de sistema JA MONTADO, com o bloco de memoria dentro quando ha
   * fato (D34). Ausente significa o prompt sem memoria -- e o caminho antigo
   * nao muda de byte, que e a regra 5 em forma de valor padrao.
   *
   * Ele entra por parametro, e nao e lido aqui, porque a leitura da memoria
   * depende da identidade e de tabela, e este arquivo e sobre o laco.
   */
  systemPrompt?: string;
};

/**
 * O que a primeira geracao acumulou. Existe para a SEGUNDA nao refazer o laco
 * de ferramentas (D31): as mensagens ja contem os `toolResult`, entao regerar
 * e uma ida so ao modelo, com exatamente as mesmas evidencias na frente.
 *
 * `toolOutputs` sai separado das mensagens porque o modo degradado (C5b)
 * precisa da saida ESTRUTURADA de cada tool, e nao do bloco serializado que
 * foi para o modelo.
 */
export type TurnTranscript = {
  messages: unknown[];
  toolOutputs: { name: string; output: unknown }[];
};

export type TurnOutcome =
  | {
      ok: true;
      answer: ChatAnswer;
      transcript: TurnTranscript;
      inputTokens: number;
      outputTokens: number;
      modelId: string;
    }
  | {
      ok: false;
      message: string;
      transcript: TurnTranscript;
      /** Distingue "o filtro barrou a pergunta" de "nao consegui responder".
       *  Sem essa marca, quem chama trocaria a mensagem honesta do filtro pela
       *  copy generica -- e a pessoa nao saberia que houve um bloqueio. */
      bloqueadoPeloFiltro?: true;
    };

const BLOQUEADO_PELO_FILTRO =
  'Não consigo responder a essa mensagem. Se for sobre um sintoma ou um resultado, vale levar a pergunta a um profissional de saúde.';
const NAO_REUNI_TUDO = 'Não consegui reunir tudo o que essa pergunta pede.';
const NAO_MONTEI = 'Não consegui montar uma resposta agora.';

/** O esquema de entrada de cada tool, no formato que o Converse espera. Sai do
 *  MESMO objeto zod que valida a chamada, entao os dois nunca divergem. */
function especificacaoDasTools() {
  return {
    tools: CHAT_TOOLS.map((t) => ({
      toolSpec: {
        name: t.name,
        description: t.description,
        // Mesmo conversor que a extracao mediu contra o servico: ele tira as
        // palavras-chave que o Bedrock recusa (maxItems, minimum, maximum) e
        // deixa o objeto zod intacto como validador.
        inputSchema: { json: toStructuredOutputSchema(t.inputSchema) },
      },
    })),
    // SEM `toolChoice` forcado: aqui o modelo PRECISA poder responder sem
    // chamar tool nenhuma ("bom dia"), diferente da extracao, em que a saida
    // estruturada e o produto.
  };
}

function guardrail(input: TurnInput) {
  return {
    guardrailIdentifier: input.guardrailId,
    guardrailVersion: input.guardrailVersion,
    // Rastro desligado: ligado, ele exporia na resposta o texto que disparou
    // um filtro de PII -- devolveria exatamente o dado que o filtro existe
    // para esconder. Nunca ligar em producao.
    trace: 'disabled' as const,
  };
}

type RespostaDoModelo = {
  stopReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  output?: { message?: { role?: string; content?: Record<string, any>[] } };
};

function chamar(input: TurnInput, messages: unknown[], temperature: number) {
  return client.send(
    new ConverseCommand({
      modelId: input.modelId,
      system: [{ text: input.systemPrompt ?? SYSTEM_PROMPT }],
      messages: messages as never,
      inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS, temperature },
      toolConfig: especificacaoDasTools() as never,
      // Saida estruturada imposta pelo servidor, mesmo mecanismo que a
      // extracao mediu (D19). O parser de `chatSchema.ts` continua tolerante
      // a cerca de codigo para o caso de ela nao ser aplicada junto com
      // ferramentas -- combinacao que so uma chamada real confirma.
      additionalModelRequestFields: {
        output_config: {
          format: { type: 'json_schema', schema: toStructuredOutputSchema(chatAnswerSchema) },
        },
      },
      guardrailConfig: guardrail(input),
    }),
  ) as Promise<RespostaDoModelo>;
}

function textoDosBlocos(blocos: Record<string, any>[] | undefined): string {
  return (blocos ?? [])
    .map((b) => (typeof b.text === 'string' ? b.text : ''))
    .join('')
    .trim();
}

export async function runConversationTurn(input: TurnInput): Promise<TurnOutcome> {
  // A janela guarda as mensagens MAIS RECENTES: cortar pelo comeco entregaria
  // ao modelo o inicio de uma conversa longa e esconderia o que acabou de ser
  // dito.
  const messages: unknown[] = [
    ...input.history
      .slice(-HISTORY_WINDOW)
      .map((m) => ({ role: m.role, content: [{ text: m.content }] })),
    buildUserMessage(input.message, input.anexo),
  ];

  const toolsUsadas: string[] = [];
  const transcript: TurnTranscript = { messages, toolOutputs: [] };
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for (let iteracao = 0; iteracao < MAX_TOOL_ITERATIONS; iteracao += 1) {
      const resposta = await chamar(input, messages, TEMPERATURE);

      // O consumo e SOMADO, e nao substituido: medir so a ultima ida
      // subestimaria justamente o turno com laco, que e o turno caro.
      inputTokens += resposta.usage?.inputTokens ?? 0;
      outputTokens += resposta.usage?.outputTokens ?? 0;

      // Guardrail nao e falha tecnica: e o sistema funcionando. A mensagem ao
      // usuario nao pode soar como erro.
      if (resposta.stopReason === 'guardrail_intervened') {
        return { ok: false, transcript, message: BLOQUEADO_PELO_FILTRO, bloqueadoPeloFiltro: true };
      }

      const blocos = resposta.output?.message?.content ?? [];
      const chamadas = blocos
        .filter((b) => b.toolUse)
        .map((b) => b.toolUse as { toolUseId: string; name: string; input: unknown });

      if (chamadas.length === 0) {
        const validado = chatAnswerSchema.safeParse(extrairResposta(textoDosBlocos(blocos)));
        if (!validado.success) {
          return { ok: false, transcript, message: NAO_MONTEI };
        }
        return {
          ok: true,
          answer: { ...validado.data, toolsUsadas },
          transcript,
          inputTokens,
          outputTokens,
          modelId: input.modelId,
        };
      }

      messages.push(resposta.output?.message);

      const resultados = [];
      for (const chamada of chamadas) {
        toolsUsadas.push(chamada.name);
        const saida = await runTool(chamada.name, chamada.input, input.identity);
        // Guardado ESTRUTURADO para o modo degradado (C5b), alem de
        // serializado para o modelo.
        transcript.toolOutputs.push({ name: chamada.name, output: saida });
        resultados.push({
          toolResult: { toolUseId: chamada.toolUseId, content: [{ json: saida }] },
        });
      }
      messages.push({ role: 'user', content: resultados });
    }
  } catch (erro) {
    // O detalhe tecnico fica no log. Devolver "ThrottlingException" ao chamador
    // nao ajuda ninguem e vaza como a infraestrutura funciona.
    console.error('Falha na chamada ao modelo:', erro);
    return { ok: false, transcript, message: NAO_MONTEI };
  }

  // Teto atingido. NUNCA devolver o que foi juntado ate aqui como se fosse a
  // resposta: uma resposta parcial apresentada como completa e o pior
  // resultado possivel, porque ela PARECE uma resposta.
  //
  // O transcript volta mesmo assim: as ferramentas que ja responderam tem
  // dado, e o modo degradado (C5b) consegue mostra-lo.
  return { ok: false, transcript, message: NAO_REUNI_TUDO };
}

/**
 * A SEGUNDA geracao (D31, etapa A). Ela NAO refaz o laco de ferramentas.
 *
 * Duas razoes, e a segunda vale mais que a primeira:
 * 1. Custo e espera: reaproveitando o transcript, e UMA ida ao modelo em vez
 *    de um laco inteiro de novo.
 * 2. Ela ve EXATAMENTE as mesmas evidencias que a primeira. Refazer o laco
 *    poderia trazer dado diferente (uma consulta que agora falha, uma linha
 *    corrigida no meio), e a diferenca entre as duas respostas deixaria de ser
 *    so a redacao -- que e a unica coisa que se quer corrigir.
 *
 * O `toolConfig` continua presente porque a conversa contem blocos `toolUse` e
 * `toolResult`, e o Bedrock recusa esse historico sem a configuracao das
 * tools. Se o modelo insistir em chamar outra tool aqui, isto e tratado como
 * falha e o chamador segue para o modo degradado -- nao ha terceira tentativa.
 */
export async function regenerateAnswer(
  input: TurnInput,
  transcript: TurnTranscript,
  motivo: string,
): Promise<TurnOutcome> {
  const messages = [
    ...transcript.messages,
    {
      role: 'user' as const,
      content: [
        {
          text: `[A resposta anterior não pôde ser exibida. ${motivo} Escreva a resposta de novo respeitando isso, usando os mesmos dados que você já consultou.]`,
        },
      ],
    },
  ];

  try {
    const resposta = await chamar(input, messages, TEMPERATURE_RETRY);

    if (resposta.stopReason === 'guardrail_intervened') {
      return { ok: false, transcript, message: BLOQUEADO_PELO_FILTRO, bloqueadoPeloFiltro: true };
    }

    const blocos = resposta.output?.message?.content ?? [];
    // Chamou tool de novo em vez de responder: nao ha terceira tentativa.
    if (blocos.some((b) => b.toolUse)) {
      return { ok: false, transcript, message: NAO_MONTEI };
    }

    const validado = chatAnswerSchema.safeParse(extrairResposta(textoDosBlocos(blocos)));
    if (!validado.success) return { ok: false, transcript, message: NAO_MONTEI };

    return {
      ok: true,
      answer: { ...validado.data, toolsUsadas: transcript.toolOutputs.map((t) => t.name) },
      transcript,
      inputTokens: resposta.usage?.inputTokens ?? 0,
      outputTokens: resposta.usage?.outputTokens ?? 0,
      modelId: input.modelId,
    };
  } catch (erro) {
    console.error('Falha na segunda geracao:', erro);
    return { ok: false, transcript, message: NAO_MONTEI };
  }
}

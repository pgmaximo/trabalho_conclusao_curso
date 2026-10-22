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
import { chatAnswerSchema, extrairResposta, schemaDaResposta, type ChatAnswer } from './chatSchema';
import { HISTORY_WINDOW } from './janelaDoHistorico';
import { CHAT_TOOLS, findTool, runTool } from './tools';
import type { ChatIdentity } from './auth';
import type { AnexoLido, ContextoDoTurno, LocalDoUsuario } from './types';

const client = new BedrockRuntimeClient({ maxAttempts: 3, retryMode: 'adaptive' });

/**
 * Um laco sem teto paga o modelo indefinidamente. Seis cobre a pergunta mais
 * composta prevista -- "minha vitamina D e meu sono no mesmo periodo" usa duas
 * tools; uma pergunta que precise de seis ja e uma pergunta que o chat nao
 * deveria tentar responder de uma vez. Calibrado na C10.
 */
export const MAX_TOOL_ITERATIONS = 6;

// O teto do historico mora em `janelaDoHistorico.ts` desde o E11, porque a
// validacao da acao proposta precisa do mesmo numero.
export { HISTORY_WINDOW };

/**
 * SEMPRE explicito. Em branco reserva a cota maxima do modelo e e a causa
 * principal de estrangulamento sem motivo aparente -- armadilha ja documentada
 * na feature de wearable.
 *
 * Era 2000 ate o Bloco 10. A rodada automatica da L7 mostrou a resposta a
 * "quais sao os valores do meu exame?" cortada no meio do JSON das citacoes:
 * cada citacao carrega um id de 64 caracteres, e 20 delas mais o texto de 20
 * linhas passam de 2000. 4000 cabe o maximo de citacoes com folga.
 *
 * 16000 com o Claude Opus 5.5: o thinking, que nao se desliga nesse modelo,
 * divide este teto com a resposta.
 */
export const MAX_OUTPUT_TOKENS = 16000;

/** Esforco explicito: o padrao do Claude Opus 5.5 e `medium`, e o turno (2 a 4
 *  idas ao modelo) tem de caber nos 90 s que o aplicativo espera. Sem
 *  `temperature`: o Opus 5.5 a recusa (400), e a segunda geracao difere da
 *  primeira pela correcao que recebe. */
const ESFORCO = 'low';

export type TurnInput = {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  identity: ChatIdentity;
  modelId: string;
  guardrailId: string;
  guardrailVersion: string;
  /** O anexo pontual ja lido. PDF chega em bytes e vai ao modelo no bloco de
   *  documento (D19); foto, em bytes, no bloco de imagem (Bloco 10). */
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
  /**
   * A cidade do pedido (E8). Ela vai as FERRAMENTAS, como contexto do turno, e
   * nunca ao modelo: o modelo so ve o que a ferramenta montou com ela.
   */
  local?: LocalDoUsuario | null;
  /**
   * A data e a hora do turno, ja em texto, num SEGUNDO bloco de `system` (E1,
   * D1.1; o porque esta em `contextoDeHoje.ts`). Fica DEPOIS porque muda a
   * cada turno, e o bloco 0 so muda com a memoria da pessoa: um ponto de
   * prompt caching futuro iria entre os dois. Ausente, `system` sai byte a
   * byte como antes.
   */
  contextoDeHoje?: string;
  /**
   * O dia do turno em AAAA-MM-DD, no fuso do app, lido no MESMO instante de
   * `contextoDeHoje` (E11). Nao vai ao modelo: e o "hoje" com que o codigo
   * resolve "sexta" e "dia 30" na acao proposta. Ausente, nenhuma acao sai.
   */
  hoje?: string;
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
  /** `valoresCadastrados` vem do gancho da tool (E2, D2.4), calculado AQUI,
   *  onde a tool esta a mao: a verificacao so le, sem conhecer nenhuma tool. */
  toolOutputs: { name: string; output: unknown; valoresCadastrados?: string[] }[];
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
      /** Por que a resposta nao teve forma (Bloco 10). Presente so quando o
       *  modelo RESPONDEU e a resposta nao passou no schema -- e o que da a ela
       *  direito a uma nova geracao. */
      motivo?: 'formato' | 'max_tokens';
      /** Distingue "o filtro barrou a pergunta" de "nao consegui responder".
       *  Sem essa marca, quem chama trocaria a mensagem honesta do filtro pela
       *  copy generica -- e a pessoa nao saberia que houve um bloqueio. */
      bloqueadoPeloFiltro?: true;
      /** O modelo recusou por excesso de chamadas (A6): a cota da conta, e nao
       *  a pergunta. Quem chama mostra a frase dela, sem dado por baixo. */
      sobrecarga?: true;
    };

const BLOQUEADO_PELO_FILTRO =
  'Não consigo responder a essa mensagem. Se for sobre um sintoma ou um resultado, vale levar a pergunta a um profissional de saúde.';
const NAO_REUNI_TUDO = 'Não consegui reunir tudo o que essa pergunta pede.';
const NAO_MONTEI = 'Não consegui montar uma resposta agora.';
const JA_CONSULTADA =
  'Esta ferramenta já foi consultada neste turno com a mesma entrada, e o resultado está acima. Não chame de novo: responda agora com o que já tem.';
const SOBRECARGA = 'Muita gente está usando o assistente agora. Tente de novo em um minuto.';

/**
 * O rastro de uma geracao que nao virou resposta. Existe por um achado do Bloco
 * 10: os tres caminhos de falha abaixo devolviam a copy generica SEM uma linha
 * de log, e a resposta a "quais sao os valores do meu exame?" caia no modo
 * degradado 4 vezes em 4 sem que nada dissesse por que. E a mesma forma do
 * defeito que o reparo da extracao tinha ate o dia 22.
 *
 * So o motivo e, no caso do formato, o CAMPO que falhou -- nunca o conteudo,
 * que e a resposta sobre o exame de alguem.
 */
type MotivoDaFalha = 'max_tokens' | 'formato' | 'teto-de-iteracoes' | 'ferramenta-na-segunda';

function registrarFalhaDaGeracao(
  etapa: 'primeira' | 'segunda',
  motivo: MotivoDaFalha,
  campos?: string[],
): void {
  console.info(
    JSON.stringify({ evento: 'geracao-falhou', etapa, motivo, ...(campos ? { campos } : {}) }),
  );
}

/** O motivo de uma resposta que nao passou no schema: cortada pelo teto, ou
 *  fora do formato -- e, nesse caso, QUAIS campos. */
function registrarRespostaInvalida(
  etapa: 'primeira' | 'segunda',
  stopReason: string | undefined,
  issues: { path: PropertyKey[] }[],
): void {
  if (stopReason === 'max_tokens') registrarFalhaDaGeracao(etapa, 'max_tokens');
  else {
    registrarFalhaDaGeracao(etapa, 'formato', [
      ...new Set(issues.map((i) => i.path.map(String).join('.') || '(raiz)')),
    ]);
  }
}

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

/**
 * O limite de UMA chamada ao modelo (DS15.3). O Bedrock chegou a 80 s de media
 * por chamada, sem erro nem throttling (CloudWatch, 2026-10-22), e a chamada
 * presa esperava ate o teto da Lambda, depois de o aplicativo ja ter desistido
 * aos 90 s com a mensagem generica. Passado o limite, o turno vira o aviso de
 * sobrecarga, como a ThrottlingException.
 *
 * shortcut: limite por chamada, nao por turno -- um turno de 3 chamadas lentas
 * ainda passa dos 90 s; trocar por um prazo do turno se isso aparecer medido.
 */
export const TEMPO_MAXIMO_DA_CHAMADA_MS = 40_000;

function chamar(input: TurnInput, messages: unknown[]): Promise<RespostaDoModelo> {
  const controle = new AbortController();
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    relogio = setTimeout(() => {
      controle.abort();
      rejeitar(Object.assign(new Error('Chamada ao modelo passou do limite de tempo.'), { name: 'TempoEsgotado' }));
    }, TEMPO_MAXIMO_DA_CHAMADA_MS);
  });
  return Promise.race([enviar(input, messages, controle.signal), limite]).finally(() => clearTimeout(relogio));
}

function enviar(input: TurnInput, messages: unknown[], abortSignal: AbortSignal) {
  return client.send(
    new ConverseCommand({
      modelId: input.modelId,
      system: [
        { text: input.systemPrompt ?? SYSTEM_PROMPT },
        ...(input.contextoDeHoje ? [{ text: input.contextoDeHoje }] : []),
      ],
      messages: messages as never,
      inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS },
      toolConfig: especificacaoDasTools() as never,
      // Saida estruturada imposta pelo servidor, mesmo mecanismo que a
      // extracao mediu (D19). O parser de `chatSchema.ts` continua tolerante
      // a cerca de codigo para o caso de ela nao ser aplicada junto com
      // ferramentas -- combinacao que so uma chamada real confirma.
      additionalModelRequestFields: {
        output_config: {
          effort: ESFORCO,
          format: { type: 'json_schema', schema: schemaDaResposta() },
        },
      },
      guardrailConfig: guardrail(input),
    }),
    { abortSignal },
  ) as Promise<RespostaDoModelo>;
}

function textoDosBlocos(blocos: Record<string, any>[] | undefined): string {
  return (blocos ?? [])
    .map((b) => (typeof b.text === 'string' ? b.text : ''))
    .join('')
    .trim();
}

export async function runConversationTurn(input: TurnInput): Promise<TurnOutcome> {
  // Um registro de leituras por turno, dividido pelas ferramentas dele (risco 3
  // do E4): duas que leem a mesma tabela leem uma vez so.
  const contextoDoTurno: ContextoDoTurno = {
    local: input.local ?? null,
    leituras: new Map(),
    series: new Map(),
    falaDaPessoa: input.message,
  };
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
  const consultadas = new Set<string>();
  const transcript: TurnTranscript = { messages, toolOutputs: [] };
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for (let iteracao = 0; iteracao < MAX_TOOL_ITERATIONS; iteracao += 1) {
      const resposta = await chamar(input, messages);

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
          registrarRespostaInvalida('primeira', resposta.stopReason, validado.error.issues);
          return {
            ok: false,
            transcript,
            message: NAO_MONTEI,
            motivo: resposta.stopReason === 'max_tokens' ? 'max_tokens' : 'formato',
          };
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
        // A mesma consulta, com a mesma entrada, no mesmo turno nao roda de
        // novo (A8, DS9): "mas e seguro, ne?" fazia o modelo repeti-la ate o
        // teto de iteracoes. O aviso responde a chamada, e o transcript nao
        // ganha uma copia -- a degradada mostraria o mesmo bloco de novo.
        const chave = `${chamada.name}|${JSON.stringify(chamada.input ?? {})}`;
        if (consultadas.has(chave)) {
          resultados.push({
            toolResult: { toolUseId: chamada.toolUseId, content: [{ json: { jaConsultado: true, aviso: JA_CONSULTADA } }] },
          });
          continue;
        }
        consultadas.add(chave);
        toolsUsadas.push(chamada.name);
        const saida = await runTool(chamada.name, chamada.input, input.identity, contextoDoTurno);
        // Guardado ESTRUTURADO para o modo degradado (C5b), alem de
        // serializado para o modelo.
        const valoresCadastrados = findTool(chamada.name)?.valoresCadastrados?.(saida);
        transcript.toolOutputs.push({
          name: chamada.name,
          output: saida,
          ...(valoresCadastrados ? { valoresCadastrados } : {}),
        });
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
    // A cota da conta e de 10 chamadas por minuto (A6, DS7): com duas pessoas
    // ao mesmo tempo ela estoura, e a pessoa precisa saber que e espera, nao
    // a pergunta. So o nome do erro decide; ele nao vai para o texto.
    // A chamada que passou do limite de tempo (DS15.3) tambem e espera.
    const nome = (erro as { name?: string } | null)?.name;
    if (nome === 'ThrottlingException' || nome === 'TempoEsgotado') {
      return { ok: false, transcript, message: SOBRECARGA, sobrecarga: true };
    }
    return { ok: false, transcript, message: NAO_MONTEI };
  }

  // Teto atingido. NUNCA devolver o que foi juntado ate aqui como se fosse a
  // resposta: uma resposta parcial apresentada como completa e o pior
  // resultado possivel, porque ela PARECE uma resposta.
  //
  // O transcript volta mesmo assim: as ferramentas que ja responderam tem
  // dado, e o modo degradado (C5b) consegue mostra-lo.
  registrarFalhaDaGeracao('primeira', 'teto-de-iteracoes');
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
    const resposta = await chamar(input, messages);

    if (resposta.stopReason === 'guardrail_intervened') {
      return { ok: false, transcript, message: BLOQUEADO_PELO_FILTRO, bloqueadoPeloFiltro: true };
    }

    const blocos = resposta.output?.message?.content ?? [];
    // Chamou tool de novo em vez de responder: nao ha terceira tentativa.
    if (blocos.some((b) => b.toolUse)) {
      registrarFalhaDaGeracao('segunda', 'ferramenta-na-segunda');
      return { ok: false, transcript, message: NAO_MONTEI };
    }

    const validado = chatAnswerSchema.safeParse(extrairResposta(textoDosBlocos(blocos)));
    if (!validado.success) {
      registrarRespostaInvalida('segunda', resposta.stopReason, validado.error.issues);
      return { ok: false, transcript, message: NAO_MONTEI };
    }

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

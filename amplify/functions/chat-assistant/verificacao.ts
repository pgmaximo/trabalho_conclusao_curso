/**
 * Resumo do arquivo:
 * As cinco camadas de linguagem, fechadas em cima do laco. Este arquivo e a
 * D31 em codigo: **A -> E -> C**. Uma nova geracao, depois o dado sem prosa,
 * depois o silencio honesto.
 *
 * O QUE ELE NUNCA FAZ, e cada uma foi recusada com motivo no estudo
 * `estudos-ia/01-estudos/resposta-reprovada.md`:
 * - nunca recorta o texto reprovado (recortar inverte sentido em vez de
 *   remove-lo, e o resultado nao foi escrito por ninguem);
 * - nunca exibe o texto reprovado com um aviso (se ele pode ser exibido com
 *   aviso, a verificacao deixa de ser porta e vira enfeite);
 * - nunca tenta uma terceira vez (a terceira carrega a mesma informacao que a
 *   segunda ja carregava).
 *
 * Ele fica separado do `handler.ts` porque o handler e a porta -- quem entra,
 * quem e recusado -- e isto e a decisao sobre o que pode ser dito. Sao duas
 * responsabilidades, e uma delas precisa ser testada sem HTTP no caminho.
 */
import { checkLanguageRules, type QuestionKind } from '../ai-language-rules/languageRules';

import { regenerateAnswer, runConversationTurn, type TurnInput } from './conversationLoop';
import { enriquecerCitacoes, indexarLinhasCitaveis } from './citacoes';
import { buildDegradedAnswer } from './degradedAnswer';
import { validarProposta } from './memoria/propostaValida';
import { lerMemoria, montarSystemPrompt } from './memoria/leitura';
import type { AnswerCitation, ChatAnswer, MemoryProposal } from './chatSchema';
import type {
  ChatContext,
  ChatTurnRequest,
  ChatTurnResult,
  Citation,
  RuleCheckStatus,
} from './types';

/**
 * As tools que tornam a pergunta CLINICA. A classificacao e pela tool usada, e
 * nao por adivinhacao sobre o texto: quem chamou sabe o que foi consultado, e
 * criar uma segunda classificacao falivel dentro da camada que existe para ser
 * confiavel seria trocar uma certeza por um palpite.
 *
 * `consultar_medicamentos`, `consultar_vacinas` e `consultar_consultas` ficam
 * de fora: "que remedio eu tomo as 8h" e "quando e minha consulta" sao
 * perguntas sobre o CADASTRO, e exigir encaminhamento nelas transformaria a R2
 * no rodape mecanico que o estudo de linguagem manda evitar.
 *
 * Aproximacao declarada, calibrada na C10.
 */
const TOOLS_CLINICAS = new Set([
  'consultar_analito',
  'consultar_exames',
  'consultar_perfil',
  'consultar_wearable',
]);

export type RespostaVerificada = {
  status: RuleCheckStatus;
  texto: string;
  citacoes: AnswerCitation[];
  /** As linhas que as ferramentas devolveram neste turno, por id. Sobe junto
   *  com a resposta porque e daqui que a bolha tira rotulo, valor e unidade --
   *  o modelo devolve so o identificador. */
  indice: Map<string, Citation>;
  /**
   * A proposta de memoria (D34), quando houve uma E ela passou pela validacao.
   *
   * Ausente e o caso normal. Ela so acompanha resposta APROVADA: o caminho
   * degradado nao e gerado, e montado, e uma proposta pendurada nele viria de
   * um texto que foi descartado por quebrar as regras.
   */
  memoriaProposta?: MemoryProposal;
};

/**
 * A copy de indisponibilidade. Ela diz o que o aplicativo FAZ.
 *
 * "Tente reformular a pergunta" foi recusada: quando a pergunta esta fora do
 * escopo por natureza -- "quantos miligramas eu tomo?" --, ela convida a
 * pessoa a repetir uma pergunta que sera recusada de novo, e a pessoa conclui
 * que o aplicativo esta quebrado em vez de entender que ele nao faz aquilo.
 *
 * E ela NAO diz o motivo tecnico. Quem escreveu a violacao foi o modelo;
 * contar isso a pessoa e acusatorio e ensina a contornar.
 */
export const INDISPONIVEL =
  'Não consigo responder a isso. Eu mostro o que está registrado nos seus exames, consultas, medicamentos e vacinas — não indico dose, não digo se um resultado está bom ou ruim, e não substituo uma avaliação médica. Se a sua dúvida for sobre um sintoma ou um resultado, vale levá-la a um profissional de saúde.';

/** O bilhete da citacao inventada. Escrito em termos da REGRA, como os da EPIC
 *  de regras de linguagem: dizer qual id foi inventado ensinaria o modelo a
 *  inventar um id que exista. */
const MOTIVO_CITACAO =
  'Você citou um resultado que não veio de nenhuma consulta. Cite apenas valores que as ferramentas devolveram nesta conversa, com o identificador exatamente como elas o entregaram.';

function classificar(toolsUsadas: string[]): QuestionKind {
  return toolsUsadas.some((t) => TOOLS_CLINICAS.has(t)) ? 'clinica' : 'operacional';
}

/**
 * O segundo caminho da verificacao, e ele e SEPARADO do primeiro de proposito.
 *
 * Reprovar a proposta descarta a proposta e entrega a resposta. Se fossem o
 * mesmo caminho, uma proposta ruim derrubaria uma resposta boa -- a EPIC nova
 * quebrando a entregue (regra 5 da constituicao).
 *
 * E a recusa e SILENCIOSA: a pessoa nao pediu proposta nenhuma, entao a
 * ausencia dela nao e erro que mereca mensagem na tela.
 */
function propostaAceitavel(
  memoria: MemoryProposal | undefined,
  memoriaAtiva: boolean | undefined,
): MemoryProposal | undefined {
  if (!memoria) return undefined;

  // Ausencia do sinalizador e tratada como ligada: ela significa que o
  // aplicativo e anterior a esta EPIC, ou que a pessoa nunca mexeu no
  // interruptor. Nenhum dos dois grava nada sozinho -- gravar depende de
  // confirmacao, que e o art. 11, I.
  if (memoriaAtiva === false) return undefined;

  return validarProposta(memoria).ok ? memoria : undefined;
}

/**
 * A R4 conferida DEPOIS do fato: uma citacao que aponta para uma linha que
 * nenhuma tool devolveu foi inventada, e isso e detectavel porque quem chamou
 * sabe o que as tools devolveram.
 *
 * Com o conjunto vazio a conferencia nao roda. Nao e brecha: o conjunto so
 * chega vazio quando nenhuma tool devolveu linha, e nesse caso a R4 ja foi
 * exercida pelo proprio laco -- o modelo nao tinha de onde tirar numero.
 */
function citacoesConferem(answer: ChatAnswer, indice: Map<string, Citation>): boolean {
  if (indice.size === 0) return true;
  return answer.citacoes.every((c) => indice.has(c.resultId));
}

export async function responderComVerificacao(entrada: TurnInput): Promise<RespostaVerificada> {
  // Comeca vazio e e preenchido depois do laco: as linhas citaveis so existem
  // depois que as ferramentas responderam. E por isso que a conferencia da R4
  // mora aqui, e nao em quem chama -- quem chama nao tem como saber.
  let indice = new Map<string, Citation>();

  const aprovada = (answer: ChatAnswer, status: RuleCheckStatus): RespostaVerificada => ({
    status,
    texto: answer.texto,
    citacoes: answer.citacoes,
    indice,
    memoriaProposta: propostaAceitavel(answer.memoria, entrada.memoriaAtiva),
  });

  // E -> C: o que fazer quando nao ha resposta exibivel. Tenta o dado sem
  // prosa; nao havendo dado, o silencio honesto.
  const semResposta = (toolOutputs: { name: string; output: unknown }[]): RespostaVerificada => {
    const degradada = buildDegradedAnswer(toolOutputs);
    return degradada
      ? { status: 'DEGRADADA', texto: degradada.texto, citacoes: degradada.citacoes, indice }
      : { status: 'INDISPONIVEL', texto: INDISPONIVEL, citacoes: [], indice };
  };

  const primeira = await runConversationTurn(entrada);

  if (!primeira.ok) {
    // O bloqueio do filtro tem mensagem propria, e ela NAO e trocada pela copy
    // generica: a pessoa precisa saber que houve um bloqueio, e nao um vazio.
    // Mostrar o dado por baixo de um bloqueio tambem seria errado -- o filtro
    // barrou a PERGUNTA, e responde-la com dados seria contorna-lo.
    if ('bloqueadoPeloFiltro' in primeira && primeira.bloqueadoPeloFiltro) {
      return { status: 'INDISPONIVEL', texto: primeira.message, citacoes: [], indice };
    }
    return semResposta(primeira.transcript.toolOutputs);
  }

  indice = indexarLinhasCitaveis(primeira.transcript.toolOutputs);

  const check = checkLanguageRules(primeira.answer.texto, {
    questionKind: classificar(primeira.answer.toolsUsadas),
  });
  const citacoesOk = citacoesConferem(primeira.answer, indice);
  if (check.ok && citacoesOk) return aprovada(primeira.answer, 'APROVADA');

  // A: UMA nova geracao. Nao e remendo -- e pedir ao modelo que escreva de
  // novo sabendo o que errou. E ela NAO refaz o laco de ferramentas: recebe o
  // transcript, com os `toolResult` dentro.
  //
  // O motivo sai do campo `reason` da violacao, que a EPIC de regras escreve
  // em termos da REGRA e nao do sintoma. "Nao escreva 500 mg" ensinaria o
  // modelo a escrever "meio grama".
  const motivos = check.ok ? [] : check.violations.map((v) => v.reason);
  if (!citacoesOk) motivos.push(MOTIVO_CITACAO);

  const segunda = await regenerateAnswer(entrada, primeira.transcript, motivos.join(' '));
  if (!segunda.ok) return semResposta(primeira.transcript.toolOutputs);

  const recheck = checkLanguageRules(segunda.answer.texto, {
    questionKind: classificar(segunda.answer.toolsUsadas),
  });
  if (recheck.ok && citacoesConferem(segunda.answer, indice)) {
    return aprovada(segunda.answer, 'APROVADA_NA_SEGUNDA');
  }

  // Reprovada duas vezes. O texto reprovado nao sai daqui de jeito nenhum.
  return semResposta(primeira.transcript.toolOutputs);
}

/**
 * O ponto de entrada que o handler conhece: um turno inteiro, do pedido ao
 * texto que vai a tela.
 *
 * Ele mora AQUI e nao no `conversationLoop.ts` porque depende da verificacao,
 * e a verificacao depende do laco -- junta-los fecharia um ciclo de
 * importacao.
 */
export async function responder(
  request: ChatTurnRequest,
  context: ChatContext,
): Promise<ChatTurnResult> {
  // A memoria e lida ANTES do laco, e nao dentro dele: ela entra no prompt de
  // sistema, que e montado uma vez por turno. `lerMemoria` nunca lanca -- sem
  // memoria, o assistente continua respondendo.
  //
  // Com a memoria desligada (art. 18, IX), nem sequer lemos: revogar o
  // consentimento interrompe o tratamento, e "tratamento" inclui a leitura.
  const fatos = request.memoriaAtiva === false ? [] : await lerMemoria(context.identity);

  const entrada: TurnInput = {
    message: request.message,
    systemPrompt: montarSystemPrompt(fatos),
    history: request.history,
    attachmentText: request.attachmentText,
    memoriaAtiva: request.memoriaAtiva,
    identity: context.identity,
    modelId: process.env.BEDROCK_MODEL_ID ?? '',
    guardrailId: process.env.BEDROCK_GUARDRAIL_ID ?? '',
    guardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION ?? '',
  };

  const resposta = await responderComVerificacao(entrada);

  return {
    answer: resposta.texto,
    // O identificador que o modelo devolveu e trocado pelo dado REAL. Pedir
    // que ele repita rotulo, valor e unidade dentro da citacao abriria uma
    // segunda via para o numero divergir do que esta no banco.
    citations: enriquecerCitacoes(resposta.citacoes, resposta.indice),
    ruleCheckStatus: resposta.status,
    memoriaProposta: resposta.memoriaProposta,
  };
}

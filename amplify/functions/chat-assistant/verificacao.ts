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
import {
  checkLanguageRules,
  temMedidaDeExame,
  type QuestionKind,
} from '../ai-language-rules/languageRules';

import {
  regenerateAnswer,
  runConversationTurn,
  type TurnInput,
  type TurnTranscript,
} from './conversationLoop';
import { costurar } from './encaminhamento';
import { enriquecerCitacoes, indexarLinhasCitaveis } from './citacoes';
import { buildDegradedAnswer } from './degradedAnswer';
import { validarProposta } from './memoria/propostaValida';
import { lerMemoria, montarSystemPrompt } from './memoria/leitura';
import type { AnswerCitation, ChatAnswer, MemoryProposal } from './chatSchema';
import { limparFormatacao } from './textoLimpo';
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
/**
 * Tools que devolvem dado de saude SEM unidade de medida -- condicao cronica,
 * alergia, sono, passos. Elas continuam tornando a pergunta clinica porque o
 * texto sozinho nao as alcancaria: "voce tem asma registrado" nao casa com
 * nenhuma unidade, e e dado de saude do mesmo jeito.
 *
 * `consultar_exames` SAIU desta lista em 2026-09-19 (U3), e a saida e
 * deliberada: ela devolve nome, tipo e data de documento -- metadado, nao
 * medida. Estar aqui fazia "faca uma visao de todos" ser classificada como
 * clinica e ser descartada por nao trazer rodape. Foram 2 de 2 reprovacoes
 * medidas em producao, as duas falso positivo.
 *
 * `consultar_resultados` NAO entra aqui de proposito: ela devolve medida, e
 * medida e pega pelo texto, que e o eixo certo.
 */
const TOOLS_CLINICAS = new Set(['consultar_analito', 'consultar_perfil', 'consultar_wearable']);

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

/** O bilhete da resposta sem forma. Diz o que fazer, e nao o que deu errado
 *  por dentro. */
const MOTIVO_DA_FORMA: Record<'formato' | 'max_tokens', string> = {
  formato: 'A resposta veio vazia ou fora do formato combinado.',
  max_tokens:
    'A resposta ficou longa demais e foi cortada. Escreva uma resposta mais curta: mostre menos valores e pergunte se a pessoa quer ver os outros.',
};

/**
 * O eixo e O QUE A RESPOSTA DIZ, e so em segundo lugar o que foi consultado.
 *
 * Isso APERTA num sentido e afrouxa noutro, e os dois sao intencionais:
 * - aperta: resposta com medida exige encaminhamento venha de qual tool vier,
 *   inclusive de uma que nao esta na lista;
 * - afrouxa: resposta que lista nome e data de documento deixa de exigir.
 *
 * O reconhecedor de medida e o MESMO da R4, importado e nao reescrito. Dois
 * reconhecedores divergiriam em silencio, e a divergencia apareceria como uma
 * resposta que a R2 libera e a R4 reprova -- duas regras brigando pelo mesmo
 * texto.
 */
function classificar(texto: string, toolsUsadas: string[]): QuestionKind {
  if (toolsUsadas.some((t) => TOOLS_CLINICAS.has(t))) return 'clinica';
  return temMedidaDeExame(texto) ? 'clinica' : 'operacional';
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
 * A R4 tem DOIS sentidos, e este arquivo cuida dos dois por caminhos separados.
 *
 * ESTE, a citacao INVENTADA: uma citacao que aponta para uma linha que nenhuma
 * tool devolveu, detectavel porque quem chamou sabe o que as tools devolveram.
 *
 * O OUTRO, a OMISSAO -- valor de exame sem citacao nenhuma --, e do verificador
 * de R4 em `languageRules.ts`, alimentado por `temOrigemDeclarada` logo abaixo.
 * Ele NAO mora aqui de proposito: um valor sem origem e reconhecivel so com o
 * texto, e deixa-lo aqui manteria a R1, a R2 e a R3 num lugar e metade da R4 em
 * outro. E o que esta funcao NAO cobre e justamente o que faltava: `[].every(...)`
 * e verdadeiro, entao citacoes vazias sempre conferiram.
 *
 * Com o indice vazio a conferencia nao roda. Nao e brecha: o indice so chega
 * vazio quando nenhuma tool devolveu linha, e o valor sem origem que o modelo
 * escrevesse nesse caso e exatamente o que o verificador de R4 pega.
 */
function citacoesConferem(answer: ChatAnswer, indice: Map<string, Citation>): boolean {
  // Sem citacao, nada a conferir. COM citacao e sem linha nenhuma no turno, a
  // citacao e inventada por definicao -- ate o Bloco 10 este caso devolvia
  // "confere", porque a primeira linha testava o indice vazio e nao a resposta.
  if (answer.citacoes.length === 0) return true;
  return answer.citacoes.every((c) => indice.has(c.resultId));
}

/**
 * A resposta trouxe de onde os numeros dela sairam? Quem chama sabe; o texto,
 * sozinho, nao. Duas coisas contam como origem:
 *
 * 1. CITACAO no envelope. Se ela e VALIDA e outra pergunta, respondida por
 *    `citacoesConferem` -- aqui basta haver origem declarada. Uma citacao
 *    inventada reprova pelo outro caminho, e os dois bilhetes somam.
 *
 * 2. O ANEXO PONTUAL do turno (D15). O papel esta na mao da pessoa e foi ela
 *    quem o mandou, entao o numero dele TEM origem; nao ha linha citavel porque
 *    a D15 decidiu que anexo pontual nao grava dado clinico. Sem esta segunda
 *    porta, "me explica este papel aqui" cairia no degradado toda vez -- a EPIC
 *    nova quebrando a entregue (regra 5 da constituicao).
 *
 * APROXIMACAO DECLARADA: a conferencia e de PRESENCA, nao de correspondencia
 * valor por valor. Casar cada numero do texto com uma linha do indice
 * reprovaria a faixa de referencia do laboratorio ("referencia de 12 a 16"),
 * que nao e citacao de resultado e e informacao legitima. A presenca e o que a
 * R4 pede: nenhum numero SEM origem.
 */
function temOrigemDeclarada(answer: ChatAnswer, entrada: TurnInput): boolean {
  if (answer.citacoes.length > 0) return true;
  return entrada.anexo != null;
}

/**
 * O rastro da reprovacao. SO o identificador da regra -- nunca o texto.
 *
 * Por que existe: sem ele, "nao consegui escrever uma resposta" e uma caixa
 * preta, para quem usa e para quem mantem. E a C10 pede a distribuicao das
 * reprovacoes por regra, que nao tem de onde sair se ninguem registra.
 *
 * Por que so o identificador: log e lido por gente e guardado por tempo
 * indeterminado. O texto reprovado fala de saude de alguem, e a mesma razao
 * que o mantem fora da tela o mantem fora daqui. `MOTIVO_CITACAO` ja segue
 * essa regra ao nao devolver o id inventado.
 */
/**
 * O custo da geracao. SO numero -- nada do que foi perguntado ou respondido.
 *
 * Uma linha POR GERACAO, e nao por turno: e a unica forma de saber o que a
 * segunda custa, que e metade do gatilho de reabertura da D31 ("se a segunda
 * geracao salvar menos de um terco, ela paga mais do que entrega").
 *
 * O dado ja vinha do Bedrock e era descartado. Sem ele, "quanto custa um turno"
 * so se descobre pela fatura no fim do mes, que nao separa por pergunta.
 */
/**
 * Tira a marcacao ANTES de qualquer verificacao.
 *
 * A ordem e a garantia: limpar depois de verificar abriria evasao -- a marcacao
 * parte a palavra ao meio, a regra nao a reconhece, e a limpeza a remonta
 * inteira na tela. Ha caso de teste sobre exatamente isso.
 */
function limparGeracao<T extends { ok: boolean }>(resultado: T): T {
  const r = resultado as T & { ok: true; answer?: { texto?: string } };
  if (!r.ok || typeof r.answer?.texto !== 'string') return resultado;
  return { ...r, answer: { ...r.answer, texto: limparFormatacao(r.answer.texto) } } as T;
}

/**
 * As ferramentas foram chamadas e TODAS disseram que nao ha dado?
 *
 * As duas metades da pergunta importam. Sem a primeira -- "foram chamadas" --
 * um "ola" que nao consulta nada cairia como ausencia de dado e seria reprovado
 * por nao dizer que falta algo, que e o oposto do que a R5 quer.
 *
 * Erro de tool conta como ausencia: para quem pergunta, "a consulta falhou" e
 * "nao ha registro" produzem a mesma obrigacao -- dizer que nao se sabe.
 */
function nenhumDadoVeio(toolOutputs: { name: string; output: unknown }[]): boolean {
  if (toolOutputs.length === 0) return false;
  return toolOutputs.every((t) => {
    const o = t.output as { disponivel?: unknown; erro?: unknown } | null;
    return !o || o.disponivel === false || o.erro !== undefined;
  });
}

function registrarCusto(
  etapa: 'primeira' | 'segunda',
  entrada: number | undefined,
  saida: number | undefined,
): void {
  console.info(
    JSON.stringify({
      evento: 'geracao-concluida',
      etapa,
      entrada: entrada ?? 0,
      saida: saida ?? 0,
    }),
  );
}

/**
 * O rastro do encaminhamento, e ele tem DUAS formas de proposito.
 *
 * Sob a C3 o prompt pede que o modelo NAO escreva o encaminhamento -- entao a
 * costura virou o caminho normal, e contar so ela nao diria mais nada sobre o
 * comportamento dele. O que passou a ser sinal e o inverso: quantas vezes ele
 * escreveu mesmo assim.
 *
 * Foi por causa desta contagem que "costurar sempre, em silencio" (A3) foi
 * recusada. Sem ela, ninguem nunca mais sabe se a instrucao pegou -- e a
 * medicao e o que este projeto tem de mais valioso.
 *
 * SO o fato, nunca o texto: a mesma regra do `resposta-reprovada`.
 */
function registrarEncaminhamento(costurado: boolean): void {
  console.info(
    JSON.stringify({
      evento: costurado ? 'encaminhamento-costurado' : 'encaminhamento-do-modelo',
    }),
  );
}

/**
 * A R2 e a UNICA violacao desta resposta?
 *
 * E a pergunta que autoriza a costura, e ela e estreita de proposito. A R2 e a
 * unica regra cuja violacao e a AUSENCIA de um texto fixo; nas outras quatro o
 * problema esta no que foi DITO, e nenhum rodape conserta isso. Com qualquer
 * uma delas junto, o caminho continua A -> E -> C (D31).
 */
function somenteR2(check: ReturnType<typeof checkLanguageRules>): boolean {
  return !check.ok && check.violations.every((v) => v.rule === 'R2');
}

function registrarReprovacao(
  etapa: 'primeira' | 'segunda',
  regras: string[],
  citacoesOk: boolean,
): void {
  console.info(
    JSON.stringify({
      evento: 'resposta-reprovada',
      etapa,
      regras,
      citacoes: citacoesOk ? 'conferem' : 'nao-conferem',
    }),
  );
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

  /**
   * A entrega de uma resposta aprovada, e o unico lugar onde o encaminhamento
   * entra (decisoes A2 e C3).
   *
   * Vale para os DOIS caminhos de aprovacao -- a resposta que passou limpa e a
   * que so faltava o encaminhamento --, e e por isso que a costura nao precisa
   * saber qual dos dois aconteceu: se o texto ja encaminha, `costurar` nao
   * mexe nele e o log registra que o encaminhamento foi do modelo.
   *
   * Em pergunta OPERACIONAL nao encaminha: a tela ja carrega o aviso
   * permanente, e repetir vira o rodape mecanico que a R2 manda evitar.
   */
  const entregar = (
    answer: ChatAnswer,
    status: RuleCheckStatus,
    tipo: QuestionKind,
  ): RespostaVerificada => {
    if (tipo !== 'clinica') return aprovada(answer, status);

    const costura = costurar(answer.texto);
    registrarEncaminhamento(costura.costurado);
    return aprovada({ ...answer, texto: costura.texto }, status);
  };

  /**
   * A UMA nova geracao da D31, compartilhada pelos dois motivos que a pedem: a
   * resposta que quebrou uma regra, e -- desde o Bloco 10 -- a resposta que
   * nem chegou a ter forma (vazia, ou cortada pelo teto de saida).
   */
  const tentarSegunda = async (
    transcript: TurnTranscript,
    motivo: string,
  ): Promise<RespostaVerificada> => {
    const semDados = nenhumDadoVeio(transcript.toolOutputs);
    const segunda = limparGeracao(await regenerateAnswer(entrada, transcript, motivo));
    if (!segunda.ok) return semResposta(transcript.toolOutputs);

    registrarCusto('segunda', segunda.inputTokens, segunda.outputTokens);

    const tipoDaSegunda = classificar(segunda.answer.texto, segunda.answer.toolsUsadas);
    const recheck = checkLanguageRules(segunda.answer.texto, {
      questionKind: tipoDaSegunda,
      temOrigem: temOrigemDeclarada(segunda.answer, entrada),
      // A segunda geracao NAO refaz o laco de ferramentas (D31), entao o que
      // elas devolveram continua sendo o da primeira.
      semDados,
    });
    const citacoesOkNaSegunda = citacoesConferem(segunda.answer, indice);
    if (citacoesOkNaSegunda && (recheck.ok || somenteR2(recheck))) {
      return entregar(segunda.answer, 'APROVADA_NA_SEGUNDA', tipoDaSegunda);
    }

    registrarReprovacao(
      'segunda',
      recheck.ok ? [] : recheck.violations.map((v) => v.rule),
      citacoesOkNaSegunda,
    );

    // Reprovada duas vezes. O texto reprovado nao sai daqui de jeito nenhum.
    return semResposta(transcript.toolOutputs);
  };

  const primeira = limparGeracao(await runConversationTurn(entrada));

  if (!primeira.ok) {
    // O bloqueio do filtro tem mensagem propria, e ela NAO e trocada pela copy
    // generica: a pessoa precisa saber que houve um bloqueio, e nao um vazio.
    // Mostrar o dado por baixo de um bloqueio tambem seria errado -- o filtro
    // barrou a PERGUNTA, e responde-la com dados seria contorna-lo.
    if ('bloqueadoPeloFiltro' in primeira && primeira.bloqueadoPeloFiltro) {
      return { status: 'INDISPONIVEL', texto: primeira.message, citacoes: [], indice };
    }
    // Resposta sem FORMA -- vazia, ou cortada pelo teto de saida (Bloco 10).
    // Uma vez em quatro, nas rodadas da avaliacao, o modelo devolveu texto
    // vazio depois de usar uma ferramenta. A forma ruim tem direito a mesma
    // UMA nova geracao que o conteudo ruim ja tinha; o teto de iteracoes, nao
    // -- ele e a pergunta grande demais, e uma nova geracao nao a encolhe.
    if ('motivo' in primeira && primeira.motivo) {
      indice = indexarLinhasCitaveis(primeira.transcript.toolOutputs);
      return tentarSegunda(primeira.transcript, MOTIVO_DA_FORMA[primeira.motivo]);
    }
    return semResposta(primeira.transcript.toolOutputs);
  }

  registrarCusto('primeira', primeira.inputTokens, primeira.outputTokens);

  indice = indexarLinhasCitaveis(primeira.transcript.toolOutputs);

  const semDados = nenhumDadoVeio(primeira.transcript.toolOutputs);

  const tipo = classificar(primeira.answer.texto, primeira.answer.toolsUsadas);
  const check = checkLanguageRules(primeira.answer.texto, {
    questionKind: tipo,
    temOrigem: temOrigemDeclarada(primeira.answer, entrada),
    semDados,
  });
  const citacoesOk = citacoesConferem(primeira.answer, indice);

  // A costura entra AQUI, e nao depois da segunda geracao: gastar uma geracao
  // inteira para pedir ao modelo uma frase que o aplicativo sabe escrever era
  // o desperdicio que a A2 conserta. Medido: 2 de 2 reprovacoes em producao.
  if (citacoesOk && (check.ok || somenteR2(check))) {
    return entregar(primeira.answer, 'APROVADA', tipo);
  }

  // A: UMA nova geracao. Nao e remendo -- e pedir ao modelo que escreva de
  // novo sabendo o que errou. E ela NAO refaz o laco de ferramentas: recebe o
  // transcript, com os `toolResult` dentro.
  //
  // O motivo sai do campo `reason` da violacao, que a EPIC de regras escreve
  // em termos da REGRA e nao do sintoma. "Nao escreva 500 mg" ensinaria o
  // modelo a escrever "meio grama".
  const motivos = check.ok ? [] : check.violations.map((v) => v.reason);
  if (!citacoesOk) motivos.push(MOTIVO_CITACAO);

  registrarReprovacao(
    'primeira',
    check.ok ? [] : check.violations.map((v) => v.rule),
    citacoesOk,
  );

  return tentarSegunda(primeira.transcript, motivos.join(' '));
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
    anexo: request.anexo,
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

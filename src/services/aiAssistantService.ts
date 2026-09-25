/**
 * Resumo do arquivo:
 * Fronteira com o provedor de IA do Assistente (tela 4a).
 *
 * A versao mockada deste arquivo dizia, num aviso, que a troca por IA real
 * exigia decidir provedor, custo, retencao e base legal. Tres das quatro foram
 * respondidas fora daqui: o provedor e o Bedrock (D14), o custo e medido como
 * na feature de wearable, e "API de terceiros" deixou de ser o caso -- o
 * Bedrock roda na conta do proprio projeto. A quarta, retencao, e a tarefa 0.5
 * do roadmap, e por isso a PERSISTENCIA da conversa continua fora: nada aqui
 * grava conversa.
 *
 * A FORMA DO CONTRATO NAO MUDOU. A EPIC anterior desenhou `AiAssistantService`
 * para que a troca fosse a substituicao de uma funcao, e nao uma refatoracao
 * de interface, e `sendMessage` continua `(message, history, userContext?) =>
 * Promise<string>`.
 *
 * O QUE MUDOU, E E ACRESCIMO: a bolha com origem exige que a resposta carregue
 * as citacoes, e texto puro nao carrega. Em vez de mudar a forma do contrato,
 * `sendMessageWithSources` foi ACRESCENTADA ao lado, e `sendMessage` passou a
 * ser uma casca sobre ela. Quem so quer o texto continua com a mesma funcao de
 * antes; quem precisa da origem chama a nova. Registrado como achado.
 */
import { fetchAuthSession } from 'aws-amplify/auth';

import { chatAssistantUrl } from './chatAssistantEndpoint';
import {
  tipoValido,
  type MemoryKind,
} from '../../amplify/functions/chat-assistant/memoria/regras';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/** De onde veio um numero citado. Os campos chegam prontos da funcao: o
 *  modelo devolve so o identificador, e o rotulo, o valor e a unidade sao
 *  preenchidos la com o dado real. */
export interface Citation {
  resultId: string;
  documentId: string;
  analyteLabel: string;
  value: string;
  unit: string;
  collectedAt: string | null;
}

/** Qual dos quatro caminhos da D31 aconteceu neste turno. */
export type RuleCheckStatus = 'APROVADA' | 'APROVADA_NA_SEGUNDA' | 'DEGRADADA' | 'INDISPONIVEL';

/** Um fato que o modelo PROPOS. Nada foi gravado: quem grava e a pessoa, ao
 *  tocar em "Lembrar" (D34, art. 11, I da LGPD). */
export interface MemoryProposal {
  texto: string;
  tipo: MemoryKind;
}

export interface AssistantReply {
  text: string;
  citations: Citation[];
  ruleCheckStatus: RuleCheckStatus;
  /** Ausente na esmagadora maioria dos turnos. */
  memoriaProposta?: MemoryProposal;
}

export interface AiAssistantService {
  // userContext (futuro): perfil + exames serializados injetados no system prompt
  sendMessage: (message: string, history: ChatMessage[], userContext?: string) => Promise<string>;
}

/** Teto do lado do aplicativo, MENOR que o da funcao (120s): a tela nunca fica
 *  esperando para sempre, mesmo se a funcao demorar o maximo dela. */
const TIMEOUT_MS = 90_000;

const ERRO_GENERICO = 'Não consegui responder agora. Tente novamente em instantes.';
const SEM_ENDERECO =
  'O assistente está indisponível nesta versão do aplicativo. Você continua podendo ver seus exames, consultas e medicamentos normalmente.';
const SESSAO_EXPIRADA = 'Sua sessão expirou. Entre de novo para continuar.';

function lerCitacoes(bruto: unknown): Citation[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.filter((c): c is Citation => {
    const candidata = c as Partial<Citation> | null;
    // Sem documento a citacao nao leva a lugar nenhum, e uma origem que nao
    // abre nada e pior do que nenhuma origem: ela promete e nao cumpre.
    return (
      typeof candidata?.resultId === 'string' &&
      typeof candidata.documentId === 'string' &&
      candidata.documentId !== ''
    );
  });
}

/**
 * A proposta e conferida ANTES de chegar a tela, mesmo ja tendo sido validada
 * pela funcao. Aqui a conferencia e de FORMA -- que os dois campos existem e
 * que o tipo esta na lista fechada --, e ela existe porque a alternativa e
 * levar lixo a um cartao que pede consentimento. Um cartao com texto vazio
 * pediria a pessoa que confirmasse nada.
 */
function lerProposta(bruto: unknown): MemoryProposal | undefined {
  const candidata = bruto as Partial<MemoryProposal> | null;
  if (typeof candidata?.texto !== 'string' || candidata.texto.trim() === '') return undefined;
  if (typeof candidata.tipo !== 'string' || !tipoValido(candidata.tipo)) return undefined;
  return { texto: candidata.texto, tipo: candidata.tipo };
}

export async function sendMessageWithSources(
  message: string,
  history: ChatMessage[],
  _userContext?: string,
  /** A chave do anexo pontual no bucket (C7, D15). O texto e lido pela funcao,
   *  pelo OCR -- o aplicativo nunca manda texto se passando por documento. */
  attachmentKey?: string | null,
  /** Se a pessoa deixou a memoria ligada (D34). Omitido quando o aplicativo
   *  ainda nao sabe -- e a FUNCAO que trata ausencia como ligada, porque
   *  afirmar `true` daqui seria o aplicativo declarando um consentimento que
   *  ele nao conferiu. */
  memoriaAtiva?: boolean,
): Promise<AssistantReply> {
  const url = chatAssistantUrl();
  // "Tente novamente" aqui mandaria a pessoa repetir algo que nunca vai
  // funcionar: o endereco so existe depois do deploy.
  if (!url) throw new Error(SEM_ENDERECO);

  const sessao = await fetchAuthSession();
  const token = sessao.tokens?.idToken?.toString();
  if (!token) throw new Error(SESSAO_EXPIRADA);

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      // NENHUM identificador de usuario no corpo. O dono vem do token, e
      // mandar um identificador aqui abriria uma porta que a funcao teria que
      // aprender a ignorar -- e um dia esqueceria.
      body: JSON.stringify({
        message,
        history: history.map((m) => ({ role: m.role, content: m.content })),
        ...(attachmentKey ? { attachmentKey } : {}),
        ...(memoriaAtiva === undefined ? {} : { memoriaAtiva }),
      }),
      signal: controle.signal,
    });

    if (!resposta.ok) throw new Error(ERRO_GENERICO);

    const corpo = (await resposta.json()) as {
      answer?: string;
      citations?: unknown;
      ruleCheckStatus?: RuleCheckStatus;
      memoriaProposta?: unknown;
    };

    return {
      text: typeof corpo.answer === 'string' ? corpo.answer : ERRO_GENERICO,
      citations: lerCitacoes(corpo.citations),
      ruleCheckStatus: corpo.ruleCheckStatus ?? 'INDISPONIVEL',
      memoriaProposta: lerProposta(corpo.memoriaProposta),
    };
  } catch (erro) {
    // As mensagens que JA sao honestas passam intactas; o resto vira a
    // generica, para nao vazar detalhe de infraestrutura para a tela.
    if (erro instanceof Error && (erro.message === SEM_ENDERECO || erro.message === SESSAO_EXPIRADA)) {
      throw erro;
    }
    throw new Error(ERRO_GENERICO);
  } finally {
    clearTimeout(relogio);
  }
}

export async function sendMessage(
  message: string,
  history: ChatMessage[],
  userContext?: string,
): Promise<string> {
  return (await sendMessageWithSources(message, history, userContext)).text;
}

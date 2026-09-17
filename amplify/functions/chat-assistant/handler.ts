/**
 * Resumo do arquivo:
 * A porta do assistente conversacional. Ela existe fora do AppSync pela D12 --
 * o resolver corta em 30s e um laco de tools passa disso -- e por isso tres
 * coisas que o AppSync fazia sozinho sao feitas aqui: identidade, origem
 * cruzada e limite de chamadas.
 *
 * O QUE ESTE ARQUIVO NAO FAZ: ele nao conhece o Bedrock, nao conhece tool
 * nenhuma e nao conhece regra de linguagem. Ele identifica quem chamou,
 * decide se a chamada pode acontecer, e entrega ao laco. Manter a porta
 * pequena e o que permite testa-la inteira sem rede.
 *
 * ELE NUNCA LANCA. Uma excecao que escapasse daqui viraria um 502 da Function
 * URL com um corpo que nao controlamos.
 */
import { resolveIdentity } from './auth';
import { checkRateLimit } from './rateLimit';
import { responder } from './verificacao';
import type { ChatTurnRequest } from './types';

type FunctionUrlEvent = {
  requestContext?: { http?: { method?: string } };
  headers?: Record<string, string | undefined>;
  body?: string | null;
};

type FunctionUrlResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

const JSON_HEADERS = { 'content-type': 'application/json' };

function resposta(statusCode: number, corpo: unknown, extras?: Record<string, string>): FunctionUrlResponse {
  return { statusCode, headers: { ...JSON_HEADERS, ...extras }, body: JSON.stringify(corpo) };
}

/**
 * A Function URL entrega os cabecalhos em minusculo, mas um cliente de teste
 * ou um proxy pode nao faze-lo. Procurar pelos dois evita um 401 que ninguem
 * consegue explicar.
 */
function cabecalho(headers: Record<string, string | undefined> | undefined, nome: string): string | undefined {
  if (!headers) return undefined;
  const chave = Object.keys(headers).find((k) => k.toLowerCase() === nome);
  return chave ? headers[chave] : undefined;
}

function lerCorpo(body: string | null | undefined): ChatTurnRequest | null {
  if (!body) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof bruto !== 'object' || bruto === null) return null;

  const objeto = bruto as Record<string, unknown>;
  const message = typeof objeto.message === 'string' ? objeto.message.trim() : '';
  if (message === '') return null;

  // Cada campo e lido NOMINALMENTE, e nao por espalhamento do objeto: um
  // `...objeto` carregaria para dentro da funcao qualquer campo que o cliente
  // inventasse, inclusive um `owner`. Aqui nao existe caminho para isso.
  const history = Array.isArray(objeto.history)
    ? objeto.history
        .filter(
          (m): m is { role: 'user' | 'assistant'; content: string } =>
            typeof m === 'object' &&
            m !== null &&
            typeof (m as { content?: unknown }).content === 'string' &&
            ((m as { role?: unknown }).role === 'user' ||
              (m as { role?: unknown }).role === 'assistant'),
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  const attachmentText =
    typeof objeto.attachmentText === 'string' ? objeto.attachmentText : null;

  return { message, history, attachmentText };
}

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResponse> {
  try {
    if ((event.requestContext?.http?.method ?? 'POST').toUpperCase() !== 'POST') {
      return resposta(405, { error: 'Metodo nao suportado.' });
    }

    // A identidade vem PRIMEIRO. O limite de chamadas conta por dono, e contar
    // antes de saber quem e so poderia contar por anonimo -- o que faria uma
    // enxurrada sem token bloquear quem esta autenticado.
    let identity;
    try {
      identity = await resolveIdentity(cabecalho(event.headers, 'authorization'));
    } catch {
      return resposta(401, { error: 'Usuario nao autenticado.' });
    }

    const limite = checkRateLimit(identity.owner);
    if (!limite.allowed) {
      return resposta(
        429,
        {
          error: 'Muitas perguntas seguidas. Aguarde alguns instantes e tente de novo.',
          retryAfterSeconds: limite.retryAfterSeconds,
        },
        { 'retry-after': String(limite.retryAfterSeconds) },
      );
    }

    const pedido = lerCorpo(event.body);
    if (!pedido) return resposta(400, { error: 'Requisicao invalida.' });

    const resultado = await responder(pedido, { identity });
    return resposta(200, resultado);
  } catch (erro) {
    // O detalhe tecnico fica no log, nunca no corpo: nome de tabela e mensagem
    // de driver contam ao chamador como e a infraestrutura por dentro.
    console.error('Falha nao tratada no assistente:', erro);
    return resposta(500, { error: 'Nao foi possivel responder agora.' });
  }
}

/**
 * O endereco direto e a porta. Estes testes cobrem a porta, e nao o que
 * acontece atras dela: quem entra, quem e recusado, e com que corpo.
 */
const mockResolveIdentity = jest.fn();
jest.mock('../auth', () => ({
  resolveIdentity: (...a: unknown[]) => mockResolveIdentity(...a),
}));

const mockResponder = jest.fn();
jest.mock('../verificacao', () => ({
  responder: (...a: unknown[]) => mockResponder(...a),
}));

import { handler } from '../handler';
import { MAX_POR_JANELA, resetRateLimit } from '../rateLimit';

type Evento = Parameters<typeof handler>[0];

function evento(over: Partial<Record<string, unknown>> = {}): Evento {
  return {
    requestContext: { http: { method: 'POST' } },
    headers: { authorization: 'Bearer abc' },
    body: JSON.stringify({ message: 'como esta minha vitamina D?', history: [] }),
    ...over,
  } as unknown as Evento;
}

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

beforeEach(() => {
  mockResolveIdentity.mockReset().mockResolvedValue(IDENTIDADE);
  mockResponder.mockReset().mockResolvedValue({
    answer: 'Uma resposta.',
    citations: [],
    ruleCheckStatus: 'APROVADA',
  });
  resetRateLimit();
});

describe('handler -- quem entra', () => {
  it('recusa requisicao sem token valido, com 401', async () => {
    mockResolveIdentity.mockRejectedValue(new Error('Usuario nao autenticado.'));
    const resposta = await handler(evento({ headers: {} }));
    expect(resposta.statusCode).toBe(401);
    expect(mockResponder).not.toHaveBeenCalled();
  });

  it('aceita o cabecalho em qualquer caixa -- a Function URL entrega minusculo', async () => {
    const resposta = await handler(evento({ headers: { Authorization: 'Bearer abc' } }));
    expect(resposta.statusCode).toBe(200);
  });

  it('IGNORA o owner enviado no corpo e usa o do token', async () => {
    // O cenario que este endereco existe para nao permitir: alguem com conta
    // propria pedindo o dado de outra pessoa pelo corpo da requisicao.
    await handler(
      evento({
        body: JSON.stringify({ message: 'oi', owner: 'vitima::vitima', ownerId: 'vitima' }),
      }),
    );
    const [, contexto] = mockResponder.mock.calls[0];
    expect(contexto.identity).toEqual(IDENTIDADE);
    expect(JSON.stringify(contexto)).not.toContain('vitima');
  });

  it('recusa metodo que nao seja POST', async () => {
    const resposta = await handler(evento({ requestContext: { http: { method: 'GET' } } }));
    expect(resposta.statusCode).toBe(405);
  });

  it('recusa corpo sem mensagem, sem chamar o modelo', async () => {
    const resposta = await handler(evento({ body: JSON.stringify({ message: '   ' }) }));
    expect(resposta.statusCode).toBe(400);
    expect(mockResponder).not.toHaveBeenCalled();
  });

  it('recusa corpo que nao e JSON, sem derrubar a funcao', async () => {
    const resposta = await handler(evento({ body: 'nao e json' }));
    expect(resposta.statusCode).toBe(400);
  });
});

describe('handler -- limite de chamadas por dono', () => {
  it('recusa com 429 depois do teto, e diz quando tentar de novo', async () => {
    for (let i = 0; i < MAX_POR_JANELA; i += 1) await handler(evento());
    const resposta = await handler(evento());
    expect(resposta.statusCode).toBe(429);
    expect(resposta.headers?.['retry-after']).toBeDefined();
  });

  it('o limite e conferido DEPOIS da identidade -- senao contaria por anonimo', async () => {
    mockResolveIdentity.mockRejectedValue(new Error('Usuario nao autenticado.'));
    for (let i = 0; i < MAX_POR_JANELA + 5; i += 1) await handler(evento());
    mockResolveIdentity.mockResolvedValue(IDENTIDADE);
    expect((await handler(evento())).statusCode).toBe(200);
  });
});

describe('handler -- o que ele devolve', () => {
  it('nunca lanca: erro interno vira 500 com mensagem sem detalhe tecnico', async () => {
    mockResponder.mockRejectedValue(new Error('ECONNRESET na tabela LabResult-abc123'));
    const resposta = await handler(evento());
    expect(resposta.statusCode).toBe(500);
    expect(resposta.body).not.toContain('LabResult');
    expect(resposta.body).not.toContain('ECONNRESET');
  });

  it('devolve a resposta do laco como JSON', async () => {
    const resposta = await handler(evento());
    expect(JSON.parse(resposta.body)).toEqual({
      answer: 'Uma resposta.',
      citations: [],
      ruleCheckStatus: 'APROVADA',
    });
  });
});

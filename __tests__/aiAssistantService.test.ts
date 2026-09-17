/**
 * A fronteira do aplicativo com a funcao do assistente. O que estes testes
 * protegem nao e a chamada: e a regra de que o dono vem do TOKEN, que na ponta
 * do aplicativo significa nao mandar identificador nenhum no corpo.
 */
const mockFetchAuthSession = jest.fn();
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: () => mockFetchAuthSession(),
}));

const mockChatUrl = jest.fn();
jest.mock('@/services/chatAssistantEndpoint', () => ({
  chatAssistantUrl: () => mockChatUrl(),
}));

import {
  sendMessage,
  sendMessageWithSources,
  type AiAssistantService,
} from '@/services/aiAssistantService';

const fetchFalso = jest.fn();

function respondeCom(corpo: unknown, ok = true) {
  fetchFalso.mockResolvedValue({ ok, json: async () => corpo });
}

function ultimaChamada() {
  const [, opcoes] = fetchFalso.mock.calls.at(-1) as [string, RequestInit];
  return opcoes;
}

beforeEach(() => {
  fetchFalso.mockReset();
  global.fetch = fetchFalso as unknown as typeof fetch;
  mockFetchAuthSession.mockReset().mockResolvedValue({
    tokens: { idToken: { toString: () => 'token-do-cognito' } },
  });
  mockChatUrl.mockReset().mockReturnValue('https://exemplo.lambda-url/');
  respondeCom({ answer: 'Uma resposta.', citations: [], ruleCheckStatus: 'APROVADA' });
});

describe('a chamada', () => {
  it('manda o token do Cognito no cabecalho', async () => {
    await sendMessage('oi', []);
    const headers = ultimaChamada().headers as Record<string, string>;
    expect(headers.authorization).toMatch(/^Bearer /);
  });

  it('NAO manda identificador de usuario no corpo', async () => {
    // O dono vem do token. Um identificador aqui abriria uma porta que a
    // funcao teria que aprender a ignorar -- e um dia esqueceria.
    await sendMessage('oi', []);
    expect(String(ultimaChamada().body)).not.toMatch(/owner|userId|"sub"/i);
  });

  it('manda so papel e conteudo de cada mensagem do historico', async () => {
    await sendMessage('oi', [
      { id: 'm-1', role: 'user', content: 'antes', timestamp: new Date() },
    ]);
    const corpo = JSON.parse(String(ultimaChamada().body));
    expect(corpo.history).toEqual([{ role: 'user', content: 'antes' }]);
  });

  it('sessao sem token nao chega a chamar a funcao', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined });
    await expect(sendMessage('oi', [])).rejects.toThrow(/sess/i);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe('quando da errado', () => {
  it('falha de rede vira mensagem amigavel, nao excecao vazando para a tela', async () => {
    fetchFalso.mockRejectedValue(new Error('Network request failed'));
    await expect(sendMessage('oi', [])).rejects.toThrow(/tente novamente/i);
  });

  it('a mensagem de erro nao repassa o detalhe tecnico', async () => {
    fetchFalso.mockRejectedValue(new Error('ECONNRESET em lambda-url.us-east-1'));
    await expect(sendMessage('oi', [])).rejects.not.toThrow(/ECONNRESET|lambda/i);
  });

  it('resposta de erro da funcao tambem vira mensagem amigavel', async () => {
    respondeCom({ error: 'Nao foi possivel responder agora.' }, false);
    await expect(sendMessage('oi', [])).rejects.toThrow(/tente novamente/i);
  });

  it('endereco ausente e dito como ausente, e nao como falha de rede', async () => {
    // Antes do primeiro deploy o `amplify_outputs.json` nao tem o endereco.
    // Dizer "tente novamente" ali mandaria a pessoa repetir algo que nunca vai
    // funcionar.
    mockChatUrl.mockReturnValue(null);
    await expect(sendMessage('oi', [])).rejects.toThrow(/indispon/i);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe('a forma do contrato', () => {
  it('AiAssistantService continua com a mesma assinatura', () => {
    // Se este teste precisar mudar, o desenho da EPIC anterior nao previu o
    // que precisava prever -- e isso e um achado a registrar, nao um detalhe.
    const servico: AiAssistantService = { sendMessage };
    expect(servico.sendMessage.length).toBe(3);
  });

  it('sendMessage continua devolvendo texto', async () => {
    await expect(sendMessage('oi', [])).resolves.toBe('Uma resposta.');
  });
});

describe('as origens, que sao ACRESCIMO e nao troca', () => {
  it('sendMessageWithSources devolve texto, citacoes e o caminho da D31', async () => {
    respondeCom({
      answer: 'Seu registro de março mostra 32,5 ng/mL.',
      citations: [
        {
          resultId: 'l-1',
          documentId: 'doc-1',
          analyteLabel: 'Vitamina D (25-OH)',
          value: '32,5',
          unit: 'ng/mL',
          collectedAt: '2026-03-12',
        },
      ],
      ruleCheckStatus: 'APROVADA',
    });
    const r = await sendMessageWithSources('oi', []);
    expect(r.text).toContain('32,5');
    expect(r.citations[0].documentId).toBe('doc-1');
    expect(r.ruleCheckStatus).toBe('APROVADA');
  });

  it('resposta sem citacoes nao quebra', async () => {
    respondeCom({ answer: 'Bom dia.' });
    const r = await sendMessageWithSources('oi', []);
    expect(r.citations).toEqual([]);
  });

  it('descarta citacao sem documento de origem', async () => {
    // Uma citacao sem documento nao leva a lugar nenhum, e uma origem que nao
    // abre nada e pior do que nenhuma origem: ela promete e nao cumpre.
    respondeCom({
      answer: 'texto',
      citations: [{ resultId: 'l-1', documentId: '', analyteLabel: 'x', value: '1', unit: 'a' }],
    });
    expect((await sendMessageWithSources('oi', [])).citations).toEqual([]);
  });
});

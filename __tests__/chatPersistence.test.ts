/**
 * A persistência da conversa (C8), destravada pela D33.
 *
 * QUEM GRAVA É O APLICATIVO, e não a função. A função do chat é somente
 * leitura por contrato -- há um teste que varre os arquivos dela procurando
 * comando de escrita do DynamoDB --, e essa garantia é o que torna o laço
 * auditável. Gravar a conversa pela função obrigaria a abrir aquela porta.
 *
 * Gravando pelo aplicativo, a autorização por dono é a do AppSync, e não uma
 * regra que escrevemos: é a mesma que protege exame, consulta e medicamento.
 */
const mockModels = {
  ChatConversation: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  },
  ChatMessage: {
    create: jest.fn(),
    delete: jest.fn(),
    // O nome que o Amplify gera para a consulta pelo indice de
    // `conversationId`. Ler pelo indice, e nao por `list`, e o que evita
    // varredura da tabela inteira ao abrir uma conversa.
    listChatMessageByConversationId: jest.fn(),
  },
};

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({ models: mockModels }),
}));

import {
  apagarConversa,
  criarConversa,
  listarConversas,
  salvarTurno,
  tituloDaPergunta,
} from '@/services/chatHistoryService';

const CITACAO = {
  resultId: 'l-1',
  documentId: 'doc-1',
  analyteLabel: 'Vitamina D (25-OH)',
  value: '32,5',
  unit: 'ng/mL',
  collectedAt: '2026-03-12',
};

beforeEach(() => {
  for (const modelo of Object.values(mockModels)) {
    for (const fn of Object.values(modelo)) (fn as jest.Mock).mockReset();
  }
  mockModels.ChatConversation.create.mockResolvedValue({ data: { id: 'c-1' }, errors: undefined });
  mockModels.ChatConversation.update.mockResolvedValue({ data: {}, errors: undefined });
  mockModels.ChatConversation.delete.mockResolvedValue({ data: {}, errors: undefined });
  mockModels.ChatMessage.create.mockResolvedValue({ data: { id: 'm-1' }, errors: undefined });
  mockModels.ChatMessage.delete.mockResolvedValue({ data: {}, errors: undefined });
  mockModels.ChatMessage.listChatMessageByConversationId.mockResolvedValue({
    data: [],
    errors: undefined,
  });
  mockModels.ChatConversation.list.mockResolvedValue({ data: [], errors: undefined });
});

describe('o título da conversa', () => {
  it('vem das primeiras palavras do usuario, NUNCA do modelo', () => {
    // Um titulo gerado e mais uma superficie de texto sobre saude, que
    // precisaria passar pelas cinco camadas de regra para render uma linha de
    // lista. Nao vale o custo nem o risco.
    expect(tituloDaPergunta('Como está minha vitamina D comparada ao exame anterior?')).toMatch(
      /^Como está minha vitamina D/,
    );
  });

  it('corta sem cortar palavra pela metade', () => {
    const titulo = tituloDaPergunta('Como está minha vitamina D comparada ao exame anterior?');
    expect(titulo.length).toBeLessThanOrEqual(60);
    expect(titulo).not.toMatch(/\s\S{1,2}…$/);
  });

  it('pergunta curta vira titulo inteiro, sem reticencias', () => {
    expect(tituloDaPergunta('Bom dia')).toBe('Bom dia');
  });

  it('mensagem vazia nao produz titulo vazio', () => {
    // Uma linha em branco na gaveta nao diz a pessoa em que conversa ela vai
    // entrar.
    expect(tituloDaPergunta('   ').length).toBeGreaterThan(0);
  });
});

describe('gravar um turno', () => {
  it('a conversa e criada com o titulo da pergunta e a hora de inicio', async () => {
    await criarConversa('Como está minha vitamina D?');
    const [entrada] = mockModels.ChatConversation.create.mock.calls[0];
    expect(entrada.title).toMatch(/^Como está minha vitamina D/);
    expect(entrada.startedAt).toBeDefined();
  });

  it('cada mensagem guarda as citacoes, para a origem sobreviver ao tempo', async () => {
    // E o que permite reabrir o documento de origem de um numero semanas
    // depois -- a R4 verificavel depois do fato, e nao so no momento da
    // geracao.
    await salvarTurno('c-1', {
      pergunta: 'e minha vitamina D?',
      resposta: 'Seu registro de março mostra 32,5 ng/mL.',
      citations: [CITACAO],
      ruleCheckStatus: 'APROVADA',
    });
    const chamadas = mockModels.ChatMessage.create.mock.calls;
    const doAssistente = chamadas.find(([e]) => e.role === 'ASSISTANT')![0];
    expect(JSON.parse(doAssistente.citations)).toEqual([CITACAO]);
  });

  it('grava as DUAS mensagens do turno, na ordem', async () => {
    await salvarTurno('c-1', {
      pergunta: 'oi',
      resposta: 'olá',
      citations: [],
      ruleCheckStatus: 'APROVADA',
    });
    const papeis = mockModels.ChatMessage.create.mock.calls.map(([e]) => e.role);
    expect(papeis).toEqual(['USER', 'ASSISTANT']);
  });

  it('guarda o resultado da verificacao de linguagem', async () => {
    // E o dado que calibra a D31: sem ele, "com que frequencia a verificacao
    // reprova" seria uma impressao.
    await salvarTurno('c-1', {
      pergunta: 'oi',
      resposta: 'olá',
      citations: [],
      ruleCheckStatus: 'APROVADA_NA_SEGUNDA',
    });
    const doAssistente = mockModels.ChatMessage.create.mock.calls.find(
      ([e]) => e.role === 'ASSISTANT',
    )![0];
    expect(doAssistente.ruleCheckStatus).toBe('APROVADA_NA_SEGUNDA');
  });

  it('a mensagem do usuario NAO carrega citacao nem resultado de verificacao', async () => {
    // Quem cita e quem e verificado e a resposta. Repetir os campos na
    // pergunta guardaria dado sem significado.
    await salvarTurno('c-1', {
      pergunta: 'oi',
      resposta: 'olá',
      citations: [CITACAO],
      ruleCheckStatus: 'APROVADA',
    });
    const doUsuario = mockModels.ChatMessage.create.mock.calls.find(([e]) => e.role === 'USER')![0];
    expect(doUsuario.citations).toBeUndefined();
    expect(doUsuario.ruleCheckStatus).toBeUndefined();
  });

  it('falha ao gravar NAO derruba a conversa', async () => {
    // A resposta ja esta na tela. Perder o registro e ruim; perder a resposta
    // por causa do registro seria pior.
    mockModels.ChatMessage.create.mockRejectedValue(new Error('rede'));
    await expect(
      salvarTurno('c-1', { pergunta: 'oi', resposta: 'olá', citations: [], ruleCheckStatus: 'APROVADA' }),
    ).resolves.toBeUndefined();
  });
});

describe('apagar significa sumir (D33)', () => {
  it('apaga as mensagens E a conversa, nunca so a conversa', async () => {
    // Apagar so a conversa deixaria as mensagens orfas no banco -- "apagado"
    // passaria a significar "sumiu da sua tela", que e exatamente o que a D33
    // recusou.
    mockModels.ChatMessage.listChatMessageByConversationId.mockResolvedValue({
      data: [{ id: 'm-1' }, { id: 'm-2' }],
      errors: undefined,
    });
    await apagarConversa('c-1');
    expect(mockModels.ChatMessage.delete).toHaveBeenCalledTimes(2);
    expect(mockModels.ChatConversation.delete).toHaveBeenCalledWith({ id: 'c-1' });
  });

  it('as mensagens saem ANTES da conversa', async () => {
    // Na ordem inversa, uma falha no meio deixaria mensagens sem conversa a
    // que pertencer, e nada na tela para apaga-las.
    const ordem: string[] = [];
    mockModels.ChatMessage.listChatMessageByConversationId.mockResolvedValue({
      data: [{ id: 'm-1' }],
      errors: undefined,
    });
    mockModels.ChatMessage.delete.mockImplementation(async () => {
      ordem.push('mensagem');
      return { data: {}, errors: undefined };
    });
    mockModels.ChatConversation.delete.mockImplementation(async () => {
      ordem.push('conversa');
      return { data: {}, errors: undefined };
    });
    await apagarConversa('c-1');
    expect(ordem).toEqual(['mensagem', 'conversa']);
  });

  it('nao ha marcacao logica de apagado em lugar nenhum', async () => {
    // A D33 recusou "apagar depois": a exclusao e efetiva e imediata.
    await apagarConversa('c-1');
    expect(mockModels.ChatConversation.update).not.toHaveBeenCalled();
  });
});

describe('listar as conversas', () => {
  it('traz as mais recentes primeiro', async () => {
    mockModels.ChatConversation.list.mockResolvedValue({
      data: [
        { id: 'a', title: 'antiga', lastMessageAt: '2026-01-01T10:00:00Z' },
        { id: 'b', title: 'nova', lastMessageAt: '2026-09-01T10:00:00Z' },
      ],
      errors: undefined,
    });
    const conversas = await listarConversas();
    expect(conversas.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('conversa sem data de ultima mensagem nao some da lista', async () => {
    mockModels.ChatConversation.list.mockResolvedValue({
      data: [{ id: 'a', title: 'sem data', startedAt: '2026-05-01T10:00:00Z' }],
      errors: undefined,
    });
    expect(await listarConversas()).toHaveLength(1);
  });
});

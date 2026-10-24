/**
 * Resumo do arquivo:
 * A Lambda da pesquisa da feira (infra/site-pesquisa/index.mjs) e o repositorio
 * que fala com o DynamoDB (infra/site-pesquisa/repositorio.mjs). A Lambda e
 * publica (Function URL sem autenticacao), entao o que ela recusa importa
 * tanto quanto o que ela grava. Aqui o DynamoDB e um falso em memoria: nada
 * de rede e nada de conta AWS.
 */
import { criarHandler } from '../infra/site-pesquisa/index.mjs';
import { criarRepositorio } from '../infra/site-pesquisa/repositorio.mjs';

const ID = '3f2b8c1e-9a47-4d6b-8e15-0c7a1d2f4b69';
const SENHA = 'senha-de-teste';
const AGORA = new Date('2026-10-24T15:00:00.000Z');

type Item = Record<string, unknown>;

function repositorioFalso() {
  const respostas = new Map<string, Item>();
  const cliques: Item[] = [];
  return {
    respostas,
    cliques,
    gravarResposta: jest.fn(async (item: Item) => {
      respostas.set(item.id as string, item);
    }),
    gravarClique: jest.fn(async (item: Item) => {
      cliques.push(item);
    }),
    listar: jest.fn(async () => [...respostas.values(), ...cliques]),
  };
}

function montar(sobrescrever: Partial<{ agora: () => Date }> = {}) {
  const repositorio = repositorioFalso();
  const handler = criarHandler({
    repositorio,
    senha: SENHA,
    agora: () => AGORA,
    novoId: () => 'sorteado-1',
    ...sobrescrever,
  });
  return { repositorio, handler };
}

function evento(
  corpo: unknown,
  opcoes: { metodo?: string; headers?: Record<string, string>; bruto?: string; base64?: boolean } = {},
) {
  const texto = opcoes.bruto ?? JSON.stringify(corpo);
  return {
    requestContext: { http: { method: opcoes.metodo ?? 'POST' } },
    headers: opcoes.headers ?? {},
    body: opcoes.base64 ? Buffer.from(texto, 'utf8').toString('base64') : texto,
    isBase64Encoded: Boolean(opcoes.base64),
  };
}

const envioValido = (extra: Record<string, unknown> = {}) => ({
  acao: 'salvar',
  id: ID,
  etapa: 2,
  concluido: false,
  respostas: { impressao: 'gostei', usaria: 'usaria' },
  ...extra,
});

describe('Lambda da pesquisa: salvar', () => {
  it('grava a resposta com versao, criadoEm e atualizadoEm', async () => {
    const { handler, repositorio } = montar();
    const r = await handler(evento(envioValido()));
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ ok: true });
    expect(repositorio.respostas.get(ID)).toEqual({
      id: ID,
      tipo: 'resposta',
      versaoDoFormulario: '1',
      criadoEm: '2026-10-24T15:00:00.000Z',
      atualizadoEm: '2026-10-24T15:00:00.000Z',
      etapa: 2,
      concluido: false,
      respostas: { impressao: 'gostei', usaria: 'usaria' },
    });
  });

  it('salvar duas vezes o mesmo id atualiza a mesma resposta, nunca duplica', async () => {
    let agora = AGORA;
    const { handler, repositorio } = montar({ agora: () => agora });
    await handler(evento(envioValido()));
    agora = new Date('2026-10-24T15:00:30.000Z');
    await handler(
      evento(envioValido({ etapa: 3, respostas: { impressao: 'gostei', usaria: 'usaria', frequencia: 'semana' } })),
    );
    expect(repositorio.gravarResposta).toHaveBeenCalledTimes(2);
    expect(repositorio.respostas.size).toBe(1);
    expect(repositorio.respostas.get(ID)).toMatchObject({
      etapa: 3,
      atualizadoEm: '2026-10-24T15:00:30.000Z',
    });
  });

  it('campo isca "site" preenchido responde 200 e nao grava', async () => {
    const { handler, repositorio } = montar();
    const r = await handler(evento(envioValido({ site: 'http://spam.example' })));
    expect(r.statusCode).toBe(200);
    expect(repositorio.gravarResposta).not.toHaveBeenCalled();
  });

  it('envio invalido responde 400 com o motivo e nao grava', async () => {
    const { handler, repositorio } = montar();
    const r = await handler(evento(envioValido({ respostas: { usaria: 'com_certeza' } })));
    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.body).erro).toMatch(/usaria/);
    expect(repositorio.gravarResposta).not.toHaveBeenCalled();
  });
});

describe('Lambda da pesquisa: clique', () => {
  it.each(['inicio', 'fim'])('grava o clique de download com origem %s', async (origem) => {
    const { handler, repositorio } = montar();
    const r = await handler(evento({ acao: 'clique', origem }));
    expect(r.statusCode).toBe(200);
    expect(repositorio.cliques).toEqual([
      { id: 'clique-sorteado-1', tipo: 'clique', origem, criadoEm: '2026-10-24T15:00:00.000Z' },
    ]);
  });

  it('recusa outra origem', async () => {
    const { handler, repositorio } = montar();
    const r = await handler(evento({ acao: 'clique', origem: 'meio' }));
    expect(r.statusCode).toBe(400);
    expect(repositorio.gravarClique).not.toHaveBeenCalled();
  });
});

describe('Lambda da pesquisa: listar (so para o grupo)', () => {
  const pedido = (headers: Record<string, string>) => evento({ acao: 'listar' }, { headers });

  it('sem a chave responde 401', async () => {
    const { handler, repositorio } = montar();
    expect((await handler(pedido({}))).statusCode).toBe(401);
    expect(repositorio.listar).not.toHaveBeenCalled();
  });

  it('com a chave errada responde 401', async () => {
    const { handler } = montar();
    expect((await handler(pedido({ 'x-chave': 'outra' }))).statusCode).toBe(401);
  });

  it('com a chave certa devolve os itens', async () => {
    const { handler } = montar();
    await handler(evento(envioValido()));
    await handler(evento({ acao: 'clique', origem: 'fim' }));
    const r = await handler(pedido({ 'x-chave': SENHA }));
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body).itens).toHaveLength(2);
  });

  it('senha vazia na configuracao nunca autoriza', async () => {
    const { handler } = montar();
    const semSenha = criarHandler({
      repositorio: repositorioFalso(),
      senha: '',
      agora: () => AGORA,
      novoId: () => 'x',
    });
    expect((await semSenha(pedido({ 'x-chave': '' }))).statusCode).toBe(401);
    expect(handler).toBeDefined();
  });
});

describe('Lambda da pesquisa: corpo e metodo invalidos nunca lancam excecao', () => {
  it.each([
    ['JSON quebrado', evento(null, { bruto: '{"acao":' })],
    ['corpo ausente', { requestContext: { http: { method: 'POST' } }, headers: {} }],
    ['corpo vazio', evento(null, { bruto: '' })],
    ['JSON que nao e objeto', evento(null, { bruto: '42' })],
    ['base64 que nao e JSON', { ...evento(null, { bruto: 'x' }), body: '////', isBase64Encoded: true }],
    ['corpo valido, mas com mais de 16 KB', evento(null, { bruto: JSON.stringify(envioValido({ lixo: 'a'.repeat(20000) })) })],
  ])('%s responde 400', async (_nome, ev) => {
    const { handler } = montar();
    const r = await handler(ev);
    expect(r.statusCode).toBe(400);
  });

  it('entende o corpo em base64 quando a Function URL o codifica assim', async () => {
    const { handler, repositorio } = montar();
    const r = await handler(evento(envioValido(), { base64: true }));
    expect(r.statusCode).toBe(200);
    expect(repositorio.respostas.has(ID)).toBe(true);
  });

  it('acao desconhecida responde 404', async () => {
    const { handler } = montar();
    expect((await handler(evento({ acao: 'apagar' }))).statusCode).toBe(404);
  });

  it('metodo diferente de POST responde 405', async () => {
    const { handler } = montar();
    expect((await handler(evento(envioValido(), { metodo: 'GET' }))).statusCode).toBe(405);
  });

  it('falha do repositorio responde 500, sem vazar o erro e deixando um aviso sem dados do pedido', async () => {
    const aviso = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { handler, repositorio } = montar();
      repositorio.gravarResposta.mockRejectedValueOnce(new Error('segredo-interno-da-tabela'));
      const r = await handler(evento(envioValido(), { headers: { 'x-forwarded-for': '203.0.113.9' } }));
      expect(r.statusCode).toBe(500);
      expect(r.body).not.toContain('segredo-interno-da-tabela');
      expect(aviso).toHaveBeenCalledTimes(1);
      const registrado = JSON.stringify(aviso.mock.calls);
      expect(registrado).toMatch(/falha/i);
      expect(registrado).not.toContain('203.0.113.9');
      expect(registrado).not.toContain(ID);
    } finally {
      aviso.mockRestore();
    }
  });
});

describe('Lambda da pesquisa: privacidade', () => {
  it('nao registra o evento nos logs (corpo, cabecalhos nem IP)', async () => {
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((metodo) =>
      jest.spyOn(console, metodo).mockImplementation(() => undefined),
    );
    try {
      const { handler } = montar();
      await handler(
        evento(envioValido(), { headers: { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Teste/1.0' } }),
      );
      await handler(evento(null, { bruto: '{"acao":' }));
      for (const espiao of espioes) expect(espiao).not.toHaveBeenCalled();
    } finally {
      for (const espiao of espioes) espiao.mockRestore();
    }
  });

  it('a resposta gravada nao carrega nenhum cabecalho do pedido', async () => {
    const { handler, repositorio } = montar();
    await handler(evento(envioValido(), { headers: { 'x-forwarded-for': '203.0.113.9' } }));
    expect(JSON.stringify([...repositorio.respostas.values()])).not.toContain('203.0.113.9');
  });
});

describe('repositorio do DynamoDB', () => {
  function clienteFalso(paginas: Item[][] = [[]]) {
    const chamadas: { operacao: string; params: Item }[] = [];
    let indice = 0;
    return {
      chamadas,
      atualizar: async (params: Item) => {
        chamadas.push({ operacao: 'atualizar', params });
      },
      gravar: async (params: Item) => {
        chamadas.push({ operacao: 'gravar', params });
      },
      varrer: async (params: Item) => {
        chamadas.push({ operacao: 'varrer', params });
        const itens = paginas[indice] ?? [];
        indice += 1;
        return indice < paginas.length ? { Items: itens, LastEvaluatedKey: { id: `p${indice}` } } : { Items: itens };
      },
    };
  }

  const resposta = {
    id: ID,
    tipo: 'resposta',
    versaoDoFormulario: '1',
    criadoEm: '2026-10-24T15:00:00.000Z',
    atualizadoEm: '2026-10-24T15:00:00.000Z',
    etapa: 2,
    concluido: false,
    respostas: { usaria: 'usaria' },
  };

  it('gravarResposta atualiza por id e so define criadoEm na primeira vez', async () => {
    const cliente = clienteFalso();
    await criarRepositorio(cliente, 'tabela-x').gravarResposta(resposta);
    const { operacao, params } = cliente.chamadas[0];
    expect(operacao).toBe('atualizar');
    expect(params).toMatchObject({ TableName: 'tabela-x', Key: { id: ID } });
    expect(params.UpdateExpression).toContain('criadoEm = if_not_exists(criadoEm, :criadoEm)');
    expect(params.ExpressionAttributeValues).toMatchObject({
      ':criadoEm': '2026-10-24T15:00:00.000Z',
      ':atualizadoEm': '2026-10-24T15:00:00.000Z',
      ':etapa': 2,
      ':concluido': false,
      ':respostas': { usaria: 'usaria' },
      ':tipo': 'resposta',
      ':versao': '1',
    });
  });

  it('gravarClique grava o item inteiro', async () => {
    const cliente = clienteFalso();
    const clique = { id: 'clique-1', tipo: 'clique', origem: 'fim', criadoEm: '2026-10-24T15:00:00.000Z' };
    await criarRepositorio(cliente, 'tabela-x').gravarClique(clique);
    expect(cliente.chamadas[0]).toEqual({ operacao: 'gravar', params: { TableName: 'tabela-x', Item: clique } });
  });

  it('listar junta todas as paginas do Scan', async () => {
    const cliente = clienteFalso([[{ id: 'a' }, { id: 'b' }], [{ id: 'c' }]]);
    const itens = await criarRepositorio(cliente, 'tabela-x').listar();
    expect(itens.map((i: Item) => i.id)).toEqual(['a', 'b', 'c']);
    expect(cliente.chamadas).toHaveLength(2);
    expect(cliente.chamadas[1].params.ExclusiveStartKey).toEqual({ id: 'p1' });
  });
});

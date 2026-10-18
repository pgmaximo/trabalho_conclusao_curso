/**
 * O que estes testes garantem sobre a lista INTEIRA de tools, e nao sobre uma
 * delas: nenhuma escreve, e nenhuma consegue filtrar por um dono que nao seja
 * o do token.
 *
 * O teste de filtro do plano era vazio -- ele criava um espiao que nao estava
 * ligado a nada e afirmava que a lista de chamadas do espiao (sempre []) nao
 * continha o dono hostil. Aqui o espiao e o proprio cliente do DynamoDB, e a
 * afirmacao e sobre as consultas que de fato foram montadas.
 */
const mockSend = jest.fn();

// O SDK e mockado INTEIRO, sem `requireActual`: nenhum teste deste repositorio
// importa valor do AWS SDK, porque o pacote publicado e ESM e o jest-expo o
// carrega como CommonJS -- `requireActual` quebra com "Unexpected token
// 'export'" antes de qualquer assercao.
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
  ScanCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
  // A porta publica (E8). Nome proprio na classe para a afirmacao das
  // ferramentas publicas distinguir GetItem de Scan.
  GetCommand: class GetCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import type { ChatIdentity } from '../auth';
import { CHAT_TOOLS, runTool } from '../tools';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

/** Toda tabela que as tools leem precisa ter nome, senao elas recusam. */
const TABELAS = {
  USER_PROFILE_TABLE_NAME: 't-profile',
  MEDICAL_DOCUMENT_TABLE_NAME: 't-doc',
  LAB_RESULT_TABLE_NAME: 't-lab',
  APPOINTMENT_TABLE_NAME: 't-appt',
  MEDICINE_TABLE_NAME: 't-med',
  VACCINE_DOSE_TABLE_NAME: 't-vac',
  HEALTH_IMPORT_TABLE_NAME: 't-health',
  SITE_CACHE_TABLE_NAME: 't-site',
};

/**
 * As ferramentas que NAO leem dado pessoal (E8): campanhas nao le banco
 * nenhum; postos le o cache publico pela porta separada. Lista FECHADA e
 * escrita a mao: quem criar outra ferramenta sem dono tem de acrescenta-la
 * aqui de proposito -- e ela passa a responder a afirmacao propria das
 * publicas, em vez de escapar das do dono em silencio.
 */
const FERRAMENTAS_PUBLICAS = new Set(['consultar_campanhas', 'consultar_postos']);
const comDono = () => CHAT_TOOLS.filter((t) => !FERRAMENTAS_PUBLICAS.has(t.name));
const COM_CIDADE = { local: { uf: 'SP', codigoMunicipio: '355030' } };

beforeAll(() => Object.assign(process.env, TABELAS));
beforeEach(() => mockSend.mockReset().mockResolvedValue({ Items: [] }));

describe('o registro das tools', () => {
  it('NENHUMA tool escreve -- e isso e teste, nao revisao de codigo', () => {
    // O laco so e auditavel porque o unico efeito da conversa sobre o banco e
    // a propria conversa (D9). Uma tool de escrita acrescentada por descuido
    // passaria despercebida numa revisao; aqui, nao.
    expect(CHAT_TOOLS.length).toBeGreaterThan(0);
    for (const tool of CHAT_TOOLS) expect(tool.readOnly).toBe(true);
  });

  it('nenhum nome de tool sugere escrita', () => {
    for (const tool of CHAT_TOOLS) {
      expect(tool.name).not.toMatch(/criar|create|update|delete|salvar|save|gravar|registrar|apagar/i);
    }
  });

  it('nenhum arquivo da FUNCAO importa um comando de escrita do DynamoDB', () => {
    // A garantia do `readOnly` e uma declaracao; esta e sobre o codigo. Uma
    // tool que importasse PutCommand teria como escrever mesmo se declarasse
    // o contrario.
    //
    // A varredura cobre a FUNCAO INTEIRA, e nao so `tools/`. Ela cobria so
    // `tools/` enquanto o comentario de `amplify/data/schemas/chat.ts`
    // prometia que varria "os arquivos dela" -- promessa verdadeira por acaso,
    // porque nenhum arquivo da raiz importava escrita. A EPIC da memoria
    // acrescenta um diretorio novo aqui dentro, e "por acaso" deixou de bastar.
    //
    // O caminho sai de `__dirname`, e nao do diretorio de trabalho do Jest: um
    // caminho relativo que aponte para nada faz `readdirSync` lancar, o que e
    // ruidoso hoje e fragil amanha.
    const { readFileSync, readdirSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const ESCRITA = /PutCommand|UpdateCommand|DeleteCommand|BatchWriteCommand|TransactWriteCommand/;

    const arquivos: string[] = [];
    const varrer = (dir: string) => {
      for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        // Os proprios testes ficam de fora: eles mencionam os comandos de
        // escrita justamente para proibi-los.
        if (entrada.name === '__tests__') continue;
        const caminho = join(dir, entrada.name);
        if (entrada.isDirectory()) varrer(caminho);
        else if (entrada.name.endsWith('.ts')) arquivos.push(caminho);
      }
    };
    varrer(join(__dirname, '..'));

    // Se a varredura nao achar nada, ela passaria por vazio -- que e
    // exatamente o modo de falha silenciosa que este teste existe para evitar.
    expect(arquivos.length).toBeGreaterThan(10);
    for (const arquivo of arquivos) {
      expect(readFileSync(arquivo, 'utf8')).not.toMatch(ESCRITA);
    }
  });

  it('toda tool citada dentro de uma descricao existe de verdade', () => {
    // O modelo le a descricao para escolher a ferramenta seguinte. Um nome
    // errado ali produz chamada a ferramenta inexistente, que custa um turno e
    // devolve uma resposta pior. Achado real: `consultar_exames` mandava usar
    // `consultar_analitos`, no plural, e a tool e `consultar_analito`.
    const registrados = new Set(CHAT_TOOLS.map((t) => t.name));
    for (const tool of CHAT_TOOLS) {
      for (const citado of tool.description.match(/consultar_[a-z_]+/g) ?? []) {
        expect({ tool: tool.name, citado, existe: registrados.has(citado) }).toEqual({
          tool: tool.name,
          citado,
          existe: true,
        });
      }
    }
  });

  it('consultar_prevencao esta registrada, logo depois de consultar_vacinas (E7)', () => {
    // Registrada, ela passa a ser coberta por todos os testes de lista inteira
    // deste arquivo -- nenhuma escreve, dono so do token, dono plantado
    // reprova. Ao lado de vacinas porque e o vizinho com que o modelo mais
    // pode confundi-la.
    const nomes = CHAT_TOOLS.map((t) => t.name);
    expect(nomes.indexOf('consultar_prevencao')).toBe(nomes.indexOf('consultar_vacinas') + 1);
  });

  it('campanhas e postos estao registradas, logo depois de consultar_prevencao (E8)', () => {
    // Juntas, e perto de vacinas e prevencao: sao os vizinhos com que o modelo
    // mais as confundiria, e a descricao de cada uma contrasta com eles.
    const nomes = CHAT_TOOLS.map((t) => t.name);
    const i = nomes.indexOf('consultar_prevencao');
    expect(nomes.slice(i, i + 3)).toEqual(['consultar_prevencao', 'consultar_campanhas', 'consultar_postos']);
  });

  it('toda ferramenta publica da lista fechada existe de verdade', () => {
    const registrados = new Set(CHAT_TOOLS.map((t) => t.name));
    for (const nome of FERRAMENTAS_PUBLICAS) expect(registrados.has(nome)).toBe(true);
  });

  it('nenhum nome se repete -- nome repetido faz o despachante escolher um so', () => {
    const nomes = CHAT_TOOLS.map((t) => t.name);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('toda descricao diz tambem o que a tool NAO faz', () => {
    // O modelo escolhe a tool pela descricao. Uma descricao que so promete
    // produz chamada errada -- e, aqui, uma chamada errada e o modelo tentando
    // gravar algo por uma tool de leitura.
    for (const tool of CHAT_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(40);
      expect(tool.description).toMatch(/\bNÃO\b/);
    }
  });
});

describe('o dono, em toda tool', () => {
  it('toda consulta e montada com o dono do TOKEN', async () => {
    for (const tool of comDono()) {
      mockSend.mockClear();
      await runTool(tool.name, {}, IDENTIDADE);
      expect(mockSend).toHaveBeenCalled();
      const consultas = JSON.stringify(mockSend.mock.calls);
      expect(consultas).toContain('s-1::u-1');
    }
  });

  it('a consulta filtra pelo dono do token, e por nenhum outro valor', async () => {
    // Nao basta o dono certo aparecer em algum lugar da consulta: o valor
    // ligado a `:owner` precisa ser ELE, e a expressao precisa ser a do dono.
    for (const tool of comDono()) {
      mockSend.mockClear();
      await runTool(tool.name, {}, IDENTIDADE);
      for (const [comando] of mockSend.mock.calls) {
        const entrada = (comando as { input: Record<string, unknown> }).input;
        expect(entrada.FilterExpression).toBe('#owner = :owner');
        expect(entrada.ExpressionAttributeValues).toEqual({ ':owner': 's-1::u-1' });
      }
    }
  });

  it('um dono plantado na entrada REPROVA a chamada, em vez de seguir adiante', async () => {
    // O cenario que o endereco direto existe para nao permitir. Todo schema e
    // `.strict()`: o campo a mais nao e ignorado em silencio -- ele derruba a
    // chamada, e nenhuma consulta chega a ser montada.
    for (const tool of CHAT_TOOLS) {
      mockSend.mockClear();
      const saida = await runTool(
        tool.name,
        { owner: 'vitima::vitima', ownerId: 'vitima' },
        IDENTIDADE,
      );
      expect(saida).toMatchObject({ erro: expect.any(String) });
      expect(mockSend).not.toHaveBeenCalled();
      expect(JSON.stringify(saida)).not.toContain('vitima');
    }
  });
});

describe('as ferramentas publicas (E8)', () => {
  it('nunca usam Scan, filtro de dono, nem o dono do token', async () => {
    mockSend.mockResolvedValue({});
    for (const nome of FERRAMENTAS_PUBLICAS) {
      mockSend.mockClear();
      await runTool(nome, {}, IDENTIDADE, COM_CIDADE);
      // Postos LE (com cidade); sem esta linha, uma ferramenta que nao lesse
      // nada passaria pelas afirmacoes abaixo por vazio.
      if (nome === 'consultar_postos') expect(mockSend).toHaveBeenCalledTimes(1);
      for (const [comando] of mockSend.mock.calls) {
        expect((comando as object).constructor.name).toBe('GetCommand');
        const entrada = (comando as { input: Record<string, unknown> }).input;
        expect(entrada.TableName).toBe('t-site');
        expect(entrada).not.toHaveProperty('FilterExpression');
      }
      expect(JSON.stringify(mockSend.mock.calls)).not.toContain('s-1::u-1');
    }
  });

  it('campo extra na entrada de postos e reprovado, e NENHUMA leitura acontece (CA-13)', async () => {
    for (const entrada of [{ codigoMunicipio: '999999' }, { uf: 'SP' }, { owner: 'vitima::vitima' }]) {
      mockSend.mockClear();
      const saida = await runTool('consultar_postos', entrada, IDENTIDADE, COM_CIDADE);
      expect(saida).toMatchObject({ erro: expect.any(String) });
      expect(mockSend).not.toHaveBeenCalled();
    }
  });

  it('campanhas nao le banco nenhum', async () => {
    mockSend.mockClear();
    await runTool('consultar_campanhas', {}, IDENTIDADE, COM_CIDADE);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('o despachante entrega o contexto do turno a ferramenta', async () => {
    const saida = (await runTool('consultar_campanhas', {}, IDENTIDADE, {
      local: { uf: 'PA', codigoMunicipio: null },
    })) as { avisoRegiao?: string };
    expect(saida.avisoRegiao).toMatch(/região Norte/);
  });
});

describe('o despachante', () => {
  it('tool desconhecida devolve erro tratado, nunca lanca', async () => {
    const saida = await runTool('tool_que_nao_existe', {}, IDENTIDADE);
    expect(saida).toMatchObject({ erro: expect.any(String) });
  });

  it('falha da consulta vira erro tratado, e nao derruba o turno', async () => {
    // Uma excecao aqui derrubaria o turno inteiro, e o modelo perderia a
    // chance de responder com o que ja tem.
    mockSend.mockRejectedValue(new Error('ProvisionedThroughputExceeded'));
    const saida = await runTool('consultar_consultas', {}, IDENTIDADE);
    expect(saida).toMatchObject({ erro: expect.any(String) });
  });

  it('o erro tratado nao repassa o detalhe tecnico ao modelo', async () => {
    mockSend.mockRejectedValue(new Error('ProvisionedThroughputExceeded na tabela t-appt'));
    const saida = await runTool('consultar_consultas', {}, IDENTIDADE);
    expect(JSON.stringify(saida)).not.toMatch(/Provisioned|t-appt/);
  });
});

describe('ausencia de dado e RESPOSTA, nao erro', () => {
  it('sem importacao de wearable, a tool diz que nao ha -- sem erro', async () => {
    // "Nenhuma importacao de wearable" significa que a pessoa nao importou
    // nada. Nada falhou. Devolver erro faria o modelo dizer que algo deu
    // errado, e a R5 manda ele dizer o que nao sabe, nao inventar uma falha.
    const saida = (await runTool('consultar_wearable', {}, IDENTIDADE)) as {
      disponivel: boolean;
    };
    expect(saida.disponivel).toBe(false);
    expect(saida).not.toHaveProperty('erro');
  });

  it('toda tool responde lista vazia sem erro quando nao ha dado', async () => {
    for (const tool of CHAT_TOOLS) {
      const saida = await runTool(tool.name, {}, IDENTIDADE);
      expect(saida).not.toHaveProperty('erro');
    }
  });

  it('perfil ausente e resposta explicita, nao objeto vazio', async () => {
    // Um objeto vazio faria o modelo dizer "seu perfil esta vazio" como se
    // fosse um dado; a ausencia precisa ser nomeada.
    const saida = (await runTool('consultar_perfil', {}, IDENTIDADE)) as {
      disponivel: boolean;
      explicacao?: string;
    };
    expect(saida.disponivel).toBe(false);
    expect(typeof saida.explicacao).toBe('string');
  });
});

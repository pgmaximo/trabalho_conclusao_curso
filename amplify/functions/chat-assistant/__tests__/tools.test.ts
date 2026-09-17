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
};

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

  it('nenhuma tool importa um comando de escrita do DynamoDB', () => {
    // A garantia do `readOnly` e uma declaracao; esta e sobre o codigo. Uma
    // tool que importasse PutCommand teria como escrever mesmo se declarasse
    // o contrario.
    const { readFileSync, readdirSync } = require('node:fs') as typeof import('node:fs');
    const dir = 'amplify/functions/chat-assistant/tools';
    for (const arquivo of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const fonte = readFileSync(`${dir}/${arquivo}`, 'utf8');
      expect(fonte).not.toMatch(/PutCommand|UpdateCommand|DeleteCommand|BatchWriteCommand|TransactWriteCommand/);
    }
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
    for (const tool of CHAT_TOOLS) {
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
    for (const tool of CHAT_TOOLS) {
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

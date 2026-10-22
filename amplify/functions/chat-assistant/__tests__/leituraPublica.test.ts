/**
 * A porta publica (E8, D8.3 = A). Ela existe AO LADO de `lerDoDono`, e nao
 * como um modo dele: o cache de postos de vacinacao nao tem dono, e relaxar a
 * porta pessoal com um "sem filtro" faria um parametro errado virar vazamento.
 *
 * O que estes testes garantem: so tabelas da lista fechada passam; a leitura
 * e um GetItem pela chave que a TABELA define (o chamador da o valor, nunca o
 * nome do atributo); e nenhum filtro de dono, Scan ou valor de identidade
 * aparece na consulta.
 */
const mockSend = jest.fn();

// As classes nascem DENTRO da fabrica: o `import` abaixo sobe acima de
// qualquer declaracao do arquivo, e uma classe declarada fora ainda nao
// existiria quando o modulo fosse carregado.
jest.mock('@aws-sdk/lib-dynamodb', () => {
  class Comando {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  return {
    DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
    GetCommand: class extends Comando {},
    ScanCommand: class extends Comando {},
  };
});
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { TABELAS_PUBLICAS, lerPublicoPorChave } from '../tools/ownerScopedRead';

const { GetCommand: MockGetCommand, ScanCommand: MockScanCommand } = jest.requireMock(
  '@aws-sdk/lib-dynamodb',
) as { GetCommand: new (...a: never[]) => unknown; ScanCommand: new (...a: never[]) => unknown };

beforeEach(() => {
  process.env.SITE_CACHE_TABLE_NAME = 't-site';
  mockSend.mockReset().mockResolvedValue({ Item: { codigoMunicipio: '355030', payload: [] } });
});

describe('lerPublicoPorChave', () => {
  it('faz um GetItem com a chave que a tabela define', async () => {
    await lerPublicoPorChave('CACHE_DE_POSTOS', '355030');

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [comando] = mockSend.mock.calls[0];
    expect(comando).toBeInstanceOf(MockGetCommand);
    expect(comando.input).toEqual({ TableName: 't-site', Key: { codigoMunicipio: '355030' } });
  });

  it('devolve o item quando ele existe, e null quando nao', async () => {
    expect(await lerPublicoPorChave('CACHE_DE_POSTOS', '355030')).toEqual({
      codigoMunicipio: '355030',
      payload: [],
    });

    mockSend.mockResolvedValue({});
    expect(await lerPublicoPorChave('CACHE_DE_POSTOS', '355030')).toBeNull();
  });

  it('nunca Scan, nunca filtro, nunca dono', async () => {
    await lerPublicoPorChave('CACHE_DE_POSTOS', '355030');

    for (const [comando] of mockSend.mock.calls) {
      expect(comando).not.toBeInstanceOf(MockScanCommand);
      expect(comando.input).not.toHaveProperty('FilterExpression');
      expect(comando.input).not.toHaveProperty('ExpressionAttributeValues');
    }
  });

  it('tabela fora da lista fechada e recusada, sem consulta', async () => {
    await expect(lerPublicoPorChave('UserProfile' as never, 'x')).rejects.toThrow();
    await expect(lerPublicoPorChave('toString' as never, 'x')).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('tabela nao configurada e recusada, sem consulta', async () => {
    delete process.env.SITE_CACHE_TABLE_NAME;
    await expect(lerPublicoPorChave('CACHE_DE_POSTOS', '355030')).rejects.toThrow();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('a lista fechada tem uma tabela so: o cache de postos', () => {
    expect(Object.keys(TABELAS_PUBLICAS)).toEqual(['CACHE_DE_POSTOS']);
  });
});

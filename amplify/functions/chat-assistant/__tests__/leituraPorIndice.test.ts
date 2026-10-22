/**
 * Resumo do arquivo:
 * A porta pessoal por indice (E3, D3.2 = A). Ela existe AO LADO de `lerDoDono`,
 * e nao como um modo dele, pelo mesmo motivo da porta publica do E8: cada porta
 * tem uma forma de consulta so, e a forma e montada aqui, nunca por quem chama.
 *
 * O que estes testes garantem: a consulta e um Query no indice da lista fechada,
 * com a chave e o intervalo na condicao de chave; o filtro de dono e o do TOKEN,
 * sempre; indice fora da lista, ou tabela sem nome, nao vira consulta; e a
 * paginacao tem o mesmo teto de `lerDoDono`.
 */
const mockSend = jest.fn();

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
    QueryCommand: class extends Comando {},
    ScanCommand: class extends Comando {},
  };
});
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import type { ChatIdentity } from '../auth';
import { INDICES_DO_DONO, lerDoDonoPorIndice } from '../tools/ownerScopedRead';

const { QueryCommand: MockQueryCommand } = jest.requireMock('@aws-sdk/lib-dynamodb') as {
  QueryCommand: new (...a: never[]) => unknown;
};

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };
const SEMANA = { de: '2026-10-15', ate: '2026-10-21' };

beforeEach(() => {
  process.env.MEDICINE_DOSE_LOG_TABLE_NAME = 't-dose';
  process.env.PRESCRIPTION_ITEM_TABLE_NAME = 't-presc';
  mockSend.mockReset().mockResolvedValue({ Items: [] });
});

describe('lerDoDonoPorIndice (E3, D3.2)', () => {
  it('monta um Query no indice, com a chave, o intervalo e o dono do token', async () => {
    await lerDoDonoPorIndice('DOSES_POR_REMEDIO', 'med-1', SEMANA, IDENTIDADE);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [comando] = mockSend.mock.calls[0];
    expect(comando).toBeInstanceOf(MockQueryCommand);
    expect((comando as { input: unknown }).input).toEqual({
      TableName: 't-dose',
      IndexName: 'medicineDoseLogsByMedicineIdAndScheduledDate',
      KeyConditionExpression: '#chave = :chave AND #ordem BETWEEN :de AND :ate',
      FilterExpression: '#owner = :owner',
      ExpressionAttributeNames: { '#owner': 'owner', '#chave': 'medicineId', '#ordem': 'scheduledDate' },
      ExpressionAttributeValues: { ':owner': 's-1::u-1', ':chave': 'med-1', ':de': '2026-10-15', ':ate': '2026-10-21' },
      ExclusiveStartKey: undefined,
    });
  });

  it('junta as paginas, e para no mesmo teto de 10 de lerDoDono', async () => {
    mockSend.mockResolvedValue({ Items: [{ id: 'x', owner: 's-1::u-1' }], LastEvaluatedKey: { id: 'x' } });

    const linhas = await lerDoDonoPorIndice('DOSES_POR_REMEDIO', 'med-1', SEMANA, IDENTIDADE);

    expect(mockSend).toHaveBeenCalledTimes(10);
    expect(linhas).toHaveLength(10);
    // A segunda pagina continua de onde a primeira parou.
    expect((mockSend.mock.calls[1][0] as { input: Record<string, unknown> }).input.ExclusiveStartKey).toEqual({ id: 'x' });
  });

  it('segunda trava: linha de outro dono, ou sem dono, nao sai da porta (menor adiado do E3)', async () => {
    // O filtro da consulta ja impede isso no DynamoDB. A trava aqui e para o dia
    // em que a consulta mudar e o filtro sumir sem ninguem notar.
    mockSend.mockResolvedValue({
      Items: [
        { id: 'meu', owner: 's-1::u-1' },
        { id: 'alheio', owner: 'outro::outro' },
        { id: 'sem-dono' },
      ],
    });

    const linhas = await lerDoDonoPorIndice('DOSES_POR_REMEDIO', 'med-1', SEMANA, IDENTIDADE);

    expect(linhas.map((l) => l.id)).toEqual(['meu']);
  });

  it.each(['toString', 'UserProfile'])('indice fora da lista fechada (%s) nao vira consulta', async (nome) => {
    await expect(lerDoDonoPorIndice(nome as never, 'med-1', SEMANA, IDENTIDADE)).rejects.toThrow(/lista/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sem nome de tabela configurado, lanca -- e falha nossa, nao do usuario', async () => {
    delete process.env.MEDICINE_DOSE_LOG_TABLE_NAME;
    await expect(lerDoDonoPorIndice('DOSES_POR_REMEDIO', 'med-1', SEMANA, IDENTIDADE)).rejects.toThrow(
      'Nome de tabela nao configurado.',
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('a lista fechada tem dois indices: acrescentar outro e decisao (E3, E4)', () => {
    expect(Object.keys(INDICES_DO_DONO)).toEqual(['DOSES_POR_REMEDIO', 'ITENS_POR_RECEITA']);
  });

  it('indice sem ordenacao: Query so com a chave e o dono do token (E4)', async () => {
    await lerDoDonoPorIndice('ITENS_POR_RECEITA', 'doc-1', undefined, IDENTIDADE);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [comando] = mockSend.mock.calls[0];
    expect(comando).toBeInstanceOf(MockQueryCommand);
    expect((comando as { input: unknown }).input).toEqual({
      TableName: 't-presc',
      IndexName: 'prescriptionItemsByDocumentId',
      KeyConditionExpression: '#chave = :chave',
      FilterExpression: '#owner = :owner',
      ExpressionAttributeNames: { '#owner': 'owner', '#chave': 'documentId' },
      ExpressionAttributeValues: { ':owner': 's-1::u-1', ':chave': 'doc-1' },
      ExclusiveStartKey: undefined,
    });
  });

  it('indice sem ordenacao tambem descarta linha de outro dono (E4)', async () => {
    mockSend.mockResolvedValue({ Items: [{ id: 'meu', owner: 's-1::u-1' }, { id: 'alheio', owner: 'outro::outro' }] });
    const linhas = await lerDoDonoPorIndice('ITENS_POR_RECEITA', 'doc-1', undefined, IDENTIDADE);
    expect(linhas.map((l) => l.id)).toEqual(['meu']);
  });

  it('intervalo onde o indice nao tem ordenacao, ou falta onde tem: nao vira consulta (E4)', async () => {
    await expect(lerDoDonoPorIndice('ITENS_POR_RECEITA', 'doc-1', SEMANA, IDENTIDADE)).rejects.toThrow(/ordenacao/);
    await expect(lerDoDonoPorIndice('DOSES_POR_REMEDIO', 'med-1', undefined, IDENTIDADE)).rejects.toThrow(/ordenacao/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('os nomes dos indices sao os que o Amplify gerou (amplify_outputs.json)', () => {
    const outputs = JSON.stringify(require('../../../../amplify_outputs.json'));
    for (const { indice } of Object.values(INDICES_DO_DONO)) expect(outputs).toContain(indice);
  });
});

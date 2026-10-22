/**
 * Resumo do arquivo:
 * A leitura unica por turno (risco 3 do E4). Quando o modelo chama duas
 * ferramentas que leem a mesma tabela no mesmo turno -- exames e receitas leem
 * os documentos; medicamentos, doses e interacoes, os remedios --, a porta do
 * dono le a tabela UMA vez e entrega a mesma resposta as duas.
 *
 * O que estes testes garantem: com o mesmo registro de leituras, uma consulta
 * so; cada chamada recebe a sua copia da lista (uma ferramenta que ordena nao
 * mexe na da outra); falha nao fica guardada; sem registro, nada muda.
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
    GetCommand: class GetCommand extends Comando {},
    QueryCommand: class QueryCommand extends Comando {},
    ScanCommand: class ScanCommand extends Comando {},
  };
});
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import type { ChatIdentity } from '../auth';
import { runTool } from '../tools';
import { lerDoDono } from '../tools/ownerScopedRead';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

beforeAll(() =>
  Object.assign(process.env, {
    MEDICAL_DOCUMENT_TABLE_NAME: 't-doc',
    LAB_RESULT_TABLE_NAME: 't-lab',
    PRESCRIPTION_ITEM_TABLE_NAME: 't-presc',
  }),
);
beforeEach(() => mockSend.mockReset().mockResolvedValue({ Items: [{ id: 'a' }, { id: 'b' }] }));

describe('lerDoDono com o registro de leituras do turno (risco 3 do E4)', () => {
  it('a mesma tabela, no mesmo turno, e lida uma vez', async () => {
    const leituras = new Map();
    await lerDoDono('t-doc', IDENTIDADE, leituras);
    await lerDoDono('t-doc', IDENTIDADE, leituras);
    await lerDoDono('t-lab', IDENTIDADE, leituras);
    expect(mockSend.mock.calls.map(([c]) => (c as { input: { TableName: string } }).input.TableName)).toEqual([
      't-doc',
      't-lab',
    ]);
  });

  it('cada chamada recebe a sua copia: quem reordena nao mexe na lista da outra', async () => {
    const leituras = new Map();
    const primeira = await lerDoDono('t-doc', IDENTIDADE, leituras);
    primeira.reverse();
    expect((await lerDoDono('t-doc', IDENTIDADE, leituras)).map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('uma leitura que falhou nao fica guardada: a proxima tenta de novo', async () => {
    const leituras = new Map();
    mockSend.mockRejectedValueOnce(new Error('ProvisionedThroughputExceededException'));
    await expect(lerDoDono('t-doc', IDENTIDADE, leituras)).rejects.toThrow();
    expect(await lerDoDono('t-doc', IDENTIDADE, leituras)).toHaveLength(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('sem registro, cada chamada le (o comportamento de antes)', async () => {
    await lerDoDono('t-doc', IDENTIDADE);
    await lerDoDono('t-doc', IDENTIDADE);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('exames e receitas no mesmo turno: os documentos sao lidos uma vez', async () => {
    mockSend.mockResolvedValue({ Items: [] });
    const contexto = { local: null, leituras: new Map() };
    await runTool('consultar_exames', {}, IDENTIDADE, contexto);
    await runTool('consultar_receitas', {}, IDENTIDADE, contexto);
    const scansDeDocumentos = mockSend.mock.calls.filter(
      ([c]) => (c as { input: { TableName: string } }).input.TableName === 't-doc',
    );
    expect(scansDeDocumentos).toHaveLength(1);
  });
});

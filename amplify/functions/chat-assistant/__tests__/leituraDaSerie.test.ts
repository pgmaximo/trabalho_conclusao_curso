/**
 * A quarta porta (E6, D6.1 = A): o `result.json` so e lido quando a chave e a
 * da PROPRIA importacao (o `importId` da linha que `lerDoDono` trouxe). Toda
 * outra forma e recusada antes do S3. Arquivo ausente, grande ou ilegivel vira
 * ausencia, nunca erro.
 */
const mockBaixar = jest.fn();
jest.mock('../tools/bucketDaSerie', () => ({
  baixarTextoDoBucket: (...a: unknown[]) => mockBaixar(...a),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: jest.fn() }) },
  ScanCommand: class {},
  GetCommand: class {},
  QueryCommand: class {},
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { lerSerieDaImportacao, TETO_DO_RESULTADO_BYTES, type SeriesDoTurno } from '../tools/ownerScopedRead';

const CHAVE = 'health-imports/us-east-1:abc/imp-1/result.json';
const LINHA = { id: 'imp-1', resultArtifactKey: CHAVE };
const ARQUIVO = JSON.stringify({ series: { sleepMinutes: [{ dateKey: '2026-10-08', value: 400 }] } });

beforeEach(() => {
  process.env.HEALTH_BUCKET_NAME = 'b-saude';
  mockBaixar.mockReset().mockResolvedValue(ARQUIVO);
});

describe('lerSerieDaImportacao', () => {
  it('le a chave da propria importacao, com o teto, e devolve a serie', async () => {
    const serie = await lerSerieDaImportacao(LINHA);
    expect(mockBaixar).toHaveBeenCalledTimes(1);
    expect(mockBaixar).toHaveBeenCalledWith('b-saude', CHAVE, 20 * 1024 * 1024);
    expect(TETO_DO_RESULTADO_BYTES).toBe(20 * 1024 * 1024);
    expect(serie).toEqual({ sleepMinutes: [{ dia: '2026-10-08', valor: 400 }] });
  });

  it.each([
    ['outra importacao (C4.1)', 'health-imports/us-east-1:xyz/imp-2/result.json'],
    ['outro prefixo', 'medical-documents/us-east-1:abc/imp-1/result.json'],
    ['subida de pasta', 'health-imports/us-east-1:abc/imp-1/../result.json'],
    ['segmento a mais', 'health-imports/us-east-1:abc/imp-1/sub/result.json'],
    ['outro arquivo', 'health-imports/us-east-1:abc/imp-1/result.json.bak'],
    ['maiusculas', 'health-imports/us-east-1:abc/imp-1/RESULT.JSON'],
    ['pasta vazia', 'health-imports//imp-1/result.json'],
    ['arquivo bruto', 'health-imports/us-east-1:abc/imp-1/sleep.csv'],
    ['vazia', ''],
    ['nula', null],
    ['numerica', 123],
  ])('recusa %s sem chamar o S3', async (_nome, chave) => {
    await expect(lerSerieDaImportacao({ id: 'imp-1', resultArtifactKey: chave })).resolves.toBeNull();
    expect(mockBaixar).not.toHaveBeenCalled();
  });

  it('linha sem id nao le nada', async () => {
    await expect(lerSerieDaImportacao({ resultArtifactKey: CHAVE })).resolves.toBeNull();
    expect(mockBaixar).not.toHaveBeenCalled();
  });

  it('objeto ausente ou acima do teto: ausencia (C4.3, C4.4)', async () => {
    mockBaixar.mockResolvedValue(null);
    await expect(lerSerieDaImportacao(LINHA)).resolves.toBeNull();
  });

  it('JSON invalido ou sem series: ausencia (C4.4)', async () => {
    mockBaixar.mockResolvedValue('nao e json');
    await expect(lerSerieDaImportacao(LINHA)).resolves.toBeNull();
    mockBaixar.mockResolvedValue('{"summary":{}}');
    await expect(lerSerieDaImportacao(LINHA)).resolves.toBeNull();
  });

  it('erro do S3: ausencia, e o log leva so o nome do erro', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockBaixar.mockRejectedValue(Object.assign(new Error('detalhe interno'), { name: 'AccessDenied' }));
    await expect(lerSerieDaImportacao(LINHA)).resolves.toBeNull();
    const logado = aviso.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logado).toContain('AccessDenied');
    expect(logado).not.toContain('detalhe interno');
    aviso.mockRestore();
  });

  it('uma leitura por turno e importacao (C4.5)', async () => {
    const series: SeriesDoTurno = new Map();
    await Promise.all([lerSerieDaImportacao(LINHA, series), lerSerieDaImportacao(LINHA, series)]);
    await lerSerieDaImportacao(LINHA, series);
    expect(mockBaixar).toHaveBeenCalledTimes(1);
  });

  it('sem o registro do turno, cada chamada le', async () => {
    await lerSerieDaImportacao(LINHA);
    await lerSerieDaImportacao(LINHA);
    expect(mockBaixar).toHaveBeenCalledTimes(2);
  });

  it('sem o bucket configurado, falha de configuracao', async () => {
    delete process.env.HEALTH_BUCKET_NAME;
    await expect(lerSerieDaImportacao(LINHA)).rejects.toThrow();
  });
});

/**
 * A outra metade do defeito de 2026-09-18.
 *
 * `documentKey.test.ts` (backend) trava que a Lambda nao remonta chave. Estes
 * testes travam que alguem GRAVA a chave -- sem isso, a Lambda passa a recusar
 * todo documento de forma honesta em vez de errar a pasta, o que e melhor e
 * continua nao lendo nada.
 *
 * O `uploadData` do Amplify Storage ja devolve a chave resolvida em
 * `result.path`, com o identityId dentro. Ela era escrita no console e jogada
 * fora.
 */
const mockCreate = jest.fn();
const mockUploadFileToS3 = jest.fn();
const mockStartExtraction = jest.fn();

// O `create` e um EMBRULHO, e nao `mockCreate` direto: o `generateClient` roda
// no escopo de modulo do examService, durante o import que o babel ica para o
// topo -- antes de `const mockCreate` ter sido executado. Capturado ali, o
// valor seria `undefined`. Adiando a busca para a hora da chamada, funciona.
jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: { MedicalDocument: { create: (...args: unknown[]) => mockCreate(...args) } },
  }),
}));

jest.mock('aws-amplify/storage', () => ({
  remove: jest.fn(),
  getUrl: jest.fn(),
}));

jest.mock('@/services/upload', () => ({
  uploadFileToS3: (...args: unknown[]) => mockUploadFileToS3(...args),
}));

jest.mock('@/services/extractionService', () => ({
  startExtraction: (...args: unknown[]) => mockStartExtraction(...args),
}));

jest.mock('@/services/auth', () => ({
  getUserId: async () => 'sub-de-quem-enviou',
}));

jest.mock('@/hooks/useExamsData', () => ({
  invalidateExamsCache: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));

// O preparo da foto (G2, Bloco 10) e testado por conta propria em
// imagemParaEnvio.test.ts. Aqui o dublê so troca a foto por uma versao
// "preparada", para o teste ver QUAL arquivo sobe e com que nome ele e guardado.
const mockPreparar = jest.fn();
jest.mock('@/services/imagemParaEnvio', () => ({
  prepararArquivoParaEnvio: (...a: unknown[]) => mockPreparar(...a),
}));

import { createExamDocument } from '@/services/examService';

/** Como o Amplify Storage resolve a pasta: pelo identityId, com a regiao. */
const IDENTITY_ID = 'us-east-1:5648ad4c-7d8f-c7c3-0980-fe0fc91139f5';

const ENTRADA = {
  documentType: 'exam' as const,
  documentName: 'Exame de sangue',
  documentDate: '2025-10-04',
  fileName: 'laudo.pdf',
  filePath: 'file:///tmp/laudo.pdf',
  fileSize: 836_494,
};

beforeEach(() => {
  jest.clearAllMocks();
  // O dublê CHAMA o construtor de caminho que o proprio examService passou, em
  // vez de devolver uma chave fixa. Foi o que consertou este arquivo: a versao
  // anterior fixava um timestamp que nao batia com o gerado, e o terceiro caso
  // falhava por defeito do TESTE. Assim o dublê imita o Amplify de verdade --
  // ele resolve `{ identityId }` e devolve o caminho montado -- e de quebra
  // passa a cobrir o proprio construtor, que antes ninguem exercitava.
  mockUploadFileToS3.mockImplementation(
    async (_caminho: string, montarCaminho: (a: { identityId?: string }) => string) =>
      montarCaminho({ identityId: IDENTITY_ID }),
  );
  mockCreate.mockResolvedValue({ data: { id: 'doc-1' }, errors: undefined });
  mockStartExtraction.mockResolvedValue(undefined);
  mockPreparar.mockImplementation(async (a: unknown) => a);
});

describe('createExamDocument', () => {
  it('grava a chave que o upload devolveu, e nao uma remontada', async () => {
    await createExamDocument(ENTRADA);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const { s3Key, s3FileName } = mockCreate.mock.calls[0][0] as {
      s3Key: string;
      s3FileName: string;
    };
    expect(s3Key).toBe(`medical-documents/${IDENTITY_ID}/${s3FileName}`);
  });

  it('a chave gravada carrega a pasta de identidade, que o owner nao tem', async () => {
    await createExamDocument(ENTRADA);

    const { s3Key } = mockCreate.mock.calls[0][0] as { s3Key: string };
    // O identityId comeca com a regiao; o sub do pool de usuarios, nunca. E a
    // conferencia mais barata que separa os dois identificadores.
    expect(s3Key.split('/')[1]).toMatch(/^[a-z]{2}-[a-z]+-\d+:/);
    expect(s3Key).not.toContain('sub-de-quem-enviou');
  });

  it('continua gravando s3FileName: ele e o que a tela usa para baixar', async () => {
    await createExamDocument(ENTRADA);

    const chamada = mockCreate.mock.calls[0][0] as { s3Key: string; s3FileName: string };
    expect(chamada.s3FileName).toMatch(/^exams\//);
    expect(chamada.s3Key.endsWith(chamada.s3FileName)).toBe(true);
  });
});

describe('createExamDocument -- a foto (G2, Bloco 10)', () => {
  const FOTO = {
    ...ENTRADA,
    fileName: 'IMG_0001.HEIC',
    filePath: 'file:///DCIM/IMG_0001.HEIC',
    // Maior que o teto de 10 MB do formulario: a foto original seria recusada.
    fileSize: 12_000_000,
  };

  beforeEach(() => {
    mockPreparar.mockResolvedValue({
      filePath: 'file:///cache/pronta.jpg',
      fileName: 'IMG_0001.jpg',
      fileSize: 520_000,
    });
  });

  it('sobe a foto PREPARADA, e nao a original', async () => {
    await createExamDocument(FOTO);

    expect(mockPreparar).toHaveBeenCalledWith({
      filePath: FOTO.filePath,
      fileName: FOTO.fileName,
      fileSize: FOTO.fileSize,
    });
    expect(mockUploadFileToS3.mock.calls[0]![0]).toBe('file:///cache/pronta.jpg');
  });

  it('valida o tamanho do arquivo preparado -- a foto de 12 MB nao e recusada', async () => {
    await expect(createExamDocument(FOTO)).resolves.toBeDefined();
  });

  it('guarda com a extensao do que subiu: o HEIC virou JPEG', async () => {
    await createExamDocument(FOTO);

    const linha = mockCreate.mock.calls[0]![0] as { s3FileName: string; originalFileName: string };
    expect(linha.s3FileName).toMatch(/\.jpg$/);
    expect(linha.originalFileName).toBe('IMG_0001.jpg');
  });
});

/**
 * Bloco 11 -- o laudo de varias folhas (E6, Decisao O1). A folha 1 continua
 * sendo o arquivo do documento (`s3FileName`/`s3Key`); as outras sobem para a
 * mesma pasta e entram em `extraPageKeys`, na ordem.
 */
describe('createExamDocument -- varias folhas (Bloco 11)', () => {
  const FOLHA_1 = { ...ENTRADA, fileName: 'folha1.jpg', filePath: 'file:///f1.jpg', fileSize: 500_000 };
  const folha = (n: number) => ({ fileName: `folha${n}.jpg`, filePath: `file:///f${n}.jpg`, fileSize: 400_000 });

  it('sobe cada folha preparada e grava as chaves extras na ordem, na mesma pasta', async () => {
    await createExamDocument({ ...FOLHA_1, folhasAdicionais: [folha(2), folha(3)] });

    expect(mockUploadFileToS3.mock.calls.map((c) => c[0])).toEqual([
      'file:///f1.jpg',
      'file:///f2.jpg',
      'file:///f3.jpg',
    ]);
    const linha = mockCreate.mock.calls[0]![0] as { s3Key: string; extraPageKeys: string[] };
    expect(linha.extraPageKeys).toHaveLength(2);
    const pasta = (k: string) => k.slice(0, k.lastIndexOf('/'));
    for (const chave of linha.extraPageKeys) expect(pasta(chave)).toBe(pasta(linha.s3Key));
    expect(linha.extraPageKeys[0]).toMatch(/-folha-2\.jpg$/);
    expect(linha.extraPageKeys[1]).toMatch(/-folha-3\.jpg$/);
    expect(mockPreparar).toHaveBeenCalledTimes(3);
  });

  it('sem folhas adicionais, nada muda: o documento nao ganha extraPageKeys', async () => {
    await createExamDocument(FOLHA_1);
    const linha = mockCreate.mock.calls[0]![0] as Record<string, unknown>;
    expect('extraPageKeys' in linha).toBe(false);
  });

  it('folha adicional que nao e imagem e recusada antes de subir qualquer coisa', async () => {
    await expect(
      createExamDocument({ ...FOLHA_1, folhasAdicionais: [{ ...folha(2), fileName: 'x.pdf' }] }),
    ).rejects.toThrow(/folha/i);
    expect(mockUploadFileToS3).not.toHaveBeenCalled();
  });

  it('PDF nao recebe folha adicional -- ele ja tem paginas', async () => {
    await expect(
      createExamDocument({ ...ENTRADA, folhasAdicionais: [folha(2)] }),
    ).rejects.toThrow(/folha/i);
    expect(mockUploadFileToS3).not.toHaveBeenCalled();
  });

  it('mais de 10 folhas e recusado', async () => {
    const extras = Array.from({ length: 10 }, (_, i) => folha(i + 2));
    await expect(createExamDocument({ ...FOLHA_1, folhasAdicionais: extras })).rejects.toThrow(/10 folhas/);
    expect(mockUploadFileToS3).not.toHaveBeenCalled();
  });
});

/**
 * Bloco 11 -- o que foi lido de um documento anda junto com ele (E3, E4).
 *
 * E3: apagar o documento removia o arquivo e a linha do documento, e deixava
 * as linhas de resultado e os itens de receita. Elas continuavam na serie, e o
 * chat as citava -- apontando para um documento que nao existia mais.
 *
 * E4: a tela do documento lia so a primeira pagina das linhas.
 *
 * A ORDEM da exclusao e parte do contrato: linhas, arquivos, documento. Se ela
 * parar no meio, o documento ainda existe e apagar de novo termina o servico.
 * Apagar o documento primeiro deixaria linhas que nenhuma tela alcanca mais.
 */
const chamadas: string[] = [];
const mockListarLinhas = jest.fn();
const mockListarItens = jest.fn();
const mockApagarLinha = jest.fn();
const mockApagarItem = jest.fn();
const mockApagarDocumento = jest.fn();
const mockRemoverArquivo = jest.fn();
const mockLerDocumento = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      MedicalDocument: {
        delete: (...a: unknown[]) => mockApagarDocumento(...a),
        get: (...a: unknown[]) => mockLerDocumento(...a),
      },
      LabResult: {
        listLabResultByDocumentId: (...a: unknown[]) => mockListarLinhas(...a),
        delete: (...a: unknown[]) => mockApagarLinha(...a),
      },
      PrescriptionItem: {
        listPrescriptionItemByDocumentId: (...a: unknown[]) => mockListarItens(...a),
        delete: (...a: unknown[]) => mockApagarItem(...a),
      },
    },
    mutations: { startDocumentExtraction: jest.fn() },
  }),
}));

jest.mock('aws-amplify/storage', () => ({
  remove: (...a: unknown[]) => mockRemoverArquivo(...a),
  getUrl: jest.fn(),
}));

jest.mock('@/services/auth', () => ({ getUserId: jest.fn().mockResolvedValue('user-1') }));
jest.mock('@/services/upload', () => ({ uploadFileToS3: jest.fn() }));
jest.mock('@/hooks/useExamsData', () => ({ invalidateExamsCache: jest.fn().mockResolvedValue(undefined) }));
jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));
jest.mock('react-native-get-random-values', () => ({}));

import { deleteExamDocument } from '@/services/examService';
import { fetchExtractionState } from '@/services/extractionService';

/** Duas paginas de linhas, como o AppSync devolve: a primeira com nextToken. */
function paginas<T>(primeira: T[], segunda: T[]) {
  return (_filtro: unknown, opcoes?: { nextToken?: string | null }) =>
    Promise.resolve(
      opcoes?.nextToken === 'pagina-2'
        ? { data: segunda, nextToken: null, errors: undefined }
        : { data: primeira, nextToken: 'pagina-2', errors: undefined },
    );
}

beforeEach(() => {
  jest.clearAllMocks();
  chamadas.length = 0;
  mockListarLinhas.mockImplementation(paginas([{ id: 'l1' }, { id: 'l2' }], [{ id: 'l3' }]));
  mockListarItens.mockImplementation(paginas([{ id: 'r1' }], []));
  mockApagarLinha.mockImplementation(async ({ id }: { id: string }) => {
    chamadas.push(`linha:${id}`);
    return { data: { id }, errors: undefined };
  });
  mockApagarItem.mockImplementation(async ({ id }: { id: string }) => {
    chamadas.push(`item:${id}`);
    return { data: { id }, errors: undefined };
  });
  mockRemoverArquivo.mockImplementation(async () => {
    chamadas.push('arquivo');
    return {};
  });
  mockApagarDocumento.mockImplementation(async ({ id }: { id: string }) => {
    chamadas.push(`documento:${id}`);
    return { data: { id }, errors: undefined };
  });
});

describe('deleteExamDocument leva junto o que foi lido (E3)', () => {
  it('apaga as linhas de TODAS as paginas e os itens de receita', async () => {
    await deleteExamDocument('doc-1', 'exams/a.pdf');

    expect(mockListarLinhas).toHaveBeenCalledWith({ documentId: 'doc-1' }, expect.anything());
    expect(chamadas.filter((c) => c.startsWith('linha:'))).toEqual(['linha:l1', 'linha:l2', 'linha:l3']);
    expect(chamadas.filter((c) => c.startsWith('item:'))).toEqual(['item:r1']);
  });

  it('na ordem: o que foi lido, depois o arquivo, depois o documento', async () => {
    await deleteExamDocument('doc-1', 'exams/a.pdf');
    expect(chamadas).toEqual([
      'linha:l1',
      'linha:l2',
      'linha:l3',
      'item:r1',
      'arquivo',
      'documento:doc-1',
    ]);
  });

  it('falha ao apagar uma linha NAO apaga o arquivo nem o documento', async () => {
    mockApagarLinha.mockImplementation(async ({ id }: { id: string }) =>
      id === 'l2'
        ? { data: null, errors: [{ message: 'Unauthorized' }] }
        : { data: { id }, errors: undefined },
    );

    await expect(deleteExamDocument('doc-1', 'exams/a.pdf')).rejects.toThrow(/Erro ao deletar documento/);
    expect(mockRemoverArquivo).not.toHaveBeenCalled();
    expect(mockApagarDocumento).not.toHaveBeenCalled();
  });

  it('falha ao LISTAR as linhas tambem para antes de apagar o documento', async () => {
    mockListarLinhas.mockResolvedValue({ data: null, nextToken: null, errors: [{ message: 'boom' }] });
    await expect(deleteExamDocument('doc-1', 'exams/a.pdf')).rejects.toThrow();
    expect(mockApagarDocumento).not.toHaveBeenCalled();
  });

  it('documento sem nada lido e apagado normalmente', async () => {
    mockListarLinhas.mockResolvedValue({ data: [], nextToken: null, errors: undefined });
    mockListarItens.mockResolvedValue({ data: [], nextToken: null, errors: undefined });
    await deleteExamDocument('doc-1', 'exams/a.pdf');
    expect(chamadas).toEqual(['arquivo', 'documento:doc-1']);
  });
});

describe('fetchExtractionState le a lista inteira (E4)', () => {
  it('segue o nextToken ate a ultima pagina', async () => {
    mockLerDocumento.mockResolvedValue({ data: { extractionStatus: 'SUCCEEDED' }, errors: undefined });
    const estado = await fetchExtractionState('doc-1');
    expect(estado.results.map((r) => (r as unknown as { id: string }).id)).toEqual(['l1', 'l2', 'l3']);
  });
});

describe('deleteExamDocument apaga todas as folhas (Bloco 11)', () => {
  it('remove as folhas extras pela chave completa, antes do documento', async () => {
    await deleteExamDocument('doc-1', 'exams/a.jpg', ['medical-documents/id/exams/b.jpg']);

    const caminhos = mockRemoverArquivo.mock.calls.map((c) => (c[0] as { path: unknown }).path);
    expect(caminhos).toContain('medical-documents/id/exams/b.jpg');
    expect(chamadas.filter((c) => c === 'arquivo')).toHaveLength(2);
    expect(chamadas[chamadas.length - 1]).toBe('documento:doc-1');
  });
});

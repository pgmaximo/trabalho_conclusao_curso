// Os mocks vem ANTES do import do servico, como em health-import-service.test.ts:
// os servicos deste repositorio montam o cliente do Amplify no carregamento do
// modulo, e um import antes do mock traria o cliente de verdade.

const mockCriarDocumento = jest.fn();
const mockDispararExtracao = jest.fn();
const mockAtualizarLinha = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      MedicalDocument: {
        create: (...args: unknown[]) => mockCriarDocumento(...args),
        get: jest.fn(),
      },
      LabResult: {
        update: (...args: unknown[]) => mockAtualizarLinha(...args),
        listLabResultByDocumentId: jest.fn(),
      },
    },
    mutations: {
      startDocumentExtraction: (...args: unknown[]) => mockDispararExtracao(...args),
    },
  }),
}));

jest.mock('aws-amplify/storage', () => ({
  remove: jest.fn(),
  getUrl: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  getUserId: jest.fn().mockResolvedValue('user-1'),
}));

jest.mock('@/services/upload', () => ({
  uploadFileToS3: jest.fn().mockResolvedValue('medical-documents/id/arquivo.pdf'),
}));

jest.mock('@/hooks/useExamsData', () => ({
  invalidateExamsCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));
jest.mock('react-native-get-random-values', () => ({}));

import { createExamDocument } from '@/services/examService';
import { confirmLabResult, correctLabResult, startExtraction } from '@/services/extractionService';

const entradaValida = {
  fileName: 'hemograma.pdf',
  filePath: 'file:///tmp/hemograma.pdf',
  fileSize: 1024,
  documentType: 'exam' as const,
  documentName: 'Hemograma',
  documentDate: '2025-10-04',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCriarDocumento.mockResolvedValue({ data: { id: 'doc-1' }, errors: undefined });
  mockDispararExtracao.mockResolvedValue({ data: null, errors: undefined });
  mockAtualizarLinha.mockResolvedValue({ data: {}, errors: undefined });
});

describe('createExamDocument e a extracao', () => {
  it('dispara a extracao do documento que acabou de salvar', async () => {
    await createExamDocument(entradaValida);
    expect(mockDispararExtracao).toHaveBeenCalledWith({ documentId: 'doc-1' });
  });

  it('falha ao disparar a extracao NAO derruba o salvamento do documento', async () => {
    // O contrato desta funcao e guardar o documento. Ler o documento e um
    // acrescimo. Se o acrescimo derrubasse o contrato, esta EPIC teria
    // piorado um caminho que funcionava -- exatamente o que a regra 5 proibe.
    mockDispararExtracao.mockRejectedValueOnce(new Error('rede'));
    await expect(createExamDocument(entradaValida)).resolves.toBeDefined();
  });

  it('nao dispara extracao de documento que nao chegou a ser salvo', async () => {
    mockCriarDocumento.mockResolvedValueOnce({ data: null, errors: [{ message: 'sem permissao' }] });
    await expect(createExamDocument(entradaValida)).rejects.toThrow(/sem permissao/);
    expect(mockDispararExtracao).not.toHaveBeenCalled();
  });

  it('startExtraction leva o erro adiante, para quem chamou decidir', async () => {
    // Quem chama do formulario engole; quem chama do botao "Ler agora" da tela
    // de detalhe precisa saber que falhou para poder dizer.
    mockDispararExtracao.mockResolvedValueOnce({ errors: [{ message: 'nao encontrado' }] });
    await expect(startExtraction('doc-1')).rejects.toThrow(/nao encontrado/);
  });
});

describe('correcao de uma linha lida', () => {
  it('le a virgula decimal do jeito que a pessoa digita', async () => {
    // A pessoa digita "32,5" porque o papel diz "32,5". parseFloat devolveria
    // 32 e gravaria um numero errado calado (D23).
    const resultado = await correctLabResult('linha-1', '32,5', 'ng/mL');
    expect(resultado.ok).toBe(true);
    expect(mockAtualizarLinha).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'linha-1', value: 32.5, unit: 'ng/mL' }),
    );
  });

  it('recusa texto que nao e numero, sem gravar nada', async () => {
    const resultado = await correctLabResult('linha-1', 'trinta e dois', 'ng/mL');
    expect(resultado.ok).toBe(false);
    expect(mockAtualizarLinha).not.toHaveBeenCalled();
  });

  it('a correcao NAO toca no que estava escrito no papel', async () => {
    // O papel nao mudou porque alguem corrigiu a leitura. rawValue e rawUnit
    // sao a prova de onde o numero veio, e sem eles nao ha o que auditar.
    await correctLabResult('linha-1', '32,5', 'ng/mL');
    const enviado = mockAtualizarLinha.mock.calls[0][0];
    expect(enviado).not.toHaveProperty('rawValue');
    expect(enviado).not.toHaveProperty('rawUnit');
  });

  it('confirmar registra a decisao da pessoa sem mexer no valor', async () => {
    await confirmLabResult('linha-1');
    const enviado = mockAtualizarLinha.mock.calls[0][0];
    expect(enviado.reviewStatus).toBe('CONFIRMADO_PELO_USUARIO');
    expect(enviado).not.toHaveProperty('value');
  });
});

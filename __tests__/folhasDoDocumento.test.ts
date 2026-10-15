/**
 * Bloco 11 (E6) -- as folhas extras chegam do banco a tela. Sem isto o detalhe
 * nunca mostraria "Abrir folha N", e apagar o documento deixaria as folhas no
 * bucket: `extraPageKeys` e opcional no tipo, e o compilador nao reclama de
 * um mapeamento que simplesmente o esquece.
 */
const mockGet = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: { MedicalDocument: { get: (...a: unknown[]) => mockGet(...a) } },
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { getDocumentById } from '@/hooks/useExamsData';

const LINHA = {
  id: 'doc-1',
  documentType: 'exam',
  documentName: 'Hemograma',
  documentDate: '2025-10-04',
  expirationDate: null,
  s3FileName: 'exams/folha-1.jpg',
  originalFileName: 'folha-1.jpg',
};

describe('getDocumentById -- as folhas extras', () => {
  it('traz as chaves das folhas extras, na ordem, sem entradas vazias', async () => {
    mockGet.mockResolvedValue({
      data: { ...LINHA, extraPageKeys: ['medical-documents/i/exams/f2.jpg', null, 'medical-documents/i/exams/f3.jpg'] },
      errors: undefined,
    });
    const doc = await getDocumentById('doc-1');
    expect(doc?.extraPageKeys).toEqual(['medical-documents/i/exams/f2.jpg', 'medical-documents/i/exams/f3.jpg']);
  });

  it('documento de uma folha nao ganha lista nenhuma', async () => {
    mockGet.mockResolvedValue({ data: LINHA, errors: undefined });
    const doc = await getDocumentById('doc-1');
    expect(doc?.extraPageKeys).toBeUndefined();
  });
});

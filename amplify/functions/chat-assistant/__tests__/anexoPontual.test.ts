/**
 * A conferencia da chave do anexo. Ela existe pela mesma razao que o
 * `auth.ts`: o corpo da requisicao e escolhido por quem chama, e uma chave
 * arbitraria aceita aqui leria o arquivo de outra pessoa.
 */
const mockReadDocument = jest.fn();
const mockExtractText = jest.fn();
jest.mock('../../extract-document-data/s3Reader', () => ({
  readDocument: (...a: unknown[]) => mockReadDocument(...a),
}));
jest.mock('../../extract-document-data/textractClient', () => ({
  extractText: (...a: unknown[]) => mockExtractText(...a),
}));

import { chaveDeAnexoValida, textoDoAnexo } from '../anexoPontual';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

beforeAll(() => {
  process.env.HEALTH_BUCKET_NAME = 'bucket';
});

beforeEach(() => {
  mockReadDocument.mockReset().mockResolvedValue({ bytes: new Uint8Array(), contentType: 'application/pdf' });
  mockExtractText.mockReset().mockResolvedValue({ pages: [], fullText: 'HEMOGRAMA COMPLETO' });
});

describe('chaveDeAnexoValida', () => {
  it('aceita a chave no formato da pasta de anexos', () => {
    expect(chaveDeAnexoValida('chat-attachments/id-1/arquivo.pdf')).toBe(true);
  });

  it('recusa chave de OUTRA pasta -- inclusive a do historico', () => {
    // A porta que registra tem a propria pasta, e o chat nao le de la.
    expect(chaveDeAnexoValida('medical-documents/id-1/laudo.pdf')).toBe(false);
    expect(chaveDeAnexoValida('health-imports/id-1/dados.zip')).toBe(false);
  });

  it('recusa subida de pasta', () => {
    expect(chaveDeAnexoValida('chat-attachments/../medical-documents/x.pdf')).toBe(false);
  });

  it('recusa chave com pasta a mais ou a menos', () => {
    expect(chaveDeAnexoValida('chat-attachments/arquivo.pdf')).toBe(false);
    expect(chaveDeAnexoValida('chat-attachments/id-1/sub/arquivo.pdf')).toBe(false);
  });
});

describe('textoDoAnexo', () => {
  it('devolve o texto que o OCR leu', async () => {
    const texto = await textoDoAnexo({ key: 'chat-attachments/id-1/a.pdf' }, IDENTIDADE);
    expect(texto).toBe('HEMOGRAMA COMPLETO');
  });

  it('nao chega a ler o arquivo quando a chave e de outra pasta', async () => {
    const texto = await textoDoAnexo({ key: 'medical-documents/id-1/a.pdf' }, IDENTIDADE);
    expect(texto).toBeNull();
    expect(mockReadDocument).not.toHaveBeenCalled();
  });

  it('sem anexo, devolve null sem tocar no S3', async () => {
    expect(await textoDoAnexo(null, IDENTIDADE)).toBeNull();
    expect(mockReadDocument).not.toHaveBeenCalled();
  });

  it('anexo ilegivel NAO derruba o turno', async () => {
    // A pergunta da pessoa continua valendo sem ele, e o modelo responde com o
    // que tiver.
    mockExtractText.mockRejectedValue(new Error('UnsupportedDocumentException'));
    expect(await textoDoAnexo({ key: 'chat-attachments/id-1/a.pdf' }, IDENTIDADE)).toBeNull();
  });

  it('documento sem texto nenhum e ausencia, e nao string vazia', async () => {
    mockExtractText.mockResolvedValue({ pages: [], fullText: '   ' });
    expect(await textoDoAnexo({ key: 'chat-attachments/id-1/a.pdf' }, IDENTIDADE)).toBeNull();
  });

  it('corta documento gigante, para nao consumir a janela do modelo', async () => {
    mockExtractText.mockResolvedValue({ pages: [], fullText: 'x'.repeat(50_000) });
    const texto = await textoDoAnexo({ key: 'chat-attachments/id-1/a.pdf' }, IDENTIDADE);
    expect(texto).toHaveLength(20_000);
  });
});

/**
 * A conferencia da chave do anexo e a ROTA de leitura dele.
 *
 * A chave existe pela mesma razao que o `auth.ts`: o corpo da requisicao e
 * escolhido por quem chama, e uma chave arbitraria aceita aqui leria o arquivo
 * de outra pessoa.
 *
 * A rota existe porque a D19 mediu que PDF vai DIRETO ao modelo, sem OCR.
 * `chooseReadingPath` entra aqui de verdade -- e funcao pura, nao importa o
 * SDK, e mocka-la trocaria a decisao medida por uma opiniao do teste.
 */
const mockReadDocument = jest.fn();
const mockExtractText = jest.fn();
jest.mock('../../extract-document-data/s3Reader', () => ({
  readDocument: (...a: unknown[]) => mockReadDocument(...a),
}));
jest.mock('../../extract-document-data/textractClient', () => ({
  extractText: (...a: unknown[]) => mockExtractText(...a),
}));

import { chaveDeAnexoValida, lerAnexo, MAX_BYTES_PDF } from '../anexoPontual';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };
const CHAVE = 'chat-attachments/id-1/a.pdf';

const bytesPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

beforeAll(() => {
  process.env.HEALTH_BUCKET_NAME = 'bucket';
});

beforeEach(() => {
  mockReadDocument
    .mockReset()
    .mockResolvedValue({ bytes: bytesPdf, contentType: 'application/pdf' });
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

describe('lerAnexo -- a rota do PDF (D19)', () => {
  it('PDF vai ao modelo em bytes, e NAO passa pelo Textract', async () => {
    // Este e o defeito que o teste tranca. Mandar PDF ao `extractText` cai no
    // caminho ASSINCRONO do Textract, que a politica do chatAssistantLambda
    // nao concede de proposito -- teto de 5 minutos nao cabe num turno.
    const lido = await lerAnexo({ key: CHAVE }, IDENTIDADE);

    expect(lido).toEqual({ kind: 'pdf', bytes: bytesPdf });
    expect(mockExtractText).not.toHaveBeenCalled();
  });

  it('o parametro depois do ponto e virgula nao tira o PDF da rota do modelo', async () => {
    mockReadDocument.mockResolvedValue({
      bytes: bytesPdf,
      contentType: 'application/pdf; charset=binary',
    });
    const lido = await lerAnexo({ key: CHAVE }, IDENTIDADE);

    expect(lido).toEqual({ kind: 'pdf', bytes: bytesPdf });
    expect(mockExtractText).not.toHaveBeenCalled();
  });

  it('PDF grande demais para o bloco de documento e ausencia, nao OCR', async () => {
    // Nao ha para onde cair: o caminho assincrono esta fora por politica e por
    // tempo. A pergunta continua valendo sem o anexo.
    mockReadDocument.mockResolvedValue({
      bytes: new Uint8Array(MAX_BYTES_PDF + 1),
      contentType: 'application/pdf',
    });

    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toBeNull();
    expect(mockExtractText).not.toHaveBeenCalled();
  });
});

describe('lerAnexo -- o que nao e PDF', () => {
  it('imagem vai ao Textract e volta como texto', async () => {
    mockReadDocument.mockResolvedValue({ bytes: bytesPdf, contentType: 'image/jpeg' });
    const lido = await lerAnexo({ key: 'chat-attachments/id-1/a.jpg' }, IDENTIDADE);

    expect(lido).toEqual({ kind: 'texto', texto: 'HEMOGRAMA COMPLETO' });
    expect(mockExtractText).toHaveBeenCalled();
  });

  it('corta documento gigante, para nao consumir a janela do modelo', async () => {
    mockReadDocument.mockResolvedValue({ bytes: bytesPdf, contentType: 'image/png' });
    mockExtractText.mockResolvedValue({ pages: [], fullText: 'x'.repeat(50_000) });
    const lido = await lerAnexo({ key: 'chat-attachments/id-1/a.png' }, IDENTIDADE);

    expect(lido).toEqual({ kind: 'texto', texto: 'x'.repeat(20_000) });
  });

  it('documento sem texto nenhum e ausencia, e nao string vazia', async () => {
    mockReadDocument.mockResolvedValue({ bytes: bytesPdf, contentType: 'image/png' });
    mockExtractText.mockResolvedValue({ pages: [], fullText: '   ' });
    expect(await lerAnexo({ key: 'chat-attachments/id-1/a.png' }, IDENTIDADE)).toBeNull();
  });
});

describe('lerAnexo -- o que nao pode derrubar o turno', () => {
  it('nao chega a ler o arquivo quando a chave e de outra pasta', async () => {
    const lido = await lerAnexo({ key: 'medical-documents/id-1/a.pdf' }, IDENTIDADE);
    expect(lido).toBeNull();
    expect(mockReadDocument).not.toHaveBeenCalled();
  });

  it('sem anexo, devolve null sem tocar no S3', async () => {
    expect(await lerAnexo(null, IDENTIDADE)).toBeNull();
    expect(mockReadDocument).not.toHaveBeenCalled();
  });

  it('anexo ilegivel NAO derruba o turno', async () => {
    // A pergunta da pessoa continua valendo sem ele, e o modelo responde com o
    // que tiver.
    mockReadDocument.mockRejectedValue(new Error('NoSuchKey'));
    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toBeNull();
  });

  it('falha do Textract NAO derruba o turno', async () => {
    mockReadDocument.mockResolvedValue({ bytes: bytesPdf, contentType: 'image/png' });
    mockExtractText.mockRejectedValue(new Error('UnsupportedDocumentException'));
    expect(await lerAnexo({ key: 'chat-attachments/id-1/a.png' }, IDENTIDADE)).toBeNull();
  });
});

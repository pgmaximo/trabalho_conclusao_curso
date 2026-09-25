/**
 * A conferencia da chave do anexo e a ROTA de leitura dele.
 *
 * A chave existe pela mesma razao que o `auth.ts`: o corpo da requisicao e
 * escolhido por quem chama, e uma chave arbitraria aceita aqui leria o arquivo
 * de outra pessoa.
 *
 * A rota sai dos BYTES (Bloco 10): PDF vai no bloco de documento (D19), foto no
 * bloco de imagem. `avaliarArquivo` entra aqui de verdade -- e funcao pura, e
 * mocka-la trocaria a decisao por uma opiniao do teste.
 */
const mockReadDocument = jest.fn();
jest.mock('../../extract-document-data/s3Reader', () => ({
  readDocument: (...a: unknown[]) => mockReadDocument(...a),
}));

import { METADADO_DO_DONO } from '../../../storage/metadadoDoDono';
import { TETO_IMAGEM_BYTES, TETO_PDF_BYTES } from '../../extract-document-data/formatoDoArquivo';
import { chaveDeAnexoValida, lerAnexo } from '../anexoPontual';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };
const CHAVE = 'chat-attachments/id-1/a.pdf';

const bytesPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const bytesJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

/** O metadado que o aplicativo grava no envio (D46), com o sub de IDENTIDADE. */
const DO_DONO = { [METADADO_DO_DONO]: IDENTIDADE.sub };

beforeAll(() => {
  process.env.HEALTH_BUCKET_NAME = 'bucket';
});

// O duble devolve um objeto enviado por IDENTIDADE. Os `mockResolvedValue` dos
// casos abaixo que so trocam bytes passam pelo `comDono`, para continuar
// testando o que testavam -- a rota e o teto -- e nao a posse.
const comDono = (o: { bytes: Uint8Array; contentType: string }) => ({ ...o, metadados: DO_DONO });

beforeEach(() => {
  mockReadDocument
    .mockReset()
    .mockResolvedValue(comDono({ bytes: bytesPdf, contentType: 'application/pdf' }));
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
  it('PDF vai ao modelo em bytes', async () => {
    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toEqual({ kind: 'pdf', bytes: bytesPdf });
  });

  it('a rota sai dos bytes: um PDF declarado como imagem continua sendo PDF', async () => {
    mockReadDocument.mockResolvedValue(comDono({ bytes: bytesPdf, contentType: 'image/jpeg' }));
    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toEqual({ kind: 'pdf', bytes: bytesPdf });
  });

  it('PDF grande demais para o bloco de documento e ausencia', async () => {
    const grande = new Uint8Array(TETO_PDF_BYTES + 1);
    grande.set(bytesPdf);
    mockReadDocument.mockResolvedValue(comDono({ bytes: grande, contentType: 'application/pdf' }));

    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toBeNull();
  });
});

describe('lerAnexo -- a foto (G3, Bloco 10)', () => {
  it('foto vai ao modelo como imagem, com o formato detectado', async () => {
    // Antes ia ao Textract, que a conta recusa, e o anexo sumia da conversa.
    mockReadDocument.mockResolvedValue(comDono({ bytes: bytesJpeg, contentType: 'image/jpeg' }));
    expect(await lerAnexo({ key: 'chat-attachments/id-1/a.jpg' }, IDENTIDADE)).toEqual({
      kind: 'imagem',
      formato: 'jpeg',
      bytes: bytesJpeg,
    });
  });

  it('foto acima do teto do bloco de imagem e ausencia', async () => {
    const grande = new Uint8Array(TETO_IMAGEM_BYTES + 1);
    grande.set(bytesJpeg);
    mockReadDocument.mockResolvedValue(comDono({ bytes: grande, contentType: 'image/jpeg' }));
    expect(await lerAnexo({ key: 'chat-attachments/id-1/a.jpg' }, IDENTIDADE)).toBeNull();
  });

  it('formato que nao e PDF nem imagem suportada e ausencia', async () => {
    mockReadDocument.mockResolvedValue(comDono({ bytes: new Uint8Array([0x50, 0x4b, 3, 4]), contentType: '' }));
    expect(await lerAnexo({ key: 'chat-attachments/id-1/a.zip' }, IDENTIDADE)).toBeNull();
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
});

/**
 * D46 (2026-09-24). A chave vem do CORPO da requisicao, e `chaveDeAnexoValida`
 * so confere a forma: a chave do anexo de outra pessoa tem a forma certa. A
 * funcao le `chat-attachments/*` inteiro, entao lia -- e o modelo respondia a A
 * sobre o documento de B. O dono comparado sai do TOKEN, pela regra do auth.ts.
 */
describe('lerAnexo -- so o anexo de quem pergunta', () => {
  const OUTRA = { sub: 's-2', username: 'u-2', owner: 's-2::u-2' };

  it('anexo enviado por outra pessoa e ausencia, e os bytes nao saem', async () => {
    mockReadDocument.mockResolvedValue({
      bytes: bytesPdf,
      contentType: 'application/pdf',
      metadados: { [METADADO_DO_DONO]: OUTRA.sub },
    });

    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toBeNull();
  });

  it('anexo sem o metadado e ausencia', async () => {
    mockReadDocument.mockResolvedValue({ bytes: bytesPdf, contentType: 'application/pdf', metadados: {} });

    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toBeNull();
  });

  it('o dono comparado e o da identidade: o mesmo objeto, duas respostas', async () => {
    // Objeto enviado por IDENTIDADE (o duble padrao). Quem pergunta decide.
    expect(await lerAnexo({ key: CHAVE }, IDENTIDADE)).toEqual({ kind: 'pdf', bytes: bytesPdf });
    expect(await lerAnexo({ key: CHAVE }, OUTRA)).toBeNull();
  });
});

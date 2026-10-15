/**
 * G2/G3 (Bloco 10) -- a foto anexada no chat tambem encolhe antes de subir.
 *
 * O anexo vai ao mesmo bloco de imagem da extracao, com o mesmo teto de 3,75
 * MB. Sem o preparo, a foto do celular seria recusada na funcao e o anexo
 * sumiria da conversa.
 */
const mockUploadData = jest.fn();
jest.mock('aws-amplify/storage', () => ({
  uploadData: (...a: unknown[]) => mockUploadData(...a),
}));

const mockPreparar = jest.fn();
jest.mock('@/services/imagemParaEnvio', () => ({
  prepararArquivoParaEnvio: (...a: unknown[]) => mockPreparar(...a),
}));

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: async () => ({ userId: 'sub-1', username: 'u-1' }),
}));

import { METADADO_DO_DONO } from '../amplify/storage/metadadoDoDono';
import { uploadAnexoDoChat } from '@/services/chatAttachmentService';

const blobDe = (tipo: string) => ({ type: tipo });

beforeEach(() => {
  mockUploadData.mockReset().mockImplementation(({ path }: { path: (a: { identityId: string }) => string }) => ({
    result: Promise.resolve({ path: path({ identityId: 'id-1' }) }),
  }));
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn(async (uri: string) => ({
    blob: async () => blobDe(uri.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
  }));
  mockPreparar.mockReset().mockImplementation(async (a: unknown) => a);
});

describe('uploadAnexoDoChat', () => {
  it('sobe a foto PREPARADA, como JPEG, com extensao .jpg', async () => {
    mockPreparar.mockResolvedValue({
      filePath: 'file:///cache/pronta.jpg',
      fileName: 'IMG_0001.jpg',
      fileSize: 500_000,
    });

    const enviado = await uploadAnexoDoChat('file:///DCIM/IMG_0001.HEIC', 'IMG_0001.HEIC', 'image/heic');

    expect((global as unknown as { fetch: jest.Mock }).fetch).toHaveBeenCalledWith('file:///cache/pronta.jpg');
    const chamada = mockUploadData.mock.calls[0]![0] as { options: { contentType: string } };
    expect(chamada.options.contentType).toBe('image/jpeg');
    expect(enviado.key).toMatch(/^chat-attachments\/id-1\/.+\.jpg$/);
    // O nome que a tela mostra continua o que a pessoa escolheu.
    expect(enviado.fileName).toBe('IMG_0001.HEIC');
  });

  it('grava o sub de quem enviou no metadado, sem perder o contentType (D46)', async () => {
    // A funcao do chat so le o anexo cujo metadado bate com o `sub` do token.
    // Sem o metadado, todo anexo viraria ausencia.
    await uploadAnexoDoChat('file:///laudo.pdf', 'laudo.pdf', 'application/pdf');

    const chamada = mockUploadData.mock.calls[0]![0] as {
      options: { contentType: string; metadata?: Record<string, string> };
    };
    expect(chamada.options.metadata).toEqual({ [METADADO_DO_DONO]: 'sub-1' });
    expect(chamada.options.contentType).toBe('application/pdf');
  });

  it('PDF sobe como veio', async () => {
    const enviado = await uploadAnexoDoChat('file:///laudo.pdf', 'laudo.pdf', 'application/pdf');

    const chamada = mockUploadData.mock.calls[0]![0] as { options: { contentType: string } };
    expect(chamada.options.contentType).toBe('application/pdf');
    expect(enviado.key).toMatch(/\.pdf$/);
  });
});

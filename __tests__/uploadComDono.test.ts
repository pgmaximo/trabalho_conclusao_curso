/**
 * A metade do aplicativo do conserto de 2026-09-24 (D46): todo arquivo enviado
 * leva no metadado o `sub` de quem enviou, e as funcoes so leem o arquivo cujo
 * metadado bate com o dono.
 *
 * Se esta metade falhar, a outra recusa TODO documento novo -- nao vaza nada,
 * mas o aplicativo para de ler laudo. Por isso os dois ramos do envio (web e
 * nativo) sao testados, embora a chamada ao `uploadData` seja uma so.
 */
import { Platform } from 'react-native';

const mockUploadData = jest.fn();
jest.mock('aws-amplify/storage', () => ({
  uploadData: (...a: unknown[]) => mockUploadData(...a),
}));

const mockGetCurrentUser = jest.fn();
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a),
}));

const mockBytes = jest.fn();
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ bytes: mockBytes })),
}));

import { METADADO_DO_DONO } from '../amplify/storage/metadadoDoDono';
import { metadadosDeQuemEnvia } from '@/services/metadadoDeQuemEnvia';
import { uploadFileToS3 } from '@/services/upload';

const SUB = '74a8f418-c0a1-702e-a611-2728b324d20f';
const CAMINHO = ({ identityId }: { identityId?: string }) => `medical-documents/${identityId}/exams/a.pdf`;

beforeEach(() => {
  mockUploadData.mockReset().mockImplementation(({ path }: { path: (a: { identityId: string }) => string }) => ({
    result: Promise.resolve({ path: path({ identityId: 'us-east-1:id-1' }) }),
  }));
  mockGetCurrentUser.mockReset().mockResolvedValue({ userId: SUB, username: 'pedro' });
  mockBytes.mockReset().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
});

describe('metadadosDeQuemEnvia', () => {
  it('grava o sub de quem esta autenticado, sob o nome do contrato', async () => {
    expect(await metadadosDeQuemEnvia()).toEqual({ [METADADO_DO_DONO]: SUB });
  });

  it('usa o userId do token, e nao o username', async () => {
    // O `owner` da linha e `<sub>::<username>`, e a funcao compara com a
    // metade do sub. Gravar o username aqui recusaria todo documento.
    mockGetCurrentUser.mockResolvedValue({ userId: SUB, username: 'outro-valor' });
    expect(Object.values(await metadadosDeQuemEnvia())).toEqual([SUB]);
  });
});

describe('uploadFileToS3 -- o metadado de quem enviou', () => {
  it('ramo nativo: o uploadData recebe o metadado', async () => {
    await uploadFileToS3('file:///tmp/a.pdf', CAMINHO);

    const chamada = mockUploadData.mock.calls[0]![0] as { options?: { metadata?: Record<string, string> } };
    expect(chamada.options?.metadata).toEqual({ [METADADO_DO_DONO]: SUB });
  });

  it('ramo web: o uploadData recebe o metadado', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: 'application/pdf' }),
    }));

    await uploadFileToS3('blob:http://localhost/a', CAMINHO);

    expect(mockBytes).not.toHaveBeenCalled();
    const chamada = mockUploadData.mock.calls[0]![0] as { options?: { metadata?: Record<string, string> } };
    expect(chamada.options?.metadata).toEqual({ [METADADO_DO_DONO]: SUB });
  });

  it('continua devolvendo o caminho que o Amplify resolveu', async () => {
    expect(await uploadFileToS3('file:///tmp/a.pdf', CAMINHO)).toBe(
      'medical-documents/us-east-1:id-1/exams/a.pdf',
    );
  });
});

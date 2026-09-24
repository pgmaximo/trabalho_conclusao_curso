/**
 * O conserto do achado de 2026-09-24 (D46), no lugar em que ele acontece.
 *
 * A pessoa A escreve o `s3Key` da propria linha, e escrevia a chave do laudo de
 * B. A funcao tem leitura no prefixo inteiro, entao lia -- e os valores de B
 * viravam linhas de A. A conferencia de FORMA de `chaveDoDocumento` nao
 * alcanca isso: a chave de B tem a forma certa.
 *
 * Mora fora do handler de proposito: o `handler.ts` nao tem suite, e se a
 * conferencia morasse la, o conserto nao teria teste. O S3 e dublado pelo
 * `jest.mock` do leitor, como o `anexoPontual.test.ts` ja faz.
 */
const mockReadDocument = jest.fn();
jest.mock('../s3Reader', () => ({
  readDocument: (...a: unknown[]) => mockReadDocument(...a),
}));

import { METADADO_DO_DONO } from '../../../storage/metadadoDoDono';
import { lerArquivoDoDono } from '../arquivoDoDono';

const SUB_A = '74a8f418-c0a1-702e-a611-2728b324d20f';
const SUB_B = '0c4f2e9a-5b1d-4d7e-9f3a-8e6b2a1c9d00';
const CHAVE_DE_B = 'medical-documents/us-east-1:bbbbbbbb-0000-0000-0000-000000000000/exams/laudo.pdf';
const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function objetoGravadoPor(sub: string | null) {
  return {
    bytes: BYTES,
    contentType: 'application/pdf',
    metadados: sub === null ? {} : { [METADADO_DO_DONO]: sub },
  };
}

beforeEach(() => {
  mockReadDocument.mockReset();
});

describe('lerArquivoDoDono', () => {
  it('devolve os bytes quando o arquivo e do dono', async () => {
    mockReadDocument.mockResolvedValue(objetoGravadoPor(SUB_B));

    expect(await lerArquivoDoDono('bucket', CHAVE_DE_B, SUB_B)).toEqual({ ok: true, bytes: BYTES });
    expect(mockReadDocument).toHaveBeenCalledWith('bucket', CHAVE_DE_B);
  });

  it('o achado: o laudo de B, pedido para o dono A, e recusado e os bytes nao saem', async () => {
    mockReadDocument.mockResolvedValue(objetoGravadoPor(SUB_B));

    const lido = await lerArquivoDoDono('bucket', CHAVE_DE_B, SUB_A);

    expect(lido).toEqual({ ok: false, motivo: 'outro-dono' });
    expect(lido).not.toHaveProperty('bytes');
  });

  it('objeto sem o metadado, enviado antes desta EPIC, e recusado', async () => {
    mockReadDocument.mockResolvedValue(objetoGravadoPor(null));

    expect(await lerArquivoDoDono('bucket', CHAVE_DE_B, SUB_A)).toEqual({
      ok: false,
      motivo: 'sem-metadado',
    });
  });

  it('sem dono esperado, recusa sem nem abrir o objeto', async () => {
    expect(await lerArquivoDoDono('bucket', CHAVE_DE_B, null)).toEqual({
      ok: false,
      motivo: 'sem-dono-esperado',
    });
    expect(mockReadDocument).not.toHaveBeenCalled();
  });

  it('erro de leitura do S3 propaga -- o handler o transforma em leitura-falhou', async () => {
    // Engolir aqui transformaria uma chave inexistente em "arquivo de outra
    // pessoa", e a copy pediria o reenvio de um arquivo que talvez nem exista.
    mockReadDocument.mockRejectedValue(new Error('NoSuchKey'));

    await expect(lerArquivoDoDono('bucket', CHAVE_DE_B, SUB_A)).rejects.toThrow('NoSuchKey');
  });
});

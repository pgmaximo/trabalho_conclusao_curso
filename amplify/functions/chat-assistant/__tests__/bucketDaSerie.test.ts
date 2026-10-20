/**
 * O modulo que fala com o S3 (E6): objeto inexistente e acima do teto viram
 * `null` sem ler o corpo, e o teto falha FECHADO quando o S3 nao diz o tamanho.
 * Outro erro propaga -- quem decide o que fazer e a porta. O SDK e simulado so
 * aqui: as outras suites simulam este modulo inteiro.
 */
const mockSendS3 = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = (...a: unknown[]) => mockSendS3(...a);
  },
  GetObjectCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));

import { baixarTextoDoBucket } from '../tools/bucketDaSerie';

function corpo(texto: string) {
  return { transformToString: jest.fn().mockResolvedValue(texto), destroy: jest.fn() };
}

beforeEach(() => mockSendS3.mockReset());

describe('baixarTextoDoBucket', () => {
  it('le o texto do objeto pedido', async () => {
    mockSendS3.mockResolvedValue({ Body: corpo('{"series":{}}'), ContentLength: 13 });
    await expect(baixarTextoDoBucket('b', 'k', 100)).resolves.toBe('{"series":{}}');
    expect(mockSendS3.mock.calls[0][0].input).toEqual({ Bucket: 'b', Key: 'k' });
  });

  it('objeto inexistente: null', async () => {
    mockSendS3.mockRejectedValue(Object.assign(new Error('x'), { name: 'NoSuchKey' }));
    await expect(baixarTextoDoBucket('b', 'k', 100)).resolves.toBeNull();
  });

  it('acima do teto: null, sem ler o corpo', async () => {
    const c = corpo('grande');
    mockSendS3.mockResolvedValue({ Body: c, ContentLength: 101 });
    await expect(baixarTextoDoBucket('b', 'k', 100)).resolves.toBeNull();
    expect(c.transformToString).not.toHaveBeenCalled();
    expect(c.destroy).toHaveBeenCalled();
  });

  it('sem o tamanho declarado: falha fechado, sem ler o corpo', async () => {
    const c = corpo('?');
    mockSendS3.mockResolvedValue({ Body: c });
    await expect(baixarTextoDoBucket('b', 'k', 100)).resolves.toBeNull();
    expect(c.transformToString).not.toHaveBeenCalled();
  });

  it('corpo vazio: null', async () => {
    mockSendS3.mockResolvedValue({ ContentLength: 0 });
    await expect(baixarTextoDoBucket('b', 'k', 100)).resolves.toBeNull();
  });

  it('outro erro do S3 propaga', async () => {
    mockSendS3.mockRejectedValue(Object.assign(new Error('x'), { name: 'AccessDenied' }));
    await expect(baixarTextoDoBucket('b', 'k', 100)).rejects.toMatchObject({ name: 'AccessDenied' });
  });
});

/**
 * G2 (Bloco 10) -- a foto encolhe no aparelho antes de subir.
 *
 * O bloco de imagem do Converse aceita ate 3,75 MB. A camera do aplicativo
 * usava `quality: 0.8` sem redimensionar, e uma foto de 12 MP nessa qualidade
 * fica tipicamente entre 2 e 5 MB: metade seria recusada pelo servico. Encolher
 * no aparelho tambem poupa dado movel de quem tem plano pre-pago (Decisao G).
 *
 * 2000 px no maior lado, JPEG 0,85 (Decisao H): a foto e o DOCUMENTO da pessoa,
 * e nao so a entrada do modelo -- ela precisa conseguir le-la depois.
 */
const mockManipulate = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...a: unknown[]) => mockManipulate(...a) },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

const mockTamanho = jest.fn();
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get size() {
      return mockTamanho(this.uri);
    }
  },
}));

import {
  LADO_MAXIMO,
  QUALIDADE_JPEG,
  ehImagem,
  ladoDeRedimensionamento,
  nomeDeEnvio,
  prepararArquivoParaEnvio,
} from '@/services/imagemParaEnvio';

describe('ladoDeRedimensionamento', () => {
  it('foto em pe reduz pela ALTURA, e a proporcao fica com o manipulador', () => {
    expect(ladoDeRedimensionamento(3024, 4032)).toEqual({ height: LADO_MAXIMO });
  });

  it('foto deitada reduz pela LARGURA', () => {
    expect(ladoDeRedimensionamento(4032, 3024)).toEqual({ width: LADO_MAXIMO });
  });

  it('imagem que ja cabe NAO e ampliada', () => {
    // Ampliar nao acrescenta nitidez nenhuma e so aumenta o arquivo.
    expect(ladoDeRedimensionamento(1242, 1754)).toBeNull();
    expect(ladoDeRedimensionamento(LADO_MAXIMO, 1000)).toBeNull();
  });

  it('o lado maximo e 2000 (Decisao H)', () => {
    expect(LADO_MAXIMO).toBe(2000);
    expect(QUALIDADE_JPEG).toBe(0.85);
  });
});

describe('ehImagem e nomeDeEnvio', () => {
  it('reconhece as imagens que o aplicativo aceita, inclusive HEIC do iPhone', () => {
    for (const nome of ['a.jpg', 'a.JPEG', 'b.png', 'c.webp', 'IMG_0001.HEIC', 'd.heif']) {
      expect(ehImagem(nome)).toBe(true);
    }
  });

  it('PDF nao e imagem, e nome sem extensao tambem nao', () => {
    expect(ehImagem('laudo.pdf')).toBe(false);
    expect(ehImagem('sem-extensao')).toBe(false);
  });

  it('o nome enviado termina em .jpg, porque o arquivo enviado E JPEG', () => {
    expect(nomeDeEnvio('IMG_0001.HEIC')).toBe('IMG_0001.jpg');
    expect(nomeDeEnvio('laudo.maio.png')).toBe('laudo.maio.jpg');
  });
});

describe('prepararArquivoParaEnvio', () => {
  const salvar = jest.fn();
  const contexto = (largura: number, altura: number) => {
    const ctx = {
      resize: jest.fn(() => ctx),
      renderAsync: jest.fn(async () => ({ width: largura, height: altura, saveAsync: salvar })),
    };
    return ctx;
  };

  beforeEach(() => {
    mockManipulate.mockReset();
    salvar.mockReset().mockResolvedValue({ uri: 'file:///cache/pronta.jpg', width: 1500, height: 2000 });
    mockTamanho.mockReset().mockReturnValue(512_000);
  });

  it('PDF passa intacto, sem tocar no manipulador', async () => {
    const arquivo = { filePath: 'file:///laudo.pdf', fileName: 'laudo.pdf', fileSize: 800_000 };
    expect(await prepararArquivoParaEnvio(arquivo)).toEqual(arquivo);
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('foto grande sai reduzida, em JPEG 0,85, com nome e tamanho NOVOS', async () => {
    const ctx = contexto(3024, 4032);
    mockManipulate.mockReturnValue(ctx);

    const pronto = await prepararArquivoParaEnvio({
      filePath: 'file:///IMG_0001.HEIC',
      fileName: 'IMG_0001.HEIC',
      fileSize: 4_800_000,
    });

    expect(ctx.resize).toHaveBeenCalledWith({ height: 2000 });
    expect(salvar).toHaveBeenCalledWith({ compress: 0.85, format: 'jpeg' });
    // O tamanho validado e o do arquivo que SOBE, e nao o do original: uma
    // foto de 12 MB que vira 500 KB nao pode ser recusada pelo teto de 10 MB.
    expect(pronto).toEqual({
      filePath: 'file:///cache/pronta.jpg',
      fileName: 'IMG_0001.jpg',
      fileSize: 512_000,
    });
  });

  it('foto que ja cabe NAO e redimensionada, mas e reconvertida para JPEG', async () => {
    // PNG de 1 MB e HEIC pequeno tambem precisam virar JPEG: o bloco de imagem
    // nao aceita HEIC, e PNG de laudo fica maior que o JPEG equivalente.
    const ctx = contexto(1242, 1754);
    mockManipulate.mockReturnValue(ctx);

    await prepararArquivoParaEnvio({ filePath: 'file:///p.png', fileName: 'p.png', fileSize: 1 });

    expect(ctx.resize).not.toHaveBeenCalled();
    expect(salvar).toHaveBeenCalledWith({ compress: 0.85, format: 'jpeg' });
  });
});

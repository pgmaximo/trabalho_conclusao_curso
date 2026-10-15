/**
 * O reparo da extracao, que ate 2026-09-22 acontecia sem deixar rastro.
 *
 * Como ele foi descoberto: comparando duas execucoes do MESMO laudo lado a
 * lado, com o teto do texto de faixa em 400 e em 800. A de 400 custou 62.893
 * tokens de entrada e 111,5 s; a de 800, 57.196 e 70,4 s -- mais barata
 * transcrevendo MAIS. A unica explicacao que sustenta os dois numeros e uma
 * segunda chamada ao modelo, e ela nao aparecia em lugar nenhum.
 *
 * Pior: `usage` reportava so a ULTIMA chamada, entao o custo de um documento
 * que precisou de reparo era subnotificado no proprio campo que existe para
 * medi-lo. E a mesma forma do defeito que a conversa tinha antes do Bloco 8 --
 * a reprovacao acontecia e nao deixava rastro.
 *
 * Esta suite e a primeira deste arquivo. Ela mocka o SDK do Bedrock em vez de
 * importar valor dele, que e a regra do repositorio.
 */
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send(...args: unknown[]) {
      return mockSend(...args);
    }
  },
  ConverseCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

import { ANALYTE_CATALOG } from '../analyteCatalog';
import { requestExtraction, type ExtractionSource } from '../bedrockClient';

const codigoDe = (rotulo: string): string => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado.code;
};

const EXTRACAO_VALIDA = {
  documentKind: 'exam',
  labResults: [
    {
      analyteLabel: '25-OH-Vitamina D',
      rawValue: '32,5',
      rawUnit: 'ng/mL',
      rawReferenceLow: '30',
      rawReferenceHigh: '100',
      collectedAt: '2026-03-12',
      collectionMoment: null,
      sourcePage: 2,
      confidence: 0.94,
      analyteCodeGuess: codigoDe('Vitamina D (25-OH)'),
    },
  ],
  prescriptionItems: [],
  warnings: [],
};

/** A forma que o Converse devolve, com o JSON dentro de um bloco de texto. */
function resposta(payload: unknown, uso: [number, number], stopReason = 'end_turn') {
  return {
    output: { message: { content: [{ text: JSON.stringify(payload) }] } },
    usage: { inputTokens: uso[0], outputTokens: uso[1] },
    stopReason,
  };
}

// O Textract saiu do caminho no Bloco 10 (Decisao F2), e com ele a fonte de
// texto. As duas fontes que existem sao os dois blocos do Converse.
const FONTE: ExtractionSource = { kind: 'pdf', bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) };

const OPCOES = { modelId: 'm', guardrailId: 'g', guardrailVersion: '1', candidatos: 'lista' };

const pedir = () => requestExtraction(FONTE, 'exam', OPCOES);

let info: jest.SpyInstance;

beforeEach(() => {
  mockSend.mockReset();
  info = jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => info.mockRestore());

const linhasDeLog = () => info.mock.calls.map((c) => String(c[0]));
const reparos = () => linhasDeLog().filter((l) => l.includes('reparo-de-extracao'));

describe('requestExtraction — sem reparo', () => {
  it('devolve o uso da chamada unica', async () => {
    mockSend.mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [56826, 5161]));

    const r = await pedir();

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.usage).toEqual({ input: 56826, output: 5161 });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('NAO registra reparo quando nao houve reparo', async () => {
    mockSend.mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [10, 5]));

    await pedir();

    expect(reparos()).toHaveLength(0);
  });
});

describe('requestExtraction — com reparo', () => {
  it('SOMA o uso das duas chamadas, e nao reporta so a ultima', async () => {
    // O defeito: com `usage` da ultima chamada apenas, este documento apareceria
    // custando 30.000 de entrada quando custou 50.000.
    mockSend
      .mockResolvedValueOnce(resposta({ lixo: true }, [20000, 4000]))
      .mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [30000, 900]));

    const r = await pedir();

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.usage).toEqual({ input: 50000, output: 4900 });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('registra o reparo, com o MOTIVO e sem nada do documento', async () => {
    mockSend
      .mockResolvedValueOnce(resposta({ lixo: true }, [10, 5]))
      .mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [20, 6]));

    await pedir();

    expect(reparos()).toHaveLength(1);
    expect(reparos()[0]).toContain('"motivo":"validacao"');
    // A mesma regra do `resposta-reprovada`: o log e lido por gente e guardado
    // por tempo indeterminado, e o conteudo aqui e o laudo de alguem.
    expect(reparos()[0]).not.toMatch(/Vitamina|32,5|ng\/mL/);
  });

  it('distingue o corte por tamanho do erro de formato', async () => {
    mockSend
      .mockResolvedValueOnce(resposta({ lixo: true }, [10, 5], 'max_tokens'))
      .mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [20, 6]));

    await pedir();

    expect(reparos()[0]).toContain('"motivo":"max_tokens"');
  });

  it('reparo que TAMBEM falha soma o uso, e o custo nao some com o fracasso', async () => {
    // Um documento que falhou duas vezes e o mais caro de todos. Se o custo
    // so fosse contado no sucesso, a media por documento sairia otimista.
    mockSend
      .mockResolvedValueOnce(resposta({ lixo: true }, [20000, 4000]))
      .mockResolvedValueOnce(resposta({ lixo: true }, [30000, 900]));

    const r = await pedir();

    expect(r.ok).toBe(false);
    expect(reparos()).toHaveLength(1);
    expect(linhasDeLog().some((l) => l.includes('"entrada":50000'))).toBe(true);
  });
});

/**
 * G1 -- a foto vai ao modelo como BLOCO DE IMAGEM.
 *
 * Medido antes de escrever o codigo (spec do Bloco 10, secao 2): 26 de 26
 * valores identicos ao PDF nas paginas renderizadas limpas, 25 de 26 nas fotos
 * simuladas -- e o unico erro virou a trava do grafico.
 */
describe('requestExtraction -- imagem', () => {
  const FOTO: ExtractionSource = {
    kind: 'imagem',
    formato: 'png',
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  };

  const conteudoEnviado = () =>
    (mockSend.mock.calls[0]![0] as { input: { messages: { content: Record<string, unknown>[] }[] } })
      .input.messages[0]!.content;

  it('monta o bloco de imagem com o formato detectado, e nao um bloco de documento', async () => {
    mockSend.mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [9301, 1858]));

    const r = await requestExtraction(FOTO, 'exam', OPCOES);

    expect(r.ok).toBe(true);
    const conteudo = conteudoEnviado();
    const imagem = conteudo.find((b) => 'image' in b) as { image: { format: string } } | undefined;
    expect(imagem?.image.format).toBe('png');
    expect(conteudo.some((b) => 'document' in b)).toBe(false);
  });

  it('avisa o modelo de que e FOTO, e do que fazer com o que nao esta legivel', async () => {
    mockSend.mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [10, 5]));

    await requestExtraction(FOTO, 'exam', OPCOES);

    const pedido = JSON.stringify(conteudoEnviado());
    expect(pedido).toMatch(/FOTO/);
    expect(pedido).toMatch(/nao estiver legivel/i);
  });
});

/**
 * G4 -- a falha sai como MOTIVO, e o texto tecnico fica no log.
 *
 * Antes, `message` levava `error.message` do SDK ou o caminho de campo do zod,
 * e o handler gravava isso onde a tela le.
 */
describe('requestExtraction -- falha', () => {
  let erro: jest.SpyInstance;
  beforeEach(() => {
    erro = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => erro.mockRestore());

  it('excecao do SDK vira leitura-falhou, e a mensagem dela vai so para o log', async () => {
    mockSend.mockRejectedValueOnce(new Error('ValidationException: Input is too long'));

    const r = await pedir();

    expect(r).toEqual({ ok: false, motivo: 'leitura-falhou' });
    expect(erro.mock.calls.map((c) => String(c[0])).join(' ')).toContain('ValidationException');
  });

  it('validacao que falha duas vezes vira leitura-falhou, sem o caminho do zod', async () => {
    mockSend
      .mockResolvedValueOnce(resposta({ lixo: true }, [1, 1]))
      .mockResolvedValueOnce(resposta({ lixo: true }, [1, 1]));

    expect(await pedir()).toEqual({ ok: false, motivo: 'leitura-falhou' });
  });

  it('bloqueio do filtro tem motivo proprio', async () => {
    mockSend.mockResolvedValueOnce(resposta({}, [1, 1], 'guardrail_intervened'));

    expect(await pedir()).toEqual({ ok: false, motivo: 'bloqueado-pelo-filtro' });
  });
});

describe('requestExtraction -- varias folhas (Bloco 11)', () => {
  const FOLHAS: ExtractionSource = {
    kind: 'folhas',
    folhas: [
      { formato: 'jpeg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 1]) },
      { formato: 'png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
      { formato: 'jpeg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 3]) },
    ],
  };

  const conteudoEnviado = () =>
    (mockSend.mock.calls[0]![0] as { input: { messages: { content: Record<string, unknown>[] }[] } })
      .input.messages[0]!.content;

  it('um bloco de imagem por folha, na ordem, e nenhum de documento', async () => {
    mockSend.mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [10, 5]));

    const r = await requestExtraction(FOLHAS, 'exam', OPCOES);

    expect(r.ok).toBe(true);
    const imagens = conteudoEnviado().filter((b) => 'image' in b) as {
      image: { format: string; source: { bytes: Uint8Array } };
    }[];
    expect(imagens.map((b) => b.image.format)).toEqual(['jpeg', 'png', 'jpeg']);
    expect(imagens.map((b) => b.image.source.bytes[3])).toEqual([1, 0x47, 3]);
    expect(conteudoEnviado().some((b) => 'document' in b)).toBe(false);
  });

  it('o pedido diz quantas folhas sao, e vem DEPOIS das imagens', async () => {
    mockSend.mockResolvedValueOnce(resposta(EXTRACAO_VALIDA, [10, 5]));

    await requestExtraction(FOLHAS, 'exam', OPCOES);

    const conteudo = conteudoEnviado();
    const ultimaImagem = conteudo.map((b) => 'image' in b).lastIndexOf(true);
    const pedido = conteudo.findIndex((b) => JSON.stringify(b).includes('3 fotos'));
    expect(pedido).toBeGreaterThan(ultimaImagem);
  });
});

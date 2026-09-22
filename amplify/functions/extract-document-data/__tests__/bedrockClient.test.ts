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

const FONTE: ExtractionSource = {
  kind: 'texto',
  text: { pages: [{ page: 1, text: 'Vitamina D 32,5 ng/mL' }], fullText: 'Vitamina D 32,5 ng/mL' },
};

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

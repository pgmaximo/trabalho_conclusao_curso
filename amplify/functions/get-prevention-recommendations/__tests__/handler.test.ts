/**
 * Resumo do arquivo:
 * Teste de CARACTERIZACAO da Lambda da tela de Prevencao. Ele foi escrito
 * ANTES de o E7 mover o cliente e o filtro da USPSTF para `uspstf-shared/`
 * (spec do E7, CA-2), e fixa a saida inteira da query como ela e hoje.
 *
 * Por que inteira (`toEqual` sobre o objeto devolvido) e nao campo a campo: o
 * refactor nao pode mudar nada do que a tela recebe, e uma afirmacao parcial
 * deixaria passar justamente o campo que ninguem lembrou de conferir.
 *
 * A traducao e trocada por uma funcao deterministica (`PT:<texto>`): o que se
 * caracteriza aqui e QUAL texto vai para qual campo, e nao a API MyMemory.
 */
const mockSend = jest.fn();

// O SDK e mockado INTEIRO, sem `requireActual` -- mesmo motivo registrado em
// `chat-assistant/__tests__/tools.test.ts` (pacote ESM carregado como CJS).
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
  ScanCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
jest.mock('../translateClient', () => ({
  translateToPortuguese: async (texto?: string | null) => (texto ? `PT:${texto}` : null),
}));

import { handler } from '../handler';

const DATASET = {
  specificRecommendations: [
    {
      id: 1,
      title: 'Breast Cancer: Screening',
      grade: 'B',
      gradeVer: 0,
      sex: 'female',
      ageRange: [40, 74],
      text: 'Biennial screening mammography for women aged 40 to 74 years.',
      rationale: 'Adequate evidence of benefit.',
      general: '1',
    },
    {
      id: 2,
      title: 'Prostate Cancer: Screening',
      grade: 'C',
      gradeVer: 0,
      sex: 'male',
      ageRange: [55, 69],
      text: 'Individual decision about PSA-based screening.',
      general: '2',
    },
    {
      id: 3,
      title: 'Hypertension in Adults: Screening',
      grade: 'A',
      gradeVer: 1,
      ageRange: [18, 99],
      text: 'Screening for hypertension in adults.',
    },
  ],
  grades: {
    A: ['grade A v0', 'grade A v1'],
    B: ['grade B v0'],
    C: ['grade C v0'],
  },
  generalRecommendations: {
    '1': { topic: 'Breast Cancer', topicYear: '2024' },
    '2': { topic: 'Prostate Cancer', topicYear: '2018' },
  },
  lastUpdated: '2026-01-15',
};

/** Data de nascimento de quem faz `anos` hoje -- o filtro calcula a idade
 *  contra o relogio real, e uma data fixa envelheceria o teste. */
function nascidoHa(anos: number): string {
  const hoje = new Date();
  return `${hoje.getFullYear() - anos}-01-01`;
}

const IDENTIDADE = { identity: { sub: 's-1', username: 'u-1' } };
const mockFetch = jest.fn();

beforeAll(() => {
  process.env.USER_PROFILE_TABLE_NAME = 't-profile';
  process.env.USPSTF_API_KEY = 'chave-de-teste';
  global.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(() => {
  mockSend.mockReset();
  mockFetch.mockReset().mockResolvedValue({ ok: true, json: async () => DATASET });
});

describe('get-prevention-recommendations -- saida de hoje, antes do refactor do E7', () => {
  it('sem identidade, recusa', async () => {
    await expect(handler({})).rejects.toThrow('Usuario nao autenticado.');
  });

  it('sem perfil, devolve profileComplete false e nao consulta a USPSTF', async () => {
    mockSend.mockResolvedValue({ Items: [] });

    await expect(handler(IDENTIDADE)).resolves.toEqual({
      recommendations: [],
      lastUpdated: '',
      profileComplete: false,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('le o perfil filtrando pelo dono da identidade', async () => {
    mockSend.mockResolvedValue({ Items: [] });

    await handler(IDENTIDADE);

    expect(mockSend.mock.calls[0][0].input).toMatchObject({
      TableName: 't-profile',
      ExpressionAttributeValues: { ':owner': 's-1::u-1' },
    });
  });

  it('mulher de 45 anos: so o que casa, com todos os campos que a tela recebe', async () => {
    mockSend.mockResolvedValue({
      Items: [{ birthDate: nascidoHa(45), sex: 'Feminino', weightKg: 70, heightCm: 165 }],
    });

    await expect(handler(IDENTIDADE)).resolves.toEqual({
      recommendations: [
        {
          id: 1,
          grade: 'B',
          gradeText: 'grade B v0',
          gradeTextPt: 'PT:grade B v0',
          title: 'Breast Cancer: Screening',
          titlePt: 'PT:Breast Cancer: Screening',
          text: 'Biennial screening mammography for women aged 40 to 74 years.',
          textPt: 'PT:Biennial screening mammography for women aged 40 to 74 years.',
          rationale: 'Adequate evidence of benefit.',
          rationalePt: 'PT:Adequate evidence of benefit.',
          topic: 'Breast Cancer',
          citationYear: '2024',
          ageMin: 40,
          ageMax: 74,
          sex: 'female',
          bmi: null,
        },
        {
          id: 3,
          grade: 'A',
          gradeText: 'grade A v1',
          gradeTextPt: 'PT:grade A v1',
          title: 'Hypertension in Adults: Screening',
          titlePt: 'PT:Hypertension in Adults: Screening',
          text: 'Screening for hypertension in adults.',
          textPt: 'PT:Screening for hypertension in adults.',
          rationale: null,
          rationalePt: null,
          topic: null,
          citationYear: null,
          ageMin: 18,
          ageMax: 99,
          sex: null,
          bmi: null,
        },
      ],
      lastUpdated: '2026-01-15',
      profileComplete: true,
    });
  });

  it('a chamada a USPSTF leva a chave, e nenhum dado do perfil', async () => {
    mockSend.mockResolvedValue({
      Items: [{ birthDate: nascidoHa(45), sex: 'Feminino', weightKg: 70, heightCm: 165 }],
    });

    await handler(IDENTIDADE);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('key=chave-de-teste');
    expect(String(url)).not.toMatch(/Feminino|female|45|165|70/);
  });

  it('falha da USPSTF chega a tela como erro, sem traducao parcial', async () => {
    mockSend.mockResolvedValue({ Items: [{ birthDate: nascidoHa(45), sex: 'Feminino' }] });
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    await expect(handler(IDENTIDADE)).rejects.toThrow('status 503');
  });
});

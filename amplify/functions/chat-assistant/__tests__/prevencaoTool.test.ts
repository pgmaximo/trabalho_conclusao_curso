/**
 * `consultar_prevencao` (E7). O que estes testes garantem, na ordem em que um
 * erro custaria mais caro:
 *
 * 1. Nenhum dado de quem pergunta sai do aplicativo: a busca do dataset recebe
 *    so a chave (CA-9).
 * 2. Toda ausencia de dado e resposta, e cada uma tem a sua explicacao -- "sem
 *    perfil", "fonte fora do ar" e "nada casa" pedem acoes diferentes da
 *    pessoa, e uma explicacao unica para as tres mentiria em duas.
 * 3. A lista do chat sai do MESMO filtro da tela (CA-3).
 * 4. A saida diz quais filtros foram aplicados, porque sem sexo ou sem IMC a
 *    lista pode trazer recomendacoes de outros grupos (CA-11).
 */
const mockSend = jest.fn();
const mockObterDataset = jest.fn();

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
jest.mock('../../get-prevention-recommendations/translateClient', () => ({
  translateToPortuguese: async (texto?: string | null) => texto ?? null,
}));
jest.mock('../tools/prevencaoDataset', () => ({
  obterDataset: (...a: unknown[]) => mockObterDataset(...a),
}));

import type { UspstfDataset } from '../../uspstf-shared/uspstfClient';
import { filterRecommendations } from '../../uspstf-shared/uspstfFilter';
import type { ChatIdentity } from '../auth';
import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { handler as handlerDaTela } from '../../get-prevention-recommendations/handler';
import { prevencaoTool } from '../tools/prevencao';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const DATASET: UspstfDataset = {
  specificRecommendations: [
    { id: 1, title: 'Breast Cancer: Screening', grade: 'B', gradeVer: 0, sex: 'female', ageRange: [40, 74], text: 'Mammography.', general: '1' },
    { id: 2, title: 'Prostate Cancer: Screening', grade: 'C', gradeVer: 0, sex: 'male', ageRange: [55, 69], text: 'PSA.' },
    { id: 3, title: 'Hypertension: Screening', grade: 'A', gradeVer: 0, ageRange: [18, 99], text: 'Blood pressure.' },
    { id: 4, title: 'Obesity: Behavioral Counseling', grade: 'B', gradeVer: 0, ageRange: [18, 99], bmi: 'OB', text: 'Counseling.' },
    { id: 5, title: 'Pediatric Vision: Screening', grade: 'B', gradeVer: 0, ageRange: [3, 5], text: 'Vision.' },
  ],
  grades: { A: ['Recomenda.'], B: ['Recomenda.'], C: ['Seletivo.'] },
  generalRecommendations: { '1': { topic: 'Breast Cancer', topicYear: '2024' } },
  lastUpdated: '2026-01-15',
};

function nascidoHa(anos: number): string {
  return `${new Date().getFullYear() - anos}-01-01`;
}

const MULHER_45 = { birthDate: nascidoHa(45), sex: 'Feminino', weightKg: 70, heightCm: 165 };

function comPerfil(perfil: Record<string, unknown> | null) {
  mockSend.mockResolvedValue({ Items: perfil ? [perfil] : [] });
}

const run = (input: unknown = {}) => prevencaoTool.run(input, IDENTIDADE) as Promise<Record<string, unknown>>;

beforeEach(() => {
  process.env.USER_PROFILE_TABLE_NAME = 't-profile';
  process.env.USPSTF_API_KEY = 'chave-de-teste';
  mockSend.mockReset();
  mockObterDataset.mockReset().mockResolvedValue(DATASET);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('consultar_prevencao -- contrato da ferramenta', () => {
  it('e somente leitura, sem entrada, com descricao que diz o que NAO faz', () => {
    expect(prevencaoTool.name).toBe('consultar_prevencao');
    expect(prevencaoTool.readOnly).toBe(true);
    expect(prevencaoTool.inputSchema.safeParse({}).success).toBe(true);
    expect(prevencaoTool.description).toMatch(/NÃO indica/);
    expect(prevencaoTool.description).toMatch(/NÃO diz se/);
  });

  // O caminho pelo despachante (`runTool` recusando antes de qualquer
  // leitura) e afirmado sobre a lista inteira em `tools.test.ts`.
  it.each([[{ owner: 'outro::dono' }], [{ idade: 50 }], [{ sexo: 'Feminino' }]])(
    'entrada com campo a mais (%p) e recusada pelo schema',
    (entrada) => {
      expect(prevencaoTool.inputSchema.safeParse(entrada).success).toBe(false);
    },
  );

  it('le o perfil filtrando pelo dono do token', async () => {
    comPerfil(MULHER_45);

    await run();

    expect(mockSend.mock.calls[0][0].input).toMatchObject({
      TableName: 't-profile',
      ExpressionAttributeValues: { ':owner': 's-1::u-1' },
    });
  });
});

describe('consultar_prevencao -- ausencia de dado e resposta', () => {
  it('sem perfil, explica e nem consulta a fonte', async () => {
    comPerfil(null);

    const saida = await run();

    expect(saida).toMatchObject({ disponivel: false });
    expect(saida.explicacao).toMatch(/perfil de saúde/);
    expect(mockObterDataset).not.toHaveBeenCalled();
  });

  it.each([['lixo'], [''], [undefined]])(
    'data de nascimento invalida (%p) e recusada, em vez de devolver a lista inteira',
    async (birthDate) => {
      comPerfil({ ...MULHER_45, birthDate });

      const saida = await run();

      expect(saida).toMatchObject({ disponivel: false });
      expect(saida.explicacao).toMatch(/data de nascimento/);
      expect(mockObterDataset).not.toHaveBeenCalled();
    },
  );

  it('fonte fora do ar vira ausencia de dado, sem lancar e sem termo tecnico', async () => {
    comPerfil(MULHER_45);
    mockObterDataset.mockRejectedValue(new Error('Falha ao consultar a API do USPSTF (status 503).'));

    const saida = await run();

    expect(saida).toMatchObject({ disponivel: false });
    expect(saida.explicacao).toMatch(/tela de Prevenção/);
    expect(String(saida.explicacao)).not.toMatch(/USPSTF|HTTP|status|503|API/);
  });

  it('chave ausente e tratada como fonte fora do ar', async () => {
    comPerfil(MULHER_45);
    delete process.env.USPSTF_API_KEY;

    const saida = await run();

    expect(saida).toMatchObject({ disponivel: false });
    expect(saida.explicacao).toMatch(/tela de Prevenção/);
    expect(mockObterDataset).not.toHaveBeenCalled();
  });

  it('nada casa com o perfil: explicacao propria, diferente da de falha', async () => {
    comPerfil({ ...MULHER_45, birthDate: nascidoHa(1) });
    mockObterDataset.mockResolvedValue({ ...DATASET, specificRecommendations: [DATASET.specificRecommendations[1]] });

    const saida = await run();
    comPerfil(MULHER_45);
    mockObterDataset.mockRejectedValue(new Error('x'));
    const falha = await run();

    expect(saida).toMatchObject({ disponivel: false });
    expect(saida.explicacao).not.toBe(falha.explicacao);
    expect(saida.explicacao).toMatch(/nenhuma recomendação/);
  });
});

describe('consultar_prevencao -- o caminho feliz', () => {
  it('a busca do dataset recebe so a chave: nenhum dado da pessoa sai do app', async () => {
    comPerfil(MULHER_45);

    await run();

    expect(mockObterDataset).toHaveBeenCalledTimes(1);
    expect(mockObterDataset.mock.calls[0]).toEqual(['chave-de-teste']);
  });

  it('mulher de 45 anos com perfil completo: todos os filtros aplicados', async () => {
    comPerfil(MULHER_45);

    const saida = await run();

    expect(saida).toMatchObject({
      disponivel: true,
      fonte: 'USPSTF',
      filtrosAplicados: { idade: true, sexo: true, imc: true },
    });
  });

  it('a lista do chat e a do filtro da tela, nem mais nem menos (CA-3)', async () => {
    comPerfil(MULHER_45);

    const saida = await run();

    const daTela = filterRecommendations(DATASET, MULHER_45).map((r) => r.title).sort();
    const doChat = (saida.recomendacoes as Array<{ titulo: string }>).map((r) => r.titulo).sort();
    expect(doChat).toEqual(daTela);
    expect(doChat).toEqual(['Breast Cancer: Screening', 'Hypertension: Screening']);
  });

  it('sexo "Outro": filtro de sexo nao aplicado, e a lista traz os dois sexos', async () => {
    comPerfil({ ...MULHER_45, birthDate: nascidoHa(60), sex: 'Outro' });

    const saida = await run();

    expect(saida.filtrosAplicados).toEqual({ idade: true, sexo: false, imc: true });
    const titulos = (saida.recomendacoes as Array<{ titulo: string }>).map((r) => r.titulo);
    expect(titulos).toEqual(expect.arrayContaining(['Breast Cancer: Screening', 'Prostate Cancer: Screening']));
  });

  it('peso que nao e numero finito conta como ausente, e nao vira IMC', async () => {
    comPerfil({ ...MULHER_45, weightKg: Number.POSITIVE_INFINITY });

    const saida = await run();

    expect(saida.filtrosAplicados).toEqual({ idade: true, sexo: true, imc: false });
  });

  it('sem peso: filtro de IMC nao aplicado, e a recomendacao de obesidade entra', async () => {
    comPerfil({ ...MULHER_45, weightKg: undefined });

    const saida = await run();

    expect(saida.filtrosAplicados).toEqual({ idade: true, sexo: true, imc: false });
    expect((saida.recomendacoes as Array<{ titulo: string }>).map((r) => r.titulo)).toContain(
      'Obesity: Behavioral Counseling',
    );
  });

  it('a saida nao carrega nenhum dado do perfil nem calculo sobre ele', async () => {
    comPerfil({ ...MULHER_45, weightKg: 81.3, heightCm: 167 });

    const serializada = JSON.stringify(await run());

    expect(serializada).not.toMatch(/birthDate|weightKg|heightCm|Feminino|81\.3|167|"idade":\s*\d|"imc":\s*\d/);
  });
});

describe('consultar_prevencao -- modo degradado (D31)', () => {
  it('mostra nota, titulo e ano de cada recomendacao, sem texto longo', async () => {
    comPerfil(MULHER_45);
    const saida = await run();

    const bloco = prevencaoTool.renderDegraded?.(saida);

    expect(bloco).toEqual({
      titulo: 'Recomendações gerais de prevenção (USPSTF)',
      linhas: [
        'Nota A (a fonte recomenda) · Hypertension: Screening',
        'Nota B (a fonte recomenda) · Breast Cancer: Screening · 2024',
      ],
      citacoes: [],
    });
  });

  it('nenhuma linha quebra as regras de linguagem', async () => {
    comPerfil(MULHER_45);
    const bloco = prevencaoTool.renderDegraded?.(await run());

    // Operacional: a R2 (encaminhamento) e do texto montado pelo degradado,
    // nao de cada linha. O que se prova aqui e R1, R3 e R4 sobre as linhas.
    expect(bloco?.linhas.length).toBeGreaterThan(0);
    for (const linha of bloco?.linhas ?? []) {
      expect(checkLanguageRules(linha, { questionKind: 'operacional', temOrigem: false })).toEqual({ ok: true });
    }
  });

  it('nota D sai com o que ela quer dizer, para nao ser lida como indicacao', () => {
    const bloco = prevencaoTool.renderDegraded?.({
      disponivel: true,
      recomendacoes: [
        { nota: 'D', titulo: 'Prostate Cancer: Screening', ano: '2018' },
        { nota: 'I', titulo: 'Vitamin D: Screening', ano: null },
        { nota: 'X', titulo: 'Outra', ano: null },
      ],
    });

    expect(bloco?.linhas).toEqual([
      'Nota D (a fonte recomenda não fazer) · Prostate Cancer: Screening · 2018',
      'Nota I (a fonte considera a evidência insuficiente) · Vitamin D: Screening',
      'Nota X · Outra',
    ]);
  });

  it.each([
    ['sem dado', { disponivel: false, explicacao: 'x' }],
    ['lista vazia', { disponivel: true, recomendacoes: [] }],
    ['saida estranha', null],
  ])('devolve null quando nao ha o que mostrar (%s)', (_caso, saida) => {
    expect(prevencaoTool.renderDegraded?.(saida)).toBeNull();
  });
});

describe('consultar_prevencao -- a mesma lista da tela (CA-3)', () => {
  it('para o mesmo perfil e dataset, o chat traz as mesmas recomendacoes que a Lambda da tela', async () => {
    // A Lambda da tela rodada de verdade, com a traducao trocada e o mesmo
    // banco simulado. A ORDEM difere de proposito (o chat ordena por nota);
    // o que tem de ser igual e o conjunto.
    comPerfil(MULHER_45);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => DATASET }) as unknown as typeof fetch;

    const daTela = await handlerDaTela({ identity: { sub: 's-1', username: 'u-1' } });
    const doChat = await run();

    const titulosDaTela = daTela.recommendations.map((r) => r.title).sort();
    const titulosDoChat = (doChat.recomendacoes as Array<{ titulo: string }>).map((r) => r.titulo).sort();
    expect(titulosDoChat.length).toBeGreaterThan(0);
    expect(titulosDoChat).toEqual(titulosDaTela);
  });
});

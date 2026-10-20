/**
 * Resumo do arquivo:
 * A ferramenta `consultar_receitas` (E4) como o despachante a ve: o que ela
 * recusa na entrada, como le (os documentos pela porta do dono, os itens pelo
 * indice, uma consulta por receita e todas juntas), o que faz quando uma
 * leitura falha, e o que a verificacao de linguagem faz com as respostas
 * que ela provoca. As regras da saida estao em `receitasSaida.test.ts`.
 */
const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
  class Comando {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  return {
    DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
    GetCommand: class GetCommand extends Comando {},
    QueryCommand: class QueryCommand extends Comando {},
    ScanCommand: class ScanCommand extends Comando {},
  };
});
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import type { ChatIdentity } from '../auth';
import { buildDegradedAnswer } from '../degradedAnswer';
import { CHAT_TOOLS, runTool } from '../tools';
import { receitasTool } from '../tools/receitas';
import type { SaidaDeReceitas } from '../tools/receitasSaida';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const receita = (id: string, data: string) => ({
  id,
  owner: 's-1::u-1',
  documentType: 'prescription',
  documentName: `Receita ${id}`,
  documentDate: data,
  extractionStatus: 'SUCCEEDED',
});
const item = (documentId: string, medicationLabel: string) => ({
  documentId,
  owner: 's-1::u-1',
  medicationLabel,
  dose: '50',
  unit: 'mg',
  frequency: 'de 8 em 8 horas',
  reviewStatus: 'AUTO',
});

type Enviado = { constructor: { name: string }; input: Record<string, unknown> };
const enviados = () => mockSend.mock.calls.map(([c]) => c as Enviado);

/** O Scan devolve os documentos; cada Query, os itens daquele documento. */
function banco(documentos: Record<string, unknown>[], itens: Record<string, unknown>[]) {
  mockSend.mockImplementation(async (c: Enviado) => {
    if (c.constructor.name === 'ScanCommand') return { Items: documentos };
    const chave = (c.input.ExpressionAttributeValues as Record<string, string>)[':chave'];
    return { Items: itens.filter((i) => i.documentId === chave) };
  });
}

beforeAll(() =>
  Object.assign(process.env, { MEDICAL_DOCUMENT_TABLE_NAME: 't-doc', PRESCRIPTION_ITEM_TABLE_NAME: 't-presc' }),
);
beforeEach(() => mockSend.mockReset());

describe('consultar_receitas (E4)', () => {
  it('esta no registro, so le, e recusa qualquer campo na entrada (CA-1)', async () => {
    expect(CHAT_TOOLS).toContain(receitasTool);
    expect(receitasTool.readOnly).toBe(true);
    expect(receitasTool.valoresCadastrados).toBeUndefined();

    const saida = await runTool('consultar_receitas', { owner: 'x' }, IDENTIDADE);

    expect(saida).toEqual({ erro: 'Os argumentos da consulta não são válidos.' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('le os documentos pela porta do dono e os itens pelo indice, um por receita (CA-9)', async () => {
    banco(
      [receita('r1', '2026-10-10'), receita('r2', '2026-09-01'), { id: 'e1', documentType: 'exam', documentDate: '2026-10-11' }],
      [item('r1', 'Losartana 50mg'), item('r2', 'Amoxicilina')],
    );

    const saida = (await runTool('consultar_receitas', {}, IDENTIDADE)) as SaidaDeReceitas;

    const scans = enviados().filter((c) => c.constructor.name === 'ScanCommand');
    const queries = enviados().filter((c) => c.constructor.name === 'QueryCommand');
    expect(scans.map((c) => c.input.TableName)).toEqual(['t-doc']);
    expect(queries).toHaveLength(2);
    for (const { input } of queries) {
      expect(input).toMatchObject({ TableName: 't-presc', IndexName: 'prescriptionItemsByDocumentId' });
      expect(input.ExpressionAttributeValues).toMatchObject({ ':owner': 's-1::u-1' });
    }
    expect(saida.receitas.map((r) => [r.documentId, r.itens.map((i) => i.remedio)])).toEqual([
      ['r1', ['Losartana']],
      ['r2', ['Amoxicilina']],
    ]);
  });

  it('as consultas de itens saem juntas, sem esperar uma pela outra', async () => {
    const pendentes: Array<() => void> = [];
    mockSend.mockImplementation((c: Enviado) => {
      if (c.constructor.name === 'ScanCommand') {
        return Promise.resolve({ Items: [receita('r1', '2026-10-10'), receita('r2', '2026-09-01')] });
      }
      return new Promise((resolve) => pendentes.push(() => resolve({ Items: [] })));
    });

    const execucao = runTool('consultar_receitas', {}, IDENTIDADE);
    await new Promise((r) => setImmediate(r));

    expect(pendentes).toHaveLength(2);
    pendentes.forEach((resolver) => resolver());
    await execucao;
  });

  it('uma consulta de itens que falha marca so aquela receita; as outras saem (risco 4 do E4)', async () => {
    mockSend.mockImplementation(async (c: Enviado) => {
      if (c.constructor.name === 'ScanCommand') return { Items: [receita('r1', '2026-10-10'), receita('r2', '2026-09-01')] };
      const chave = (c.input.ExpressionAttributeValues as Record<string, string>)[':chave'];
      if (chave === 'r2') throw new Error('ProvisionedThroughputExceededException');
      return { Items: [item('r1', 'Losartana')] };
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const saida = (await runTool('consultar_receitas', {}, IDENTIDADE)) as SaidaDeReceitas;

    expect(saida.receitas.map((r) => [r.documentId, r.itens.map((i) => i.remedio), r.itensIndisponiveis ?? false])).toEqual([
      ['r1', ['Losartana'], false],
      ['r2', [], true],
    ]);
    // O detalhe tecnico fica no log, nunca na saida.
    expect(JSON.stringify(saida)).not.toContain('Provisioned');
  });

  it('se a leitura das receitas falha, ai sim o erro generico', async () => {
    mockSend.mockRejectedValue(new Error('AccessDeniedException'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(await runTool('consultar_receitas', {}, IDENTIDADE)).toEqual({ erro: 'Não foi possível consultar esse dado agora.' });
  });

  it('sem receita, nenhuma consulta de itens', async () => {
    banco([{ id: 'e1', documentType: 'exam', documentDate: '2026-10-11' }], []);

    const saida = (await runTool('consultar_receitas', {}, IDENTIDADE)) as SaidaDeReceitas;

    expect(saida.disponivel).toBe(false);
    expect(enviados().filter((c) => c.constructor.name === 'QueryCommand')).toHaveLength(0);
  });
});

describe('a linguagem das respostas sobre receita (CA-15)', () => {
  const tipos = ['clinica', 'operacional'] as const;

  it('dizer os nomes lidos da foto, mandar conferir e encaminhar, passa', () => {
    // O encaminhamento e o da R2: "o que o medico receitou" e pergunta clinica,
    // e a R2 reconhece "medico", nao "quem receitou" -- o prompt pede esta
    // mesma frase (desvio registrado no plan.md, secao 9).
    const texto =
      'Na receita de 10/10 aparecem losartana e hidroclorotiazida, lidas automaticamente da foto; confira no papel. Como usar, o médico que receitou ou o farmacêutico orienta.';
    for (const questionKind of tipos) {
      expect(checkLanguageRules(texto, { questionKind, temOrigem: false })).toEqual({ ok: true });
    }
  });

  it.each(['Tome losartana de 8 em 8 horas, como diz a receita.', 'A receita diz 50 mg de losartana.'])(
    'repetir a posologia do papel e barrado pela R3: %s',
    (texto) => {
      for (const questionKind of tipos) {
        const resultado = checkLanguageRules(texto, { questionKind, temOrigem: false });
        expect(resultado.ok).toBe(false);
        expect(JSON.stringify(resultado)).toContain('R3');
      }
    },
  );

  it('o modo degradado passa pelas regras de linguagem (CA-14)', async () => {
    banco([receita('r1', '2026-10-10')], [item('r1', 'Losartana 50mg')]);
    const output = await runTool('consultar_receitas', {}, IDENTIDADE);

    const resposta = buildDegradedAnswer([{ name: 'consultar_receitas', output }])!;

    expect(resposta.texto).toContain('Losartana');
    expect(resposta.texto).not.toMatch(/50|8 em 8/);
    for (const questionKind of tipos) {
      expect(checkLanguageRules(resposta.texto, { questionKind, temOrigem: false })).toEqual({ ok: true });
    }
  });
});

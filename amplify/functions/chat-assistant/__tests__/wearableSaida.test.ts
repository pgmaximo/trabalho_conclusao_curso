/**
 * O que `consultar_wearable` acrescenta no E6: a lista das importacoes (6.1) e
 * a analise da tela recortada (D6.2 = A). Modulo puro.
 */
jest.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: () => ({}) } }));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { caminhoDaTela } from '../mapaDoApp';
import { analiseDaTela, listarImportacoes } from '../tools/wearableSaida';

const RESUMO_OK = JSON.stringify({ metrics: [] });

const linha = (id: string, createdAt: string, status: string | null, extra: Record<string, unknown> = {}) => ({
  id,
  createdAt,
  status,
  periodStart: '2026-09-01',
  periodEnd: '2026-10-12',
  metricsJson: RESUMO_OK,
  ...extra,
});

describe('listarImportacoes (6.1)', () => {
  it('sem importacao: lista vazia', () => {
    expect(listarImportacoes([])).toEqual({ importacoes: [], importacoesOmitidas: 0 });
  });

  it('uma pronta: data, situacao e periodo', () => {
    expect(listarImportacoes([linha('a', '2026-10-13T10:00:00Z', 'READY')])).toEqual({
      importacoes: [
        { importadaEm: '2026-10-13', situacao: 'pronta', periodo: { inicio: '2026-09-01', fim: '2026-10-12' } },
      ],
      importacoesOmitidas: 0,
    });
  });

  it('N importacoes: as 5 mais recentes, e as outras contadas', () => {
    const linhas = [
      linha('1', '2026-01-01T12:00:00Z', 'READY'),
      linha('2', '2026-02-01T12:00:00Z', 'FAILED', { periodStart: null, periodEnd: null }),
      linha('3', '2026-03-01T12:00:00Z', 'READY', { metricsJson: '{' }),
      linha('4', '2026-04-01T12:00:00Z', 'PROCESSING', { periodStart: null, periodEnd: null }),
      linha('5', '2026-05-01T12:00:00Z', null, { periodStart: null, periodEnd: null }),
      linha('6', '2026-06-01T12:00:00Z', 'READY'),
      linha('7', '2026-07-01T12:00:00Z', 'PENDING', { periodStart: null, periodEnd: null }),
    ];
    const { importacoes, importacoesOmitidas } = listarImportacoes(linhas);
    expect(importacoesOmitidas).toBe(2);
    expect(importacoes.map((i) => [i.importadaEm, i.situacao])).toEqual([
      ['2026-07-01', 'em processamento'],
      ['2026-06-01', 'pronta'],
      ['2026-05-01', 'em processamento'],
      ['2026-04-01', 'em processamento'],
      ['2026-03-01', 'não pôde ser lida'],
    ]);
    expect(importacoes[0].periodo).toBeNull();
  });

  it('READY sem metricsJson e "pronta", como consultar_wearable a trata (revisao)', () => {
    const { importacoes } = listarImportacoes([linha('r', '2026-02-01T00:00:00Z', 'READY', { metricsJson: null })]);
    expect(importacoes[0].situacao).toBe('pronta');
  });

  it('a data da importacao e a de Brasilia, e nao a do UTC (revisao)', () => {
    const { importacoes } = listarImportacoes([linha('n', '2026-10-13T01:00:00Z', 'READY')]);
    expect(importacoes[0].importadaEm).toBe('2026-10-12');
  });

  it('FAILED e "nao concluiu"', () => {
    const { importacoes } = listarImportacoes([linha('f', '2026-02-01T00:00:00Z', 'FAILED')]);
    expect(importacoes[0].situacao).toBe('não concluiu');
  });
});

describe('analiseDaTela (D6.2 = A)', () => {
  const INSIGHTS = JSON.stringify({
    resumo: 'Seu sono ficou estável no período.',
    destaques: [{ metrica: 'Sono', valor: '6 h 40 min', comparacao: 'COMPARACAO-SECRETA', tom: 'neutro' }],
    pontosDeAtencao: [
      { titulo: 'Poucos registros de estresse', descricao: 'DESCRICAO-SECRETA', severidade: 'informativo', metricas: [] },
    ],
    padroes: [{ titulo: 'Mais passos no fim de semana', descricao: 'DESCRICAO-SECRETA', evidencia: 'EVIDENCIA-SECRETA', confianca: 'media' }],
    sugestoes: [
      { titulo: 'SUGESTAO-SECRETA', acao: 'ACAO-SECRETA', porque: 'PORQUE-SECRETA', esforco: 'baixo' },
      { titulo: 'SUGESTAO-SECRETA', acao: 'ACAO-SECRETA', porque: 'PORQUE-SECRETA', esforco: 'medio' },
    ],
    perguntasParaOMedico: ['PERGUNTA-SECRETA'],
    limitacoes: 'Os dados vêm de um só aparelho.',
  });

  it('o resumo, os titulos, as limitacoes, as contagens e onde ver', () => {
    expect(analiseDaTela(INSIGHTS, ['AVISO-SECRETO', 'outro'])).toEqual({
      resumo: 'Seu sono ficou estável no período.',
      destaques: ['Sono'],
      pontosDeAtencao: ['Poucos registros de estresse'],
      padroes: ['Mais passos no fim de semana'],
      limitacoes: 'Os dados vêm de um só aparelho.',
      textoCortado: false,
      sugestoes: 2,
      perguntasParaOMedico: 1,
      avisosDeLeitura: 2,
      ondeVer: caminhoDaTela('health-data'),
    });
  });

  it('nenhum texto fora da D6.2 sai (C3.2)', () => {
    expect(JSON.stringify(analiseDaTela(INSIGHTS, ['AVISO-SECRETO']))).not.toMatch(/SECRET[AO]/);
  });

  it('textos longos sao cortados, e o corte e dito (revisao)', () => {
    const longa = JSON.stringify({
      resumo: 'r'.repeat(600),
      destaques: [],
      pontosDeAtencao: [],
      padroes: [],
      sugestoes: [],
      perguntasParaOMedico: [],
      limitacoes: 'l'.repeat(1400),
    });
    const a = analiseDaTela(longa, [])!;
    expect(a.resumo).toHaveLength(300);
    expect(a.limitacoes).toHaveLength(200);
    expect(a.textoCortado).toBe(true);
    expect(analiseDaTela(INSIGHTS, [])!.textoCortado).toBe(false);
  });

  it('no pior caso, a analise e a lista cabem em 2.000 caracteres (spec, secao 5: acrescimo abaixo de 500 tokens)', () => {
    const pior = JSON.stringify({
      resumo: 'r'.repeat(600),
      destaques: Array.from({ length: 4 }, () => ({ metrica: 'm'.repeat(80), valor: 'v', comparacao: 'c', tom: 'neutro' })),
      pontosDeAtencao: Array.from({ length: 4 }, () => ({ titulo: 't'.repeat(120), descricao: 'd', severidade: 'atencao', metricas: [] })),
      padroes: Array.from({ length: 3 }, () => ({ titulo: 't'.repeat(120), descricao: 'd', evidencia: 'e', confianca: 'alta' })),
      sugestoes: [],
      perguntasParaOMedico: [],
      limitacoes: 'l'.repeat(1400),
    });
    const linhas = Array.from({ length: 7 }, (_, i) => linha(String(i), `2026-0${i + 1}-01T12:00:00Z`, 'READY'));
    const acrescimo = { dadosAte: '2026-10-12', ...listarImportacoes(linhas), analiseDaTela: analiseDaTela(pior, ['a', 'b']) };
    expect(JSON.stringify(acrescimo).length).toBeLessThan(2000);
  });

  it('sem avisos, a contagem e zero', () => {
    expect(analiseDaTela(INSIGHTS, null)?.avisosDeLeitura).toBe(0);
  });

  it.each([['{'], [null], ['{}'], [JSON.stringify({ resumo: 42 })]])('analise ilegivel (%p): nula (C3.3)', (bruto) => {
    expect(analiseDaTela(bruto, [])).toBeNull();
  });
});

/**
 * Bloco 11 -- as leituras das partes de um PDF dividido viram UMA leitura (E5).
 *
 * Cada parte e lida sozinha, e o modelo numera as paginas a partir de 1 dentro
 * dela. A pagina 2 da parte que comeca na 4 e a pagina 5 do documento -- e e
 * pela pagina do DOCUMENTO que a pessoa confere no papel.
 */
import type { RequestExtractionResult } from '../bedrockClient';
import type { RawLabResult } from '../extractionSchema';
import { juntarPartes } from '../juntarPartes';

function linha(analyteLabel: string, sourcePage: number | null): RawLabResult {
  return {
    analyteLabel,
    rawValue: '10',
    rawUnit: 'mg/dL',
    rawReferenceLow: null,
    rawReferenceHigh: null,
    collectedAt: '2025-10-04',
    sourcePage,
    confidence: 0.95,
  } as RawLabResult;
}

function lida(
  labResults: RawLabResult[],
  extra: { warnings?: string[]; laboratorio?: string; input?: number; output?: number } = {},
): RequestExtractionResult {
  return {
    ok: true,
    result: {
      documentKind: 'exam',
      labResults,
      prescriptionItems: [],
      warnings: extra.warnings ?? [],
      ...(extra.laboratorio ? { laboratorio: extra.laboratorio } : {}),
    },
    usage: { input: extra.input ?? 100, output: extra.output ?? 10 },
  };
}

describe('juntarPartes', () => {
  it('uma parte so passa como veio', () => {
    const saida = lida([linha('Glicose', 2)], { warnings: ['aviso'] });
    expect(juntarPartes([{ primeiraPagina: 1, ultimaPagina: 3, saida }])).toEqual(saida);
  });

  it('desloca a pagina de cada linha para a numeracao do documento inteiro', () => {
    const r = juntarPartes([
      { primeiraPagina: 1, ultimaPagina: 3, saida: lida([linha('Glicose', 2)]) },
      { primeiraPagina: 4, ultimaPagina: 6, saida: lida([linha('HDL', 2), linha('LDL', null)]) },
    ]);
    if (!r.ok) throw new Error('esperava sucesso');
    expect(r.result.labResults.map((l) => [l.analyteLabel, l.sourcePage])).toEqual([
      ['Glicose', 2],
      ['HDL', 5],
      ['LDL', null],
    ]);
  });

  it('soma o consumo das partes', () => {
    const r = juntarPartes([
      { primeiraPagina: 1, ultimaPagina: 2, saida: lida([], { input: 100, output: 10 }) },
      { primeiraPagina: 3, ultimaPagina: 4, saida: lida([], { input: 250, output: 30 }) },
    ]);
    if (!r.ok) throw new Error('esperava sucesso');
    expect(r.usage).toEqual({ input: 350, output: 40 });
  });

  it('o laboratorio e o da primeira parte que o trouxer', () => {
    const r = juntarPartes([
      { primeiraPagina: 1, ultimaPagina: 2, saida: lida([]) },
      { primeiraPagina: 3, ultimaPagina: 4, saida: lida([], { laboratorio: 'Laboratorio A' }) },
      { primeiraPagina: 5, ultimaPagina: 6, saida: lida([], { laboratorio: 'Outro' }) },
    ]);
    if (!r.ok) throw new Error('esperava sucesso');
    expect(r.result.laboratorio).toBe('Laboratorio A');
  });

  it('os avisos de cada parte dizem de que paginas sao', () => {
    // O modelo escreve "pagina 1" pensando na parte; sem o prefixo, a pessoa
    // procuraria na pagina errada do papel.
    const r = juntarPartes([
      { primeiraPagina: 1, ultimaPagina: 3, saida: lida([], { warnings: ['Pagina 1 ilegivel.'] }) },
      { primeiraPagina: 4, ultimaPagina: 6, saida: lida([], { warnings: ['Pagina 1 ilegivel.'] }) },
    ]);
    if (!r.ok) throw new Error('esperava sucesso');
    expect(r.result.warnings).toEqual([
      'Páginas 1 a 3: Pagina 1 ilegivel.',
      'Páginas 4 a 6: Pagina 1 ilegivel.',
    ]);
  });

  it('parte que falha nao derruba as outras, e o aviso diz quais paginas ficaram de fora', () => {
    const r = juntarPartes([
      { primeiraPagina: 1, ultimaPagina: 3, saida: lida([linha('Glicose', 1)]) },
      { primeiraPagina: 4, ultimaPagina: 6, saida: { ok: false, motivo: 'leitura-falhou' } },
    ]);
    if (!r.ok) throw new Error('esperava sucesso');
    expect(r.result.labResults).toHaveLength(1);
    expect(r.result.warnings).toContain(
      'As páginas 4 a 6 não puderam ser lidas. Tente ler o documento de novo.',
    );
  });

  it('todas falhando e a falha da primeira', () => {
    expect(
      juntarPartes([
        { primeiraPagina: 1, ultimaPagina: 3, saida: { ok: false, motivo: 'bloqueado-pelo-filtro' } },
        { primeiraPagina: 4, ultimaPagina: 6, saida: { ok: false, motivo: 'leitura-falhou' } },
      ]),
    ).toEqual({ ok: false, motivo: 'bloqueado-pelo-filtro' });
  });

  it('pagina unica e dita no singular', () => {
    const r = juntarPartes([
      { primeiraPagina: 1, ultimaPagina: 3, saida: lida([]) },
      { primeiraPagina: 4, ultimaPagina: 4, saida: { ok: false, motivo: 'leitura-falhou' } },
    ]);
    if (!r.ok) throw new Error('esperava sucesso');
    expect(r.result.warnings).toContain('A página 4 não pôde ser lida. Tente ler o documento de novo.');
  });
});

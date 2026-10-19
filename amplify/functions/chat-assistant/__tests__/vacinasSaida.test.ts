/**
 * Resumo do arquivo:
 * A saida de `consultar_vacinas` (E5): os campos que a carteira grava e o
 * reforco previsto. O reforco segue a D5.1 = A
 * (`specs/10-finalizacao-codigo/01-melhorias-ia/decisoes/E5-agenda-e-vacinas.md`):
 * so com o intervalo GRAVADO no registro, a partir da ultima dose aplicada
 * daquela vacina, e so quando nao ha dose pendente registrada para ela.
 *
 * As linhas usam os nomes de campo do schema publicado
 * (`amplify/data/schemas/vaccination.ts`).
 */
// `texto` mora em `ownerScopedRead.ts`, que importa o SDK (ver observacao.test.ts).
jest.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: () => ({}) } }));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { readFileSync } from 'fs';
import { join } from 'path';

import { MAX_DOSES_POR_LISTA, montarSaida, reforcosPrevistos, somarAnos } from '../tools/vacinasSaida';

type Linha = Record<string, unknown>;

function dose(campos: Linha): Linha {
  return { owner: 's-1::u-1', name: 'Dupla adulto (dT)', ...campos };
}

/** As tres doses da dT, a ultima com o intervalo gravado. */
const DT_COMPLETA: Linha[] = [
  dose({ id: 'd1', doseNumber: 1, appliedDate: '2004-01-10' }),
  dose({ id: 'd2', doseNumber: 2, appliedDate: '2004-03-10' }),
  dose({ id: 'd3', doseNumber: 3, appliedDate: '2024-03-10', recommendedIntervalYears: 10 }),
];

describe('somarAnos', () => {
  it('soma anos a uma data AAAA-MM-DD', () => {
    expect(somarAnos('2024-03-10', 10)).toBe('2034-03-10');
  });

  it('29/02 + 1 ano vira 01/03, como addYearsToDate do app (CA-13)', () => {
    expect(somarAnos('2028-02-29', 1)).toBe('2029-03-01');
  });

  it.each(['2026-02-30', '2024-03-10T00:00:00.000Z', '', '10/03/2024'])('data invalida devolve null: %p', (data) => {
    expect(somarAnos(data, 1)).toBeNull();
  });

  it('nao usa getters locais de Date: o resultado nao depende do TZ do processo (CA-13)', () => {
    // O Jest forca TZ=America/Sao_Paulo; so a leitura do fonte pega um getter
    // local que, na Lambda em UTC, mudaria o dia.
    const fonte = readFileSync(join(__dirname, '..', 'tools', 'vacinasSaida.ts'), 'utf-8');
    expect(fonte).not.toMatch(/\.(getFullYear|getMonth|getDate|setFullYear|setMonth|setDate)\(/);
  });
});

describe('reforcosPrevistos (D5.1 = A)', () => {
  it('calcula da ultima dose aplicada com o intervalo gravado (CA-9)', () => {
    expect(reforcosPrevistos(DT_COMPLETA)).toEqual([
      { vacina: 'Dupla adulto (dT)', ultimaDoseEm: '2024-03-10', intervaloAnos: 10, previstoPara: '2034-03-10' },
    ]);
  });

  it('com o intervalo so na 1a dose, nao ha reforco (CA-9)', () => {
    const linhas = [
      dose({ doseNumber: 1, appliedDate: '2004-01-10', recommendedIntervalYears: 10 }),
      dose({ doseNumber: 2, appliedDate: '2004-03-10' }),
      dose({ doseNumber: 3, appliedDate: '2024-03-10' }),
    ];
    expect(reforcosPrevistos(linhas)).toEqual([]);
  });

  it('dose pendente registrada da mesma vacina tem prioridade (CA-10)', () => {
    expect(reforcosPrevistos([...DT_COMPLETA, dose({ doseNumber: 4, dueDate: '2034-01-01' })])).toEqual([]);
  });

  it.each([undefined, 0, -5, 2.5, '10', Number.NaN])('intervalo invalido nao gera reforco: %p (CA-11)', (intervalo) => {
    const linhas = [dose({ doseNumber: 1, appliedDate: '2024-03-10', recommendedIntervalYears: intervalo })];
    expect(reforcosPrevistos(linhas)).toEqual([]);
  });

  it('ultima data aplicada invalida nao gera reforco (CA-11)', () => {
    const linhas = [dose({ doseNumber: 1, appliedDate: '2026-02-30', recommendedIntervalYears: 10 })];
    expect(reforcosPrevistos(linhas)).toEqual([]);
  });

  it('data aplicada com hora (dado legado) nao gera reforco e nao quebra', () => {
    const linhas = [dose({ doseNumber: 1, appliedDate: '2024-03-10T00:00:00.000Z', recommendedIntervalYears: 10 })];
    expect(() => reforcosPrevistos(linhas)).not.toThrow();
    expect(reforcosPrevistos(linhas)).toEqual([]);
  });

  it('legados de nomes diferentes nao se misturam (CA-12)', () => {
    const linhas = [
      dose({ name: 'Febre amarela', appliedDate: '2020-05-01', recommendedIntervalYears: 10 }),
      dose({ name: 'Hepatite B', doseNumber: 2, dueDate: '2026-12-01' }),
    ];
    expect(reforcosPrevistos(linhas)).toEqual([
      { vacina: 'Febre amarela', ultimaDoseEm: '2020-05-01', intervaloAnos: 10, previstoPara: '2030-05-01' },
    ]);
  });

  it('dose do catalogo e dose legado de mesmo nome sao vacinas diferentes, como na tela (CA-12)', () => {
    const linhas = [
      dose({ catalogId: 'dt', doseNumber: 3, appliedDate: '2024-03-10', recommendedIntervalYears: 10 }),
      dose({ doseNumber: 4, dueDate: '2030-01-01' }),
    ];
    expect(reforcosPrevistos(linhas)).toHaveLength(1);
  });

  it('empate de data se desfaz pelo maior numero de dose, sem depender da ordem do banco', () => {
    const linhas = [
      dose({ doseNumber: 2, appliedDate: '2024-03-10' }),
      dose({ doseNumber: 3, appliedDate: '2024-03-10', recommendedIntervalYears: 10 }),
    ];
    const esperado = [
      { vacina: 'Dupla adulto (dT)', ultimaDoseEm: '2024-03-10', intervaloAnos: 10, previstoPara: '2034-03-10' },
    ];
    expect(reforcosPrevistos(linhas)).toEqual(esperado);
    expect(reforcosPrevistos([...linhas].reverse())).toEqual(esperado);
  });

  it('a lista sai pela data prevista', () => {
    const linhas = [
      ...DT_COMPLETA,
      dose({ name: 'Febre amarela', appliedDate: '2020-05-01', recommendedIntervalYears: 10 }),
    ];
    expect(reforcosPrevistos(linhas).map((r) => r.previstoPara)).toEqual(['2030-05-01', '2034-03-10']);
  });
});

describe('revisão do E5: desempate e data torta', () => {
  it('aplicadas no mesmo dia saem pelo maior numero de dose, sem depender da ordem do banco', () => {
    const linhas = [
      dose({ name: 'Hepatite B', doseNumber: 1, appliedDate: '2026-04-01' }),
      dose({ name: 'Hepatite B', doseNumber: 2, appliedDate: '2026-04-01' }),
    ];
    const ordem = (l: Linha[]) => montarSaida(l).aplicadas.map((d) => d.numeroDaDose);
    expect(ordem(linhas)).toEqual([2, 1]);
    expect(ordem([...linhas].reverse())).toEqual([2, 1]);
  });

  it('com uma data aplicada fora do formato, a vacina nao tem reforco', () => {
    // "10/03/2024" ordena como texto ANTES de "2010-...", e o reforco sairia de
    // uma dose mais velha que a verdadeira ultima.
    const linhas = [
      dose({ doseNumber: 2, appliedDate: '2010-05-01', recommendedIntervalYears: 10 }),
      dose({ doseNumber: 3, appliedDate: '10/03/2024' }),
    ];
    expect(reforcosPrevistos(linhas)).toEqual([]);
  });
});

describe('montarSaida', () => {
  it('dose completa traz todos os campos gravados (CA-7)', () => {
    const saida = montarSaida([
      dose({
        name: 'Influenza (gripe)',
        doseNumber: 1,
        appliedDate: '2026-04-01',
        location: 'UBS Centro',
        lot: 'AB123',
        manufacturer: 'Butantan',
        notes: 'braço esquerdo',
        recommendedIntervalYears: 1,
        isCampaign: true,
        seriesTotal: 3,
      }),
    ]);
    expect(saida.aplicadas[0]).toEqual({
      nome: 'Influenza (gripe)',
      numeroDaDose: 1,
      aplicadaEm: '2026-04-01',
      local: 'UBS Centro',
      previstaPara: null,
      lote: 'AB123',
      fabricante: 'Butantan',
      observacoes: 'braço esquerdo',
      observacoesCortadas: false,
      intervaloDeReforcoAnos: 1,
      fazParteDeCampanha: true,
      totalDeDosesDaSerie: 3,
    });
  });

  it('registro legado so com nome e data nao quebra (CA-8)', () => {
    const saida = montarSaida([{ name: 'Antitetânica', appliedDate: '2010-06-01' }]);
    expect(saida.aplicadas[0]).toMatchObject({
      nome: 'Antitetânica',
      aplicadaEm: '2010-06-01',
      lote: null,
      fabricante: null,
      observacoes: null,
      observacoesCortadas: false,
      intervaloDeReforcoAnos: null,
      fazParteDeCampanha: false,
      totalDeDosesDaSerie: null,
    });
    expect(saida.reforcosPrevistos).toEqual([]);
  });

  it('campanha gravada como texto nao vira verdadeiro', () => {
    const saida = montarSaida([dose({ appliedDate: '2026-04-01', isCampaign: 'true' })]);
    expect(saida.aplicadas[0].fazParteDeCampanha).toBe(false);
  });

  it('observacao longa volta cortada', () => {
    const saida = montarSaida([dose({ appliedDate: '2026-04-01', notes: 'n'.repeat(400) })]);
    expect(saida.aplicadas[0].observacoes).toHaveLength(300);
    expect(saida.aplicadas[0].observacoesCortadas).toBe(true);
  });

  it('35 aplicadas e 33 pendentes: teto de 30 + 30, com o reforco calculado antes do teto (CA-14)', () => {
    expect(MAX_DOSES_POR_LISTA).toBe(30);
    const aplicadas = Array.from({ length: 34 }, (_, i) =>
      dose({ name: `Vacina ${i}`, appliedDate: `${2000 + i}-01-01` }),
    );
    // A dT mais antiga de todas: fica fora do teto, mas o reforco dela conta.
    const dtAntiga = dose({ doseNumber: 3, appliedDate: '1990-01-01', recommendedIntervalYears: 10 });
    const pendentes = Array.from({ length: 32 }, (_, i) =>
      dose({ name: `Pendente ${i}`, dueDate: `${2030 + i}-01-01` }),
    );
    const semData = dose({ name: 'Pendente sem data' });
    const saida = montarSaida([...pendentes, semData, dtAntiga, ...aplicadas]);

    expect(saida.aplicadas).toHaveLength(30);
    expect(saida.aplicadas[0].aplicadaEm).toBe('2033-01-01');
    expect(saida.aplicadas[29].aplicadaEm).toBe('2004-01-01');
    expect(saida.recomendadasNaoAplicadas).toHaveLength(30);
    expect(saida.recomendadasNaoAplicadas[0].previstaPara).toBe('2030-01-01');
    expect(saida.recomendadasNaoAplicadas.some((d) => d.nome === 'Pendente sem data')).toBe(false);
    expect(saida.omitidas).toBe(8);
    expect(saida.reforcosPrevistos).toEqual([
      { vacina: 'Dupla adulto (dT)', ultimaDoseEm: '1990-01-01', intervaloAnos: 10, previstoPara: '2000-01-01' },
    ]);
  });

  it('vazia: sem dado, com explicacao, e sem campo de situacao (CA-15)', () => {
    const saida = montarSaida([]);
    expect(Object.keys(saida).sort()).toEqual([
      'aplicadas',
      'disponivel',
      'explicacao',
      'omitidas',
      'recomendadasNaoAplicadas',
      'reforcosPrevistos',
    ]);
    expect(saida.disponivel).toBe(false);
    expect(saida.explicacao).toBe('O usuário não registrou nenhuma dose de vacina no aplicativo.');
  });

  it('com doses, nenhuma chave de situacao da carteira (CA-15)', () => {
    const saida = montarSaida(DT_COMPLETA);
    expect(Object.keys(saida).sort()).toEqual([
      'aplicadas',
      'disponivel',
      'omitidas',
      'recomendadasNaoAplicadas',
      'reforcosPrevistos',
    ]);
    expect(JSON.stringify(saida)).not.toMatch(/completa|emDia|atrasad/i);
  });
});

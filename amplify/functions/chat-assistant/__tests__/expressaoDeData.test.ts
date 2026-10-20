/**
 * Resumo do arquivo:
 * A gramatica fechada que transforma o que a pessoa disse ("sexta", "dia 30",
 * "2 da tarde") em data e hora (D11.4 = A). Conta de calendario e do codigo,
 * nao do modelo: e onde o modelo mais erra, e data errada num compromisso de
 * saude e pior que data vazia. O "hoje" e fixo nos testes; a funcao nunca le
 * o relogio.
 */
import { resolverData, resolverHora } from '../acoes/expressaoDeData';

// 2026-10-20 e uma terca-feira.
const HOJE = '2026-10-20';

describe('resolverData (hoje = terca, 20/10/2026)', () => {
  it.each([
    ['hoje', '2026-10-20'],
    ['amanhã', '2026-10-21'],
    ['amanha', '2026-10-21'],
    ['depois de amanhã', '2026-10-22'],
    ['sexta', '2026-10-23'],
    ['sexta-feira', '2026-10-23'],
    ['Sexta', '2026-10-23'],
    ['sábado', '2026-10-24'],
    ['domingo', '2026-10-25'],
    ['segunda', '2026-10-26'],
    // Igual a hoje: a da semana que vem. "Marca terca" dito na terca nao e hoje.
    ['terça', '2026-10-27'],
    ['terca-feira', '2026-10-27'],
    // "dia N" inclui hoje.
    ['dia 20', '2026-10-20'],
    ['dia 30', '2026-10-30'],
    ['dia 5', '2026-11-05'],
    ['30/10', '2026-10-30'],
    // dd/mm ja passado neste ano e o do ano que vem.
    ['15/10', '2027-10-15'],
    ['30/10/2026', '2026-10-30'],
  ])('%s -> %s', (expressao, esperado) => {
    expect(resolverData(expressao, HOJE)).toBe(esperado);
  });

  it.each([
    ['15/10/2026'], // antes de hoje
    ['31/02/2027'], // nao existe
    ['semana que vem'],
    ['ontem'],
    ['sexta de manhã'], // a expressao inteira tem de casar
    ['dia 32'],
    [''],
  ])('%p fica sem data', (expressao) => {
    expect(resolverData(expressao, HOJE)).toBeNull();
  });

  it('"dia 31" pula o mes que nao tem dia 31', () => {
    expect(resolverData('dia 31', '2026-11-10')).toBe('2026-12-31');
  });

  it('dd/mm atravessa a virada do ano', () => {
    expect(resolverData('05/01', '2026-12-31')).toBe('2027-01-05');
    expect(resolverData('amanhã', '2026-12-31')).toBe('2027-01-01');
  });
});

describe('resolverHora', () => {
  it.each([
    ['14h', '14:00'],
    ['14h30', '14:30'],
    ['14:30', '14:30'],
    ['às 8', '08:00'],
    ['as 8', '08:00'],
    ['8h', '08:00'],
    ['8 da manhã', '08:00'],
    ['2 da tarde', '14:00'],
    ['8 da noite', '20:00'],
    ['12h', '12:00'],
    ['12 da noite', '00:00'],
    ['0h', '00:00'],
  ])('%s -> %s', (expressao, esperado) => {
    expect(resolverHora(expressao)).toBe(esperado);
  });

  // Revisao do E11 (menor 1): o periodo que contradiz a hora e engano de quem
  // falou ou de quem copiou, e hora errada num compromisso e pior que vazia.
  it.each([
    ['3 da tarde', '15:00'],
    ['12 da tarde', '12:00'],
    ['15 da tarde', '15:00'],
    ['4 da manhã', '04:00'],
    ['11 da manhã', '11:00'],
    ['7 da noite', '19:00'],
    ['21 da noite', '21:00'],
  ])('periodo coerente: %s -> %s', (expressao, esperado) => {
    expect(resolverHora(expressao)).toBe(esperado);
  });

  it.each([['13 da manhã'], ['12 da manhã'], ['0 da manhã'], ['0 da tarde'], ['8 da tarde'], ['20 da tarde'], ['2 da noite'], ['14 da noite']])(
    'periodo que contradiz a hora (%p) fica sem hora',
    (expressao) => {
      expect(resolverHora(expressao)).toBeNull();
    },
  );

  it.each([['24h'], ['14h75'], ['de manhã'], ['8 da tarde e meia'], ['']])('%p fica sem hora', (expressao) => {
    expect(resolverHora(expressao)).toBeNull();
  });
});

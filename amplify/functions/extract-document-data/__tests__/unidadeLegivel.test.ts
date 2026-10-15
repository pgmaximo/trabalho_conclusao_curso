/**
 * Bloco 10 -- a unidade que a pessoa le.
 *
 * A rodada automatica da L7 mostrou o modo degradado do chat dizendo
 * "Basofilos (absoluto) · 0.033 10*3/uL". "10*3/uL" e o token UCUM que o
 * conversor usa por dentro (D28), e nenhum laudo brasileiro o escreve. O mesmo
 * token aparecia nas telas de serie e de detalhe.
 *
 * A traducao e SO de exibicao: o token continua sendo o que o banco guarda e o
 * que o conversor compara.
 */
import { unidadeLegivel } from '../unidadeLegivel';

describe('unidadeLegivel', () => {
  it('contagem celular vira a grafia do hemograma brasileiro', () => {
    expect(unidadeLegivel('10*3/uL')).toBe('mil/µL');
    expect(unidadeLegivel('10*6/uL')).toBe('milhões/µL');
    expect(unidadeLegivel('/uL')).toBe('/µL');
  });

  it('unidade internacional vira UI, com o prefixo certo', () => {
    expect(unidadeLegivel('u[IU]/mL')).toBe('µUI/mL');
    expect(unidadeLegivel('m[IU]/mL')).toBe('mUI/mL');
    expect(unidadeLegivel('[IU]/mL')).toBe('UI/mL');
  });

  it('o micro volta a ser micro', () => {
    expect(unidadeLegivel('ug/dL')).toBe('µg/dL');
    expect(unidadeLegivel('umol/L')).toBe('µmol/L');
  });

  it('os tokens dos paineis novos', () => {
    expect(unidadeLegivel('mg/(24.h)')).toBe('mg/24h');
    expect(unidadeLegivel('mg/g{creat}')).toBe('mg/g de creatinina');
    // INR e adimensional: nao ha unidade para mostrar.
    expect(unidadeLegivel('{INR}')).toBe('');
  });

  it('o que ja e legivel passa intacto', () => {
    for (const u of ['mg/dL', 'g/dL', 'ng/mL', '%', 'fL', 'U/L', 'mL/min', 's', '']) {
      expect(unidadeLegivel(u)).toBe(u);
    }
  });

  it('nunca lanca, nem com nulo', () => {
    expect(unidadeLegivel(null)).toBe('');
    expect(unidadeLegivel(undefined)).toBe('');
  });
});

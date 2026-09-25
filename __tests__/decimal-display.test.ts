import { formatarDecimal, formatarFaixa } from '@/utils/decimalDisplay';

// O banco guarda ponto decimal; o papel e a pessoa usam virgula. Este modulo
// e so a traducao de volta -- e o cuidado de nunca deixar o arredondamento
// mentir sobre o numero.

describe('formatarDecimal', () => {
  it('devolve a virgula que a pessoa leu no papel', () => {
    expect(formatarDecimal(16.1)).toBe('16,1');
  });

  it('nao inventa casa decimal que nao existe', () => {
    expect(formatarDecimal(13)).toBe('13');
    expect(formatarDecimal(100)).toBe('100');
  });

  it('NUNCA arredonda um valor pequeno para zero', () => {
    // Um TSH de 0,004 exibido como "0" seria um numero errado na tela, e o
    // tipo de erro que ninguem percebe conferindo por cima.
    expect(formatarDecimal(0.004)).toBe('0,004');
    expect(formatarDecimal(0.00012)).toBe('0,00012');
  });

  it('corta a sujeira de ponto flutuante que a conversao de unidade deixa', () => {
    // 5,5000000000000005 nao e uma medida: e o binario do JavaScript
    // aparecendo. Mostrar isso faria a tela parecer quebrada.
    expect(formatarDecimal(5.5000000000000005)).toBe('5,5');
  });

  it('valor ausente e um travessao, nunca um zero', () => {
    // Zero e uma medida. Ausencia nao e (D29).
    expect(formatarDecimal(null)).toBe('—');
  });

  it('zero de verdade continua zero', () => {
    expect(formatarDecimal(0)).toBe('0');
  });
});

// Esta funcao nao tinha um unico teste, e o plano do Bloco 9 afirmava que
// tinha. Ela e a metade de tela do F3: o laudo que escreve "Superior a 40
// mg/dL" so vira faixa visivel se ela souber escrever um lado so.
describe('formatarFaixa', () => {
  it('escreve os dois limites quando o laudo deu os dois', () => {
    expect(formatarFaixa(30, 100)).toBe('30 a 100');
  });

  it('escreve UM LADO SO quando o laudo deu um limite so (F3)', () => {
    expect(formatarFaixa(40, null)).toBe('acima de 40');
    expect(formatarFaixa(null, 200)).toBe('até 200');
  });

  it('sem limite nenhum nao inventa faixa', () => {
    expect(formatarFaixa(null, null)).toBeNull();
  });

  it('respeita a virgula decimal do laudo brasileiro', () => {
    expect(formatarFaixa(0.4, 4.3)).toBe('0,4 a 4,3');
  });
});

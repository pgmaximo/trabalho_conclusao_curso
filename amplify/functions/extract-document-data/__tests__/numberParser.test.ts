import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseDecimal } from '../numberParser';

describe('parseDecimal', () => {
  it('le virgula como separador decimal, que e o que o laudo brasileiro usa', () => {
    expect(parseDecimal('32,5')).toEqual({ ok: true, value: 32.5, qualifier: null });
  });

  it('le ponto como separador de milhar quando a virgula e o decimal', () => {
    expect(parseDecimal('1.234,56')).toEqual({ ok: true, value: 1234.56, qualifier: null });
  });

  it('aceita ponto decimal, porque ha laudo que o usa', () => {
    expect(parseDecimal('79.87')).toEqual({ ok: true, value: 79.87, qualifier: null });
  });

  it('le ponto como milhar quando nao ha virgula e o grupo tem tres digitos', () => {
    expect(parseDecimal('1.234')).toEqual({ ok: true, value: 1234, qualifier: null });
  });

  it('separa o sinal de censura do numero', () => {
    expect(parseDecimal('<0,01')).toEqual({ ok: true, value: 0.01, qualifier: '<' });
    expect(parseDecimal('> 1000')).toEqual({ ok: true, value: 1000, qualifier: '>' });
  });

  it('tolera espaco e numero ja tipado', () => {
    expect(parseDecimal('  12,3 ')).toEqual({ ok: true, value: 12.3, qualifier: null });
    expect(parseDecimal(32.5)).toEqual({ ok: true, value: 32.5, qualifier: null });
  });

  it('recusa em vez de chutar', () => {
    expect(parseDecimal('nao reagente').ok).toBe(false);
    expect(parseDecimal('').ok).toBe(false);
    expect(parseDecimal(null).ok).toBe(false);
    expect(parseDecimal('12,3,4').ok).toBe(false);
  });

  it('nunca lanca', () => {
    expect(() => parseDecimal(undefined)).not.toThrow();
  });
});

describe('a regra da D23 vale para o resto da extracao', () => {
  // Regra de projeto vira teste, do mesmo jeito que a palavra vetada vira
  // teste. Sem isso, o atalho volta na primeira pressa. `Number.isFinite` e
  // companhia continuam liberados: o que esta proibido e a CHAMADA
  // `Number(texto)`, que devolve NaN calado sobre "32,5".
  const CHAMADA_NUMBER = /(?<![.\w$])Number\s*\(/;

  it('nenhum arquivo da extracao usa parseFloat ou Number sobre texto do documento', () => {
    const dir = join(__dirname, '..');
    const arquivos = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'numberParser.ts');
    expect(arquivos.length).toBeGreaterThan(0);
    for (const arquivo of arquivos) {
      const fonte = readFileSync(join(dir, arquivo), 'utf-8');
      expect(fonte).not.toMatch(/parseFloat\s*\(/);
      expect(fonte).not.toMatch(CHAMADA_NUMBER);
    }
  });
});

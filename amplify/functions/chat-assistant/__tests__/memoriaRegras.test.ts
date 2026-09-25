/**
 * As regras da memória (M2).
 *
 * Este módulo é lido pela Lambda E pelo aplicativo, e é por isso que ele não
 * importa nada: o precedente é `extract-document-data/numberParser.ts`,
 * importado por `src/services/extractionService.ts`. Duas cópias divergiriam, e
 * a divergência apareceria como um fato aceito pela tela e recusado pela
 * função — ou pior, o contrário.
 */
import {
  MAX_CARACTERES_FATO,
  MAX_FATOS,
  MEMORY_KINDS,
  normalizarTexto,
  textoValido,
  tipoValido,
} from '../memoria/regras';

describe('a lista fechada de tipos', () => {
  it('tem exatamente quatro tipos', () => {
    // Cada tipo novo é uma finalidade nova (art. 6º, I da LGPD), e finalidade
    // nova precisa de decisão registrada -- não de um `push` no array.
    expect(MEMORY_KINDS).toHaveLength(4);
  });

  it('são os quatro da D34', () => {
    expect([...MEMORY_KINDS].sort()).toEqual([
      'ACESSO_A_CUIDADO',
      'COMO_ME_CHAMAR',
      'PREFERENCIA_DE_RESPOSTA',
      'ROTINA',
    ]);
  });

  it('nenhum tipo fora da lista passa', () => {
    for (const fora of ['CONDICAO', 'DIAGNOSTICO', 'MEDICAMENTO', 'ALERGIA', 'EXAME', '']) {
      expect(tipoValido(fora)).toBe(false);
    }
  });

  it('a comparação é exata, e não por aproximação de caixa', () => {
    // Um tipo aceito por diferença de maiúscula seria um tipo novo entrando
    // sem decisão nenhuma.
    expect(tipoValido('ROTINA')).toBe(true);
    expect(tipoValido('rotina')).toBe(false);
    expect(tipoValido(' ROTINA ')).toBe(false);
  });
});

describe('os dois limites, que são de LGPD e não de implementação', () => {
  it('cabem 20 fatos', () => {
    // Art. 6º, III -- o mínimo necessário. Vinte é mais do que uma pessoa
    // costuma ter a dizer sobre a forma como quer ser atendida, e pouco o
    // bastante para caber numa tela que ela leia inteira, que é o art. 18, II.
    expect(MAX_FATOS).toBe(20);
  });

  it('um fato tem no máximo 140 caracteres', () => {
    // Acima disso deixa de ser fato e vira resumo -- a quarta memória, que a
    // D34 recusou.
    expect(MAX_CARACTERES_FATO).toBe(140);
  });
});

describe('o texto do fato', () => {
  it('vazio e só espaço são recusados', () => {
    expect(textoValido('')).toBe(false);
    expect(textoValido('   ')).toBe(false);
    expect(textoValido('\n\t ')).toBe(false);
  });

  it('exatamente no limite é aceito, e um caractere acima não', () => {
    expect(textoValido('a'.repeat(MAX_CARACTERES_FATO))).toBe(true);
    expect(textoValido('a'.repeat(MAX_CARACTERES_FATO + 1))).toBe(false);
  });

  it('o limite conta o texto já normalizado', () => {
    // Espaço duplicado não pode consumir a cota de um fato legítimo. O texto
    // abaixo tem 144 caracteres crus e 140 depois de normalizado -- é o caso
    // de fronteira exato, e ele passa por causa da normalização.
    const comEspacos = `${'a'.repeat(MAX_CARACTERES_FATO - 2)}    b`;
    expect(comEspacos.length).toBeGreaterThan(MAX_CARACTERES_FATO);
    expect(textoValido(comEspacos)).toBe(true);
  });
});

describe('a normalização', () => {
  it('tira espaço das pontas e espaço repetido do meio', () => {
    expect(normalizarTexto('  Prefiro   respostas    curtas  ')).toBe('Prefiro respostas curtas');
  });

  it('NÃO corrige, NÃO capitaliza e NÃO reescreve', () => {
    // O texto gravado é o texto mostrado na confirmação. Qualquer reescrita
    // aqui faria a tela mostrar uma coisa e o banco guardar outra, que é
    // exatamente o que esvazia o consentimento do art. 11, I.
    expect(normalizarTexto('prefiro respostas curtas')).toBe('prefiro respostas curtas');
    expect(normalizarTexto('me atendo pelo posto')).toBe('me atendo pelo posto');
    expect(normalizarTexto('Trabalho de madrugada.')).toBe('Trabalho de madrugada.');
  });

  it('preserva acento', () => {
    expect(normalizarTexto('Só à noite')).toBe('Só à noite');
  });
});

describe('o módulo é compartilhável de verdade', () => {
  it('não tem nenhuma linha de importação', () => {
    // A garantia não é de estilo: uma importação aqui quebraria o uso pelo
    // aplicativo, que carrega este arquivo por caminho relativo e não tem o
    // ambiente da Lambda.
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const fonte = readFileSync(join(__dirname, '..', 'memoria', 'regras.ts'), 'utf8');
    expect(fonte).not.toMatch(/^\s*import\s/m);
    expect(fonte).not.toMatch(/\brequire\(/);
  });
});

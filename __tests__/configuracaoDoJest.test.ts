/**
 * A trava do proprio `jest.config.js`.
 *
 * Ela existe por causa de um defeito real, medido em 2026-09-18: o padrao que
 * impede o Jest da raiz de varrer as arvores de trabalho paralelas ignorava
 * `.claude` em QUALQUER posicao do caminho -- e as arvores moram em
 * `.claude/worktrees/`. De dentro de uma delas, o padrao ignorava o repositorio
 * inteiro, e `npm run validate` passava tendo rodado ZERO teste.
 *
 * Um validate verde que nao rodou nada e pior que um vermelho: ele afirma o que
 * nao conferiu, e e o unico portao que este projeto tem antes de "concluido".
 *
 * A invariante, em uma frase: **o Jest nunca ignora o que esta sob a raiz que ele
 * esta validando, e sempre ignora as arvores de trabalho que estao dentro dela.**
 *
 * Este arquivo roda das duas pontas e cada execucao confere a sua. No checkout
 * principal `RAIZ` e o repositorio e a arvore de dentro e um caso real; de dentro
 * de uma arvore de trabalho `RAIZ` e a arvore e o caso de dentro e hipotetico. As
 * duas leituras dao a mesma resposta, e e por isso que a assercao serve nas duas.
 */
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../jest.config.js') as { testPathIgnorePatterns: string[] };

/** A raiz que o Jest esta validando -- a mesma que ele usa como `rootDir`. */
const RAIZ = path.resolve(__dirname, '..');

/** O caminho com barra normal, que e a forma em que os padroes sao escritos. */
function comBarra(...pedacos: string[]): string {
  return path.join(...pedacos).split(path.sep).join('/');
}

/**
 * Aplica os padroes: cada um como expressao regular, e basta um casar para o
 * arquivo ser ignorado.
 *
 * O caminho e comparado com barra normal porque e nessa forma que os padroes de
 * caminho sao escritos -- o Jest reescreve a `/` do padrao para o separador
 * nativo antes de comparar, e e por isso que o `'/node_modules/'` que ele mesmo
 * usa funciona no Windows. Medido em 2026-09-18, e a razao de o
 * `jest.config.js` juntar os pedacos com `/`.
 */
function ignorado(caminhoComBarra: string): boolean {
  return config.testPathIgnorePatterns.some((padrao) => new RegExp(padrao).test(caminhoComBarra));
}

describe('jest.config.js -- o portao do npm run validate', () => {
  it('NUNCA ignora um teste da propria raiz que esta validando', () => {
    // O defeito, em forma de assercao. De dentro de uma arvore de trabalho este
    // caminho contem `.claude`, e o padrao antigo o ignorava -- junto com as
    // outras 93 suites.
    const meu = comBarra(RAIZ, 'amplify', 'functions', 'exemplo', '__tests__', 'algo.test.ts');
    expect(ignorado(meu)).toBe(false);
  });

  it('ignora a arvore de trabalho que esta DENTRO da raiz', () => {
    // A razao de o padrao existir, e ela continua valendo: sem isto, o Jest da
    // raiz varre as arvores paralelas, a contagem triplica e ele roda o teste que
    // OUTRA sessao escreveu para falhar agora.
    const dentro = comBarra(
      RAIZ,
      '.claude',
      'worktrees',
      'outra-sessao',
      'amplify',
      '__tests__',
      'algo.test.ts',
    );
    expect(ignorado(dentro)).toBe(true);
  });

  it('NAO ignora um caminho com `.claude` que esta FORA da raiz', () => {
    // A prova de que a ancora existe, e o outro lado do primeiro teste: o padrao
    // fala da raiz que esta sendo validada, e nao de `.claude` onde quer que ele
    // apareca. Com o padrao solto anterior, este caminho era ignorado -- e era
    // exatamente assim que a propria arvore de trabalho se ignorava.
    expect(ignorado('/outro/lugar/.claude/worktrees/x/__tests__/algo.test.ts')).toBe(false);
  });

  it('ignora node_modules', () => {
    expect(ignorado(comBarra(RAIZ, 'node_modules', 'pacote', '__tests__', 'algo.test.js'))).toBe(
      true,
    );
  });
});

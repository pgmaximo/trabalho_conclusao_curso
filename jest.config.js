// https://docs.expo.dev/develop/unit-testing/
const path = require('path');

/**
 * Monta a expressao regular que casa um caminho absoluto.
 *
 * DUAS ARMADILHAS, e as duas foram medidas em 2026-09-18:
 *
 * 1. **Nao use o caminho cru.** `testPathIgnorePatterns` recebe EXPRESSAO
 *    REGULAR, e um caminho do Windows usado cru vira uma expressao quebrada:
 *    `C:\Users\pedro\Documents\Developing\tcc` contem `\t`, que em expressao
 *    regular e TABULACAO. O padrao nunca casaria, e falharia em silencio. Por
 *    isso cada pedaco e escapado separadamente.
 *
 *    **Correcao de uma afirmacao falsa desta mesma linha:** a redacao anterior
 *    dizia que o token `<rootDir>` "nao serve aqui". Serve. Medido em
 *    2026-09-18 com `jest --listTests`: a configuracao com
 *    `'<rootDir>/.claude/'` devolveu 97 arquivos e NENHUM de arvore de
 *    trabalho. O motivo de este arquivo nao usa-lo esta na nota da constante
 *    abaixo, e e sobre testabilidade, nao sobre funcionar.
 *
 * 2. **Junte com barra normal, e nao com contrabarra.** O Jest reescreve a `/`
 *    dos padroes de caminho para o separador nativo antes de compara-los -- e por
 *    isso que o `'/node_modules/'` que ele mesmo usa como padrao funciona no
 *    Windows. Escrever contrabarra aqui seria lutar com essa reescrita.
 */
function padraoDoCaminho(absoluto) {
  return absoluto
    .split(/[/\\]/)
    .map((pedaco) => pedaco.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('/');
}

/**
 * As arvores de trabalho paralelas ficam DENTRO do repositorio, em
 * `.claude/worktrees/`, e sem esta linha o Jest da raiz varre todas elas.
 * Duas consequencias, e as duas tornam `npm run validate` inutil justamente
 * quando ele mais importa:
 *
 * 1. A contagem triplica -- 282 suites onde ha 94 --, entao o numero deixa de
 *    dizer qualquer coisa sobre este codigo.
 * 2. Ele roda os testes que OUTRA sessao esta escrevendo agora. No ciclo TDD
 *    deste projeto o teste e escrito para falhar primeiro, entao uma sessao em
 *    andamento reprova a validacao desta, por estar funcionando corretamente.
 *
 * O PADRAO E ANCORADO EM `__dirname`, e a ancora e o conserto de um defeito real
 * (2026-09-18). A versao anterior era `[/\\]\.claude[/\\]` -- `.claude` em
 * QUALQUER posicao do caminho. De dentro de uma arvore de trabalho, cujo caminho
 * ja contem `.claude/worktrees/`, ela ignorava o repositorio inteiro: o
 * `npm run validate` passava tendo rodado ZERO teste. Um validate verde que nao
 * rodou nada e pior que um vermelho, porque afirma o que nao conferiu -- e ele e o
 * unico portao deste projeto antes de "concluido".
 *
 * Ancorado, o padrao quer dizer exatamente o que precisa querer: "ignore as
 * arvores que estao DENTRO da raiz que estou validando". As arvores VIZINHAS nao
 * precisam de padrao nenhum -- elas nao estao sob o `rootDir`, e o Jest nunca as
 * alcanca.
 *
 * A trava que impede o padrao solto de voltar esta em
 * `__tests__/configuracaoDoJest.test.ts`.
 *
 * POR QUE `__dirname` E NAO `<rootDir>`, ja que os dois funcionam: o token so e
 * expandido pelo Jest em tempo de execucao, entao um teste que LEIA este arquivo
 * enxergaria a string literal `<rootDir>/.claude/`, que como expressao regular
 * nao casa com caminho nenhum -- e a trava acima nao teria como afirmar coisa
 * alguma. Com o caminho ja resolvido, ela consegue conferir a invariante nas
 * duas pontas. Neste projeto, "da para testar" ganha de "e mais curto".
 */
const ARVORES_DE_TRABALHO = `${padraoDoCaminho(path.join(__dirname, '.claude'))}/`;

module.exports = {
  preset: 'jest-expo',
  // setupFilesAfterEnv (e nao setupFiles) para preservar os setupFiles do jest-expo.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // As duas arvores de trabalho consertaram este mesmo defeito de jeitos
  // diferentes, e o conflito foi resolvido MEDINDO em vez de escolhendo pela
  // prosa. O que ficou de cada uma esta escrito no bloco acima e logo abaixo.
  testPathIgnorePatterns: ['/node_modules/', ARVORES_DE_TRABALHO],
  // O preset do jest-expo so transforma `.[jt]sx?`, e os geradores de
  // scripts/ sao `.mjs` (o package.json nao tem "type": "module", entao `.js`
  // ali seria CommonJS e `node scripts/...` quebraria). Sem esta entrada, um
  // teste que importa o gerador morre em "Cannot use import statement outside
  // a module". Quem precisa disso hoje: catalogoNaoDeriva.test.ts.
  transform: {
    '\\.mjs$': ['babel-jest', { caller: { name: 'metro', bundler: 'metro', platform: 'ios' } }],
  },
};

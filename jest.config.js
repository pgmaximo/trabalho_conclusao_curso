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
 *    regular e TABULACAO. O padrao nunca casaria, e falharia em silencio. E a
 *    mesma razao pela qual o token `<rootDir>` nao serve aqui: ele vale em
 *    `setupFilesAfterEnv` e em `moduleNameMapper`, que recebem CAMINHO, e nao
 *    aqui. Por isso cada pedaco e escapado separadamente.
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
 */
const ARVORES_DE_TRABALHO = `${padraoDoCaminho(path.join(__dirname, '.claude'))}/`;

module.exports = {
  preset: 'jest-expo',
  // setupFilesAfterEnv (e nao setupFiles) para preservar os setupFiles do jest-expo.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', ARVORES_DE_TRABALHO],
};

// https://docs.expo.dev/develop/unit-testing/
module.exports = {
  preset: 'jest-expo',
  // setupFilesAfterEnv (e nao setupFiles) para preservar os setupFiles do jest-expo.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // As arvores de trabalho paralelas ficam DENTRO do repositorio, em
  // `.claude/worktrees/`, e sem esta linha o Jest da raiz varre todas elas.
  // Duas consequencias, e as duas tornam `npm run validate` inutil justamente
  // quando ele mais importa:
  //
  // 1. A contagem triplica -- 282 suites onde ha 94 --, entao o numero deixa de
  //    dizer qualquer coisa sobre este codigo.
  // 2. Ele roda os testes que OUTRA sessao esta escrevendo agora. No ciclo TDD
  //    deste projeto o teste e escrito para falhar primeiro, entao uma sessao em
  //    andamento reprova a validacao desta, por estar funcionando corretamente.
  //
  // ANCORADO EM `<rootDir>`, e nao no caminho absoluto. Um padrao absoluto
  // resolve o problema num sentido so: as arvores de trabalho VIVEM dentro de
  // `.claude/worktrees/`, entao rodando de DENTRO de uma delas o mesmo padrao
  // casa com o proprio `rootDir` e o Jest ignora a suite inteira -- 0 testes,
  // e `npm run validate` sai com "No tests found" em vez de validar.
  //
  // Com `<rootDir>` o padrao vira relativo a quem esta rodando: da raiz ele
  // exclui as arvores; de dentro de uma arvore ele aponta para o `.claude/`
  // dela, que nao guarda teste nenhum. Conferido nos dois sentidos.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  // O preset do jest-expo so transforma `.[jt]sx?`, e os geradores de
  // scripts/ sao `.mjs` (o package.json nao tem "type": "module", entao `.js`
  // ali seria CommonJS e `node scripts/...` quebraria). Sem esta entrada, um
  // teste que importa o gerador morre em "Cannot use import statement outside
  // a module". Quem precisa disso hoje: catalogoNaoDeriva.test.ts.
  transform: {
    '\\.mjs$': ['babel-jest', { caller: { name: 'metro', bundler: 'metro', platform: 'ios' } }],
  },
};

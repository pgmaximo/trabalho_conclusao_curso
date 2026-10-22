# TASKS: E6 — Wearable: série diária e histórico

**Estado:** concluído em 2026-10-20 (aprovado pelo usuário); conferência no sandbox pendente (plano aprovado em 2026-10-19) · Spec: [`spec.md`](./spec.md) · Plan: [`plan.md`](./plan.md) · Passo a passo: `docs/superpowers/plans/2026-10-19-e6-wearable.md`

Cada tarefa começa pelo teste, que precisa falhar pelo motivo certo antes da implementação.

## Tarefas

- [x] T1 — `serieDiaria.ts` (puro): métricas, parse e validação do `result.json` com a derivação da FC de repouso, média no intervalo, formatação, diferença e datas em texto. Teste: `__tests__/serieDiaria.test.ts`. Prova CA 6 e parte dos CA 1, 2 e 7.
- [x] T2 — A quarta porta: `bucketDaSerie.ts` (S3 sob demanda), `lerSerieDaImportacao` em `ownerScopedRead.ts`, `series` no contexto do turno. Teste: `__tests__/leituraDaSerie.test.ts` (vínculo pelo `importId`, formas recusadas sem chamar o S3, ausência, teto, corrompido, cache do turno) e `__tests__/bucketDaSerieVarredura.test.ts` (só a porta importa o módulo do S3). Prova CA 10, 11 e 12. Depende de T1.
- [x] T3 — Permissão no bucket. Teste: `__tests__/infraWearable.test.ts` (`grantRead` só em `health-imports/*/result.json`, nenhuma escrita). Prova CA 17.
- [x] T4 — `wearableDiasSaida.ts` (puro): recorte, períodos e modo degradado. Teste: `__tests__/wearableDiasSaida.test.ts` (C1.1 a C1.6, C2.1 a C2.5, a tabela do plan.md seção 4, nenhum padrão usa hoje). Prova CA 1 a 4, 7 e parte do 18. Depende de T1.
- [x] T5 — `consultar_wearable_dias`, registro e classificação. Teste: `__tests__/wearableDiasTool.test.ts` (schema estrito com as refinações, leitura pela porta, sem importação pronta, série ausente), `tools.test.ts` (lista inteira) e `verificacao.test.ts` (clínica e cruza domínios). Prova CA 5, 14, 15 e 18. Depende de T2 e T4.
- [x] T6 — `consultar_wearable` com lista e análise da tela. Teste: `__tests__/wearableSaida.test.ts` (0, 1 e N importações, situações, omitidas, campos exatos da D6.2, chaves proibidas ausentes, análise ilegível) e `__tests__/wearableTool.test.ts` (saída completa e ausência com a lista). Prova CA 8, 9 e parte do 18.
- [x] T7 — Comparação com exame em 28 dias. Teste: `comparacaoSaida.test.ts` reescrito na parte da janela (C5.1 a C5.3), `comparacaoTool.test.ts` (no máximo 2 leituras, cache) e `e10PerguntasReais.test.ts` com a série no S3 simulado. Prova CA 13. Depende de T1 e T2.
- [x] T8 — Prompt e descrições. Teste: `chatPrompt.test.ts` (quando usar a nova, contraste com wearable e comparação, dados da última importação manual, sem "melhorou/piorou", janela de 28 dias) e o `avisoDoAlinhamento` nas regras de linguagem. Prova CA 16 e parte do 13. Depende de T5 a T7.
- [x] T9 — As 5 perguntas reais de ponta a ponta. Teste: `__tests__/e6PerguntasReais.test.ts` (modelo simulado, ferramentas e verificação de verdade, banco e S3 simulados; a adversária barrada ou encaminhada). Prova CA 19. Depende de T1 a T8.
- [x] T10 — Fechamento. `npm run validate` verde (2026-10-20), READMEs e PRD atualizados; a proposta de mudança no `CLAUDE.md` (quatro portas) foi levada ao usuário, que decide. Prova CA 20.

## Dependências

T1 e T3 e T6 são independentes. T2 e T4 dependem de T1. T5 depende de T2 e T4. T7 depende de T1 e T2. T8 depende de T5, T6 e T7. T9 depende de todas.

## Contagem de testes

`npm run validate` em 2026-10-20, no fechamento: typecheck e typecheck:backend limpos, lint com 0 erros (os 12 avisos antigos, todos em `src/`), **222 suítes e 3741 testes verdes**, já com as correções do review e os ajustes D10.7 e D10.8 (o total inclui o E4 e o E10, ainda não commitados). O E6 acrescentou 9 suítes novas e ajustou 7.

## Desvios do plano (registrados durante a execução)

- O SDK do S3 quebra no jest do projeto (sondado antes do plano); `bucketDaSerie.ts` o importa sob demanda, e uma varredura garante que só a porta do dono o importa.
- `importacoesParaLer` devolve as linhas, e não `{ id, inicio, fim }`: a porta recebe a linha.
- O refine de data da entrada não lança com texto malformado (o zod 4 roda o refine mesmo com o regex reprovado).
- A regra "uma frase, um domínio" (D10.6) reprova "28 dias antes do exame" junto de "sono" na mesma frase: o prompt manda dizer as datas da janela numa frase só do sono ou dos passos.
- A importação pronta sem período devolve a mesma ausência da série indisponível.

## Conferência pendente (depende do `ampx sandbox`)

Com uma conta que tenha uma importação pronta (Samsung Health) e um exame dentro do período:
1. Conferir que o papel do chat lê o `result.json` com a permissão `health-imports/*/result.json` e que um GET em um arquivo bruto da mesma pasta é negado.
2. Perguntar "como foi meu sono na ultima quinta?" e conferir a chamada a `consultar_wearable_dias`, a data e o dia da semana certos, e a frase de até quando vão os dados.
3. Perguntar "e ontem?" e conferir a resposta de que os dados vão até a data da exportação, com o caminho para importar de novo.
4. Perguntar "meu sono mudou do mes passado pra ca?" e conferir a chamada com `comparar`, a diferença com as palavras da ferramenta e nenhum "melhorou/piorou".
5. Perguntar "compara meu colesterol com meu sono" e conferir a janela de 28 dias nas datas.
6. Anotar o tempo de leitura do `result.json` de uma exportação longa e os tokens da saída de `consultar_wearable_dias` (meta: menos de 600) e de `consultar_wearable` (acréscimo de menos de 500).

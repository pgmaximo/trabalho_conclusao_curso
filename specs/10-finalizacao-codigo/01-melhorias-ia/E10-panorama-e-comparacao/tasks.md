# TASKS: E10 — Panorama e comparação entre domínios

**Estado:** concluído (entrega aprovada em 2026-10-19; conferência no sandbox pendente, ver abaixo) · Spec: [`spec.md`](./spec.md) · Plan: [`plan.md`](./plan.md) · Passo a passo: `docs/superpowers/plans/2026-10-19-e10-panorama-e-comparacao.md`

Cada tarefa começa pelo teste, que precisa falhar pelo motivo certo antes da implementação.

## Tarefas

- [x] T1 — Guarda de causa na R3 (D10.2). Teste: `ai-language-rules/__tests__/adversarial.test.ts`, novo bloco "causa entre dados (E10, D10.2)" com as frases da C3.1 barradas e as da C3.2 aprovadas, nas duas classes; `rulesPrompt.test.ts` verde com a R3 nova. Prova CA 13 (com T7), 14 e 15.
- [x] T2 — Extrair sem mudar comportamento: `serieDoAnalito`, `separarConsultas`, `dosesAplicadasPorRecencia`, `ultimaImportacaoPronta`. Teste: suítes existentes de analitos, consultas, vacinas e wearable sem mudança, mais um teste de cada função exportada. Prova CA 4 e 9.
- [x] T3 — `panoramaSaida.ts` (puro). Teste: `__tests__/panoramaSaida.test.ts` (vazio, completo, parcial, sem chave clínica, wearable que não concluiu, próxima consulta em Brasília). Prova CA 1 a 4. Depende de T2.
- [x] T4 — `consultar_panorama` e registro. Teste: `__tests__/panoramaTool.test.ts` (seis tabelas, paralelo, cache do turno, degradado) e `tools.test.ts` (lista inteira). Prova CA 5, 16 e 18. Depende de T3.
- [x] T5 — `comparacaoSaida.ts` (puro). Teste: `__tests__/comparacaoSaida.test.ts` (C2.1 a C2.8, C2.12, formato da média, média formatada sem violação da R3). Prova CA 6 a 8. Depende de T2.
- [x] T6 — `consultar_comparacao`, registro, citação e classificação. Teste: `__tests__/comparacaoTool.test.ts` (schema estrito, leituras), `citacoes.test.ts` (pares indexados), `tools.test.ts`. Prova CA 9 a 11 e 16. Depende de T5.
- [x] T7 — Frase fixa costurada. Teste: `__tests__/comparacaoFixa.test.ts` (costura, sem repetição, sem par não costura, passa nas regras) e `verificacao.test.ts` (ordem: frase e depois encaminhamento). Prova CA 12, 13 e 18. Depende de T1 e T6.
- [x] T8 — Prompt e descrição do wearable. Teste: `chatPrompt.test.ts` (quando usar, contraste, aviso do mês, não escrever a frase fixa, "modo geral" no panorama). Prova CA 17. Depende de T4 e T6.
- [x] T9 — As 5 perguntas reais de ponta a ponta. Teste: `__tests__/e10PerguntasReais.test.ts`, em que o modelo simulado devolve as ferramentas e o texto, e a verificação de verdade aprova ou barra. Prova CA 19. Depende de T1 a T8.
- [x] T10 — Fechamento. `npm run validate` verde e colado, a lista da seção 8 do PROMPT-PADRAO conferida, os READMEs de status e o PRD atualizados. Prova CA 20.

## Dependências

T1 e T2 são independentes. T3 e T5 dependem de T2. T4 depende de T3. T6 depende de T5. T7 depende de T1 e T6. T8 depende de T4 e T6. T9 depende de todas.

## Contagem de testes

`npm run validate` em 2026-10-19: typecheck e typecheck:backend limpos, lint com 0 erros (12 avisos antigos em `src/`), **212 suítes e 3556 testes verdes** depois dos riscos D10.3 a D10.6 (o total inclui o E4, ainda não commitado). Uma rodada do gate teve uma falha intermitente em `__tests__/onboarding-screen.test.tsx` (tela do app, fora do E10): a etapa 2 não apareceu a tempo sob carga. O teste passa sozinho (9 de 9), e a rodada seguinte da suíte inteira passou sem mudança.

## Conferência pendente (depende do `ampx sandbox`)

Com uma conta que tenha um exame e uma importação de wearable cobrindo as 4 semanas antes dele:
1. Perguntar "me da um resumo da minha saude" e conferir que o modelo chama `consultar_panorama`, sem chamar as ferramentas de cada assunto.
2. Perguntar "compara meu colesterol com meu sono" e conferir a chamada a `consultar_comparacao`, os dois blocos em frases separadas, o mês certo, a frase fixa e o encaminhamento no fim.
3. Perguntar "meu sono causou meu colesterol alto?" e conferir que a resposta não liga um dado ao outro.
4. Anotar o custo de tokens do turno do panorama e do turno da comparação (meta: menos de 400 e de 600 tokens na saída da ferramenta).

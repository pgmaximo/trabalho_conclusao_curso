# TASKS: E4 — Receitas e documentos

Passo a passo com teste antes da implementação: `docs/superpowers/plans/2026-10-19-e4-receitas-e-documentos.md`. Esta lista é o acompanhamento.

## Estado

**Concluído em 2026-10-19** (entrega aprovada pelo usuário). **Pendente do usuário, fora do código:** a conferência no sandbox (seção no fim), que o usuário fará depois. Plano aprovado em 2026-10-19, execução nativa; T0 a T7 feitas. Decisões D4.1 e D4.2 = A (2026-10-19). Spec aprovada em 2026-10-19.

`npm run validate`: linha de base 195 suítes / 3006 testes → depois da T7, 199 / 3061 → depois da revisão e do `/simplify`, **199 suítes / 3096 testes**, exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos, todos preexistentes em `src/`.

Branch: `sdd-10-finalizacao-codigo`, única para todo o SDD 10, no checkout principal, **sem worktree**. Commit só quando o usuário pedir. Alterações alheias ao épico: `metro.config.js`, `package.json`, `package-lock.json` (não tocar, não incluir em commit).

## Tarefas (ordem de execução)

- [x] **T0 — Linha de base.** `npm run validate` e `git status`, anotados aqui. *Prova:* saída colada. **Feita em 2026-10-19:** exit 0; Jest **195 suítes / 3006 testes**; lint 0 erros e 12 avisos (preexistentes). `git status`: só os três alheios e os docs do E4.
- [x] **T1 — Situação da leitura, pura.** `tools/situacaoDaLeitura.ts`; `JANELA_DE_TRAVAMENTO_MS` exportada de `extractionEnums.ts` e importada por `start-document-extraction/handler.ts`. Depende de: T0. *Prova:* `situacaoDaLeitura.test.ts` (as oito situações, os dois travados, `createdAt` no `PENDING`, data ilegível, motivo só da lista fechada, avisos só como número, sem palavra de prazo) (CA-10, CA-11, CA-13); testes da Lambda de início verdes sem mudança. **Feita em 2026-10-19:** 18 testes, vermelhos antes (módulo inexistente), verdes depois. **Ruling:** a `start-document-extraction` não tem testes próprios; a prova da constante movida é a suíte inteira verde (196 / 3024) e o typecheck:backend.
- [x] **T2 — Porta por índice sem ordenação.** `ownerScopedRead.ts`: `ITENS_POR_RECEITA`; `lerDoDonoPorIndice` com intervalo opcional. Depende de: T0. *Prova:* `leituraPorIndice.test.ts` ampliado (Query só com a chave; dono do token; intervalo em índice sem ordenação lança; índice com ordenação sem intervalo lança; outro dono descartado) (CA-9); testes do E3 sem mudança. **Feita em 2026-10-19:** 5 testes novos (4 vermelhos antes, um guarda do nome em `amplify_outputs.json`). **Rulings:** o teste "a lista fechada tem um índice só" passou a afirmar os dois (é a guarda da decisão, feita para mudar com ela); o teste de coerência intervalo × ordenação passava cedo por motivo errado (índice fora da lista, `TypeError`) e passou a exigir a mensagem própria. Suíte do chat 775 de 775.
- [x] **T3 — Saída das receitas, pura.** `tools/receitasSaida.ts`. Depende de: T1. *Prova:* `receitasSaida.test.ts` (só `prescription`; 5 mais recentes e omitidas; itens ordenados, teto 15 e omitidos; nome sem concentração, corte 80 e nome vazio; os três booleanos; chaves e valores de posologia ausentes; sem receita; receita sem item; bloco degradado) (CA-2 a CA-8, CA-14). **Feita em 2026-10-19:** 11 testes, vermelhos antes (módulo inexistente), verdes depois. O teste mocka o SDK como `vacinasSaida.test.ts` (`ownerScopedRead.ts` cria o cliente ao carregar).
- [x] **T4 — Ferramenta, registro e infraestrutura.** `tools/receitas.ts`, `tools/index.ts`, `amplify/backend.ts`. Depende de: T2, T3. *Prova:* `receitasTool.test.ts` (entrada recusada; um Query por receita, em paralelo; nenhum Scan nos itens; falha vira erro genérico; frases do CA-15 com `checkLanguageRules`; degradado aprovado pelas regras) (CA-1, CA-9, CA-14, CA-15); `tools.test.ts` com a tabela nova e a posição no registro (CA-16); `infraReceitas.test.ts` (CA-17). **Feita em 2026-10-19:** `receitasTool.test.ts` (9), `infraReceitas.test.ts` (4) e 2 testes novos em `tools.test.ts`; vermelhos antes (ferramenta inexistente, backend sem a tabela), verdes depois; typecheck:backend limpo. **Ruling:** a frase honesta do CA-15 era reprovada pela R2 (pergunta clínica sem encaminhamento), e a R2 reconhece "médico", não "quem receitou": a frase do teste e o prompt passaram a usar "o médico que receitou ou o farmacêutico orienta". As frases do CA-15 são guardas do comportamento atual da R3, que não mudou.
- [x] **T5 — Situação da leitura em `consultar_exames`.** `tools/exames.ts`. Depende de: T1. *Prova:* `examesTool.test.ts` ampliado (`leitura` por documento, `explicacaoDaLeitura` uma vez, texto dos avisos ausente, degradado sem mudança) (CA-12). **Feita em 2026-10-19:** 3 testes; o de `leitura` e o da descrição vermelhos antes, verdes depois; o do erro técnico já passava (o campo nem era lido) e fica como guarda. Suíte do chat 804 de 804.
- [x] **T6 — Prompt.** `chatPrompt.ts`. Depende de: T4, T5. *Prova:* `chatPrompt.test.ts` (receita × medicamentos × exames; leitura da foto; sem dose nem intervalo da receita; sem prazo de leitura) (CA-18). **Feita em 2026-10-19:** 4 testes, vermelhos antes, verdes depois. **Ruling:** os testes do E2 achavam a regra de medicamentos pela primeira menção a `consultar_medicamentos`, que agora está na linha de receitas; passaram a ancorar em "Para os remédios que a pessoa cadastrou, use consultar_medicamentos". Suítes do chat e de regras 1552 de 1552.
- [x] **T7 — Gate e documentação.** `npm run validate` verde, com a saída colada; Estado de `spec.md`, `plan.md`, deste arquivo, do README da parte e de `decisoes/README.md`. Depende de: T1 a T6. *Prova:* saída do validate (CA-19). **Feita em 2026-10-19 (antes da revisão):** exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos, todos preexistentes; Jest **199 suítes / 3061 testes**.

## Revisão (Fase 5, 2026-10-19)

Três leituras: um revisor independente (código, spec e plano, sem as minhas conclusões), `/code-review` e `/simplify` em quatro ângulos. Nenhum caminho para dado de outra pessoa, nenhuma escrita. Cada correção de comportamento entrou com teste vermelho antes e verde depois (35 testes novos ou mudados).

**Corrigido**
- **Crítico — número do papel no nome do remédio:** "AAS 100", "Bisoprolol 2,5mg", "Paracetamol 750 1cp 8/8h", "Azitromicina 500 por 3 dias", "Insulina NPH 10 unidades" levavam dose ou posologia ao modelo e ao modo degradado. Corte local mais estrito (`receitasSaida.ts`), `removerDose` intacto.
- **Importante — prazo no motivo da falha (CA-13):** a frase da falha genérica não sai.
- **Importante — remédio repetido** por releitura: um item por nome, avisos juntados.
- **Importante — textos que não batiam com a tela:** a tela não mostra a foto (caminho por "Baixar documento"); `nunca_lido` não afirma documento antigo; `sem_valores` numa receita; `demorando`; `falhou` com dado anterior; modo degradado de receita sem item.
- **Menores:** `PENDING` com início ilegível; documento sem id; contraste com `consultar_exames` e `validaAte` no prompt; "arquivo" em vez de "foto".
- **`/simplify`:** `PROMETE_PRAZO` exportado e usado pelos testes (era copiado cinco vezes); motivos que saem montados uma vez; `contarAvisos` com `texto`; regra de travado única (`passouDaJanelaDeTravamento`), usada pela Lambda de início; data do degradado com `formatarData`; `faixa` da porta por índice simplificada; explicação da leitura só com documento; teste que só repetia a constante trocado pelo do predicado.

**Mantido, com motivo**
- Itens antigos de leituras anteriores continuam no banco: a correção é na Lambda de extração, fora do épico (spec §7). O chat junta os nomes iguais, mas não reconhece um item antigo.
- Dois Scans de documentos quando o modelo chama exames e receitas no mesmo turno, e o teto de 10 páginas: desenho de `lerDoDono` para todas as ferramentas; memorizar por turno atravessa o despachante.
- Uma consulta de itens que falha derruba a ferramenta (erro genérico): melhor que uma lista parcial que pareça completa.
- Arrays paralelos em `montarSaidaDeReceitas`, booleanos falsos na saída, `leitura` em todo documento, projeção na consulta, prompt mais curto: ganho pequeno, ou mudança no contrato da saída que o modelo lê.
- Fixtures e alguns testes de dono repetidos entre arquivos: cada arquivo segue o padrão do épico anterior.

**`CLAUDE.md`:** atualizado no fechamento (lista de ferramentas, índices da porta por índice, épicos).

## Riscos do fechamento (corrigidos em 2026-10-19, a pedido do usuário)

Cada correção com teste vermelho antes e verde depois. `npm run validate` depois delas e da revisão delas: **201 suítes / 3129 testes**, exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos preexistentes.

- [x] **R1 — Itens de leituras antigas (D4.3 = A).** Lambda de extração: `regravacaoDaReceita.ts` (o que a leitura nova não gravou sai, menos o conferido), `listarItensDaReceita` (índice por documento), handler grava antes de apagar e só em receita; `backend.ts` dá `Query` no índice dos itens à extração. Chat: filtro por `updatedAt` em leitura concluída (`SUCCEEDED`, `NO_RESULTS`), para os itens velhos já gravados. *Prova:* `extract-document-data/__tests__/regravacaoDaReceita.test.ts` (6) e 5 casos em `receitasSaida.test.ts`.
- [x] **R2 — Nome cortado demais.** `nomeDoRemedio` limpa cada parte separada por "+": "Amoxicilina + Clavulanato". *Prova:* 4 rótulos novos em `receitasSaida.test.ts`, nenhum número sai.
- [x] **R3 — Leitura dupla.** `LeiturasDoTurno` em `ownerScopedRead.ts`, criado por turno no laço (`conversationLoop.ts`), no contexto do turno (`types.ts`), passado por todas as ferramentas. *Prova:* `leituraPorTurno.test.ts` (5: uma leitura por tabela, cópia por chamada, falha não guardada, sem registro lê sempre, exames + receitas leem os documentos uma vez) e o teste do laço (um registro por turno). **Ruling:** os dois testes do laço que afirmavam o contexto exato `{ local }` passaram a usar `objectContaining`.
- [x] **R4 — Falha derruba a ferramenta.** `Promise.allSettled` em `receitas.ts`; a receita que falhou sai com `itensIndisponiveis`, e a saída com `avisoDeIndisponiveis`; o modo degradado diz "não foi possível ler os remédios agora". *Prova:* `receitasTool.test.ts` (falha parcial e falha da leitura das receitas) e 2 casos em `receitasSaida.test.ts`.
- [x] **Revisão das correções** (revisor independente, sem as minhas conclusões). Nenhum crítico. Corrigido, com teste vermelho antes: **(a)** número colado a pontuação ("AAS-100", "Clav.125", "Losartana:50", "Ibuprofeno-4%") passava no nome: o corte vale para todo dígito que não esteja colado a letra; **(b)** um PDF dividido com alguma parte que falhou apagaria os itens das páginas não lidas (regra 5): a limpeza não apaga nada se alguma parte falhou; **(c)** leitura nova sem item de receita não apaga nada; **(d)** a limpeza só toca item do dono do documento; **(e)** o filtro do chat mantém o item conferido, como a Lambda. **Ruling:** o teste de ordem do handler passou a aceitar a chamada quebrada em linhas. **Mantido:** (1) reler com o mesmo id volta um item conferido para `AUTO` (`buildPrescriptionUpdate`, anterior ao E4; nenhum item é conferido hoje); (2) enquanto lê ou depois de uma releitura que falhou, o chat mostra os itens antigos junto, como a tela; (3) a cópia do registro de leituras é rasa (nenhuma ferramenta altera linha); (4) por desenho, "AAS100" (número colado a letra) fica, posologia sem dígito ("½ comprimido") passa, e "Ômega 3" vira "Ômega".
- [ ] **R5 — Nada visto no real.** Não se resolve no código: depende da conferência no sandbox abaixo, que o usuário fará depois. Os itens 7 e 8 do roteiro cobrem R1 e R3.

## Conferência no sandbox (depende do usuário, fora do código)

Com `ampx sandbox` e o app autenticado num aparelho:

1. Guardar a foto de uma receita com dois remédios, esperar a leitura e perguntar "o que o medico receitou na minha ultima receita". Esperado: `consultar_receitas` no log; a resposta lista os nomes, diz que foram lidos da foto e manda conferir na receita.
2. "de quanto em quanto tempo eu tomo o remedio da receita": a resposta não diz número; diz que a forma de usar está na receita (Exames > tocar no documento > Baixar documento) e que o médico que receitou ou o farmacêutico orienta.
3. Logo depois de guardar um exame, "meu exame ja foi lido?": a resposta diz que a leitura está em andamento, sem prazo.
4. Num exame descritivo (sem valores), "pq nao aparece os valores": a resposta explica como a tela.
5. No CloudWatch, nenhuma `AccessDeniedException` na `Query` de `prescriptionItemsByDocumentId`.
6. Uma receita com "AAS 100" ou "Paracetamol 750 1cp 8/8h": a resposta diz só o nome, sem número.
7. Reler uma receita já lida ("Tentar de novo" depois de uma falha, ou reenviando): no DynamoDB, os itens da leitura anterior que a nova não gravou somem; no CloudWatch da extração, nenhuma `AccessDeniedException` na `Query` de `prescriptionItemsByDocumentId`.
8. "meus exames e receitas ja foram lidos?": no CloudWatch do chat, as duas ferramentas no mesmo turno e uma leitura só da tabela de documentos.

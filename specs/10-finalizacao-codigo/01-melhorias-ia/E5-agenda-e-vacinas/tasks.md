# TASKS: E5 — Agenda e vacinas: campos faltantes

Passo a passo com teste antes da implementação: `docs/superpowers/plans/2026-10-19-e5-agenda-e-vacinas.md`. Esta lista é o acompanhamento.

## Estado

**Concluído em 2026-10-19** (entrega aprovada pelo usuário). T0 a T7 feitas; revisão com correções abaixo. Decisão D5.1 = A. **Pendente do usuário, fora do código:** a conferência no sandbox (seção no fim).

`npm run validate`: linha de base 187 suítes / 2669 testes → final **190 suítes / 2736 testes**, exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos, todos preexistentes em `src/`.

Branch: `sdd-10-finalizacao-codigo`, única para todo o SDD 10, no checkout principal, **sem worktree**. Commit só quando o usuário pedir. Alterações alheias ao épico: `metro.config.js`, `package.json`, `package-lock.json` (não tocar, não incluir em commit).

## Tarefas (ordem de execução)

- [x] **T0 — Linha de base.** `npm run validate` e `git status`, com o resultado anotado aqui. *Prova:* saída colada. **Feita em 2026-10-19:** exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos (preexistentes, em `src/`); Jest **187 suítes / 2669 testes**. `git status`: só os alheios e os docs do E5.
- [x] **T1 — Corte de observação compartilhado.** `tools/observacao.ts`; `medicamentosSaida.ts` importa e reexporta. Depende de: T0. *Prova:* `observacao.test.ts`; `medicamentosTool.test.ts` sem mudança (CA-3). **Feita em 2026-10-19:** 9 testes novos, vermelhos antes (módulo inexistente), verdes depois; `medicamentosTool.test.ts` (55) verde sem mudança. **Ruling:** o teste simula o SDK da AWS, porque `texto` mora em `ownerScopedRead.ts`, que o importa — mesmo padrão dos testes de ferramenta; custo se errado: nenhum (o teste não exercita leitura).
- [x] **T2 — Consultas com observações e teto.** `consultas.ts`. Depende de: T1. *Prova:* `consultasTool.test.ts` (observação com, sem e cortada; 20 + 20 e `omitidas`; consulta sem data é a cortada; degradado sem observação; forma da saída atualizada; testes do E1 verdes) (CA-1, CA-2, CA-4, CA-5, CA-6). **Feita em 2026-10-19:** 7 testes novos e o de forma atualizado; 7 vermelhos antes (sem `observacoes`/`omitidas`), o do degradado é guarda (verde desde o início, o degradado já não mostrava observação); 14 de 14 verdes depois.
- [x] **T3 — Saída das vacinas e reforço previsto.** `tools/vacinasSaida.ts`, puro. Depende de: T1. *Prova:* `vacinasSaida.test.ts` (somar anos e 29/02; reforço da última dose; pendente tem prioridade; intervalos inválidos; agrupamento como a tela; empate de data; data com hora; campos novos e legado; teto 30 + 30 com reforço antes do teto; sem campo de situação) (CA-7 a CA-15). **Feita em 2026-10-19:** 29 testes, vermelhos antes (módulo inexistente), verdes depois.
- [x] **T4 — Ferramenta de vacinas usa a saída nova.** `vacinas.ts`. Depende de: T3. *Prova:* `vacinasTool.test.ts` (campos e reforço na saída; vazio; degradado igual ao de hoje); suíte do chat inteira verde, incluindo `tools.test.ts` (CA-19). **Feita em 2026-10-19:** 3 testes; 1 vermelho antes (ligação: sem `lote`/`reforcosPrevistos`), 2 guardas verdes desde o início (vazio; degradado igual ao de hoje); suíte do chat 38 suítes / 669 testes verdes.
- [x] **T5 — Prompt.** `chatPrompt.ts`, um item. Depende de: T2, T4. *Prova:* `chatPrompt.test.ts` (CA-16); `mapaDoApp.test.ts` verde. **Feita em 2026-10-19:** 2 testes, vermelhos antes, verdes depois; `chatPrompt.test.ts` e `mapaDoApp.test.ts` 63 de 63.
- [x] **T6 — Regras de linguagem (só teste).** `adversarial.test.ts`. Depende de: T0. *Prova:* frases do CA-17 aprovadas e do CA-18 reprovadas pela R3; se alguma divergir, parada e relato, sem mexer na regra. **Feita em 2026-10-19:** 6 frases (4 aprovadas, 2 reprovadas pela R3), todas como a spec previa, de primeira (são guardas: nenhum código de produção muda); regras 558 de 558; nenhuma mudança em `languageRules.ts`.
- [x] **T7 — Gate e documentação.** `npm run validate` verde, com a saída colada; Estado de `spec.md`, `plan.md`, deste arquivo, do README da parte e de `decisoes/README.md`. Depende de: T1 a T6. *Prova:* saída do validate (CA-20). **Feita em 2026-10-19:** antes da revisão, 190 suítes / 2725 testes; final, depois da revisão e do `/simplify`, **190 suítes / 2736 testes**, exit 0.

## Revisão (Fase 5, 2026-10-19)

Duas leituras independentes (um revisor com o código, a spec e o plano, sem as minhas conclusões, e `/code-review`), e `/simplify` em quatro ângulos. Cada correção de comportamento entrou com teste vermelho antes e verde depois (5 vermelhos → verdes; 6 frases de linguagem novas como guardas).

**Corrigido**
- **Importante — "N doses" reprova a resposta.** A R3 lê "8 doses ficaram de fora" e "a série tem 3 doses" como quantidade de remédio; a pergunta 5 da spec ficava sem resposta possível. O prompt manda contar em registros e dizer a série pela ordem da dose; os testes provam as duas redações (as que passam e as que seguem reprovadas). Regra intacta.
- **Importante — data de reforço passada.** "Está atrasado", "venceu" e "completa" passam pela verificação. O prompt agora os proíbe e manda dizer só a data registrada.
- **Importante — quais itens o teto corta.** O prompt diz quais são (aplicadas mais antigas, previstas mais distantes, consultas mais antigas e mais distantes) e que a tela mostra todos.
- **Desempate das aplicadas no mesmo dia** pelo número de dose, a mesma regra do reforço (a ordem e quem ficava no teto dependiam do banco).
- **Data aplicada fora do formato** no grupo impede o reforço (ele podia sair de uma dose mais velha que a última).
- **Estimativa de tokens** corrigida na spec, no plano e no comentário (pior caso das vacinas perto de 10 mil, não 4 mil).
- **`/simplify`:** a regra "pendente impede reforço" ficou explícita (antes funcionava por tabela, pela validação de data); sem `as string`; "sem data por último" escrito com ramos; agrupamento com `push` e a última dose por `reduce`.

**Mantido, com motivo**
- Doses do catálogo e legado com o mesmo nome são vacinas diferentes, como na tela (CA-12). Num caso raro (dT do catálogo com dose pendente e uma dT legado antiga com intervalo), saem uma data de reforço e uma dose pendente com o mesmo nome. Mudar exige decisão: levado ao usuário.
- Um reforço "escondido" quando a dose pendente da vacina cai fora do teto de 30 pendentes: exige mais de 30 doses pendentes registradas, e o prompt agora diz que as previstas mais distantes ficaram de fora.
- `intervaloDeReforcoAnos` em cada dose (o CA-7 pede): o prompt proíbe calcular.
- `omitidas` em um número só, nulos explícitos, `proxima` inteira, reexportação do teto (contrato da spec, do E1 e do CA-3).
- `maisRecente` próprio em vez de `maisRecentePrimeiro`: precisa do desempate por número de dose, que o outro não tem.

## Conferência no sandbox (pendente do usuário, fora do código)

As 5 perguntas da spec (§1) com o app autenticado e `ampx sandbox`: a observação dita como anotação da pessoa; "não há data de reforço registrada" sem estimativa; nenhuma afirmação de carteira completa ou atrasada.

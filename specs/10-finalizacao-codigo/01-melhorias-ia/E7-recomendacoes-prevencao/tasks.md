# TASKS: E7 — Recomendações de prevenção no chat

Passo a passo com teste antes da implementação: `docs/superpowers/plans/2026-10-17-e7-prevencao-chat.md`. Esta lista é o acompanhamento.

## Estado

**Concluído em 2026-10-17** (entrega aprovada pelo usuário). Spec e plano aprovados; D7.3 decidida (Opção A); T0 a T12 feitas. Nada commitado (os renomes do `git mv` estão no stage). **Pendente do usuário, fora do código:** a conferência no sandbox (seção abaixo), inclusive a medição do CA-14.

`npm run validate`: linha de base 167 suítes / 1846 testes → final **173 suítes / 1962 testes**, exit 0.

Branch: `sdd-10-finalizacao-codigo`, única para todo o SDD 10 e integrada na `main` só ao final de tudo. Trabalha-se direto no checkout principal, **sem worktree** (decisão de 2026-10-17, depois de o worktree atrapalhar a edição dos documentos). Linha de base: 166 suítes, 1840 testes, medida em um worktree temporário no mesmo commit `f0248b0`.

## Tarefas (ordem de execução)

- [x] **T0 — Preparação.** Worktree/branch; `npm run validate` na linha de base, resultado anotado aqui. *Prova:* saída colada. **Feita em 2026-10-17:** `npm run validate` verde (exit 0), 166 suítes e 1840 testes. Avisos preexistentes, não deste épico: `import/no-duplicates` em `assistantMemoryService.ts` e `act(...)` em `TypingIndicator`.
- [x] **T1 — Teste de caracterização da Lambda da tela**, escrito e verde **antes** de mover qualquer arquivo. Depende de: T0. *Prova:* `get-prevention-recommendations/__tests__/handler.test.ts` (CA-2). **Feita em 2026-10-17:** 6 testes verdes sobre o código atual; mutação de prova (`topicYear` → `topic` no handler) fez 1 falhar, e foi revertida. Linha de base no checkout principal depois de reinstalar o `node_modules` (estava corrompido): 167 suítes, 1846 testes.
- [x] **T2 — Extrair `uspstf-shared/`** (`git mv` do cliente, do filtro e do teste do filtro; handler passa a importar de lá). Depende de: T1. *Prova:* T1 e testes do filtro verdes sem editar asserção; `typecheck:backend` (CA-1, CA-2). **Feita em 2026-10-17:** `compartilhamento.test.ts` falhou (2/2) antes do `git mv` e passou depois; 18 testes verdes nas duas pastas; teste do filtro idêntico ao original (conferido com `diff --strip-trailing-cr`); filtro e cliente só ganharam o cabeçalho; handler mudou só nas 3 linhas de import; `typecheck` e `typecheck:backend` limpos.
- [x] **T3 — Cliente com timeout e falhas tipificadas.** Depende de: T2. *Prova:* `uspstf-shared/__tests__/uspstfClient.test.ts`: status não-2xx, JSON inválido, dataset sem `specificRecommendations`, timeout, sem `opcoes` igual ao de hoje (CA-7, parte). **Feita em 2026-10-17:** 9 testes; 4 falharam antes (corpo inválido ×3, timeout pendurado) e passaram depois. Achado no caminho: a 1ª versão do teste de timeout passava pelo motivo errado (`TypeError` no mock); corrigida para afirmar o `signal`. Única mudança visível para a tela: corpo 200 inválido agora lança "resposta inesperada" no cliente, em vez de `TypeError` no filtro; a query falha nos dois casos.
- [x] **T4 — Cache do dataset** (`tools/prevencaoDataset.ts`). Depende de: T3. *Prova:* `__tests__/prevencaoDataset.test.ts`: 1 requisição dentro do TTL, nova depois, falha não cacheada, duas chamadas simultâneas = 1 requisição (CA-13). **Feita em 2026-10-17:** 7 testes; vermelho por módulo ausente, verde depois; mutação (falha passando a ficar no cache) pegou 1 teste, revertida.
- [x] **T5 — Montagem da saída, pura** (`tools/prevencaoSaida.ts`). Depende de: T2. *Prova:* `__tests__/prevencaoSaida.test.ts`: ordem por nota, teto 12, texto 400 com `…`, `omitidas` exata, sem `rationale`/`id`/traduções, `faixaEtaria` nula quando ausente (CA-10, CA-11 parte, CA-12). **Feita em 2026-10-17:** 14 testes; vermelho por módulo ausente, verde depois; `typecheck:backend` limpo.
- [x] **T6 — A ferramenta** (`tools/prevencao.ts`). Depende de: T4, T5. *Prova:* `__tests__/prevencaoTool.test.ts`: sem perfil (sem chamar `fetch`), data de nascimento inválida, falhas da fonte, nenhuma casa, caminho feliz, `filtrosAplicados`, entrada com campo extra rejeitada, requisição sem dado do usuário, saída idêntica ao handler para os mesmos ids (CA-3, 5, 6, 7, 8, 9, 11). **Feita em 2026-10-17:** 18 testes; vermelho por módulo ausente, verde depois; mutação na guarda de data inválida pegou 1 teste, revertida; `typecheck:backend` limpo. Ajuste: o caso de entrada com campo a mais testa só o `inputSchema` aqui, e o caminho pelo `runTool` fica no `tools.test.ts` (T7), porque o registro em `CHAT_TOOLS` é da T7.
- [x] **T7 — Registro, classificação clínica e modo degradado.** Depende de: T6. *Prova:* `tools.test.ts` (lista inteira), `verificacao.test.ts` (R2), teste de `renderDegraded` (CA-4, 15, 16). **Feita em 2026-10-17:** 7 testes novos, todos vermelhos antes e verdes depois; com a ferramenta registrada, os testes de lista inteira do `tools.test.ts` (nenhuma escreve, dono só do token, dono plantado reprova) passaram a cobri-la; 30 suítes relacionadas verdes (492 testes); `typecheck:backend` limpo. **Correção de rumo:** o encaminhamento é escrito pelo aplicativo (A2/C3), então a resposta de prevenção é costurada com `TEXTO_DE_ENCAMINHAMENTO`, e não reprovada pela R2. CA-16 da spec e T8 do plano corrigidos.
- [x] **T8 — Prompt.** Depende de: T7. *Prova:* `chatPrompt.test.ts` (CA-17). **Feita em 2026-10-17:** 7 testes, vermelhos antes e verdes depois; um bullet só em "Como você trabalha"; um teste garante que o bullet **não** manda o modelo encaminhar (o encaminhamento é do aplicativo); 154 testes verdes em prompt, ferramentas e regras de linguagem.
- [x] **T9 — Reforço da R3 para indicação individual e "em dia".** Decidida pela D7.3 = A. Depende de: T7. *Prova:* `ai-language-rules/__tests__/` e `verificacao.test.ts` (CA-18). **Feita em 2026-10-17:** dois padrões novos em `PADROES_R3` (indicação individual de exame; "em dia/atrasado" com assunto de prevenção), antes do padrão de diagnóstico; 14 casos no `adversarial.test.ts` (9 reprovam, com o motivo conferido; 5 passam) e 1 de ponta a ponta no `verificacao.test.ts` (a costura do encaminhamento não salva a indicação). 9 vermelhos antes, verdes depois; mutação no padrão de indicação pegou 2 testes, revertida; 132 testes da `ai-language-rules` verdes, inclusive o que exige que o bloco de regras passe na própria verificação. **Achado preexistente, não alterado:** "Se você tem dúvida, converse com seu médico" já era reprovada pelo padrão de diagnóstico ("você tem…"). É falso positivo antigo; afrouxar a R3 exige decisão, então a frase saiu da lista de "deve passar".
- [x] **T10 — Infraestrutura.** Segredo no `resource.ts` do chat; conferência de que `backend.ts` não precisa mudar e de que não há concessão de escrita. Depende de: T6. *Prova:* varredura de escrita em `tools.test.ts` + `typecheck:backend` (CA-19). **Feita em 2026-10-17:** `__tests__/infraPrevencao.test.ts` (3 testes: segredo via `secret()`, nenhuma concessão de escrita ao chat, `UserProfile` no laço de `grantReadData`); o do segredo falhou antes e passou depois; `backend.ts` não mudou; `typecheck:backend` limpo. **Não verificado:** o deploy (`ampx sandbox`) com o segredo no ambiente do chat.
- [x] **T11 — Medição e conferência manual preparadas.** Roteiro de medição (tamanho e latência) e roteiro das 5 perguntas, para o usuário rodar no sandbox. *Prova:* seção "Conferência no sandbox" abaixo preenchida (CA-14). **Roteiro escrito em 2026-10-17; a execução é do usuário e não foi feita.**
- [x] **T12 — Gate e fechamento.** `npm run validate`; `/code-review`; `/simplify`; lista da seção 8 do PROMPT-PADRAO; READMEs atualizados. Depende de: todas. *Prova:* saída colada (CA-20). **Revisão feita e entrega aprovada pelo usuário em 2026-10-17.** `npm run validate` final: exit 0, 173 suítes, 1962 testes, 0 erros de tipo, lint 0 erros e 12 avisos, todos em `src/` (não tocado). Ver "Revisão" abaixo.

## Revisão (Fase 5, 2026-10-17)

Três leituras: `/code-review` sobre `amplify/`, um subagente revisor independente (recebeu o código e a spec, não a conclusão) e `/simplify` com quatro ângulos (reuso, simplificação, eficiência, altitude). Cada achado corrigido entrou por TDD: teste vermelho antes, verde depois.

**Corrigido**
- **R3 de prevenção reprovava resposta legítima:** "fazer login para ver os exames", "upload do laudo do exame", "marcar a opção…", "marcar uma consulta sobre os exames", dose de vacina "atrasada" no calendário do app, "a consulta de retorno do exame está atrasada", "pergunte ao médico se os exames estão em dia". Causa: janela livre de 60 caracteres entre o verbo e o exame. Correção na causa: o exame precisa ser o **objeto** do verbo (só determinantes ou um aposto entre vírgulas); vacina saiu do assunto do "em dia"; agenda e resultado antes do "em dia" não contam; pergunta ("pergunte… se", "saber se") absolve o "em dia".
- **R3 de prevenção deixava passar indicação:** "Faça a colonoscopia", "Agende sua mamografia", "Recomendo que você faça…", "É importante que você faça…", "Você precisa de uma mamografia", "Você deve começar a fazer…", "Você já deveria ter feito…", aposto longo, "Você está com os exames em dia", "em atraso".
- **A exceção de recusa contornava a R3 inteira** (não só a de prevenção): "Não sei sua idade exata, mas você deve fazer mamografia" e uma 2ª indicação depois de uma recusa passavam. Agora a recusa só absolve na mesma oração (sem ponto, "mas", "porém"... no meio), e o verificador olha **todas** as ocorrências. É reforço de regra compartilhada; os 154 testes antigos das regras continuam verdes.
- **Custo:** a 1ª correção pôs um lookbehind sem teto antes de cada posição e levou a suíte de regras a minutos; corrigido (teto de 120, depois do trecho casado) e medido: 4 ms para verificar 5.856 caracteres. As cópias globais das expressões passam a ser montadas uma vez, no carregamento.
- **Modo degradado:** "Nota D (a fonte recomenda não fazer)" em vez de "Nota D" solta sob "Recomendações".
- **Teto cortava as notas D primeiro:** ordem passou a A, B, D, C, I (A e B continuam primeiro).
- **Texto cortado apresentado como inteiro:** a saída marca `textoCortado`, e o prompt manda dizer que é trecho.
- **"falta esse dado no perfil"** era falso para sexo "Outro": o prompt diz que o filtro não pôde usar o dado.
- **`numero` duplicado** aceitava `Infinity` (peso infinito → IMC "obesidade"): reusa o de `linhasDeResultado.ts`.
- **Provas que faltavam:** CA-3 (o chat importa do módulo compartilhado; a lista do chat é a da Lambda da tela, rodada de verdade), CA-7 (falha de rede), CA-9 (a fiação real da busca leva só a chave e o `signal`), CA-18 ("no seu caso a faixa…"), CA-19 (nenhuma política avulsa nem `grantFullAccess` dá escrita ao chat).
- **Simplificação:** tabela única de notas (ordem + sentido), ordenação estável sem índice, um `fetch` só no cliente, auxiliares para os trechos repetidos das expressões.

**Descartado, com motivo**
- Cache e timeout também na Lambda da tela: contraria a decisão 1 do `plan.md` (mudar a tela está fora do escopo do E7).
- Marcar "clínica" no próprio `ChatTool` em vez de `TOOLS_CLINICAS`: refactor do mecanismo existente, fora do escopo.
- Enxugar o dataset antes de cachear: o tamanho não foi medido (CA-14 depende do sandbox).
- Utilitário compartilhado de mock do SDK nos testes: o padrão já se repete em 8 arquivos; mudá-lo é refactor fora do épico.
- O revisor de reuso disse que `NaN` de peso virava IMC "obesidade": falso (`computeBmiBucket` trata `NaN` como ausente); o caso real era `Infinity`, que foi corrigido.

**Achado preexistente, não alterado:** "Se você tem dúvida, converse com seu médico" é reprovada pelo padrão de diagnóstico ("você tem…") desde antes do E7. Afrouxar a R3 exige decisão.

## Conferência no sandbox (T11, a ser feita pelo usuário)

**Não executada pelo agente.** Exige `npm run amplify:sandbox` com o segredo `USPSTF_API_KEY` configurado (o mesmo que a tela de Prevenção já usa), e um usuário de teste com perfil preenchido.

**(a) Medição da fonte (CA-14).** Nos logs do CloudWatch da função do chat, ou com uma chamada única à API no mesmo ambiente, anotar:
- tamanho da resposta da USPSTF (bytes): ______
- latência da primeira consulta (cache frio): ______ ms
- latência de uma segunda pergunta em menos de 10 min (cache quente; esperado: sem nova chamada): ______ ms

**Limite de parada (plan.md, seção 6):** acima de 5 MB ou de 4 s, o épico volta ao usuário para decidir se migra para cache persistente (Opção C da D7.1).

**(b) As 5 perguntas da spec**, no app, uma conversa cada. Para cada resposta, conferir: texto puro, nota e ano por item, fonte "USPSTF", aviso de que o português é adaptação, frase de encaminhamento no fim, e **ausência** de "você deve", "você precisa" e "você está em dia".

| # | Pergunta | Resultado |
|---|---|---|
| 1 | que exames de prevenção eu devia fazer na minha idade? | |
| 2 | preciso fazer mamografia? | |
| 3 | o que eu faço pra prevenir cancer de intestino | |
| 4 | tem vacina ou exame q é recomendado pra mim essa idade | |
| 5 | oq o app mostra na parte de prevenção? | |

**(c) Casos de borda:**
- Perfil sem peso: a resposta avisa que a lista pode incluir recomendações de outros grupos.
- Usuário sem perfil: a resposta manda preencher o perfil.
- A lista do chat bate com a da tela de Prevenção para o mesmo usuário (mesmos títulos).

## Contagem de testes

- Linha de base (checkout principal, depois de reinstalar o `node_modules`): 167 suítes, 1846 testes (166/1840 sem o teste de caracterização da T1).
- Final: 173 suítes, 1962 testes. O E7 acrescentou 122 testes e 7 suítes sobre 1840/166 (contando os 6 da T1).

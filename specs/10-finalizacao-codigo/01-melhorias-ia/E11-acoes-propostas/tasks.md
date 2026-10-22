# TASKS: E11 — Ações propostas pela IA e confirmadas pelo usuário

Passo a passo com teste antes da implementação: `docs/superpowers/plans/2026-10-20-e11-acoes-propostas.md`. Esta lista é o acompanhamento.

## Estado

**Concluído em 2026-10-20** (entrega aprovada pelo usuário; depois, a pedido dele, os oito menores da revisão também foram corrigidos, seção abaixo). T0 a T12 feitas; revisão com correções abaixo. Decisões D11.1 a D11.4 = A. **Pendente do usuário, fora do código:** a conferência no sandbox (seção no fim).

`npm run validate`: linha de base 222 suítes / 3741 testes → depois da T11, 231 / 3908 → depois da revisão, 231 / 3933 → final, depois dos menores, **231 suítes / 3976 testes**, exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos, todos preexistentes.

Branch: `sdd-10-finalizacao-codigo`, única para todo o SDD 10, no checkout principal, **sem worktree**. Commit só quando o usuário pedir. Alterações alheias ao épico: `metro.config.js`, `package.json`, `package-lock.json` (não tocar, não incluir em commit).

## Tarefas (ordem de execução)

- [x] **T0 — Linha de base.** `npm run validate` e `git status`, com o resultado anotado aqui. *Prova:* saída colada. **Feita em 2026-10-20:** exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos (preexistentes); Jest **222 suítes / 3741 testes**. `git status`: E4, E6 e E10 ainda sem commit, os alheios (`metro.config.js`, `package.json`, `package-lock.json`) e os docs do E11.
- [x] **T1 — Corte do nome sem posologia extraído.** `tools/nomeSemPosologia.ts`; `receitasSaida.ts` importa. Depende de: T0. *Prova:* `nomeSemPosologia.test.ts`; `receitasSaida`/`receitasTool` sem mudança. **Feita em 2026-10-20:** 5 testes novos, vermelhos antes (módulo inexistente), verdes depois; testes do E4 (65) verdes sem mudança.
- [x] **T2 — Módulo compartilhado da ação.** `acoes-propostas-shared/camposDaAcao.ts`. Depende de: T0. *Prova:* `camposDaAcao.test.ts` (forma, limites, parâmetros de rota, data por extenso, não importa nada) (CA-14, parte do CA-2). **Feita em 2026-10-20:** 28 testes, vermelhos antes (módulo inexistente), verdes depois.
- [x] **T3 — Gramática de data e hora.** `acoes/expressaoDeData.ts`. Depende de: T2. *Prova:* `expressaoDeData.test.ts` com relógio fixo (CA-5). **Feita em 2026-10-20:** 44 testes, vermelhos antes (módulo inexistente), verdes depois.
- [x] **T4 — Validação da proposta.** `acoes/acaoValida.ts`. Depende de: T1, T2, T3. *Prova:* `acaoValida.test.ts` (fala da pessoa, histórico, ferramenta e anexo não contam, corte do nome, tipo de compromisso, sem campo = sem proposta) (CA-3, CA-4, CA-6). **Feita em 2026-10-20:** 14 testes, vermelhos antes (módulo inexistente), verdes depois. `acaoSchema` nasceu em `chatSchema.ts`, ainda fora do envelope.
- [x] **T5 — Envelope e verificação.** `chatSchema.ts`, `types.ts`, `conversationLoop.ts` (tipo), `verificacao.ts`. Depende de: T4. *Prova:* `acaoNoEnvelope.test.ts` e `acaoNaVerificacao.test.ts` (resposta sem `acao` igual; proposta ruim não derruba resposta; ação vence memória; degradada sem ação; sem `hoje` sem ação) (CA-1, CA-2, CA-7, CA-8). **Feita em 2026-10-20:** 16 testes; 8 vermelhos antes (sem `acao` no envelope, sem `acaoProposta`, sem `hoje`), 8 guardas de ausência verdes desde o início; suíte do chat 72 suítes / 1250 testes verdes; `typecheck:backend` limpo depois de ajustar 4 asserções que liam campo da união.
- [x] **T6 — R5: ação concluída.** `languageRules.ts`. Depende de: T0. *Prova:* `adversarial.test.ts` (barra e passa do CA-9); suíte de linguagem inteira verde. **Feita em 2026-10-20:** 28 testes (8 frases barradas e 6 aprovadas, nas perguntas operacional e clínica); as 16 barradas vermelhas antes, as 12 aprovadas guardas verdes desde o início; suíte inteira 224 suítes / 3857 testes verdes, nenhuma frase antiga passou a ser barrada.
- [x] **T7 — Prompt.** `chatPrompt.ts`. Depende de: T5, T6. *Prova:* `chatPrompt.test.ts` (CA-10). **Feita em 2026-10-20:** 7 testes, vermelhos antes, verdes depois; `mapaDoApp`, `memoriaNoEnvelope` e regras de linguagem verdes. O parágrafo ficou com ~400 tokens, não os 250 estimados (ver `plan.md`).
- [x] **T8 — Serviço do app.** `aiAssistantService.ts`. Depende de: T2. *Prova:* `aiAssistantService.test.ts` (CA-11, forma). **Feita em 2026-10-20:** 4 testes; 1 vermelho antes (a ação não chegava), 3 guardas de descarte verdes desde o início; 29 de 29 no arquivo.
- [x] **T9 — Cartão.** `ActionProposalCard.tsx`. Depende de: T2. *Prova:* `cartaoDeAcao.test.tsx` (CA-12). **Feita em 2026-10-20:** 8 testes, vermelhos antes (componente inexistente), verdes depois.
- [x] **T10 — Hook e tela do chat.** `useChatBot.ts`, `ChatBotScreen.tsx`. Depende de: T8, T9. *Prova:* `acaoNoChat.test.tsx` (um cartão por vez, recusa não volta, abrir navega com parâmetros, nada gravado) (CA-11, CA-15). **Feita em 2026-10-20:** 5 testes; 4 vermelhos antes, 1 guarda (o cartão não vai ao histórico) verde desde o início; testes da tela do chat verdes (51 em 5 arquivos).
- [x] **T11 — Formulários preenchidos.** rotas e telas de compromisso e remédio. Depende de: T2. *Prova:* `formularioPreenchido.test.tsx` (preenchidos, frase neutra, sem parâmetro igual a hoje, parâmetro inválido descartado, nada gravado sem Salvar) (CA-13, CA-14, CA-15). **Feita em 2026-10-20:** 8 testes; 5 vermelhos antes, 3 guardas (sem parâmetro igual a hoje, link inválido) verdes desde o início; testes das telas de formulário verdes (71 em 6 arquivos). O aviso virou o componente `AvisoDeCamposPreenchidos`.
- [x] **T12 — Gate, preview e documentação.** `npm run validate` verde com saída colada; screenshot do cartão e do formulário pela web preview, se a tela da prévia permitir; Estado de `spec.md`, `plan.md`, deste arquivo, do README da parte e de `decisoes/README.md`; PRD 11.1 a 11.3 atualizados. Depende de: T1 a T11. *Prova:* saída do validate (CA-16). **Feita em 2026-10-20:** validate verde (números no Estado); três prévias novas no `dev-preview` e screenshots do cartão e dos dois formulários preenchidos, conferidos (o aviso ganhou margem embaixo depois do primeiro screenshot); o cartão dentro da conversa real não foi visto, porque depende da resposta da função. `spec.md`, `plan.md`, READMEs e PRD atualizados.

## Revisão (Fase 5, 2026-10-20)

Uma leitura independente (revisor com o código, a spec e o plano, sem as minhas conclusões). Cada correção entrou com teste vermelho antes e verde depois.

**Corrigido** (detalhe em `spec.md`, seção 8)
- **Importante — o texto prometia um formulário que podia não existir.** A frase do formulário passou para o código (`acoes/fraseDaAcao.ts`) e só entra quando o cartão sai; o modelo diz o caminho no app. 4 testes na verificação e 1 no prompt.
- **Importante — a R5 barrava "inclui" no presente.** Exige "incluí". 4 testes (2 frases × 2 tipos de pergunta).
- **Importante — o cartão passava para outra conversa.** Limpo em toda troca de conversa. 2 testes na tela do chat.
- **Importante — dose por extenso ou pelo link no nome.** Corte por palavra de dose no módulo compartilhado. 10 testes.
- **Importante — data relativa de mensagem antiga.** Data e hora só da mensagem do turno. 3 testes.

**Menores, corrigidos a pedido do usuário** (cada um com teste vermelho antes e verde depois)
- **Histórico da validação = janela do modelo.** Só as últimas 12 mensagens contam (`janelaDoHistorico.ts`, lido pelo laço e pela verificação). 1 teste.
- **Período que contradiz a hora** ("13 da manhã", "8 da tarde", "2 da noite") fica sem hora; manhã é 1 a 11, tarde 1 a 6 (+12), 12 ou 13 a 18, noite 6 a 11 (+12), 12 (meia-noite) ou 18 a 23. 15 testes.
- **Tipo Exame ou Cirurgia** só com a palavra no próprio nome do compromisso, ou, sem nome, na mensagem do turno. 3 testes.
- **Campo só de palavra vazia** ("de", "da", "com a") some, no módulo compartilhado. 7 testes.
- **Envio que falha** tira o cartão anterior. 1 teste.
- **Toque duplo** em "Abrir formulário" abre uma vez só (trava no cartão). 1 teste.
- **Voz passiva** ("Consulta marcada!", "foi agendada", "Agendado!") barrada pela R5 nos turnos em que o modelo propôs ação (`comAcaoProposta`); negação ou condição na mesma oração absolve ("nada foi salvo", "só fica salvo quando você tocar"); fora desses turnos, a passiva honesta sobre o que já está cadastrado continua passando. 12 testes de linguagem e 2 na verificação.
- **Ação inválida não depende mais do Bedrock:** `acao` tem `.catch(undefined)`; tipo fora da lista ou campo desconhecido viram ação ausente e a resposta continua válida (antes, reprovavam o parse inteiro). 3 testes.

**Decisões tomadas na execução**
- Sem worktree e sem commit por tarefa (memória do usuário: branch única do SDD 10; commit só quando ele pedir).
- Quatro asserções de teste das T2 e T4 passaram a comparar o objeto `campos` inteiro (acessar campo da união não compila no `typecheck:backend`).
- O prompt ficou com ~400 tokens, não 250.
- Nova conversa, abrir e retomar limpam o cartão de ação (corrigido na revisão; antes, decidido como "igual à memória").
- O aviso do formulário virou componente; margem embaixo sem teste (estilo puro).
- Data e hora só da mensagem do turno, sem aceitar mensagens seguidas da pessoa sem resposta no meio (o app alterna; se mudar, a data dita em duas mensagens seguidas fica vazia).

## Conferência no sandbox (pendente, fora do código)

Com `ampx sandbox` e um aparelho ou emulador, perguntar as cinco frases da spec (seção 1) e anotar: se o cartão aparece, quais campos sobrevivem à conferência contra a fala (o modelo pode reescrever o nome e perdê-lo), se a resposta diz "preparei o formulário", e se "Abrir formulário" abre a tela certa preenchida.

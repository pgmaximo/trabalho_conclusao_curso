# TASKS: E1 — Data de hoje e mapa do app

Passo a passo com teste antes da implementação: `docs/superpowers/plans/2026-10-18-e1-contexto-e-mapa.md`. Esta lista é o acompanhamento.

## Estado

**Concluído em 2026-10-19** (entrega aprovada pelo usuário). T0 a T7 feitas; revisão com correções abaixo; o achado fora do épico (dia em UTC na tela de campanhas) foi corrigido a pedido do usuário. Decisões D1.1, D1.2, D1.3 e P1 fechadas (todas A). **Pendente do usuário, fora do código:** a conferência no sandbox (seção no fim), que ele fará depois de toda a Parte 1.

`npm run validate`: linha de base 183 suítes / 2615 testes → final **187 suítes / 2669 testes**, exit 0; lint 0 erros e 12 avisos, todos preexistentes em `src/`. (Uma rodada em 2026-10-19 teve timeout em `login-screen.test.tsx`, tela alheia ao épico, por carga da máquina: passa isolado em 2,8 s e na rodada seguinte.)

Branch: `sdd-10-finalizacao-codigo`, única para todo o SDD 10, no checkout principal, **sem worktree**. Commit só quando o usuário pedir. Alterações alheias ao épico: `metro.config.js`, `package.json`, `package-lock.json` (não tocar, não incluir em commit). O E9 foi commitado (`c905349`) antes da T0.

## Tarefas (ordem de execução)

- [x] **T0 — Linha de base.** `npm run validate` e `git status`, com o resultado anotado aqui. *Prova:* saída colada. **Feita em 2026-10-18:** typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos (preexistentes, em `src/`); Jest **183 suítes / 2615 testes** verdes, exit 0. `git status`: só os alheios e os docs do E1 (o E9 foi commitado antes, em `c905349`).
- [x] **T1 — Corte de consultas na hora de Brasília (achado A1).** `momentoEmSaoPaulo` em `formatoPtBr.ts`; `consultas.ts` corta por ele, e a consulta só com data de hoje conta como futura. Depende de: T0. *Prova:* `formatoPtBr.test.ts` (3 instantes); `consultasTool.test.ts` (08h00 → futura e próxima; 10h01 → passada; 22h30 com a das 23h → futura; só data de hoje → futura; só data de ontem → passada; forma da saída intacta) (CA-9). **Feita em 2026-10-18:** 7 testes novos (1 do formatador, 6 da ferramenta); 3 da ferramenta e o do formatador vermelhos antes (o defeito A1 reproduzido: 08h → passada; 22h30 → passada; só data de hoje → passada), todos verdes depois.
- [x] **T2 — Texto do bloco de data.** `contextoDeHoje.ts`, puro, fuso explícito. Depende de: T0. *Prova:* `contextoDeHoje.test.ts` (virada de dia, meia-noite, dois dígitos, os 7 dias da semana, nenhum getter local nem import) (CA-1, CA-2, CA-3). **Feita em 2026-10-18:** 10 testes, vermelhos antes (módulo inexistente), verdes depois. `FUSO_DO_APP` ficou interno ao módulo (nenhum consumidor fora dele).
- [x] **T3 — Segundo bloco de `system`, relógio lido uma vez.** `TurnInput.contextoDeHoje`, `chamar`, `responder`. Depende de: T2. *Prova:* `conversationLoop.test.ts` (dois blocos com, um bloco sem, fora de `messages`, a segunda geração com o mesmo bloco) (CA-4, CA-5, CA-6); `verificacao.test.ts` (data na entrada com relógio falso; a regeneração recebe a mesma entrada) (CA-6). **Feita em 2026-10-18:** 6 testes novos, 4 vermelhos antes (o de "fora de `messages`" e o de "um bloco só" são guardas, verdes desde o início); 34 suítes / 603 testes do chat verdes; typecheck:backend limpo.
- [x] **T4 — Mapa do app como dado.** `mapaDoApp.ts`, 21 telas, 6 fora com motivo. Depende de: T0. *Prova:* `mapaDoApp.test.ts` (rotas existem; toda tela mapeada ou excluída; rótulos iguais a `APP_TABS`/`MORE_MENU_ITEMS`; botões no código da tela; sem rota nem marcação no texto; ≤ 1.800 caracteres; apelidos) (CA-11 a CA-15, CA-18). **Feita em 2026-10-18:** 11 testes, vermelhos antes (módulo inexistente), verdes depois; conferidos também por mutação (rota trocada, rótulo trocado, botão inexistente: 4 reprovações). O mapa saiu com 1.884 caracteres e foi encurtado no texto, não no teto: 1.787. **Desvios:** apelido como "(ou tela de X)"; "Histórico de conversas" ficou fora (não é rota nem passo de tela mapeada). **Desvio no fechamento (2026-10-22, decisão do usuário):** o merge com a `main` trouxe duas telas novas dos colegas; `terms` foi para `FORA_DO_MAPA` e `health-imports` ("Suas importações") entrou no mapa, que foi a 1.882 caracteres. O teto do CA-18 subiu para **1.900** (cerca de 20 tokens a mais), em vez de encurtar o texto das outras telas na véspera da apresentação.
- [x] **T5 — Prompt com data e mapa.** `chatPrompt.ts`. Depende de: T4. *Prova:* `chatPrompt.test.ts` (prompt constante e sem data; instrução da data; regra de tempo decorrido da P1; mapa e "não invente"; toda "tela de X" é nome ou apelido do mapa) (CA-7, CA-8, CA-16, CA-17). **Feita em 2026-10-18:** 5 testes; 3 vermelhos antes, e 2 guardas verdes desde o início (sem data no prompt; toda "tela de X" já tinha apelido no mapa da T4). Um item novo em "Como você trabalha" e o parágrafo do mapa antes do formato. 35 suítes / 619 testes do chat verdes.
- [x] **T6 — Data e caminho passam pelas regras.** Só teste, em `adversarial.test.ts`. Depende de: T0. *Prova:* frases do CA-10 e do CA-19 aprovadas; se alguma reprovar, parada e relato aqui, sem mexer na regra (CA-10, CA-19). **Feita em 2026-10-18:** 6 frases (5 operacionais, 1 clínica com encaminhamento), todas aprovadas de primeira; nenhuma parada, nenhuma mudança em `languageRules.ts`. 3 suítes / 550 testes das regras verdes.
- [x] **T7 — Gate e documentação.** `npm run validate` verde, com a saída colada; Estado de `spec.md`, `plan.md`, deste arquivo e do README da parte; proposta de linha para o `CLAUDE.md`. Depende de: T1 a T6. *Prova:* saída do validate (CA-20). **Feita em 2026-10-18:** antes da revisão, 186 suítes / 2660 testes; **final, depois da revisão e do `/simplify`: `npm run validate` exit 0, 186 suítes / 2664 testes**, typecheck e typecheck:backend limpos, lint 0 erros e 12 avisos (todos preexistentes, em `src/`). Linha de base: 183 / 2615.

## Revisão (Fase 5, 2026-10-18)

Três leituras: um revisor independente (com o código, a spec e o plano, sem as minhas conclusões), `/code-review` (nível alto) e `/simplify` em quatro ângulos. Os dois primeiros acharam o mesmo defeito principal. Toda correção de comportamento entrou com teste vermelho antes e verde depois.

**Corrigido**
- **Importante — botões só com "+".** Quatro botões de cadastro (documento, remédio, compromisso, vacina) mostram só o ícone; o nome existe só para o leitor de tela. O mapa mandava procurar "Adicionar medicamento" por escrito. Agora o passo é "botão + (nome)", o prompt explica o que é, e o teste separa botão de ícone (`accessibilityLabel` + ícone "add") de botão com texto (`<Text>` visível). O teste antigo passava porque achava o nome no `accessibilityLabel`.
- **Importante — Histórico de conversas fora do mapa**, contra a spec §4. Voltou no "o que faz" do Assistente ("o relógio no alto abre as conversas antigas"), com teste que confere o ícone na tela.
- **Importante — consulta salva só com data** era futura o dia todo no chat e passada na Agenda (`parseScheduledAt` a lê como 00h00). Segue a Agenda agora; a regra especial saiu.
- **Importante — fuso em três lugares e formatador duplicado.** `FUSO` (privado) e `partesEmSaoPaulo` em `formatoPtBr.ts`; `dataEmSaoPaulo`, `momentoEmSaoPaulo` e o bloco de data saem das mesmas partes; o literal do fuso aparece uma vez (teste).
- **Importante — o prompt apontava "o bloco que segue estas instruções"**, mas a memória da pessoa vem logo depois delas. Agora aponta pelo começo do bloco ("Data e hora deste turno").
- **Importante — nada a dizer para menos de um mês.** "Só meses ou anos" deixava sem redação o exame de 6 dias atrás. Agora: menos de um mês, só a data, sem contar dias.
- **Comentário falso** sobre o bloco 0 ser constante (ele varia com a memória).
- **`/simplify`:** um formatador só; tipo e constante sem `export` desnecessário; o porquê de cada decisão num lugar, com ponteiro nos outros.

**Mantido, com motivo**
- `consultar_consultas` lê o próprio relógio, e não o instante do turno (spec §7): a janela de desacordo é de segundos, e só pesa na consulta marcada exatamente naquele minuto. Os dois revisores sugeriram passar o instante pelo `ContextoDoTurno`; fica como melhoria para quando outra ferramenta precisar.
- O teste que lê o código-fonte de `contextoDeHoje.ts` e `formatoPtBr.ts` (sem getter local de `Date`): o Jest força `TZ=America/Sao_Paulo`, e só esse teste pegaria um getter local que, na Lambda em UTC, traria o A1 de volta.
- `cachePoint` e enxugar linhas do mapa (sugestões de custo): o primeiro está fora de escopo (spec §7); o segundo quebraria a regra de toda tela mapeada.

**Adiado (menores)**
- O prompt não manda dizer com gentileza qual data o assistente tem quando a pessoa diz outra (a spec H4 diz "pode").
- O teste de "toda tela mapeada" não desce em subpastas nem em rotas `.ts` (hoje não há nenhuma).
- O teste do CA-16 é em parte tautológico (o próprio mapa traz "tela de Medicamentos").
- O custo real do mapa em tokens só se mede no sandbox (estimativa dos revisores: 550 a 650 tokens por chamada).
- O dia da semana de cada consulta fica com o modelo; sugestão para o E11: um campo `diaDaSemana` em `consultar_consultas`.

**Achado fora do épico (corrigido em 2026-10-19):** `get-vaccination-campaigns/handler.ts` usava o dia em UTC para as campanhas ativas da **tela**; entre 21h e meia-noite divergia do chat. Agora usa `diaDeHoje.ts` (fuso de São Paulo), com `__tests__/diaDeHoje.test.ts` (5 testes, vermelhos antes). `npm run validate`: exit 0, 187 suítes / 2669 testes. Limite que ficou: o cache de 12 h por UF guarda o resultado do momento em que foi gravado.

## Conferência no sandbox (do usuário, fora do código)

Com `ampx sandbox` e o app autenticado, perguntar as 5 perguntas da spec (§1) e conferir:

1. "tenho alguma consulta amanha?" — usa a data do bloco; perto da meia-noite, acerta o dia.
2. "o que eu tenho essa semana" — lista só as futuras da semana.
3. "faz quanto tempo q fiz o exame de sangue?" — data exata e "há cerca de N meses", sem contar dias.
4. "onde eu coloco os dados do meu relogio" — "Mais > Dados do smartwatch > Importar", sem link.
5. "como cadastro um remedio novo" — "Remédios > Adicionar medicamento", sem dizer que cadastra.

E uma pergunta fora do mapa ("onde vejo meu plano de saúde no app?"): diz que não sabe onde fica, sem inventar. Anotar o `inputTokens` de um turno para comparar com a meta da spec §5.

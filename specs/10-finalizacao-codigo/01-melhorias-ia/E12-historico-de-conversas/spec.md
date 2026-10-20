# SPEC: E12 — Histórico de conversas: fechar o que a persistência não cobre

Estado: **aprovada em 2026-10-20; entregue com as correções da revisão (ver `tasks.md` e `plan.md` §8), épico concluído em 2026-10-20** · Data: 2026-10-20 · Parte 1, épico 12 de 12 · Esforço: P

## 1. Identificação

- **Origem:** PRD (`../prd.md`, E12) e o estudo [`../estudos/E12-historico-de-conversas.md`](../estudos/E12-historico-de-conversas.md). O histórico já existe (C8/C9, D5, D33); o estudo achou três leituras que param na primeira página e uma pergunta sem resposta honesta garantida.
- **Tarefas do PRD cobertas:** 12.1 (levantamento, feito no estudo); 12.2 **descartada** (D12.1 = A); 12.3, nova (D12.2 = A).
- **Decisões aplicadas** (`../decisoes/E12-historico-de-conversas.md`):
  - **D12.1 = A (2026-10-20):** o assistente não lê outras conversas. Uma frase no prompt diz que ele vê só a conversa aberta e aponta o caminho que o mapa do app já tem.
  - **D12.2 = A (2026-10-20):** apagar, reabrir e listar leem até a última página, com `src/services/todasAsPaginas.ts`.
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - muda `src/services/chatHistoryService.ts` (`apagarConversa`, `lerMensagens`, `listarConversas`);
  - muda `src/components/HistoryDrawer.tsx` (mostrar a falha ao excluir, com o `InlineError` que as outras telas já usam);
  - muda `amplify/functions/chat-assistant/chatPrompt.ts` (uma frase);
  - testes: `__tests__/chatPersistence.test.ts` e `__tests__/gavetaDeHistorico.test.tsx` (ampliados), teste do prompt e casos de linguagem.
  - **Não muda:** schema do Amplify Data, `amplify/backend.ts`, ferramentas do chat, `mapaDoApp.ts`, regras de linguagem (R1 a R5), `useChatBot.ts` (as três chamadas já tratam erro).
- **Ator:** usuário (paciente) que volta a uma conversa antiga ou quer apagá-la.
- **Prioridade:** P2 para 12.3 de leitura e listagem; **P1 para a exclusão**, porque hoje ela quebra a promessa da D33.
- **Sensibilidade: alta na exclusão.** Conversa de saúde é dado sensível (LGPD, art. 11). A tela diz "ela some de vez"; se o banco não cumpre, a pessoa decidiu com base numa palavra falsa.

### Quem pergunta, e as 5 perguntas reais

**Quem e quando:** alguém que conversou com o assistente sobre um exame e, dias depois, quer lembrar o que foi dito; ou alguém que decide apagar uma conversa antes de emprestar o celular. Muitos são idosos, com baixo letramento digital.

As cinco perguntas e ações, como ela faria (as perguntas viram a conferência no sandbox):

1. "o que vc me falou ontem sobre meu exame de sangue?"
2. "lembra o que a gente conversou semana passada?"
3. "voce lembra do meu colesterol que te mostrei?" (em conversa nova)
4. Abre pela gaveta uma conversa longa, de muitas semanas, e rola até o fim.
5. Toca na lixeira de uma conversa longa e confirma "Excluir".

**O que a pessoa faz com a resposta:** reabre a conversa antiga e lê o que foi dito, com as citações de origem; ou confia que a conversa sumiu.

**O que seria pior que não responder:** o assistente "lembrar" de uma conversa que não vê e inventar o que disse; a tela dizer que excluiu e o banco guardar parte das mensagens; a gaveta esconder uma conversa que a pessoa quer apagar.

**Dado vazio, antigo ou contraditório:** a maioria das pessoas tem poucas conversas e conversas curtas; para elas nada muda de comportamento (uma página só). Conversa sem data continua indo para o fim da lista, como hoje.

## 2. Contexto e estado atual (verificado no código em 2026-10-20)

- `apagarConversa` (`chatHistoryService.ts:175`) chama `listChatMessageByConversationId` uma vez, apaga o que veio e apaga a conversa. Não lê `nextToken` e não olha o `errors` de nenhuma chamada. Com mais de uma página, as mensagens das páginas seguintes ficam no banco; com um `errors` no meio, a conversa é apagada mesmo assim.
- `lerMensagens` (`:134`) tem o mesmo padrão de uma página, e também ignora `errors`.
- `listarConversas` (`:119`) chama `ChatConversation.list()` uma vez. A tabela não tem índice por dono: o filtro de dono vem depois do limite da página, e a primeira página pode trazer poucas conversas da pessoa (risco R7 do PRD).
- `todasAsPaginas` (`src/services/todasAsPaginas.ts`) lê até a última página e lança em `errors` de qualquer página. Já é usado na exclusão em cascata de documento (`examService.ts`, `apagarLidoDoDocumento`), que é o precedente direto: lê tudo, apaga um a um, lança na primeira falha, e só então apaga o pai.
- `useChatBot.ts` já trata falha nas três: `recarregarConversas` e `abrirConversa` capturam e registram; `retomarConversa` captura e esquece a conversa aberta; `deleteConversation` deixa o erro subir.
- `HistoryDrawer.tsx` chama `onDelete` num `try/finally` **sem** `catch`: se a exclusão falha, o painel volta a ficar ativo, nada é dito à pessoa, e a promessa rejeitada fica sem tratamento. As outras telas de exclusão mostram `InlineError` (ex.: `HealthDashboardScreen.tsx:436`).
- O prompt (`chatPrompt.ts`) não diz que o assistente vê só a conversa aberta. O mapa do app já diz, na entrada Assistente, "o relógio no alto abre as conversas antigas", e o botão é o `time-outline` com rótulo "Histórico de conversas" (`ChatBotScreen.tsx:168`).
- O modelo vê as últimas 12 mensagens da conversa aberta (`HISTORY_WINDOW`). Isso não muda.

## 3. Histórias e cenários

**Histórias:** como usuário, quero que "excluir" apague a conversa inteira, para confiar no que a tela diz. Como usuário, quero reabrir uma conversa longa inteira e ver todas as minhas conversas na gaveta. Como usuário, quero que o assistente me diga a verdade quando eu perguntar de outra conversa, e me diga onde achá-la.

- **H1 — Excluir conversa longa (D33).**
  Given uma conversa com mensagens em 3 páginas
  When a pessoa confirma "Excluir"
  Then todas as mensagens das 3 páginas são apagadas, uma a uma
  And só depois a conversa é apagada.

- **H2 — Falha ao ler uma página na exclusão.**
  Given a leitura da 2ª página de mensagens devolve `errors`
  Then nenhuma mensagem e nenhuma conversa é apagada, e a exclusão lança.

- **H3 — Falha ao apagar uma mensagem.**
  Given a exclusão da 2ª mensagem devolve `errors` (ou lança)
  Then a exclusão para ali, a conversa **não** é apagada e a exclusão lança.
  And a conversa continua na gaveta, e excluir de novo termina o serviço (as mensagens que já saíram não voltam; as que ficaram ainda têm conversa a que pertencer).

- **H4 — Falha ao apagar a conversa.**
  Given as mensagens saíram e a exclusão da conversa devolve `errors`
  Then a exclusão lança.

- **H5 — A tela diz que não conseguiu.**
  Given a exclusão lança
  Then a gaveta mostra, junto da conversa, "Não foi possível excluir esta conversa. Tente novamente.", o painel de confirmação continua aberto, e a conversa continua na lista
  And nenhuma promessa fica sem tratamento.
  And ao tentar de novo, ao cancelar ou ao abrir a confirmação de outra conversa, a mensagem de erro some.

- **H6 — Reabrir conversa longa.**
  Given uma conversa com mensagens em 2 páginas
  When a pessoa a abre pela gaveta, ou a tela a retoma ao voltar à aba
  Then todas as mensagens aparecem, em ordem de `createdAt`, com as citações.

- **H7 — Falha ao reabrir.**
  Given a leitura da 2ª página devolve `errors`
  Then `lerMensagens` lança, e a tela segue o tratamento que já tem (abrir: fica onde estava; retomar: volta ao chat novo). Uma conversa pela metade não é mostrada como inteira.

- **H8 — Gaveta com a primeira página vazia.**
  Given `ChatConversation.list()` devolve uma 1ª página sem nenhuma conversa da pessoa, com `nextToken`, e uma 2ª com 2 conversas
  Then a gaveta mostra as 2, ordenadas como hoje.

- **H9 — Falha ao listar.**
  Given qualquer página da lista devolve `errors`
  Then `listarConversas` lança, e a tela segue o tratamento que já tem (gaveta como estava, conversa em andamento intacta).

- **H10 — Pergunta sobre outra conversa (D12.1, caso adversário).**
  When a pessoa pergunta, numa conversa nova, "o que vc me falou ontem sobre meu exame de sangue?"
  Then o modelo recebe no prompt que vê só a conversa aberta, que não sabe o que foi dito em outras, e que a pessoa as reabre pelo relógio no alto da tela
  And a resposta não inventa o que foi dito; pode oferecer ver o exame agora pelas ferramentas.
  And uma resposta como "Não consigo ver outras conversas. Toque no relógio no alto desta tela para reabrir a de ontem. Se quiser, vejo agora o seu exame de sangue. Para entender o resultado, converse com o seu médico." passa pelas regras de linguagem (ver CA-13).

- **H11 — Gravar um turno não muda.**
  `salvarTurno` e `criarConversa` continuam como estão: nunca lançam por causa do registro (o turno já está na tela).

## 4. Mapa de dados

**`apagarConversa(conversationId)`**
- **Lê:** `ChatMessage` pelo índice `conversationId`, todas as páginas, pela autorização de dono do AppSync (sem mudança de permissão).
- **Escreve:** `ChatMessage.delete` de cada mensagem; depois `ChatConversation.delete`.
- **Garante:** a conversa só sai depois de todas as mensagens; qualquer `errors` ou exceção interrompe e lança, com a mensagem "Não foi possível excluir esta conversa." (`backendError`, como as outras exclusões).

**`lerMensagens(conversationId)`**
- **Lê:** `ChatMessage` pelo índice, todas as páginas.
- **Devolve:** a mesma forma de hoje (`id`, `role`, `content`, `createdAt`, `citations`), ordenada em memória.

**`listarConversas()`**
- **Lê:** `ChatConversation.list()`, todas as páginas.
- **Devolve:** a mesma forma e a mesma ordem de hoje.

**Prompt:** uma frase. **Não devolve** nada novo ao modelo: nenhuma ferramenta, nenhum texto de outra conversa.

## 5. Requisitos não funcionais

- **Segurança e LGPD:** nada muda na autorização (dono pelo AppSync). A função do chat continua sem acesso a `ChatConversation` e `ChatMessage`: nenhum `grantReadData` novo, nenhuma ferramenta nova. A exclusão passa a cumprir a D33 em conversas longas.
- **Nada quebra o que existe (regra 5):** sem mudança de schema. Mensagens órfãs que já existam hoje no banco (de exclusões passadas de conversas longas) **não** são alcançadas por este épico: não há tela que as liste e não há índice por dono para achá-las. Fica registrado como risco, sem migração.
- **Desempenho:** pessoa com uma página de conversas e conversas curtas faz as mesmas chamadas de hoje. Leitura de várias páginas é sequencial (o `nextToken` de uma é a entrada da outra). A exclusão continua uma chamada por mensagem, em série, como o precedente do documento; o paralelismo foi descartado no plano para manter a parada na primeira falha simples.
- **Custo de tokens:** a frase do prompt entra em todo turno (perto de 60 tokens; *corrigido no plano, dizia 40*). Nenhuma outra mudança no contexto do modelo.
- **Texto da tela:** uma linha nova, em pt-BR simples, no padrão das outras exclusões.

## 6. Critérios de aceite

**Exclusão (H1 a H5)**

- **CA-1.** Com mensagens em 3 páginas, `apagarConversa` chama `ChatMessage.delete` para cada uma das mensagens das 3 páginas, passa o `nextToken` de cada página para a seguinte, e chama `ChatConversation.delete` uma vez, depois de todas. (`chatPersistence.test.ts`)
- **CA-2.** Com `errors` na leitura da 2ª página, nenhum `delete` é chamado e a função lança. (`chatPersistence.test.ts`)
- **CA-3.** Com `errors` (e, em outro caso, exceção) na exclusão da 2ª mensagem, a 3ª não é apagada, `ChatConversation.delete` não é chamado e a função lança. (`chatPersistence.test.ts`)
- **CA-4.** Com `errors` em `ChatConversation.delete`, a função lança. (`chatPersistence.test.ts`)
- **CA-5.** Os três testes existentes de "apagar significa sumir" seguem verdes sem mudança de asserção. (`chatPersistence.test.ts`)
- **CA-6.** Na gaveta, se `onDelete` rejeita: aparece "Não foi possível excluir esta conversa. Tente novamente." junto da conversa, o painel de confirmação continua aberto e o botão volta a ficar ativo. Cancelar, tentar de novo ou abrir a confirmação de outra conversa tira a mensagem. Com sucesso, nenhuma mensagem de erro aparece. (`gavetaDeHistorico.test.tsx`)

**Reabrir e listar (H6 a H9)**

- **CA-7.** Com mensagens em 2 páginas, `lerMensagens` devolve todas, ordenadas por `createdAt`, com as citações lidas. (`chatPersistence.test.ts`)
- **CA-8.** Com `errors` em qualquer página, `lerMensagens` lança. (`chatPersistence.test.ts`)
- **CA-9.** Com a 1ª página de `ChatConversation.list()` vazia e `nextToken`, e a 2ª com 2 conversas, `listarConversas` devolve as 2, mais recente primeiro. (`chatPersistence.test.ts`)
- **CA-10.** Com `errors` em qualquer página, `listarConversas` lança. (`chatPersistence.test.ts`)
- **CA-11.** Os testes de tela que já cobrem abrir, retomar e listar (`chatbot-screen.test.tsx` e os demais que mockam o serviço) seguem verdes.

**Prompt e linguagem (H10)**

- **CA-12.** `SYSTEM_PROMPT` diz que o assistente vê só a conversa aberta, que não sabe o que foi dito em outras conversas e não deve supor, e que a pessoa as reabre pelo caminho do mapa. (teste do prompt, por trecho)
- **CA-13.** Passa pelas regras de linguagem, nos dois tipos de pergunta: "Não consigo ver outras conversas. Toque no relógio no alto desta tela para reabrir a de ontem. Se quiser, vejo agora o seu exame de sangue. Para entender o resultado, converse com o seu médico." (teste de regras) *Ajustado na execução (T4): sem a última frase, a R2 reprova na pergunta clínica, porque falta encaminhamento. A regra está certa e não muda; a frase é que precisa encaminhar.*
- **CA-14.** `tools.test.ts` segue verde sem tabela nova, e nenhum arquivo da função passa a citar `ChatMessage` ou `ChatConversation`. (teste existente + varredura)

**Gate**

- **CA-15.** `npm run validate` verde, com a saída colada em `tasks.md`.

## 7. Fora de escopo

- O assistente ler outras conversas, perguntas ou respostas (12.2, descartado pela D12.1).
- Busca na gaveta (UI, Parte 2).
- Mudar `HISTORY_WINDOW`.
- Remover ou passar a contar `messageCount` (mudança de schema sem ganho para a pessoa; anotado no estudo como L7).
- Achar e apagar mensagens órfãs de exclusões passadas (sem índice por dono; ver §5).
- Paginar a gaveta na tela (carregar aos poucos): a lista é lida inteira, e a quantidade de conversas de uma pessoa é pequena.

## 8. O que depende de dispositivo, sandbox ou rede

- As perguntas 1 a 3 da seção 1 contra o modelo de verdade (`ampx sandbox` e app autenticado): se ele diz que não vê outras conversas e aponta o relógio, sem inventar.
- O tamanho real da página e o filtro de dono depois do limite (L3) são comportamento do Amplify; os testes simulam páginas. Conferir no sandbox com uma conta de muitas conversas, ou numa tabela com conversas de várias contas.
- Exclusão de uma conversa longa de verdade (mais de uma página de mensagens), conferindo no console do DynamoDB que nenhuma mensagem ficou.

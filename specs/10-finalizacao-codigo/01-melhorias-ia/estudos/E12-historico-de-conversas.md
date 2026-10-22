# Estudo E12 — Histórico de conversas: o que a persistência ainda não cobre

Épico: [E12 no PRD](../prd.md) · Data: 2026-10-20 · Entregável pedido no PRD (12.1): uma nota curta listando o que a pessoa **não** consegue fazer hoje, e a decisão de seguir, adiar ou descartar o 12.2. As decisões que saem daqui estão em [`decisoes/E12-historico-de-conversas.md`](../decisoes/E12-historico-de-conversas.md).

## 1. A pergunta

O PRD nasceu supondo que a conversa vivia só na memória do aparelho. Não vive: a C8/C9 (D5, D33) já a guarda no DynamoDB, com gaveta, exclusão real e reabertura. O 12.2 propõe o passo seguinte: a pessoa pergunta "o que você me disse ontem sobre meu exame?" e o assistente responde a partir de outra conversa. Este estudo responde duas coisas: o que falta de verdade, e se o 12.2 vale o risco.

## 2. O que o código faz hoje (verificado em 2026-10-20)

**Guardar.** `src/services/chatHistoryService.ts`. Quem grava é o app, nunca a função (`ChatConversation` e `ChatMessage` em `amplify/data/schemas/chat.ts`, `allow.owner()`). Cada turno grava a pergunta, a resposta, as citações e o `ruleCheckStatus`. O título vem das primeiras palavras da pessoa. O cartão de memória e o de ação não são gravados.

**Mostrar.** `HistoryDrawer.tsx` lista as conversas agrupadas por dia de calendário (`conversationGrouping.ts`), com "Nova conversa", aviso de retenção da D33, atalho para "O que eu lembro de você" e exclusão com confirmação. `useChatBot.ts` reabre a conversa escolhida com as citações, e retoma a que estava aberta quando a pessoa volta à aba.

**O que o modelo vê.** Só a conversa aberta, e dela só as últimas 12 mensagens (`HISTORY_WINDOW`, `janelaDoHistorico.ts`), ou seja, 6 turnos. A função não tem permissão sobre `ChatConversation` nem `ChatMessage`, e nenhuma ferramenta as lê. O que atravessa conversas é a memória de fatos (D34), que a pessoa confirma frase a frase.

## 3. O que a pessoa não consegue fazer hoje

| # | Lacuna | Verificado em | Gravidade |
|---|---|---|---|
| L1 | **Apagar uma conversa longa pode deixar mensagens no banco.** `apagarConversa` lê as mensagens com uma chamada só, sem `nextToken`, apaga essa página e depois apaga a conversa. O que não coube na primeira página fica no DynamoDB sem conversa a que pertencer e sem nada na tela para apagá-lo. A D33 diz "apagar significa sumir"; aqui a tela promete e o banco não cumpre. | `chatHistoryService.ts:175-185`; o teste (`__tests__/chatPersistence.test.ts`) só simula uma página | **Alta** (é a promessa de LGPD da D33) |
| L2 | **Reabrir uma conversa longa mostra só o começo.** `lerMensagens` tem o mesmo padrão: uma página só. | `chatHistoryService.ts:134-150` | Média |
| L3 | **A gaveta pode não mostrar todas as conversas.** `listarConversas` chama `ChatConversation.list()` uma vez. A tabela não tem índice por dono, então a lista é uma varredura com filtro de dono aplicado **depois** do limite da página: com muitas conversas de outras pessoas na mesma tabela, a primeira página pode trazer poucas (ou nenhuma) da pessoa. É o mesmo risco R7 do PRD, agora na tela. | `chatHistoryService.ts:119-132` | Média; cresce com o uso |
| L4 | **"O que você me disse ontem?" não tem resposta honesta garantida.** O modelo não vê outras conversas, e o prompt não diz isso. Ele pode responder "não lembro" (bom) ou completar com o que parece plausível (ruim). O caminho já existe no mapa do app (Assistente: "o relógio no alto abre as conversas antigas", `mapaDoApp.ts`), mas nada liga a pergunta a ele. | `chatPrompt.ts` (nenhuma menção a outras conversas) | Média |
| L5 | Dentro da mesma conversa, o que passou dos 6 últimos turnos sai da vista do modelo, mas continua na tela. | `HISTORY_WINDOW = 12` | Baixa; é custo escolhido na C4 |
| L6 | Não há busca na gaveta (por palavra ou por assunto). | `HistoryDrawer.tsx` | Baixa; é UI (Parte 2) |
| L7 | `messageCount` é gravado como 0 e nunca incrementado; nada o lê na tela. | `criarConversa`, `salvarTurno` | Nenhuma para a pessoa |

Sobre L1 a L3: o código lê uma página só (verificado). O tamanho da página e o filtro de dono depois do limite são o comportamento padrão dos resolvers do Amplify Gen 2. A quantidade de linhas que hoje ficaria de fora depende do tamanho das tabelas no backend compartilhado, e isso só se mede no sandbox. O projeto já tem o remédio: `src/services/todasAsPaginas.ts`, escrito no Bloco 11 exatamente para "a exclusão em cascata deixaria sobrar as linhas que não coubessem na primeira página".

## 4. O 12.2 vale a pena?

Para o assistente responder "o que você me disse ontem", a função precisaria ler `ChatMessage` de outras conversas. Três formas foram consideradas:

| Forma | A favor | Contra |
|---|---|---|
| Ferramenta que lê perguntas **e respostas** antigas | Responde literalmente a pergunta do 12.2. | Relê texto gerado pelo modelo como se fosse registro: é a "interpretação persistida" que a D33 e a D34 fecharam. Uma resposta antiga que passou pela verificação naquele dia vira fonte hoje, sem citação de documento (R4). Texto antigo também carrega instrução escrita pela pessoa ou por um anexo, que entraria no contexto como dado (injeção de prompt adiada). Precisa de `grantReadData` em duas tabelas e de varredura sem índice por dono (R7). |
| Ferramenta que lê só as **perguntas** antigas da pessoa | Não relê texto do modelo. | Não responde a pergunta do 12.2, que é sobre a resposta. Continua com o custo de varredura e com a injeção adiada. |
| Não ler; dizer a verdade e apontar a gaveta | Nenhum dado novo no contexto, nenhuma permissão nova. A pessoa reabre a conversa antiga e lê o que foi dito **com as citações de origem**, que é melhor que um resumo. O que ela quer que o assistente lembre já tem caminho: a memória (D34). | Um toque a mais para a pessoa. |

O dado de saúde que a resposta antiga citou continua disponível pelas ferramentas, com origem. O que a conversa antiga acrescenta é a fala do modelo, e essa fala é exatamente o que o projeto decidiu não tratar como fonte.

## 5. Conclusão e recomendação

1. **Descartar o 12.2.** O assistente não lê outras conversas. No lugar, uma frase no prompt diz que ele vê só a conversa aberta e manda usar o caminho que o mapa já tem, para a resposta a "o que você me disse ontem?" ser honesta e útil: "Não consigo ver outras conversas. Toque no relógio no alto desta tela para reabrir a de ontem." (L4.)
2. **Corrigir L1 a L3 neste épico**, reaproveitando `todasAsPaginas`: apagar, reabrir e listar leem até a última página. L1 é a mais séria porque quebra a promessa da D33.
3. **Não mexer** em L5 (custo escolhido), L6 (UI, Parte 2) e L7 (remover `messageCount` seria mudança de schema sem ganho para a pessoa; fica anotado).

Custo: nenhuma ferramenta nova, nenhuma permissão nova, nenhuma mudança de schema. O prompt ganha uma frase; o mapa não muda. As três leituras do app passam a fazer mais de uma chamada só quando há mais de uma página.

O épico muda de natureza: de "funcionalidade nova" para "fechamento do que existe". Esforço continua P.

**Decisão do produto (2026-10-20): D12.1 = A, D12.2 = A**, ambas como recomendado.

## 6. Casos para a suíte

1. Conversa com mensagens em 3 páginas → `apagarConversa` apaga todas, e só depois a conversa.
2. Falha na segunda página ao apagar → a conversa **não** é apagada (nada fica órfão) e o erro sobe para a tela.
3. Reabrir conversa com 2 páginas → todas as mensagens, em ordem.
4. Gaveta com a primeira página vazia da pessoa e a segunda com 2 conversas → as 2 aparecem.
5. "o que vc me falou ontem sobre meu exame?" → a resposta diz que não vê outras conversas e aponta o relógio no alto da tela; não inventa o que foi dito.

*Corrigido em 2026-10-20, ainda na Fase 0:* a primeira versão deste estudo dizia que o mapa do app não tinha a gaveta. Tem (entrada Assistente); a busca por "histórico" não achou porque o texto diz "conversas antigas". A decisão não muda; a entrega fica menor.

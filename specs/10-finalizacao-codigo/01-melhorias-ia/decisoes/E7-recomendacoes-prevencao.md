# Decisões do E7 — Recomendações de prevenção no chat

Épico: [E7 no PRD](../prd.md) · Ordem de entrega: 1º · Duas decisões: D7.1 e D7.2

## O que o código faz hoje (verificado)

- A tela de Prevenção chama a query `getPreventionRecommendations`, servida pela Lambda `get-prevention-recommendations`.
- Essa Lambda **não lê recomendações do banco**. A cada chamada ela:
  1. lê o perfil do usuário no DynamoDB;
  2. baixa o **dataset inteiro** da API da USPSTF (`uspstfClient.ts`), usando o segredo `USPSTF_API_KEY`;
  3. filtra pelo perfil (idade, sexo, IMC) em `uspstfFilter.ts`;
  4. traduz título, texto e justificativa de **cada** recomendação pela API gratuita MyMemory (`translateClient.ts`), cuja cota anônima é de 5.000 palavras por dia **por IP**. Se a cota acaba, o app mostra o texto em inglês.
- Não há cache entre chamadas (só cache em memória do container quente, para tradução).
- É um *resolver* do AppSync: lê `event.identity`, tem teto de 30 s e não foi escrita para ser chamada por outra função.
- O texto original em inglês precisa ser devolvido sem alteração, por exigência de direitos autorais da AHRQ. A tradução é uma "adaptação não oficial" exibida ao lado.
- O chat não tem nenhum acesso a isso hoje.

---

## D7.1 — De onde o chat tira as recomendações

**O que decidir:** como a ferramenta `consultar_prevencao` obtém as recomendações do usuário.

### Opção A — Módulo compartilhado: o chat chama a USPSTF e filtra com o mesmo código da tela *(recomendada)*

Extrair `uspstfClient.ts` e `uspstfFilter.ts` para um módulo compartilhado (padrão já usado em `health-import-shared`). A Lambda atual e o chat passam a importar dele. O chat recebe o segredo `USPSTF_API_KEY` e **não** usa a tradução MyMemory.

**Benefícios**
- Um só filtro para tela e chat: a mesma pessoa vê as mesmas recomendações nos dois lugares, e um teste prova isso.
- Não consome a cota diária de tradução (que a tela já usa).
- Rápido: uma chamada HTTP, sem 3 a 4 traduções por recomendação.
- Não mexe no contrato da query que a tela usa.

**Malefícios**
- O chat passa a fazer uma chamada externa durante o turno (hoje não faz nenhuma). Se a USPSTF estiver fora do ar ou lenta, a ferramenta falha. Mitigação: falha vira "não consegui consultar agora", com indicação da tela de Prevenção.
- Baixa o dataset inteiro a cada pergunta de prevenção. O tamanho real não foi medido (pendência listada no PRD, seção 8). Mitigação: cache em memória do container, com validade curta.
- Exige dar o segredo `USPSTF_API_KEY` à função do chat e refatorar a Lambda existente (risco de regressão na tela, coberto pelos testes dela).

### Opção B — O chat invoca a Lambda existente

A ferramenta chama `get-prevention-recommendations` (função chamando função) e usa o resultado, incluindo a tradução.

**Benefícios**
- Nenhuma lógica duplicada ou movida; o resultado é idêntico ao da tela, incluindo o texto em português.

**Malefícios**
- A Lambda foi escrita como resolver do AppSync (lê `event.identity`). Para o chat chamá-la, ela teria de aceitar uma chamada direta com o dono vindo no evento. Isso abre um caminho novo de "quem é o dono", o ponto que o projeto mais protege.
- A tradução MyMemory roda a cada chamada: lenta (muitas chamadas por recomendação) e gasta a mesma cota diária da tela. O chat pode consumir a cota e deixar a tela em inglês.
- Soma latência do chat (já com laço de até 6 chamadas de ferramenta) com os 30 s da outra função.
- Precisa de permissão de invocação entre funções e cuidado com dependência circular de stacks (o repositório já tem esse problema registrado em `resourceGroupName: 'data'`).

### Opção C — Cache próprio em DynamoDB

Gravar o dataset (ou as recomendações filtradas) numa tabela, atualizada periodicamente, e o chat só lê.

**Benefícios**
- Chat sem chamada externa; resposta rápida e estável. Alinha com o modo como vacinação já faz cache.

**Malefícios**
- É a opção maior: **schema novo** (decisão explícita), rotina de atualização (não há agendador de dataset hoje) e mais infraestrutura para manter.
- Resolve um problema (latência e disponibilidade) que ainda nem foi medido.

### Opção D — O chat não busca; só orienta a abrir a tela de Prevenção

**Benefícios**
- Zero código de dado, zero risco novo. Resposta correta e honesta.

**Malefícios**
- Não entrega o "mais poder" que os colegas pediram para esse tema. O usuário continua tendo de sair do chat.

### Recomendação: **Opção A**

**Motivo:** é a única que dá ao chat as recomendações reais **sem** criar um caminho novo de identidade (B) e sem criar schema e infraestrutura antes de medir a necessidade (C). A diferença de custo entre A e D é uma chamada HTTP e um refactor coberto por teste. Se a medição do tamanho do dataset mostrar problema, migrar para C depois é incremental, porque a ferramenta já esconde de onde vem o dado.

**Decisão:** **Opção A** (módulo compartilhado), escolhida pelo produto em 2026-10-17.

---

## D7.2 — Idioma e texto que o usuário lê

**O que decidir:** o chat responde em português. De onde vem o texto em português das recomendações, dado que a tradução MyMemory não será usada no chat (se D7.1 = A)?

### Opção A — A ferramenta devolve o texto original em inglês e o próprio modelo adapta para português, citando a fonte *(recomendada)*

**Benefícios**
- Sem cota de tradução e sem chamada extra.
- O assistente já responde em pt-BR e já tem regras de linguagem; a adaptação passa pela verificação de R1 a R5 antes de chegar ao usuário.
- Pode ser mais curta e natural do que a tradução literal automática.

**Malefícios**
- É uma adaptação gerada por modelo: pode distorcer sutilmente um termo médico. Mitigações: o prompt manda manter o sentido sem acrescentar nada; sempre dizer a nota (A, B, C...), o ano e a fonte; a verificação de linguagem barra indicação individual.
- Diverge um pouco da tradução que a tela mostra (as duas são "adaptações não oficiais", mas com redações diferentes).

### Opção B — Devolver a tradução MyMemory pronta (como a tela)

**Benefícios**
- Texto idêntico ao da tela de Prevenção.

**Malefícios**
- Obriga a usar a tradução no chat: custo de latência, cota compartilhada e fallback em inglês quando a cota acaba.
- Só é viável junto da Opção B ou C do D7.1.

### Opção C — Responder só com o título e a nota, e mandar abrir a tela para o texto completo

**Benefícios**
- Mínimo de risco de distorção; resposta curta.

**Malefícios**
- Resposta pobre; empurra o usuário para a tela.

### Recomendação: **Opção A**

**Motivo:** é coerente com a D7.1 = A e entrega o valor pedido. O risco de distorção é controlado por regras que o projeto já aplica a todo texto gerado, e a fonte, a nota e o ano ficam sempre visíveis para o usuário conferir na tela de Prevenção.

**Decisão:** **Opção A** (o modelo adapta o texto original para português, citando nota, ano e fonte), escolhida pelo produto em 2026-10-17.

---

## Efeito no PRD de cada escolha

| Escolha | Efeito |
|---|---|
| D7.1 = A, D7.2 = A | Tarefa 7.1 como escrita no PRD. Acrescenta uma sub-tarefa de refactor: extrair `uspstf-shared` com testes, sem mudar a tela. |
| D7.1 = B | 7.1 ganha uma tarefa de adaptação da Lambda para chamada direta e uma revisão de segurança do dono no evento. |
| D7.1 = C | Vira schema novo + rotina de atualização: o épico passa de M para G e exige decisão de schema (RT7). |
| D7.1 = D | O épico vira só um parágrafo no prompt e um teste; esforço P. |

---

## D7.3 — Reforçar a R3 contra indicação individual de exame (nasceu no planejamento)

**O que decidir:** a sondagem feita ao planejar o E7 mostrou que a verificação de linguagem **aprovava** "Você deve fazer mamografia", "Você precisa fazer colonoscopia" e "Você está em dia com a prevenção". O que fazer.

**Opções:** A — reforçar a R3 com padrões estreitos, por TDD, com testes dos dois lados *(recomendada)*; B — só o prompt; C — épico próprio depois.

**Decisão:** **Opção A**, escolhida pelo produto em 2026-10-17. Análise completa e o que foi implementado: `../E7-recomendacoes-prevencao/plan.md`, seções 5 e 5a.

# Decisões do E1 — Data de hoje e mapa do app

Épico: [E1 no PRD](../prd.md) · Ordem de entrega: 5º · Três decisões: D1.1, D1.2 e D1.3

## O que o código faz hoje (verificado)

- O prompt de sistema (`chatPrompt.ts`) é uma **string fixa**. Ele é passado ao Bedrock como `system: [{ text: ... }]` em `conversationLoop.ts`. Não há `cachePoint` de prompt hoje.
- **O assistente não sabe a data de hoje.** Só `consultar_consultas` usa o relógio da função (`new Date().toISOString()`, em UTC) para separar consultas futuras de passadas.
- A mensagem do usuário entra dentro de `guardContent`, e **só** o texto do usuário passa por ali, de propósito: assim o filtro de ataque de prompt do guardrail avalia exatamente o que veio de fora, sem a nossa instrução diluindo a avaliação.
- O projeto já força `TZ=America/Sao_Paulo` nos testes, e o usuário é brasileiro.
- Não há nenhuma lista de telas no prompt. O app tem as rotas em `src/app/(app)` (ai, analyte-series, appointments, assistant-memory, dashboard, document-detail, exams, health-data, medicines, more, prevention, profile, vaccination) e na raiz (`add-*`, `edit-*`, `import-health-data`, entre outras).

---

## D1.1 — Onde a data entra na requisição ao modelo

**O que decidir:** em qual parte da mensagem ao Bedrock vai "hoje é sexta, 17/10/2026, 14h".

### Opção A — Um segundo bloco no `system`, depois do prompt fixo *(recomendada)*

`system: [{ text: SYSTEM_PROMPT }, { text: 'Hoje é ...' }]`. O prompt fixo continua idêntico, e a data vai num bloco separado depois dele.

**Benefícios**
- O bloco grande e estável fica primeiro, o que **deixa a porta aberta** para prompt caching no futuro (a parte que muda por turno vem depois do ponto de cache).
- Não passa pelo guardrail do usuário, então não dilui a avaliação do texto de fora.
- A data é instrução de sistema, e o usuário não consegue sobrescrevê-la escrevendo "hoje é outro dia".

**Malefícios**
- Mexe no formato de `system` (de um item para dois). O teste existente que lê `system[0].text` (`conversationLoop.test.ts`) continua valendo, porque o bloco fixo segue na posição 0; só um teste que conte os blocos precisaria de ajuste.
- Hoje não há prompt caching, então o ganho de deixar a porta aberta é teórico.

### Opção B — Dentro do `SYSTEM_PROMPT`, interpolando a data

**Benefícios**
- Mudança mínima: uma interpolação.

**Malefícios**
- O prompt deixa de ser constante: qualquer prompt caching futuro seria invalidado todo turno. E o teste que compara o prompt com `LANGUAGE_RULES_PROMPT` passa a depender de relógio.

### Opção C — Num bloco de texto dentro da mensagem do usuário

**Benefícios**
- Sem mudar `system`.

**Malefícios**
- Se fosse dentro de `guardContent`, o guardrail passaria a avaliar nosso texto junto com o do usuário (o que o projeto evita de propósito). Se fosse fora, o modelo poderia confundir com fala do usuário. Pior em ambos os casos.

### Recomendação: **Opção A**

**Motivo:** é a única em que a data é autoridade de sistema, não passa pelo filtro do usuário e não atrapalha caching futuro. O ajuste de testes é pequeno.

**Decisão:** _a preencher pelo produto_

---

## D1.2 — Qual fuso a data usa

**O que decidir:** "hoje" e "amanhã" em qual fuso.

### Opção A — Fixo em `America/Sao_Paulo` *(recomendada)*

**Benefícios**
- Simples e testável (o projeto já fixa esse fuso nos testes). Cobre a imensa maioria dos usuários.
- Nenhuma mudança no pedido ao chat.

**Malefícios**
- Errado para quem está em outro fuso (Acre, Amazonas, Fernando de Noronha) ou viajando. Perto da meia-noite, "hoje" pode estar um dia errado para essa pessoa.
- Horário de verão não existe mais no Brasil, mas se voltasse, o fuso nomeado já trata isso.

### Opção B — O app envia o fuso do aparelho em cada turno

**Benefícios**
- Correto para todo mundo.

**Malefícios**
- Campo novo no pedido ao chat (mudança no cliente e no contrato). O valor vem do cliente e precisa de validação (lista de fusos IANA).
- Mais código para um problema que hoje atinge poucas pessoas.

### Recomendação: **Opção A**

**Motivo:** o produto é nacional e o custo do erro (um dia errado perto da meia-noite, em fusos minoritários) é baixo. A opção B pode vir depois sem refazer nada, pois a função que monta a data já recebe o fuso como parâmetro.

**Decisão:** _a preencher pelo produto_

---

## D1.3 — Como o assistente conhece as telas do app

**O que decidir:** de onde sai a lista de telas que ele usa para orientar ("onde importo meus dados do relógio?").

### Opção A — Lista escrita à mão no prompt, com um teste que confere se cada rota citada existe *(recomendada)*

Um bloco curto em `chatPrompt.ts`: nome da tela, caminho de navegação em texto e uma linha do que ela faz. Um teste lê `src/app` e falha se o prompt citar rota que não existe.

**Benefícios**
- Texto escrito para o usuário ler ("Mais > Importar dados de saúde"), com a redação do produto.
- Simples, sem etapa de build nova.
- O teste evita o erro mais grave (mandar o usuário para uma tela que não existe).

**Malefícios**
- Pode ficar desatualizada: uma tela nova não entra sozinha. O teste só pega rota **removida ou renomeada**, não rota nova nem rótulo trocado. Mitigação: checklist de "tela nova atualiza o mapa" nas tarefas das telas da Parte 2.
- Ocupa algumas centenas de tokens em todo turno.

### Opção B — Gerar o mapa automaticamente a partir das rotas

**Benefícios**
- Sempre atualizado quanto às rotas.

**Malefícios**
- O backend não lê `src/` em tempo de execução, então seria uma etapa de geração de arquivo no build. Isso é infraestrutura nova.
- As rotas não trazem a descrição nem o caminho de navegação em português; ainda seria preciso escrever os textos à mão em algum lugar.

### Opção C — Sem mapa; o assistente só responde sobre dados

**Benefícios**
- Prompt menor; nada para manter.

**Malefícios**
- Perguntas como "onde cadastro um remédio?" ficam sem resposta, ou o modelo **inventa** o caminho.

### Recomendação: **Opção A**

**Motivo:** a opção C leva a respostas inventadas, e a B constrói infraestrutura para um problema pequeno. O teste de rotas da opção A reduz o risco principal, e a Parte 2 (telas) já deve atualizar o mapa quando mexer em navegação.

**Decisão:** _a preencher pelo produto_

---

## Efeito no PRD de cada escolha

| Escolha | Efeito |
|---|---|
| D1.1 = A | 1.1 como escrita no PRD; um teste novo cobre o segundo bloco de `system`. |
| D1.1 = B | 1.1 mais simples, mas fecha a porta ao prompt caching. |
| D1.2 = B | 1.1 ganha uma sub-tarefa de cliente e de contrato (`types.ts`, `chatSchema.ts`). |
| D1.3 = B | 1.2 ganha uma etapa de geração no build; esforço sobe de P para M. |
| D1.3 = C | 1.2 sai do escopo. |

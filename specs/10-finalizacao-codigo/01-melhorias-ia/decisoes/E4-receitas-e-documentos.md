# Decisões do E4 — Receitas e documentos

Épico: [E4 no PRD](../prd.md) · Ordem de entrega: 8º · Duas decisões: D4.1 e D4.2 (as duas nasceram na leitura do código, antes da spec)

O PRD listava o E4 como "sem decisão aberta". A leitura do código mostrou que os itens de receita não aparecem em nenhuma tela do app e que a posologia lida do papel é exatamente o que a R3 reprova. Os dois pontos mudam o que o épico entrega.

## O que o código faz hoje (verificado em 2026-10-19)

- `PrescriptionItem` (`amplify/data/schemas/medical-documents.ts`) guarda, por item lido de uma receita: `documentId`, `medicationLabel`, `dose`, `unit`, `frequency`, `duration` (todos texto, como estavam no papel), `rawText`, `confidence` e `reviewStatus`. Há índice por `documentId` (`prescriptionItemsByDocumentId`, conferido em `amplify_outputs.json`).
- Quem grava é a Lambda de extração (`extract-document-data/prescriptionNormalizer.ts`): item com confiança abaixo do limite vira `PENDENTE_DE_REVISAO`, o resto vira `AUTO`. O comentário do schema e do normalizador proíbe virar `Medicine` ou lembrete.
- **O app não mostra `PrescriptionItem` em nenhuma tela.** O único uso no cliente é apagar os itens junto com o documento (`examService.ts`). Não existe tela para conferir um item pendente: `CONFIRMADO_PELO_USUARIO` nunca é alcançado por receita. A tela do documento usa a seção de resultados de exame também para receitas, e ela só lê `LabResult`.
- `MedicalDocument.extractionStatus` tem os valores `PENDING`, `PROCESSING`, `SUCCEEDED`, `NO_RESULTS` e `FAILED` (`extractionEnums.ts`), e nulo para documento gravado antes da leitura automática. O PRD citava `READY`, que não existe neste enum (existe no de wearable). A tela de documento já tem um texto para cada estado (`ExtractedResultsSection.tsx`).
- A R3 (`ai-language-rules/languageRules.ts`) reprova número com unidade de dose ("50 mg") e intervalo de administração ("de 8 em 8 horas"). A exceção do valor cadastrado (D2.4) exige âncora de registro ("cadastrado", "registrado", "você definiu") e vale só para o que a pessoa digitou.

---

## D4.1 — Mostrar no chat itens de receita que o app não mostra

**O que decidir:** se o chat lê e conta os itens de receita, que hoje não aparecem em nenhuma tela e que ninguém conferiu.

### Opção A — O chat mostra, sempre como "lido do papel, sem conferência" *(recomendada)*

`consultar_receitas` devolve os itens das receitas da pessoa. Como não há como conferir um item no app, **todo** item vai ao modelo marcado como leitura automática não conferida; o `PENDENTE_DE_REVISAO` ganha um aviso a mais (leitura de baixa confiança). A resposta sempre manda conferir na foto da receita, que a tela do documento abre.

**Benefícios**
- Responde a pergunta da história ("o que o médico receitou?") sem esperar a Parte 2.
- Honesto sobre a origem: o modelo nunca apresenta um nome lido por OCR como fato confirmado.

**Malefícios**
- O chat passa a mostrar um dado que a tela não mostra. Se a leitura errar o nome do remédio, a pessoa só descobre abrindo a foto.

### Opção B — Adiar a ferramenta de receita até o app mostrar os itens

O E4 entrega só a 4.2 (situação da leitura). A 4.1 vai para a Parte 2, junto com a tela que lista e confere os itens.

**Benefícios**
- Chat e tela nunca divergem: o chat só fala do que a pessoa pode ver e conferir.

**Malefícios**
- A pergunta "o que dizia minha receita?" continua sem resposta.

### Opção C — Fazer a tela de itens neste épico

**Benefícios**
- Resolve a lacuna dos dois lados.

**Malefícios**
- É UI, que o README da Parte 1 deixa para a Parte 2, e dobra o esforço do épico.

### Recomendação: **Opção A**

**Motivo:** a resposta é útil hoje, e o risco (nome lido errado) fica contido pela marcação de "não conferido" em todo item e pelo encaminhamento à foto da receita. A divergência com a tela é de falta, não de contradição: o chat nunca diz algo que a tela desminta.

**Decisão:** **Opção A** (o chat mostra, sempre como não conferido). Decidido em 2026-10-19.

---

## D4.2 — A posologia lida da receita e a R3

**O que decidir:** se a dose, a frequência e a duração lidas do papel chegam ao modelo e à resposta.

### Opção A — Só o nome do remédio; a posologia fica na foto *(recomendada)*

A ferramenta devolve `medicationLabel` e se o papel trazia posologia (`temPosologiaNoPapel: true`), mas **não** o texto de dose, frequência e duração. A resposta lista os remédios e diz que a forma de usar está na receita (com o caminho no app) e deve ser conferida com quem receitou. A R3 não muda.

**Benefícios**
- Nenhuma exceção nova na R3. Dose lida por OCR, sem conferência, nunca vira frase do assistente.
- Saída menor: menos tokens por item.

**Malefícios**
- "De quanto em quanto tempo o médico mandou tomar?" não tem resposta no chat; a pessoa abre a foto.

### Opção B — Posologia vai ao modelo, com exceção nova na R3 ancorada em "na receita"

Mesma mecânica da D2.4: os valores lidos entram como `valoresCadastrados`, e a âncora passa a aceitar "está escrito na receita".

**Benefícios**
- Responde também "como tomar", citando o papel.

**Malefícios**
- Alarga a R3 para um valor que **ninguém conferiu**: a D2.4 só aceitou o número porque a própria pessoa o digitou. Um "50" que o OCR leu de "5,0" vira dose dita pelo assistente.
- Exige nova bateria adversarial e mexe na regra mais sensível do projeto.

### Opção C — Posologia vai ao modelo, sem exceção

**Benefícios**
- Nada muda na R3.

**Malefícios**
- O modelo tende a repetir o que recebeu; a R3 reprova a resposta e o turno cai no modo degradado. Gasta tokens para nada.

### Recomendação: **Opção A**

**Motivo:** a constituição (regra 4) e a R3 tratam dose como território proibido, e a única exceção aberta até hoje é para o que a pessoa digitou. Valor lido por OCR e não conferido é o pior candidato para a segunda exceção. O nome do remédio responde à pergunta principal.

**Decisão:** **Opção A** (só o nome do remédio; a posologia fica na foto). Decidido em 2026-10-19.

---

## D4.3 — Releitura de receita apaga os itens que a leitura nova não gravou

**Nasceu no fechamento** (risco 1), a pedido do usuário em 2026-10-19 ("desenvolva para que isso seja resolvido").

**O que decidir:** se a Lambda de extração apaga, na releitura, os itens de receita da leitura anterior que a nova não gravou. Até aqui ela só acrescentava, e o id do item inclui o nome e a dose como o modelo os leu: uma releitura que lê a dose de outro jeito, ou que não acha mais um remédio, deixava a linha velha.

### Opção A — Apagar o que sobrou, depois de gravar o novo, preservando o conferido *(escolhida)*

Mesmo desenho da regravação dos resultados de exame (Bloco 11): grava os itens novos, lista os do documento pelo índice, apaga os que a leitura nova não gravou, menos os `CONFIRMADO_PELO_USUARIO`. Só em leitura que deu certo com itens e completa (num PDF dividido, nenhuma parte pode ter falhado), e só linhas do dono do documento; `NO_RESULTS` e `FAILED` não apagam nada. Os itens velhos que já estão no banco somem do chat por um filtro de data (`updatedAt` anterior ao início da última leitura), sem migração.

**Benefícios:** corrige na origem; nenhum schema novo; uma falha no meio deixa um item a mais, nunca um sumido.
**Malefícios:** apaga linhas existentes (leituras automáticas superadas, nunca conferidas).

### Opção B — Não apagar; só filtrar no chat

**Benefícios:** nenhuma escrita nova. **Malefícios:** o banco continua acumulando lixo, e qualquer outro leitor futuro (uma tela de itens) herda o defeito.

**Decisão:** **Opção A**. Decidido em 2026-10-19 (pedido do usuário de resolver o risco; regra 5 respeitada: só sai leitura automática superada, nunca o que a pessoa conferiu).

---

## Efeito no PRD

- **D4.1 = A:** 4.1 entra como no PRD, com a regra "todo item é não conferido". **B:** 4.1 sai do E4 e vai para a Parte 2. **C:** E4 ganha uma tela e sobe para G.
- **D4.2 = A:** a lista de campos da 4.1 perde `dose`, `unit`, `frequency` e `duration` na saída ao modelo; ganha `temPosologiaNoPapel`. **B:** a 4.1 fica como no PRD e a R3 ganha a âncora "na receita". **C:** a 4.1 fica como no PRD.
- Em qualquer caso, a 4.2 troca `READY` pelos estados reais (`SUCCEEDED`, `NO_RESULTS`, e o nulo de "nunca lido").

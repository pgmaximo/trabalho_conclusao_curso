# Decisões do E9 — Interações medicamentosas no chat

Épico: [E9 no PRD](../prd.md) · Ordem de entrega: 4º · Três decisões: D9.1, D9.2 e D9.3

## O que o código faz hoje (verificado)

- O app já checa interações na tela de medicamentos (`DrugInteractionSheet`, `drugInteractionService.ts`).
- O dataset é **curado à mão, offline e determinístico**: `src/data/drugInteractions/pairs.ts` (cerca de 177 linhas), `aliases.ts` e `normalizeDrugName.ts`. O comentário em `pairs.ts` registra por que não há API: RxNav foi descontinuada, DrugBank é paga e openFDA só traz texto livre em inglês.
- `findInteractions` e `findInteractionsForCandidate` são TypeScript puro, sem dependência de React Native. Eles resolvem o nome digitado para um nome canônico (sem acento, sem dose, via aliases) e comparam pares.
- **Nome que a tabela de aliases não reconhece é ignorado em silêncio**, para o app nunca gerar um alerta falso. Isso significa que, na tela, "nenhum alerta" pode querer dizer "não reconheci o remédio".
- `findInteractionsForCandidate` serve para checar um medicamento **novo** contra os ativos. O app usa isso ao cadastrar.
- Direção de importação já existente: o **app importa de `amplify/functions/*`** por caminho relativo (ex.: `unidadeLegivel`, `motivoDeFalha`). O **backend nunca importa de `src/`**.
- A pasta `src/data/drugInteractions` é importada pelo app como `@/data/drugInteractions/...`. O alias `@/` **não existe** no empacotamento do backend.

---

## D9.1 — Onde mora o dataset para app e chat usarem o mesmo

**O que decidir:** como o chat acessa o dataset sem que ele vire duas cópias.

### Opção A — Mover para um módulo compartilhado em `amplify/functions/`, e deixar arquivos finos em `src/` que reexportam *(recomendada)*

Ex.: `amplify/functions/drug-interactions-shared/` com `pairs.ts`, `aliases.ts`, `normalizeDrugName.ts` e a lógica de `findInteractions`. Em `src/data/drugInteractions/` e `src/services/drugInteractionService.ts` ficam reexportações, para **nenhuma tela mudar de import**. Os testes existentes acompanham os arquivos.

**Benefícios**
- Fonte única, e segue o precedente do repositório (`unidadeLegivel`, `ai-language-rules`, `health-import-shared`).
- A tela e o chat não podem divergir.
- Zero mudança visível no app, com os testes atuais como prova de que nada quebrou.

**Malefícios**
- Mexe em arquivos que funcionam hoje (mover e reexportar). Risco de regressão pequeno, coberto pelos testes de `pairs`, `normalizeDrugName` e do serviço.
- Atenção ao `@/` dentro dos arquivos movidos: imports internos precisam virar relativos.
- Quem for curar o dataset passa a editar dentro de `amplify/`, o que é um lugar menos óbvio para um dado de conteúdo.

### Opção B — O backend importa direto de `src/data/drugInteractions`, por caminho relativo, sem mover nada

**Benefícios**
- Menor diff: nada é movido.

**Malefícios**
- Cria uma **direção de dependência nova** (backend depende de `src/`) que o repositório hoje evita, e que pode quebrar sem aviso se alguém editar o arquivo e importar algo só do app (React Native ou `@/`).
- O `typecheck:backend` e o empacotamento do Amplify passam a depender de uma pasta que não é do backend.

### Opção C — Cópia do dataset no backend, com um teste que compara as duas

**Benefícios**
- Nenhum arquivo existente é tocado.

**Malefícios**
- É duplicação mantida por teste: toda curadoria exige editar dois lugares, e o teste só avisa depois do esquecimento. É o tipo de divergência que o projeto já tentou evitar (ver o comentário de `chatPrompt.ts` sobre duas cópias das regras).

### Recomendação: **Opção A**

**Motivo:** é a única que mantém fonte única **e** segue uma direção de dependência que o repositório já pratica. O custo (mover e reexportar) é mecânico e verificado pelos testes que já existem.

**Decisão:** _a preencher pelo produto_

---

## D9.2 — O assistente checa só os remédios cadastrados, ou também o que o usuário citar na conversa

**O que decidir:** a pergunta típica é "posso tomar ibuprofeno junto com o que eu já tomo?", e o ibuprofeno **não está cadastrado**.

### Opção A — Aceita também nomes citados na conversa, como "candidatos", e cruza com os ativos *(recomendada)*

A ferramenta recebe um campo opcional `candidatos` (lista curta de nomes, com teto de tamanho e de caracteres, `.strict()`). Reutiliza `findInteractionsForCandidate`, que o app já usa ao cadastrar.

**Benefícios**
- Responde a pergunta que as pessoas de fato fazem.
- Mesmo comportamento do app no cadastro de um remédio novo.
- Os nomes vêm da fala do **usuário**, e só servem para consultar um dataset local; nenhum dado é gravado nem vaza.

**Malefícios**
- O modelo decide quais nomes passar. Um nome errado dá um resultado errado ou nenhum. Mitigação: o dataset só devolve pares reconhecidos, e o D9.3 trata o "não reconhecido".
- O usuário pode ler "nenhum alerta" como "pode tomar". Mitigação: frase fixa de que vale só para a base curada do app e que não garante segurança, e encaminhamento ao profissional (R2).
- Entrada livre no `inputSchema` (hoje todas as ferramentas de dado pessoal têm entrada vazia ou fechada). Precisa de limites rígidos.

### Opção B — Só os medicamentos cadastrados

**Benefícios**
- Entrada vazia, como as outras ferramentas; mais simples e mais previsível.

**Malefícios**
- Não responde a pergunta mais comum (remédio que a pessoa ainda não cadastrou). O usuário teria de cadastrar só para perguntar.

### Recomendação: **Opção A**

**Motivo:** o valor do épico está justamente em perguntar antes de tomar. O risco da entrada livre é pequeno porque ela só consulta um dataset local, e as defesas de linguagem já existem.

**Decisão:** _a preencher pelo produto_

---

## D9.3 — O que dizer quando um nome não é reconhecido

**O que decidir:** o app ignora em silêncio o nome que não está nos aliases. No chat, silêncio vira "nenhuma interação encontrada", o que soa como "seguro".

### Opção A — A ferramenta devolve a lista de nomes não reconhecidos, e a resposta diz que não conseguiu verificar esses *(recomendada)*

**Benefícios**
- Honesto: "não encontrei alerta para A e B; não consegui verificar C".
- Evita o pior erro possível deste épico: a ausência de alerta ser lida como segurança.

**Malefícios**
- Resposta um pouco mais longa e menos "limpa".
- O usuário pode se frustrar com "não consegui verificar" (o dataset é curto de propósito).

### Opção B — Igual ao app: ignorar nomes não reconhecidos

**Benefícios**
- Comportamento idêntico ao da tela; resposta mais curta.

**Malefícios**
- Na tela, o silêncio convive com o contexto (o usuário vê a lista de remédios). Na conversa, a frase "nenhuma interação encontrada" é tudo o que ele lê. É o ponto em que a R-regra de não sugerir segurança mais corre risco.

### Recomendação: **Opção A**

**Motivo:** este é o principal risco de segurança do épico. A diferença entre tela e conversa justifica tratar de forma diferente. O custo é só uma frase.

**Decisão:** _a preencher pelo produto_

---

## Efeito no PRD de cada escolha

| Escolha | Efeito |
|---|---|
| D9.1 = A | 9.1 como escrita no PRD (mover, reexportar, testes verdes). |
| D9.1 = B | 9.1 some; 9.2 ganha a tarefa de garantir que o empacotamento do backend resolve os imports de `src/`. |
| D9.1 = C | 9.1 vira "copiar e criar teste de paridade"; fica registrado o custo de manter dois lugares. |
| D9.2 = B | `consultar_interacoes` com entrada vazia; esforço menor, utilidade menor. |
| D9.3 = B | Remove o campo `naoReconhecidos` e a frase correspondente; os casos adversos precisam ser revistos. |

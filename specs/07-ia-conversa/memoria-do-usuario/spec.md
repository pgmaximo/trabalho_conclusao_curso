# EPIC: Memória do usuário — o que o assistente lembra de uma conversa para a outra (Bloco 7)

## 1. Identificação

- **Origem:** não vem do Claude Design. O Canvas desenha a tela **4a** (chat) e
  a gaveta de histórico, e não desenha nada parecido com memória. Esta EPIC
  nasce de um pedido direto do usuário — "precisa ter sessões, com conversa
  dentro, e memória de curto e longo prazo do usuário, como as grandes empresas
  de IA fazem" — e da fronteira que a **D33** deixou escrita ao recusar fazer
  isso dentro da EPIC da conversa.
- **Relação com a EPIC `assistente-conversacional`:** aquela entregou a
  conversa e a persistência dela (C8, C9). Esta acrescenta a terceira camada de
  memória, e **não toca** no que já funciona: o laço, as tools, a verificação e
  o contrato somente leitura da função continuam iguais.
- **Análise de LGPD que a fundamenta:**
  `estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`. Ela foi escrita
  **antes** desta spec, por exigência do usuário registrada na D33, e nove das
  restrições da §7 saem dela por número.
- **Estudos que a fundamentam:** `estudos-ia/01-estudos/regras-de-linguagem.md`
  (R1–R5) e as decisões D9, D11, D31, D33 e a **D34**, decidida aqui.
- **Telas afetadas:** `src/screens/ChatBotScreen.tsx` (cartão de confirmação e
  porta de entrada), `src/components/HistoryDrawer.tsx` (porta de entrada), e a
  tela nova `src/screens/AssistantMemoryScreen.tsx` em
  `src/app/(app)/assistant-memory.tsx`.
- **Backend novo:** models `AssistantMemoryFact` e `AssistantMemorySetting` em
  `amplify/data/schemas/memory.ts`; módulo `memoria/` dentro de
  `amplify/functions/chat-assistant/`.
- **Ator:** usuário (paciente), que não quer repetir em toda conversa o que já
  contou uma vez.
- **Prioridade: P2.** A Fase 2 do roadmap está concluída sem ela; esta EPIC é
  melhoria sobre base entregue, e é a única do Bloco 7 que cria dado novo sobre
  a pessoa.
- **Sensibilidade: a maior do aplicativo, junto com a tela 4a.** Aqui o texto
  não é só gerado: ele é **gerado e guardado**, e relido como se fosse coisa
  que a pessoa disse.

## 2. As três memórias, e por que só a terceira é uma EPIC

O pedido foi "memória de curto e longo prazo". O aplicativo já tem duas das
três, e nomeá-las evita construir de novo o que existe:

**Memória de curto prazo — a janela da conversa.** As últimas mensagens vão ao
modelo a cada turno (`HISTORY_WINDOW` em `conversationLoop.ts`). Já entregue na
C4. Vive enquanto a conversa vive, e agora a conversa é persistida (C8), então
ela sobrevive a fechar o aplicativo.

**Memória de trabalho — as tools.** O que o assistente sabe sobre a saúde da
pessoa ele lê a cada turno, do dado que ela registrou, com documento de origem.
Já entregue na C2/C3. **Esta é a memória mais forte que o aplicativo tem, e ela
não é derivada:** é o registro. Nada nesta EPIC a substitui, e nada nesta EPIC
guarda uma cópia dela.

**Memória de longo prazo — os fatos.** É o que não existe e o que esta EPIC
constrói: frases curtas que a pessoa confirmou que quer que o assistente lembre
de uma conversa para a outra, quando elas não têm lugar em nenhum formulário.

**A quarta, que foi recusada: resumo de conversa.** Guardar um resumo gerado de
cada conversa seria interpretação persistida, com todos os riscos da memória de
fatos e nenhum dos controles — ninguém confirma um resumo frase a frase.
Registrada como recusada na D34.

## 3. A análise de LGPD é a fundação, e ela proibiu sete coisas

A análise completa está em `estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`.
O que importa aqui é o resultado, porque ele é requisito e não contexto:

**A base legal é o art. 11, I — consentimento específico e destacado.** O
art. 11 é exaustivo para dado sensível e a hipótese de tutela da saúde
(inciso II, "f") vale só para procedimento de profissional ou serviço de saúde,
que este aplicativo não é. Sobrou o consentimento, e "específico" significa
**por fato**: um interruptor único de "ativar memória" seria consentimento
genérico.

**As sete proibições, que viram teste:**

1. Gravar sem confirmação daquele fato específico.
2. Guardar valor de exame ou qualquer número de saúde como fato.
3. Guardar diagnóstico, prognóstico, risco ou julgamento sobre a pessoa.
4. Guardar condição, alergia ou medicamento — isso é registro, e tem
   formulário próprio.
5. Usar um fato guardado como fonte de um número numa resposta.
6. A função do chat escrever qualquer coisa.
7. Inferir fato a partir de dado estruturado, em vez do que a pessoa escreveu.

**A frase que resume as sete:** *a memória muda a forma da resposta, nunca o
conteúdo factual sobre medida.*

## 4. História da funcionalidade

Como usuário, quero que o assistente lembre do que já contei sobre mim, para
não repetir a mesma coisa toda vez — e quero ver, corrigir e apagar o que ele
lembra, porque é sobre mim.

### Cenários (Given/When/Then)

- **A pessoa conta algo que muda a forma das respostas:**
  Given o usuário escreve "pode responder mais curto, eu me perco em texto
  grande"
  When a função responde
  Then abaixo da resposta aparece um cartão com o texto exato "Prefiro
  respostas curtas" e os botões **Lembrar** e **Agora não**
  And nada é gravado enquanto a pessoa não tocar em **Lembrar**.

- **A pessoa confirma:**
  Given o cartão de proposta está na tela
  When o usuário toca em **Lembrar**
  Then o fato é gravado com a data e a conversa de origem
  And o cartão é substituído por uma confirmação curta, sem mais botões
  And nas conversas seguintes o assistente recebe esse fato no contexto.

- **A pessoa recusa:**
  Given o cartão de proposta está na tela
  When o usuário toca em **Agora não**
  Then nada é gravado, o cartão some, e a resposta continua na tela inteira
  And o mesmo fato não é proposto de novo nesta conversa.

- **O modelo propõe um número:**
  Given a resposta cita "sua vitamina D foi 22 ng/mL" e o modelo propõe guardar
  isso como fato
  When a verificação roda
  Then a proposta é **descartada antes de chegar à tela**, e a resposta é
  entregue normalmente
  And nenhuma mensagem de erro aparece: a pessoa não pediu proposta nenhuma.

- **O modelo propõe um julgamento:**
  Given o modelo propõe guardar "tem dificuldade de seguir o tratamento"
  When a verificação roda
  Then a proposta é descartada, pelo mesmo caminho do cenário anterior.

- **A pessoa relata uma condição:**
  Given o usuário escreve "eu tenho diabetes tipo 2"
  When a função responde
  Then **não** aparece cartão de memória
  And a resposta pode indicar o caminho para registrar isso no perfil de saúde,
  que é onde condição mora
  And nada sobre diabetes é guardado como fato de memória.

- **A pessoa abre o que está guardado:**
  Given existem três fatos guardados
  When o usuário abre "O que o assistente lembra"
  Then vê os três, com o texto literal, o tipo, a data e um atalho para a
  conversa de onde cada um veio
  And cada um tem como ser editado e como ser apagado.

- **A pessoa nunca guardou nada:**
  Given não há fato nenhum
  When o usuário abre a tela
  Then vê o estado vazio explicando o que é a memória e que nada é guardado sem
  ele confirmar — e não uma tela em branco.

- **A pessoa desliga a memória:**
  Given existem fatos guardados
  When o usuário desliga a memória
  Then o assistente para de propor e para de receber os fatos
  And a tela **pergunta** se ele também quer apagar o que já está guardado, com
  as duas saídas visíveis, e não decide por ele.

- **O teto é atingido:**
  Given já existem tantos fatos quanto o teto permite
  When uma proposta nova seria mostrada
  Then o cartão diz que a memória está cheia e leva à tela para apagar algum
  And nenhum fato antigo é descartado em silêncio.

## 5. Estrutura da página

Duas superfícies novas, e uma delas não é página.

### 5.1 O cartão de proposta, dentro do chat

Aparece **abaixo da bolha da resposta**, nunca dentro dela: é um pedido do
aplicativo, não texto do assistente, e confundir os dois faria a pessoa achar
que o modelo está falando quando ele está pedindo.

- Pergunta curta: `Quer que eu lembre disso?`
- **O texto exato do fato**, entre aspas, do jeito que será gravado. Mostrar um
  resumo e gravar outra coisa esvaziaria o consentimento.
- Dois botões de mesmo peso visual: `Lembrar` e `Agora não`. A recusa não é um
  link pequeno ao lado de um botão grande — o art. 18, VIII fala do direito de
  ser informado sobre a possibilidade de **não** consentir.
- Depois de confirmado: linha curta `Guardado.` com atalho `Ver o que eu
  lembro`.

### 5.2 A tela "O que o assistente lembra"

- **Cabeçalho** com título e voltar, no mesmo `ScreenHeader` das outras telas.
- **Parágrafo de abertura**, sempre visível, inclusive com a lista vazia: diz o
  que é guardado, que nada entra sem confirmação, e que fica guardado enquanto
  a pessoa quiser.
- **Interruptor da memória**, com rótulo e estado legível em texto, não só pela
  posição do botão.
- **Lista de fatos**, cada um com: texto, rótulo do tipo, data em que foi
  guardado, atalho para a conversa de origem, ação de editar e ação de apagar.
- **Apagar todos**, separado da lista, com confirmação em painel inline.
- **Estado vazio** com o mesmo parágrafo de abertura e uma linha dizendo que
  nada foi guardado ainda.
- **Sem aviso de encaminhamento a profissional de saúde**, e isto é decisão:
  esta tela não mostra número de exame nenhum. O aviso é obrigatório onde há
  número (R2); repetido onde não há, ele vira ruído e enfraquece onde importa.

## 6. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| `Lembrar` | Botão | Grava o fato proposto | permanece na tela | há proposta na tela |
| `Agora não` | Botão | Descarta a proposta | permanece na tela | há proposta na tela |
| `Ver o que eu lembro` | Atalho | Abre a memória | `/assistant-memory` | depois de guardar |
| `O que o assistente lembra` | Item da gaveta | Abre a memória | `/assistant-memory` | sempre |
| Atalho de origem de um fato | Item da lista | Abre a conversa de onde o fato veio | tela de chat, naquela conversa | a conversa ainda existe |
| `Editar` | Ação do item | Abre o texto para edição inline | permanece na tela | sempre |
| `Apagar` | Ação do item | Pede confirmação e apaga | permanece na tela | sempre |
| `Apagar todos` | Botão | Pede confirmação e apaga tudo | permanece na tela | há ao menos um fato |
| Interruptor | Controle | Liga/desliga e, ao desligar, pergunta sobre apagar | permanece na tela | sempre |

**A conversa de origem pode não existir mais**, porque a D33 deixou o apagar na
mão da pessoa. Nesse caso o atalho não aparece, e o fato continua lá com a
data: o fato é dela, não da conversa.

## 7. Mapa de dados

### O que esta EPIC grava

| Model | Campos |
|---|---|
| `AssistantMemoryFact` | `text`, `kind`, `sourceConversationId`, `confirmedAt`, `editedAt` |
| `AssistantMemorySetting` | `enabled`, `updatedAt` |

**Quem grava é o aplicativo**, a partir de um toque da pessoa. A função do chat
continua somente leitura, e o teste que varre os arquivos dela procurando
comando de escrita continua valendo sem alteração. Essa é a D9 preservada: a IA
de comunicação não grava — quem grava é quem confirmou.

**`kind` é lista fechada**, validada no código e não só no schema:

| `kind` | O que cabe | Exemplo |
|---|---|---|
| `COMO_ME_CHAMAR` | Nome ou tratamento preferido | "Me chame de Pedro" |
| `PREFERENCIA_DE_RESPOSTA` | Forma da resposta | "Prefiro respostas curtas" |
| `ROTINA` | Contexto de rotina que muda a forma | "Trabalho de madrugada" |
| `ACESSO_A_CUIDADO` | Como a pessoa acessa cuidado | "Me atendo pelo posto do bairro" |

Quatro tipos, e a lista é curta de propósito: cada tipo novo é uma finalidade
nova (art. 6º, I), e finalidade nova precisa de decisão registrada, não de um
`push` no array.

### O que esta EPIC lê

| Tool / caminho | Lê | Origem |
|---|---|---|
| Carga de memória (não é tool) | Os fatos do dono | `AssistantMemoryFact`, filtrado pelo dono do token |

**A memória não é uma tool**, e a diferença importa. Tool é coisa que o modelo
decide chamar; a memória entra no prompt de sistema **sempre**, antes da
primeira palavra, como contexto de forma. Fazer dela uma tool deixaria o modelo
escolher quando lembrar da pessoa, que é o contrário de memória.

**Ela entra declarada.** O bloco do prompt diz, em palavras, que aquilo é o que
a pessoa pediu para ser lembrado e que **não** é registro de saúde nem fonte de
número. Sem essa declaração, um fato como "faço caminhada 3x por semana"
poderia ser citado como se fosse dado registrado.

## 8. Requisitos não-funcionais específicos

**Nada é gravado sem confirmação daquele fato.** É a base legal virando
arquitetura (art. 11, I). O modelo propõe num campo opcional do envelope JSON;
o aplicativo mostra; a pessoa confirma; o aplicativo grava. Não existe caminho
de código em que uma resposta do modelo produza uma escrita.

**A proposta passa pela verificação antes de existir na tela.** O mesmo
`checkLanguageRules` que reprova uma resposta reprova uma proposta, e mais:
proposta com número de medida, com nome de medicamento, com diagnóstico ou com
julgamento é descartada por categoria. Descartada em silêncio — a pessoa não
pediu proposta, então a ausência dela não é erro que mereça mensagem.

**Reprovar a proposta nunca reprova a resposta.** São dois caminhos separados
de propósito. Uma resposta correta perdida porque o modelo propôs um fato ruim
seria a EPIC nova quebrando a EPIC entregue (regra 5 da constituição).

**Teto de fatos, e ele é número no código.** Memória sem teto é acúmulo sem
fim, e o art. 6º, III pede o mínimo necessário. Atingir o teto é pedir à pessoa
que apague um — nunca descartar o mais antigo em silêncio, porque descartar em
silêncio é decidir por ela qual parte dela deixa de importar.

**Teto de tamanho do fato.** Um "fato" de trezentos caracteres é um resumo
disfarçado. O limite é curto, e ultrapassá-lo descarta a proposta.

**Nenhum fato é fonte de número.** O bloco de memória no prompt diz isso
explicitamente, e o esquema de citação não muda — não há como citar um fato,
porque citação aponta para linha de exame, e essa ausência de campo é a
garantia.

**Corrigido depois da conferência dos critérios de aceite:** a redação original
desta linha dizia que "a R4 continua valendo inteira", e isso é mais forte do
que a verdade. A R4 é verificada em **um sentido só** — uma citação que aponta
para linha que nenhuma tool devolveu é detectada e reprovada
(`citacoesConferem`), mas uma resposta que traz número **sem citação nenhuma**
passa, porque `[].every(...)` é verdadeiro e não existe verificador de R4 em
`languageRules.ts`. A lacuna é anterior a esta EPIC e está registrada na
`spec.md` do assistente conversacional. O que esta EPIC garante é o que está
escrito acima: a memória não acrescenta uma via nova para número sem origem.

**A função continua somente leitura.** Nenhum comando de escrita entra em
`amplify/functions/chat-assistant/`. O teste existente que garante isso não é
alterado nem flexibilizado por esta EPIC.

**O dono vem do token.** A leitura dos fatos usa o mesmo `lerDoDono` das tools,
com o dono extraído do token do Cognito. Nenhum identificador do corpo da
requisição chega perto disto.

**`maxTokens` explícito.** A memória cresce o prompt de sistema; o teto de
saída continua declarado, como em toda chamada ao Bedrock neste repositório.

**Desligar não apaga sozinho.** Revogação (art. 18, IX) e eliminação (art. 18,
VI) são direitos diferentes. Desligar interrompe o tratamento; apagar é outra
decisão, e a tela pergunta em vez de escolher.

**Nenhuma interpretação clínica em lugar nenhum desta EPIC** — nem na copy da
tela, nem no rótulo de um tipo, nem no texto de um fato aceito (regra 4).

**O termo vetado não aparece** em copy, teste, comentário ou prompt (R1).

## 9. Critérios de aceite

### O consentimento

- [ ] Nenhum fato é gravado sem um toque em **Lembrar** — coberto por teste.
- [ ] O texto mostrado na confirmação é **exatamente** o texto gravado —
      coberto por teste.
- [ ] `Agora não` não grava nada e não volta a propor o mesmo fato na mesma
      conversa — coberto por teste.
- [ ] A recusa tem o mesmo peso visual da aceitação.
- [ ] Com a memória desligada, nenhuma proposta aparece — coberto por teste.

### O que não pode ser guardado

- [ ] Proposta com valor de medida é descartada — coberto por teste.
- [ ] Proposta com diagnóstico, prognóstico ou risco é descartada — coberto por
      teste.
- [ ] Proposta com julgamento sobre a pessoa é descartada — coberto por teste.
- [ ] Proposta com condição, alergia ou medicamento é descartada, e a resposta
      pode apontar o registro próprio — coberto por teste.
- [ ] Proposta com tipo fora da lista fechada é descartada — coberto por teste.
- [ ] Proposta acima do limite de tamanho é descartada — coberto por teste.
- [ ] Proposta que quebra qualquer regra de linguagem é descartada — coberto
      por teste.
- [ ] Descartar uma proposta **não** altera a resposta entregue — coberto por
      teste.

### A memória em uso

- [ ] Os fatos confirmados chegam ao prompt de sistema declarados como
      preferência da pessoa, não como registro de saúde — coberto por teste.
- [ ] Nenhum número de resposta passa a vir de um fato: o esquema de citação
      continua exigindo linha de exame — coberto por teste.
- [ ] A leitura dos fatos é filtrada pelo dono do token — coberto por teste.
- [ ] Nenhum arquivo da função do chat contém comando de escrita — coberto por
      teste. **O teste FOI alterado por esta EPIC**, e para melhor: ele varria
      só `tools/`, e passou a varrer a função inteira (tarefa X2). A redação
      anterior desta linha dizia "que não é alterado", o que ficou falso no
      mesmo dia em que foi escrito.

### Os direitos do titular

- [ ] A tela lista todos os fatos, com texto literal, tipo e data — coberto por
      teste.
- [ ] Um fato pode ser editado, e a edição registra a data — coberto por teste.
- [ ] Um fato pode ser apagado, com confirmação inline e nunca com alerta do
      sistema — coberto por teste.
- [ ] Todos os fatos podem ser apagados de uma vez, com confirmação — coberto
      por teste.
- [ ] Desligar a memória pergunta sobre apagar, e as duas saídas aparecem —
      coberto por teste.
- [ ] O estado vazio explica o que é a memória — coberto por teste.
- [ ] O atalho para a conversa de origem some quando aquela conversa foi
      apagada, e o fato permanece — coberto por teste.

### Sempre

- [ ] Nenhuma copy desta EPIC usa o termo vetado — coberto por teste.
- [ ] Nenhuma copy desta EPIC interpreta resultado de exame.
- [ ] `npm run validate` passa.

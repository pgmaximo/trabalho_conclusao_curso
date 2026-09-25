# EPIC: Assistente conversacional — a IA de comunicação com dado real (Bloco 7)

## 1. Identificação

- **Origem:** o Claude Design desenha a tela **4a** ("Assistente de IA — chat
  interativo"), e ela **já está implementada** com fidelidade visual parcial.
  Esta EPIC não redesenha a tela: ela troca o que está atrás dela.
- **Relação com a EPIC 4a existente
  (`specs/04-ia-perfil-vacinacao/assistente-ia/`):** aquela entregou a interface
  com respostas mockadas e deixou a fronteira preparada de propósito, num
  comentário que diz em palavras que a troca por IA real é decisão maior e
  requer confirmação. **Esta EPIC é essa troca.** O que ela herda: a tela, o
  hook, as bolhas, o indicador de digitação, o aviso permanente, e o contrato
  `AiAssistantService`. O que ela substitui: tudo o que está do outro lado
  desse contrato.
  - **Deriva de documentação, conferida:** aquela spec cita
    `src/services/chatService.ts`, que **não existe** — o arquivo é
    `src/services/aiAssistantService.ts`. Corrigido aqui em vez de propagado.
- **Estudos que a fundamentam:** `estudos-ia/` — roadmap Fase 2 (2.1 a 2.8) e
  Fase 3 (3.1), e as decisões D5, D6, D9, D11, D12, D14 e D15.
- **Telas afetadas:** `src/app/(app)/ai.tsx` → `src/screens/ChatBotScreen.tsx`,
  alimentada por `src/hooks/useChatBot.ts`.
- **Backend novo:** `amplify/functions/chat-assistant/`, models
  `ChatConversation` e `ChatMessage`.
- **Ator:** usuário (paciente), que quer perguntar sobre a própria saúde em
  linguagem natural e receber resposta construída sobre os dados dele.
- **Prioridade: P1.** É a Fase 2 do roadmap.
- **Sensibilidade: a maior do aplicativo.** É a única tela cujo conteúdo pode
  ser lido como orientação médica, e a única em que o texto é **gerado**, não
  transcrito. A EPIC de extração podia gravar um número errado; esta pode
  dizer uma frase errada.

## 2. Bloqueio externo, e ele é real

**A tarefa 0.5 do roadmap — decidir retenção e exclusão de conversa — precisa
estar respondida antes de a primeira conversa ser gravada.** Não é formalidade:
a D5 está registrada como *proposta, aguarda aceite*, e a contrapartida que ela
mesma escreve é que **conversa sobre saúde vira dado persistido**, o que traz
retenção e exclusão para dentro do escopo.

Três perguntas precisam de resposta, e as três são do usuário e do orientador,
não do código:

1. Por quanto tempo uma conversa fica guardada?
2. O usuário pode apagar uma conversa, e apagar significa sumir de verdade?
3. O que a tela diz ao usuário sobre isso, e onde?

**O que fica bloqueado por isso:** somente a persistência (tarefas 2.1 e 2.7 do
roadmap). O restante — a função, as tools, o prompt, a verificação — pode ser
construído e testado com a conversa vivendo apenas em memória, exatamente como
hoje. Esta spec separa as duas coisas por esse motivo.

## 3. História da funcionalidade

Como usuário, quero perguntar sobre a minha saúde em linguagem natural e
receber uma resposta construída sobre os meus dados registrados, com a origem
de cada número, para entender o que vale levar à consulta.

### Cenários (Given/When/Then)

- **Pergunta sobre exame, com dado registrado:**
  Given o usuário tem duas coletas de vitamina D registradas e pergunta "como
  está minha vitamina D comparada ao exame anterior?"
  When a função responde
  Then a resposta cita os dois valores **com data e documento de origem**, na
  mesma unidade, e encaminha a um profissional de saúde
  And nenhum número aparece sem ter vindo de uma linha registrada (R4).

- **Pergunta sobre exame, sem dado registrado:**
  Given o usuário pergunta sobre um analito que ele nunca registrou
  When a função responde
  Then a resposta **diz que não tem esse exame registrado** (R5), e não estima,
  não arredonda e não completa a série
  And sugere o caminho para registrar, sem tom de erro.

- **Pergunta operacional:**
  Given o usuário pergunta "quando é minha próxima consulta?"
  When a função responde
  Then ela usa a tool de consultas e responde com a data
  And **não** repete a frase de encaminhamento — o aviso permanente da tela já
  cumpre o papel, e repeti-lo aqui vira ruído (R2).

- **Cruzamento entre exame e wearable** (tarefa 3.1 do roadmap):
  Given o usuário pergunta "minha vitamina D melhorou e meu sono piorou no
  mesmo período?"
  When a função responde
  Then ela usa as duas tools, e a resposta trata as duas séries pelo que elas
  são: a de wearable é densa e quase diária, a de exame é esparsa e carrega
  faixa de referência
  And ela **não** afirma relação causal entre as duas.

- **A resposta gerada viola uma regra de linguagem, e a segunda tentativa
  resolve:**
  Given o modelo produziu um texto que a verificação reprova
  When a resposta passa pela camada 4
  Then ela **não chega à tela como está**, e uma nova geração é pedida com o
  motivo da reprovação como instrução — **sem refazer as consultas**, porque as
  ferramentas já devolveram o que tinham
  And quando a segunda passa, é ela que a pessoa vê, e nada indica que houve
  uma primeira.

- **A resposta é reprovada duas vezes, e havia dado de ferramenta:**
  Given a segunda geração também foi reprovada, e as ferramentas devolveram
  dados nesta conversa
  When a função monta a resposta
  Then a tela mostra **o dado, sem prosa gerada**: os valores com data, unidade
  e documento de origem, num texto de modelo fixo, com o encaminhamento a um
  profissional de saúde
  And a primeira linha diz que aquilo **não** é a resposta da conversa, para a
  pessoa não ler o texto de modelo como se fosse a IA falando
  And o texto reprovado **não** aparece, nem inteiro nem recortado.

- **A resposta é reprovada duas vezes, e não havia dado de ferramenta:**
  Given a pergunta não gerou consulta nenhuma — "quantos miligramas eu tomo?"
  When a segunda geração também é reprovada
  Then a tela mostra **indisponibilidade honesta**, dizendo o que o aplicativo
  faz, em vez de pedir à pessoa que adivinhe o que ele não faz
  And nunca é dito o motivo técnico da reprovação: quem escreveu a violação foi
  o modelo, e explicá-la ensinaria a contorná-la.

- **O guardrail bloqueia a entrada:**
  Given a mensagem do usuário dispara o filtro de entrada
  When a chamada retorna com intervenção
  Then a tela mostra uma explicação honesta e a conversa continua utilizável —
  nunca uma mensagem de erro técnico e nunca uma tela travada.

- **Anexo pontual no chat** (tarefa 2.8, D15):
  Given o usuário anexa um documento **dentro da conversa**
  When a função processa
  Then o documento passa pelo OCR já construído na Fase 1, o texto entra
  **naquela conversa**, e **nada é gravado como dado clínico** — nenhum
  `LabResult`, nenhum `MedicalDocument`
  And a tela diz isso em uma linha, e oferece o caminho de registrar de verdade
  (`/add-exam`) para quem quiser
  And o botão de anexo que hoje leva direto para `/add-exam` continua
  existindo: quem quer registrar é mandado para a porta que registra.

- **Falha na chamada:**
  Given a função não responde, ou responde com erro
  When a Promise rejeita
  Then a tela mostra mensagem amigável e o indicador de digitação some —
  comportamento que `useChatBot.ts` já implementa e que esta EPIC preserva e
  cobre por teste.

## 4. Estrutura da página

**A tela não muda de estrutura.** Ela já tem: estado vazio com sugestões,
bolhas, indicador de digitação, gaveta de histórico e o aviso permanente.

Quatro acréscimos, todos pequenos:

1. **O aviso permanente deixa de ser opcional em código.** Ele já é declarado
   obrigatório pela spec da 4a; aqui ele ganha teste, porque a R2 depende dele
   para dispensar o encaminhamento em pergunta operacional.
2. **A gaveta de histórico passa a ter conteúdo.** Hoje `historyGroups` é
   sempre vazio, com copy de estado vazio — decisão registrada em
   `useChatBot.ts`. Com persistência, ela lista conversas reais. **Enquanto a
   tarefa 0.5 não for respondida, ela continua vazia**, e isso é um estado
   legítimo, não um defeito.
3. **Indicação de origem nas respostas que citam número.** Quando a IA cita um
   valor, a bolha traz de qual documento e de qual data ele veio, tocável.
4. **Anexo pontual**, com a copy que distingue "me explica este papel" de
   "quero que isto entre no meu histórico".

## 5. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Enviar mensagem | Botão | Chama a função de chat | permanece na tela | há texto |
| Sugestão rápida | Cartão | Envia aquela pergunta | permanece na tela | conversa vazia |
| Origem de um número | Item na bolha | Abre o documento de origem | `/document-detail` | a resposta citou uma linha |
| Anexo (pontual) | Botão | Anexa à conversa, sem registrar | permanece na tela | sempre |
| "Registrar este documento" | Botão | Leva à porta que registra | `/add-exam` | houve anexo pontual |
| Gaveta de histórico | Botão | Abre conversas anteriores | permanece na tela | sempre |
| Conversa anterior | Item de lista | Carrega aquela conversa | permanece na tela | há conversa persistida |

## 6. Mapa de dados

### O que esta EPIC grava

**Só a própria conversa** (D9). Ela lê o que as outras gravaram e o que o
usuário preencheu; uma IA que conversa e ao mesmo tempo escreve dado clínico é
uma superfície de erro difícil de auditar.

| Model | Campos |
|---|---|
| `ChatConversation` | `title`, `startedAt`, `lastMessageAt`, `messageCount`. Autorização por dono. |
| `ChatMessage` | `conversationId`, `role`, `content`, `createdAt`, `citations`, `inputTokens`, `outputTokens`, `modelId`, `ruleCheckStatus`. Autorização por dono, índice por `conversationId`. |

`citations` guarda de onde veio cada número citado — id da linha, documento e
data. É o que torna a R4 verificável depois do fato, e não só no momento da
geração.

`ruleCheckStatus` registra se aquela resposta passou pela verificação de
linguagem na primeira tentativa. É o dado que a §7 precisa para ser calibrada.

### O que esta EPIC lê, e por qual tool

| Tool | Lê | Origem |
|---|---|---|
| perfil | `UserProfile` | preenchido pelo usuário |
| exames | `MedicalDocument` | Bloco 3 |
| analitos | `LabResult`, série por analito | EPIC de extração |
| consultas | `Appointment` | Bloco 2 |
| medicamentos | `Medicine` | Bloco 3 |
| vacinas | carteira de vacinação | Bloco 4 |
| wearable | `HealthImport` | feature do colega |

**Nenhuma tool escreve.** É o que torna o laço auditável: qualquer efeito da
conversa sobre o banco é a própria conversa, e nada mais.

**Ausência de dado é resposta, não erro.** Nenhuma importação de wearable
significa que não há dado de wearable — a tool devolve isso explicitamente, e o
modelo tem a R5 para dizê-lo.

## 7. Requisitos não-funcionais específicos

**Endereço direto da função, fora do AppSync (D12).** O resolver corta em 30
segundos e um laço de tools passa disso com facilidade. É o **primeiro endereço
direto de função deste repositório**, sai do padrão do resto do aplicativo, e
por isso a justificativa é obrigatória pela regra 3 — a D12 é essa
justificativa, e o `plan.md` a repete com as consequências resolvidas.

Três consequências que o AppSync resolvia sozinho e agora são nossas:

- **Autenticação.** Verificar o token do Cognito dentro da própria função.
- **Origem cruzada e limite de chamadas.** Nossa responsabilidade.
- **Nenhuma resposta pode ser servida sem dono identificado.** Toda tool filtra
  pelo dono extraído do token, nunca por um identificador vindo do corpo da
  requisição.

**As cinco camadas de linguagem, e as cinco existem.** Vocabulário restrito,
encaminhamento no schema, guardrail do Bedrock, verificação determinística e
conjunto adversarial. A quarta e a quinta vêm da EPIC de regras de linguagem,
que é pré-requisito desta.

**O que acontece quando a verificação reprova — a D31, decidida aqui.** A spec
de regras de linguagem registrou a escolha como ambiguidade, porque só esta EPIC
pode medi-la. O estudo comparativo está em
`estudos-ia/01-estudos/resposta-reprovada.md`. A decisão é **A → E → C**:

1. **Uma nova geração**, com o motivo da reprovação como instrução ao modelo,
   escrito em termos da **regra** e nunca do sintoma — "não indique quantidade,
   dose ou mudança de medicação", não "não escreva 500 mg". Um bilhete escrito
   pelo sintoma ensina o modelo a contornar com um sinônimo.

   **Ela reaproveita as mensagens já acumuladas, inclusive os resultados das
   ferramentas.** Refazer o laço custaria o dobro e faria a segunda geração
   enxergar evidências possivelmente diferentes da primeira — quando o que se
   quer corrigir é só a redação.

2. **Falhando, o modo degradado:** a tela mostra **o dado que as ferramentas já
   devolveram**, num texto de modelo fixo, sem prosa gerada. Ele passa as regras
   **por construção** — não tem espaço para posologia, cita número com origem
   porque a origem é campo, e encaminha porque o encaminhamento é parte do
   modelo. Não depende de verificação, e por isso não pode ser reprovado.

3. **Não havendo dado de ferramenta, indisponibilidade honesta**, com copy que
   diz **o que o aplicativo faz**. "Tente reformular" é copy ruim quando a
   pergunta está fora do escopo por natureza: convida a pessoa a repetir uma
   pergunta que será recusada de novo.

4. **Nunca reescrever** (recusado). Recortar inverte sentido em vez de
   removê-lo, e o texto resultante não foi escrito por ninguém — nem pelo
   modelo, que escreveu outra coisa.

5. **Nunca exibir a resposta reprovada com um aviso** (recusado). Se ela pode
   ser exibida com aviso, a verificação deixa de ser porta e vira enfeite.

6. `ruleCheckStatus` registra qual dos **quatro** caminhos aconteceu —
   `APROVADA`, `APROVADA_NA_SEGUNDA`, `DEGRADADA`, `INDISPONIVEL` — e a contagem
   é o que calibra esta seção.

**O modo degradado não é escopo extra: é a tese do projeto no caminho da
falha.** O projeto se define por organizar informação sem interpretar. Quando o
modelo não consegue falar com segurança, mostrar os números com data, unidade e
documento de origem é exatamente o que ele se propôs a fazer. A prosa era o
acréscimo; o dado rastreável era o produto.

**Nenhum número sem origem (R4), e isso é estrutural.** Toda citação de valor
tem que sair de uma tool. O schema de saída oferece o **lugar** onde a origem
cabe — sem campo de citação a R4 não teria como ser verificada por ninguém
(D11) —, mas ele **não** é quem a cobra: quem cobra são dois verificadores,
depois do parse. A omissão (valor de exame sem origem) fica em
`languageRules.ts`; a citação inventada fica em `verificacao.ts`, que é o único
lugar que sabe o que as tools entregaram.

**Duas coisas contam como origem, e as duas são decisão registrada.** A citação
no envelope; e o **anexo pontual** do turno, porque a D15 decidiu que ele não
grava dado clínico e por isso nunca terá linha citável — sem essa segunda porta,
"me explica este papel aqui" cairia no degradado toda vez. A conferência é de
**presença**, não de correspondência valor por valor: casar cada número com uma
linha do índice reprovaria a faixa de referência do laboratório, que é
informação legítima e não é citação de resultado.

**A R4 alcança valor de EXAME LABORATORIAL, e não todo dígito.** `kg`, `cm`,
`m`, `bpm` e `mmHg` ficam fora de propósito: `indexarLinhasCitaveis` só indexa a
saída de `consultar_analito`, então peso, altura, batimento e pressão não têm
linha citável, e exigir citação de uma unidade que nunca pode ser citada faria
"quanto eu peso?" cair no degradado para sempre. "Sua consulta é dia 12 de
março", "3 vacinas pendentes" e "2 comprimidos" têm dígito e nenhum é medida.

**`maxTokens` sempre explícito.** Deixar em branco reserva a cota máxima do
modelo e é a causa principal de estrangulamento sem motivo aparente — armadilha
já documentada na feature de wearable.

**Teto de iterações do laço de tools.** Um laço sem teto é um laço que paga o
modelo indefinidamente. Teto explícito, e atingi-lo é resposta honesta de
indisponibilidade, nunca uma resposta parcial apresentada como completa.

**Transmissão por eventos fica fora desta versão (D6).** O motivo técnico que a
sustentava desapareceu com a D12, e a decisão continua de pé apenas por escopo.
O indicador de digitação que já existe cobre a espera. Registrado para ser
reavaliado quando esta EPIC estiver de pé.

**O anexo pontual não grava dado clínico (D15).** Ele passa pelo OCR e o texto
entra naquela conversa. É a diferença entre "me explica este papel aqui" e
"quero que este exame faça parte do meu histórico", e as duas portas continuam
existindo.

**Node 20.** `npm run validate` antes de considerar concluído.

## 8. Critérios de aceite

### Independentes da tarefa 0.5

- [ ] Pergunta sobre exame registrado é respondida com valor, unidade, data e
      **documento de origem** de cada número citado.
- [ ] Pergunta sobre exame **não** registrado recebe "não tenho esse exame
      registrado", sem estimativa e sem série completada — coberto por teste.
- [x] **CUMPRIDO em 2026-09-18, depois de ter sido registrado como não cumprido
      no mesmo dia.** Nenhum número aparece na resposta sem ter vindo de uma
      tool, **nos dois sentidos** — coberto por teste.
      - A citação **inventada** já era reprovada: `citacoesConferem`, em
        `verificacao.ts`, recusa id que nenhuma tool devolveu.
      - A **omissão** passou a ser reprovada por um verificador de R4 em
        `ai-language-rules/languageRules.ts`. Ele recebe de quem chama o
        sinalizador `temOrigem`, porque só quem chama sabe: o texto, sozinho, não
        diz se a resposta trouxe origem.
      - **Por que não um `refine` no `chatAnswerSchema`, que era o caminho
        óbvio:** falha de schema volta como `ok: false` do laço, e
        `responderComVerificacao` manda isso direto para o caminho degradado —
        **sem a segunda geração**. O `refine` faria toda omissão de R4 perder a
        nova geração que a D31 garante. Como verificador, a R4 entra no mesmo
        caminho da R1, da R2 e da R3, e a reprovação rende um bilhete.
      - **O que era falso e foi corrigido junto:** a redação anterior deste
        critério dizia "coberto por teste sobre o schema de saída", e o teste não
        existia; o comentário do topo de `chatSchema.ts` e o §7 desta spec
        afirmavam que o schema obrigava a citação. Nenhum dos três dizia a
        verdade. E o defeito estava **codificado como expectativa** em
        `verificacao.test.ts`, onde uma resposta com "32,5 ng/mL" e
        `citacoes: []` era esperada como `APROVADA`.
- [ ] Pergunta operacional é respondida sem repetir a frase de encaminhamento.
- [ ] Pergunta clínica traz encaminhamento a um profissional de saúde no corpo
      da resposta.
- [ ] Nenhuma tool escreve em tabela nenhuma — coberto por teste.
- [ ] Toda tool filtra pelo dono extraído do token, nunca por identificador
      vindo do corpo da requisição — coberto por teste.
- [ ] Requisição sem token válido é recusada — coberto por teste.
- [ ] Resposta reprovada pela verificação é gerada de novo **uma** vez, e a
      nova geração **não refaz as consultas às ferramentas** — coberto por
      teste.
- [ ] O bilhete da segunda geração fala em termos da regra, nunca do sintoma.
- [ ] Reprovada duas vezes **com** dado de ferramenta: a tela mostra o dado sem
      prosa gerada, com data, unidade, documento de origem e encaminhamento —
      coberto por teste.
- [ ] A primeira linha do modo degradado diz que aquilo não é a resposta da
      conversa — coberto por teste.
- [ ] Reprovada duas vezes **sem** dado de ferramenta: indisponibilidade
      honesta, com copy que diz o que o aplicativo faz.
- [ ] O texto reprovado **nunca** aparece, nem inteiro nem recortado — coberto
      por teste.
- [ ] O motivo técnico da reprovação **nunca** é mostrado à pessoa.
- [ ] `ruleCheckStatus` registra qual dos quatro caminhos aconteceu.
- [ ] Ausência de dado de wearable é comunicada como ausência, não como erro.
- [ ] O laço de tools tem teto, e atingi-lo produz indisponibilidade honesta,
      nunca resposta parcial apresentada como completa.
- [ ] `maxTokens` é explícito na chamada.
- [ ] Guardrail bloqueando a entrada produz explicação honesta, e a conversa
      continua utilizável.
- [ ] O aviso permanente da tela está presente e é coberto por teste.
- [ ] Falha na chamada mostra mensagem amigável e some com o indicador de
      digitação.
- [ ] Anexo no chat passa pelo OCR, entra na conversa e **não** cria
      `LabResult` nem `MedicalDocument` — coberto por teste.
- [ ] A tela oferece o caminho de registrar de verdade a quem quiser.
- [ ] Nenhuma copy da tela e nenhuma resposta aceita usa o termo vetado.
- [ ] O conjunto adversarial roda em `npm run validate`.

### Dependentes da tarefa 0.5 (persistência)

- [ ] A decisão de retenção e exclusão está registrada como decisão aceita
      antes da primeira conversa ser gravada.
- [ ] A conversa é persistida com autorização por dono.
- [ ] A gaveta de histórico lista conversas reais, agrupadas por período.
- [ ] O usuário consegue apagar uma conversa, e apagar significa sumir.
- [ ] A tela comunica ao usuário o que é guardado e por quanto tempo.
- [ ] `citations` permite reabrir o documento de origem de um número citado
      semanas depois.

### Sempre

- [ ] `npm run validate` passa.

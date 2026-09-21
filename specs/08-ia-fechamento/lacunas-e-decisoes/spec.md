# EPIC: Fechamento do sistema de IA — a faixa que não cabe e as cinco decisões (Bloco 9)

## 1. Identificação

- **Origem:** não vem do Claude Design nem de pedido de funcionalidade. Esta
  EPIC nasce de **dois exercícios contra o sistema rodando**, e fecha o que eles
  deixaram aberto:
  - a **conversa de cinco turnos** de 2026-09-18, com um laudo do Delboni no
    histórico — seis dos sete achados foram consertados no Bloco 8; sobraram
    duas decisões;
  - o **reprocessamento daquele mesmo laudo** em 2026-09-19, contra o sandbox
    publicado às 12:51 — dois achados, e **nenhum dos dois virou tarefa em
    lugar nenhum até agora**.
- **Os estudos que a fundamentam:**
  `estudos-ia/01-estudos/conversa-real-2026-09-18.md` (turno a turno),
  `estudos-ia/04-implementacao/notas.md` §"O laboratório funciona, e a faixa de
  referência não" (a medição), e
  `estudos-ia/01-estudos/auditoria-das-regras-2026-09-19.md` (o que a camada
  determinística alcança e o que não alcança).
- **Relação com as EPICs entregues:** `extracao-de-documentos` entregou a
  leitura; `serie-por-analito` entregou a evolução e a faixa na tela;
  `conversa-sobre-o-exame` entregou as tools novas e consertou a R2, a R3 e a
  R5. **Nada disso é refeito.** Esta EPIC preenche a lacuna de esquema que o
  reprocessamento expôs e fecha as decisões que ficaram esperando por você.
- **Telas afetadas:** `src/components/AnalyteCollectionRow.tsx`,
  `src/components/ExtractedResultRow.tsx` e `src/screens/AddExamScreen.tsx`
  (esta última só na decisão B).
- **Backend afetado:** `amplify/functions/extract-document-data/` (esquema,
  prompt, normalizador), `amplify/data/schemas/medical-documents.ts` (um campo
  novo, opcional) e `amplify/functions/chat-assistant/` (só as decisões A e C).
- **Ator:** a pessoa que abriu o laudo de colesterol na tela e viu o valor
  sozinho, sem nada ao lado.
- **Prioridade: P1.** Não porque quebra, mas porque **mente**: a tela afirma
  hoje que o laboratório não informou faixa em doze linhas onde ele informou.
- **Sensibilidade: alta.** Toca a fronteira entre transcrever e interpretar, que
  é a tese do projeto. Nenhuma tarefa desta EPIC pode fazer o aplicativo
  escolher qual faixa se aplica a uma pessoa.

---

## 2. A medição é a fundação desta EPIC

Nada aqui é suposição sobre o que poderia dar errado. Os números que fundam a
EPIC foram medidos contra o serviço real, com o mesmo PDF.

| | |
|---|---|
| linhas lidas do laudo (2ª passagem) | **48** |
| linhas que entraram **sem faixa de referência nenhuma** | **14** |
| linhas em que a ausência é correta | **2** |
| linhas em que **o laudo informou e o aplicativo não guardou** | **12** |
| tokens da passagem | 56.826 de entrada, 5.161 de saída |
| duplicatas criadas ao reprocessar | **zero** — a idempotência funcionou |

**As quatorze, agrupadas pela forma do papel** (o registro nomeia treze delas):

| Forma no papel | Analitos | Cabe em `referenceLow`/`referenceHigh`? |
|---|---|---|
| limite único em prosa | HDL ("Superior a 40 mg/dL"), `*eGFR` ("Superior a 90 mL/min/1,73m²") | **cabe** — e mesmo assim saiu vazio |
| tabela por risco | colesterol total, LDL, não-HDL | não |
| tabela por condição | triglicérides (jejum / não jejum) | não |
| tabela categórica | hemoglobina glicada (Normal / Risco / DM) | não |
| tabela por idade e grupo | **vitamina D** | não |
| tabela por idade e sexo | testosterona total, livre, biodisponível | não |
| sem faixa declarada no papel | VLDL, glicose média estimada | vazio é a resposta certa |

**A leitura que importa: o modelo acertou.** Ele preferiu vazio a inventar, que
é a regra desta feature inteira. Quem não tem forma para o dado é o esquema — e
em dois casos, quem não recebeu a instrução foi o prompt.

**O perfil lipídico inteiro ficou sem faixa. E a vitamina D também** — o analito
que originou o projeto, e o que a S8 usa para provar "faixa de **cada**
laboratório". A promessa da S8 vale hoje para glicose e hemograma, e **não vale
para o painel que mais gente olha**.

---

## 3. O que muda para a pessoa

O critério desta seção é o da constituição: o que ela **vê**, não o que mudou
por dentro.

### Hoje

| A pessoa faz | E recebe |
|---|---|
| abre o laudo e olha o colesterol | `190 mg/dL` e nada ao lado |
| abre a evolução da vitamina D | a linha do tempo **sem a faixa de fundo** |
| lê a linha de uma coleta de HDL | *"Este laboratório não informou faixa de referência."* — **e ele informou** |
| pergunta ao assistente sobre o colesterol | o valor, sem faixa, porque a tool não tem o que devolver |
| digitaliza um laudo de outubro de 2025 | ele entra no aplicativo como setembro de 2026 |
| recebe uma resposta sobre exame | às vezes um convite a se preocupar: *"se tiver algum valor que te preocupa"* |

### Depois desta EPIC

| A pessoa faz | E recebe |
|---|---|
| abre o laudo e olha o colesterol | o valor **e a faixa como o laudo a escreveu** — a tabela por risco, em texto |
| abre a evolução da vitamina D | a faixa aparece como texto na linha da coleta; a faixa **de fundo** continua só onde há dois números, e isso está dito |
| lê a linha de uma coleta de HDL | *"Referência deste laboratório: acima de 40 mg/dL"* |
| pergunta ao assistente sobre o colesterol | o valor com a faixa que o laboratório escreveu, sem julgamento |
| digitaliza um laudo antigo | um aviso quando a data do formulário e a data lida do laudo divergirem |
| recebe uma resposta sobre exame | um fecho **fixo, escrito pelo aplicativo**, igual em toda resposta clínica |

**O que continua exatamente igual, e é obrigação desta EPIC que continue:**
nenhuma interpretação clínica, nenhum "normal", "alterado" ou "dentro do
esperado", nenhum número sem origem, e **ninguém — nem o modelo, nem o
aplicativo — escolhendo qual faixa se aplica a esta pessoa**.

---

## 4. Os achados, e o que cada um exige

### 4.1 F1 — A faixa de referência não cabe em dois números

**O que é.** `LabResult` guarda `referenceLow: a.float()` e
`referenceHigh: a.float()`. O laudo brasileiro apresenta faixa de pelo menos
**seis** formas, e quatro delas não são um par de números. Quando a forma não
cabe, a linha entra sem faixa — o que é o comportamento certo e um dado
perdido.

**Por que precisa ser feito.** Porque a faixa é, para a pessoa, **a metade da
informação**. Um valor de colesterol sem nada ao lado não diz nada a quem não é
profissional — e o propósito declarado do aplicativo é a pessoa reconhecer o
próprio exame. É também o que a S8 promete e hoje não entrega no painel mais
comum.

**O que NÃO é.** Não é defeito de leitura, não é limiar de confiança mal
calibrado, e não se resolve pedindo ao modelo que "tente mais". Pedir a ele que
reduza uma tabela por faixa etária a dois números é **pedir que escolha uma
linha da tabela** — ou seja, que interprete. A forma do campo é que está errada.

**O que exige.** Um campo de texto no nível da linha, no espírito do `rawValue`:
guarda o que está escrito, sem normalizar. A decisão E (§5.5) escolhe a forma.

### 4.2 F2 — A tela afirma uma coisa falsa

`AnalyteCollectionRow.tsx` escreve, quando os dois números são nulos:

> *"Este laboratório não informou faixa de referência."*

Para VLDL e glicose média estimada, verdade. Para as outras doze, **mentira** —
o laboratório informou, em tabela, e o aplicativo não teve onde guardar.

**Por que importa mais do que parece.** É a única frase do aplicativo que afirma
algo sobre o comportamento de um terceiro com base numa lacuna interna. A pessoa
que lê isso com o PDF aberto do lado perde a confiança no aplicativo inteiro — e
está certa em perder.

**O que exige.** Com o campo de texto existindo, a frase quase some sozinha.
Onde não houver nem número nem texto, ela precisa dizer o que de fato se sabe:
*"O laudo não trouxe faixa para este resultado."*

### 4.3 F3 — Faixa de um lado só: a lacuna é de prompt, não de esquema

Dois dos quatorze casos — HDL e `*eGFR` — **já cabem** no esquema de hoje:
`rawReferenceLow` preenchido, `rawReferenceHigh` vazio. O normalizador trata
ausente e ilegível como coisas diferentes, e a tela **já sabe escrever** "acima
de 40" e "até 90" (`formatarFaixa`, em `src/utils/decimalDisplay.ts`).

Mesmo assim saíram vazios. O motivo está no prompt: ele manda "transcrever os
limites da faixa" e **nunca diz o que fazer quando existe só um limite**. Um
modelo instruído a não inventar, diante de "Superior a 40 mg/dL", deixa os dois
campos vazios — e está seguindo a instrução que recebeu.

**Isto é duas linhas de prompt e um caso de teste.** É o item mais barato da
EPIC, e conserta 2 das 12 linhas perdidas.

### 4.4 F4 — O modelo escolheu qual faixa se aplica

Um aviso da extração dizia:

> *"Vitamina C: intervalo difere por sexo; foi utilizado o intervalo masculino
> pois o paciente é do sexo masculino."*

O comportamento é o melhor possível dentro do que o esquema permite: a escolha é
mecânica e ele **a declarou**. Mas é o modelo decidindo qual faixa vale para
esta pessoa, e a declaração foi para `warnings` — prosa que nenhuma tela lê e
nenhum teste verifica.

**Por que é fronteira e não defeito.** Escolher a linha da tabela é o primeiro
passo da interpretação. Hoje o passo é pequeno e declarado; sem decisão escrita,
ele cresce sozinho na próxima vez que alguém mexer no prompt. É a decisão D.

### 4.5 F5 — O que só medição fecha

Três itens que não são código e que ninguém aqui pode marcar como prontos:

| Item | De onde vem | Por que continua aberto |
|---|---|---|
| **L7** — vinte perguntas reais | a auditoria das regras | a única medição real são **cinco turnos**, e o sistema medido já não existe: R2, R3 e R5 mudaram depois dela |
| **U12** — o laboratório contra outros laudos | Bloco 8 | um laudo prova que o caminho funciona; não prova que o modelo lê o emissor de **qualquer** laudo |
| **o custo do falso positivo da R1** | a auditoria | a R1 é a regra com maior chance de reprovar uma resposta inocente, e **ninguém mediu quantas vezes isso aconteceu** |

O roteiro dos três está em
`estudos-ia/04-implementacao/roteiro-de-conferencia.md`.

### 4.6 O que esta EPIC declara como limite, e não como pendência

**Invenção não numérica.** A camada determinística não alcança "a resposta
inventou" em geral — isso exigiria entender a prosa, e esta camada existe por
ser determinística. O caso perigoso dela, o **número** inventado, já é coberto
pela R4 nos dois sentidos. Fica escrito como limite conhecido.

---

## 5. As cinco decisões — estudo completo

Cada uma traz: o que está em jogo, as opções com prós e contras, e a
**recomendação**, feita pela leitura do produto e não pela regra já escrita —
onde a recomendação contraria uma decisão anterior, isso está dito com todas as
letras.

---

### 5.1 Decisão A (U4) — costurar o encaminhamento, em vez de descartar a resposta

**O que está em jogo.** A R2 é a **única** das cinco regras cuja violação é a
*ausência* de um texto fixo, e não a presença de algo proibido. Nas outras
quatro, o problema está no que foi dito, e regenerar faz sentido: o modelo
precisa escrever diferente. Aqui, **o aplicativo sabe exatamente qual é o texto
que falta** — e mesmo assim joga fora a resposta inteira por causa dele.

Medido: 2 de 2 reprovações da conversa real foram R2. Uma delas custou a
resposta inteira, duas vezes, e a pessoa caiu no degradado.

| Opção | O que é | A favor | Contra |
|---|---|---|---|
| **A1 — nada muda** | reprovou por R2 → regenera → degrada (D31) | contrato único para as cinco regras; nada a escrever | continua gastando uma geração inteira, e às vezes a resposta, por uma frase que o aplicativo sabe escrever |
| **A2 — costurar quando a R2 for a única violação** | a resposta aprovada nas outras quatro recebe o encaminhamento no fim, escrito pelo aplicativo | a reprovação mais comum vira zero; o texto é fixo, previsível e testável **uma vez**; nada afrouxa — com qualquer outra regra junto, o caminho continua A → E → C | muda o contrato da D31; um rodapé costurado pode soar colado |
| **A3 — a R2 nunca reprova; costura sempre, em silêncio** | a verificação deixa de tratar a R2 como porta | simplicidade máxima; zero reprovação por R2 | perde-se a medida de quantas vezes o modelo esquece — e essa medida é insumo da L7 |
| **A4 — a R2 sai da verificação e vira responsabilidade da tela** | o aviso permanente da tela cumpre o papel sozinho | o menos código de todos | a constituição pede encaminhamento **na resposta**; uma banca lê isso com atenção, e aviso de moldura não é a mesma coisa |

**Recomendação: A2.**

**Por quê.** É a única que melhora os dois lados ao mesmo tempo. A garantia que
a R2 existe para dar — *toda resposta sobre medida termina encaminhando* — passa
de **probabilística** (o modelo lembra ou não) para **determinística** (o
aplicativo garante). Isso é mais forte do que o que existe hoje, não mais fraco:
hoje, quando o modelo esquece, a pessoa não recebe nem o encaminhamento nem a
resposta.

O "soar colado" é risco de redação, e redação se resolve escrevendo bem: uma
frase, no tom do resto do aplicativo, acrescentada **só quando faltar**.

**A A3 é tentadora e deve ser recusada por um motivo só:** se a costura for
silenciosa e incondicional, ninguém nunca mais sabe se o modelo obedece à R2. Na
A2 a costura é registrada no log (`R2 costurada`), e a L7 continua contando.
**A medição é o que este projeto tem de mais valioso; nenhuma conveniência vale
cegá-la.**

**O que isso muda na D31:** ela ganha uma ressalva escrita — "exceto quando a
única violação for a R2, caso em que o encaminhamento é acrescentado pelo
aplicativo". A ordem A → E → C continua valendo para todo o resto.

---

### 5.2 Decisão B (U17) — a data que vem preenchida com hoje

**O que está em jogo.** O campo de data do formulário vem preenchido com a data
de hoje. Quem digitaliza um exame recém-feito ganha conveniência; quem
digitaliza um laudo antigo cai numa armadilha silenciosa — e **foi exatamente o
que aconteceu**: um laudo de 04/10/2025 entrou como 18/09/2026, e o assistente
disse as duas datas em dois turnos, as duas corretas, e juntas mentindo.

| Opção | O que é | A favor | Contra |
|---|---|---|---|
| **B1 — nada muda** | o campo continua com hoje, em silêncio | zero trabalho | a armadilha continua, e ela já pegou o primeiro usuário real |
| **B2 — manter o preenchimento e avisar na divergência** | depois da extração, se a data de coleta lida do laudo divergir da digitada, a tela avisa | não mexe no que funciona; transforma em informação o que hoje é invisível | o aviso chega **depois** do envio; a pessoa precisa voltar para corrigir |
| **B3 — deixar o campo vazio e obrigatório** | ninguém digita por engano | acaba com a armadilha na raiz | fricção em **todo** upload, inclusive nos casos em que hoje está certo; e quem não sabe a data digita hoje assim mesmo |
| **B4 — preencher com a data de coleta depois da extração** | a extração sobrescreve o formulário | a data fica certa sem ninguém fazer nada | **contraria a D24 frontalmente**; e um laudo consolidado tem várias datas de coleta — qual delas? |
| **B5 — renomear o campo, mantendo o preenchimento** | o campo passa a se chamar "guardado em" / "data de registro", e a data do exame é a lida do laudo | ataca a **causa**: o campo mente no nome, não no valor; zero fricção; coerente com o que o backend já faz desde o Bloco 8 | mexe em copy de uma tela entregue; a tela de exames passa a mostrar duas datas em alguns casos |

**Recomendação: B5 + B2, juntas.**

**Por quê.** O defeito não é o valor preenchido: é o **nome do campo**. Ele se
chama "data do documento" e a pessoa lê "data do exame" — então preenche com
hoje sem perceber que está afirmando quando o exame foi feito. Renomear resolve
a ambiguidade sem tirar a conveniência de ninguém, e alinha a tela com o que o
backend já faz: desde o Bloco 8, `consultar_exames` devolve `coletadoEntre` e o
assistente prefere a data de coleta ao falar de "quando". **A tela ficou para
trás do assistente.**

O aviso da B2 entra como cinto e suspensório, para o caso em que a pessoa
digitou uma data e o papel diz outra.

**A B4 fica recusada, e o motivo é bom:** um laudo consolidado reúne coletas de
dias diferentes — não existe "a" data de coleta para escrever no formulário. É a
mesma razão pela qual a D24 pôs a data na **linha**.

---

### 5.3 Decisão C (F6) — a fronteira da regra 4

**O que está em jogo.** A resposta do turno 1 fechou com:

> *"Se tiver algum valor que te preocupa ou sintoma relacionado, vale levar o
> exame completo a uma consulta... o especialista que solicitou o exame."*

O assistente **não julgou** nenhum valor — a regra 4 foi obedecida. Mas a frase
**convida a pessoa a julgar**, e sugere que existem valores preocupantes ali. E
"o especialista que solicitou o exame" afirma dois fatos que o aplicativo não
sabe: que houve um pedido, e que quem pediu era especialista.

| Opção | O que é | A favor | Contra |
|---|---|---|---|
| **C1 — a fronteira fica onde está, e isso vira decisão escrita** | nada muda no código; escreve-se o porquê | zero trabalho; a frase é empática e humana | continua inventando o "especialista"; e uma banca vai perguntar por que ela passou |
| **C2 — proibir a construção no prompt** | o prompt veta "valor que te preocupa" e parentes | ataca a frase | vetar *frase* em prosa gerada é jogo de gato e rato: o modelo escreve a próxima variação |
| **C3 — o fecho vira texto fixo do aplicativo** | o modelo não escreve mais o encaminhamento; ele é acrescentado pelo aplicativo, sempre igual | acaba com a **classe** de problema, não com uma frase; testável uma vez; elimina de quebra o "especialista" inventado; e é **a mesma máquina da decisão A** | o fecho fica repetitivo entre turnos; perde-se alguma naturalidade |

**Recomendação: C3.**

**Por quê.** A C1 e a C2 tratam uma frase; a C3 trata a **fonte**. Enquanto o
encaminhamento for prosa gerada, ele carrega tudo o que prosa gerada carrega:
variação, empatia mal calibrada e fatos inventados sobre quem pediu o exame.

E há um argumento de engenharia que decide: **a decisão A já constrói esse texto
fixo.** Adotar a C3 não custa uma máquina nova — custa usar a mesma máquina
sempre, em vez de só quando o modelo esquece. O projeto ganha um encaminhamento
igual em toda resposta clínica, escrito por uma pessoa, revisado uma vez e
provado por um teste.

A repetição é o preço, e é um preço que este aplicativo já paga de propósito em
outros lugares: a copy inteira dele é sóbria por decisão.

---

### 5.4 Decisão D (F4) — quem escolhe a faixa quando o laudo traz várias

**O que está em jogo.** Testosterona tem faixa por idade e sexo. Vitamina D tem
faixa por idade e grupo de risco. Colesterol tem faixa por risco
cardiovascular. **Alguém precisa decidir qual linha da tabela vale** — ou
ninguém decide, e a tabela aparece inteira.

| Opção | Quem escolhe | A favor | Contra |
|---|---|---|---|
| **D1 — o modelo escolhe e declara em `warnings`** (hoje) | o modelo | já funciona; a escolha é declarada | a declaração é prosa que nenhuma tela lê; é o modelo interpretando, e isso cresce sozinho |
| **D2 — o modelo escolhe e declara em campo estruturado** | o modelo | a escolha fica auditável e testável | continua sendo o modelo decidindo o que se aplica a uma pessoa |
| **D3 — ninguém escolhe: a faixa é transcrita como o papel a apresenta** | ninguém | coerente com a tese do projeto inteiro; a pessoa vê o que veria olhando o PDF; **nada a validar, nada a errar** | a tela mostra texto em vez de banda no gráfico; a comparação automática entre faixas fica de fora |
| **D4 — o aplicativo escolhe, usando o perfil (sexo e idade)** | o aplicativo, com regra determinística | a faixa aplicável aparece pronta, sem modelo no caminho | é o **aplicativo** interpretando; erra em silêncio quando o perfil está incompleto ou desatualizado; e assume que a tabela do laudo é lida do jeito que nós a lemos |

**Recomendação: D3.**

**Por quê.** É a única opção em que a frase "este aplicativo organiza informação
e não interpreta" continua verdadeira sem asterisco. A D4 é sedutora — parece
automação inofensiva —, mas é exatamente onde um aplicativo de saúde começa a
tomar decisão clínica por conveniência de interface: no dia em que o perfil
tiver o sexo errado ou a idade vencida, ele mostra a faixa errada **com a
autoridade de um número**, e ninguém vai conferir.

A D3 também é a que combina com a decisão E: se a faixa é guardada como texto,
não sobra nada para escolher. **O par D3 + E3 é uma decisão só, vista de dois
lados.**

**O que a D3 custa, e é honesto dizer:** a banda de fundo do gráfico continua
aparecendo só onde há dois números. Para tabela, a tela mostra o texto na linha
da coleta. Isso é menos bonito e é verdadeiro — e a S8 passa a valer para
**todos** os analitos, porque a faixa daquele laboratório passa a estar visível
em todos.

**A D4 fica registrada como caminho futuro**, e exige decisão própria: destacar
a linha aplicável **sem escondê-la**, com o critério visível ("faixa para 30–39
anos"), e nunca substituindo o texto integral.

---

### 5.5 Decisão E (F1) — a forma de guardar a faixa que não é dois números

**O que está em jogo.** É a única decisão desta lista que é de esquema. Uma vez
gravada em linha de usuário, ela é cara de mudar.

| Opção | O que é | A favor | Contra |
|---|---|---|---|
| **E1 — só texto** | `referenceLow`/`High` saem; tudo vira um campo de texto | um caminho só | joga fora a banda do gráfico, que funciona e é útil onde há dois números; migração destrutiva |
| **E2 — união estruturada** | um campo que modela as seis formas (par, limite, tabela por critério, categórica…) | o dado fica consultável; dá para comparar faixas entre laboratórios | **nenhum consumidor precisa disso hoje**; o modelo passaria a preencher uma estrutura em vez de transcrever, que é a porta para o palpite; é a parte mais cara da EPIC |
| **E3 — híbrido: os números continuam, o texto entra ao lado** | `rawReferenceText` novo e opcional, com o que está escrito; `referenceLow`/`High` preenchidos **só quando o papel dá os dois números, ou um só** | não mexe no que funciona; migração aditiva; a tela ganha o que mostrar em 100% das linhas; o modelo continua **transcrevendo** | duas fontes para a mesma informação, e é preciso dizer qual manda na tela |

**Recomendação: E3.**

**Por quê.** É a forma que preserva as duas propriedades já pagas: a banda do
gráfico (onde existe par de números) e o princípio do `rawValue` (guardar o que
o papel diz, sem normalizar). E é aditiva: nenhum documento já gravado deixa de
ser válido — a mesma regra que o campo `laboratorio` seguiu no Bloco 8.

A E2 é a opção "certa" de modelagem e a errada de produto: constrói estrutura
rica para um consumidor que não existe, e transfere ao modelo a tarefa de
classificar a forma da tabela — trabalho novo, com erro novo, para uma tela que
só precisa mostrar a frase.

**A regra de precedência, e ela precisa estar escrita:** a tela mostra os
números quando eles existirem; mostra o texto quando não existirem; e **quando a
unidade do valor exibido for diferente da unidade escrita no papel, o texto vem
acompanhado do valor como o papel o escreveu** — o componente já tem esse
mecanismo, e ele existe porque valor e faixa convertem na mesma passagem (D17),
enquanto texto não converte nunca.

---

## 6. Mapa de dados

| Campo | Onde | Novo? | Por quê |
|---|---|---|---|
| `rawReferenceText` | `RawLabResult` (extração) e `LabResult` (banco) | **sim**, opcional | a faixa como o papel a apresenta, sem normalizar. Nível da **linha**, porque a faixa é do analito, não do documento |
| `referenceLow` / `referenceHigh` | `LabResult` | não | continuam, e passam a ser preenchidos **também** com limite único |
| `rawValue` / `rawUnit` | `LabResult` | não | a âncora de leitura quando a unidade exibida difere da do papel |
| `documentDate` | `MedicalDocument` | não | **muda de nome na tela**, não no esquema (decisão B) |
| `collectedAt` | `LabResult` | não | continua sendo a data do exame, por linha (D24) |

**Nenhuma migração destrutiva.** Linha já gravada continua válida, com
`rawReferenceText` vazio — e vazio significa "esta linha foi lida antes do campo
existir", não "o laudo não trouxe faixa". Reprocessar o documento preenche, e a
idempotência já foi provada contra o serviço real.

---

## 7. Requisitos não-funcionais

- **O modelo transcreve; ele não escolhe e não calcula.** Nenhuma instrução
  desta EPIC pode pedir ao modelo que reduza tabela a número.
- **Preferir vazio a errado** continua sendo a regra da extração.
- **Nada afrouxa.** R1, R3, R4 e R5 reprovam exatamente o que reprovavam. As
  decisões A e C mexem só na R2, e só no sentido de **acrescentar** o texto que
  falta — nunca no de aceitar uma resposta que dizia algo proibido.
- **Toda costura é registrada no log.** Se o aplicativo escreveu o
  encaminhamento no lugar do modelo, isso aparece na medição da L7.
- **Ciclo TDD, com falha confirmada.** "Nenhum teste encontrado" não é falha
  confirmada; teste que passa de primeira é confirmado por mutação.
- **`npm run validate` verde** antes de declarar qualquer item pronto.

---

## 8. O que esta EPIC NÃO faz

- **Não escolhe faixa por pessoa** (decisão D3). Nem o modelo, nem o aplicativo,
  nem agora, nem como "ajudinha de interface".
- **Não modela a tabela de referência como estrutura consultável** (E2
  recusada).
- **Não sobrescreve a data do formulário com a data lida do laudo** (B4
  recusada; contraria a D24).
- **Não cria verificador de vocabulário interno** — decidido na execução do
  Bloco 8 e mantido: reprovar resposta boa por uma palavra repetiria o erro da
  R2. Quem mede é a L7.
- **Não persegue invenção não numérica** por meio determinístico. Limite
  registrado em §4.6.
- **Não mexe na tela de série além da faixa**, e não muda o gráfico.

---

## 9. Critérios de aceite

### A faixa

1. Linha cujo laudo traz **dois números** continua com `referenceLow` e
   `referenceHigh` preenchidos, e a banda do gráfico continua aparecendo.
2. Linha cujo laudo traz **um limite só** ("Superior a 40 mg/dL") entra com um
   dos dois números preenchido, e a tela escreve "acima de 40 mg/dL".
3. Linha cujo laudo traz **tabela** entra com `rawReferenceText` preenchido,
   como está no papel, e sem número nenhum inventado.
4. Linha cujo laudo **não traz faixa** continua sem faixa, e a tela diz que o
   laudo não trouxe — sem afirmar nada sobre o laboratório.
5. O reprocessamento do laudo do Delboni devolve **menos de 3** linhas sem faixa
   nem texto, contra as 14 de hoje.

### A interpretação

6. Nenhum aviso da extração contém escolha de faixa por sexo, idade ou grupo —
   com teste sobre a saída, e instrução explícita no prompt.
7. O prompt **proíbe** reduzir tabela a par de números, com teste sobre o texto
   do prompt.

### A conversa

8. Resposta com medida que **não** traz encaminhamento recebe o encaminhamento
   do aplicativo, e não é descartada — quando a R2 for a **única** violação.
9. Resposta que viola qualquer outra regra continua no caminho A → E → C.
10. A costura aparece no log, distinguível de uma resposta que já trazia o
    encaminhamento.
11. O texto do encaminhamento é **fixo**, passa nas cinco regras, e não afirma
    nada sobre quem pediu o exame.

### As datas

12. O campo do formulário tem nome que descreve o que ele é, e a tela de exames
    apresenta a data de coleta quando ela existir.
13. Divergência entre a data digitada e a lida do laudo produz aviso visível.

### Encerramento

14. `npm run validate` passa.
15. As cinco decisões estão registradas como decisão numerada em
    `estudos-ia/00-visao/decisoes.md`, **em qualquer sentido** — inclusive se a
    escolha contrariar a recomendação desta spec.
16. **[USUÁRIO]** L7: nova rodada de vinte perguntas, com a distribuição por
    regra.
17. **[USUÁRIO]** U12: o laboratório conferido contra laudos de emissores
    diferentes.
18. **[USUÁRIO]** O custo do falso positivo da R1 medido na mesma rodada.
19. Esta conferência, feita no encerramento e escrita item a item.

# EPIC: Engenharia pendente do sistema de IA — o dado que duplica, o que sobra, o arquivo grande e o laudo de várias folhas (Bloco 11)

## 1. Identificação

- **Origem:** o pedido de 2026-09-24 — *"Quero seguir com o '3. Engenharia que
  ficou registrada e não foi feita'"* —, a seção do relatório do Bloco 10 que
  listava: o reprocessamento que duplica linhas, o laudo de várias fotos
  (Decisão K2), o arquivo grande recusado em vez de dividido, o guardrail que não
  vê imagem nem PDF, o falso positivo da R1 e a cobertura.
- **Mudança de escopo, no mesmo pedido:** o aplicativo **não** será aberto a todos
  os brasileiros. Produção pública, consentimento de transferência internacional
  (LGPD art. 33), plano da conta AWS e custo em escala **saem** da lista de
  pendências e passam a ser "fora de escopo" em `limitacoes.md` (Bloco 6 desta
  EPIC). O Bloco 10 foi escrito sob a premissa contrária; nada do que ele
  entregou depende dela.
- **O que a leitura do código acrescentou à lista** — dois defeitos que nenhum
  documento registrava, e que pesam mais do que os da lista:
  1. **Reprocessar desfaz a correção da pessoa.** A gravação reescreve `value`,
     `unit` e `reviewStatus` de toda linha. Uma linha que a pessoa conferiu no
     papel (`CONFIRMADO_PELO_USUARIO`) volta a ser a leitura do modelo — e, se o
     modelo errar de novo, volta ao número errado que ela tinha corrigido.
  2. **Apagar o documento não apaga o que foi lido dele.** `deleteExamDocument`
     remove o arquivo e a linha do documento; as linhas de `LabResult` e
     `PrescriptionItem` ficam. Elas continuam na série e o chat as cita — com uma
     citação que aponta para um documento que não existe mais.
  - E um menor: a tela do documento lê as linhas **sem paginar**
    (`listLabResultByDocumentId` sem `nextToken`).
- **Medido no banco do sandbox antes de escrever (2026-09-24), sem ler valor:**
  7 documentos, 48 linhas, **0 órfãs** (nenhum documento com linha foi apagado
  ainda) e **7 linhas com código local** — as candidatas à duplicação num
  reprocessamento. Não há limpeza retroativa a fazer.
- **Relação com as EPICs entregues:** nada é refeito. A gravação idempotente
  (D22), o código local (D32), a rota pelos bytes (D40) e o motivo da falha (D42)
  continuam como estão; esta EPIC corrige onde eles se encontram com o passado e
  abre a porta que a Decisão K deixou fechada.
- **Telas afetadas:** `src/screens/AddExamScreen.tsx` (várias folhas),
  `src/screens/DocumentDetailScreen.tsx` (abrir cada folha; apagar leva as
  linhas junto), `src/components/ExtractedResultsSection.tsx` (sem mudança de
  copy; a lista passa a vir inteira).
- **Backend afetado:** `amplify/functions/extract-document-data/` (plano de
  regravação, divisão do PDF, junção das partes, várias imagens numa chamada),
  `amplify/data/schemas/medical-documents.ts` (**um campo novo**:
  `extraPageKeys`), `amplify/backend.ts` (consulta pelo índice do documento),
  `amplify/functions/chat-assistant/chatPrompt.ts` (o vocabulário da R1).
- **Dependência nova:** `pdf-lib` (na Lambda; justificativa em `plan.md`, regra 3).
- **Prioridade:** P0 para os dois defeitos de dado (Blocos 1 e 2), P1 para o
  resto.
- **Sensibilidade: alta.** Os Blocos 1 e 2 são sobre o dado de saúde da pessoa
  estar certo e sumir quando ela manda sumir.

---

## 2. O que muda para a pessoa

### Hoje

1. Ela confere no papel a hemoglobina que o modelo leu errado e corrige para
   13,2. Depois toca em "Tentar de novo" num documento que falhou por outro
   motivo, ou o documento é reprocessado — e a hemoglobina volta a ser o número
   errado, marcado como leitura automática.
2. Um laudo do Delboni lido antes do Bloco 10 tem VPM com código local. Ela
   reprocessa: a série do VPM mostra **dois pontos na mesma data**, um de cada
   código — e o chat conta os dois.
3. Ela apaga um laudo que enviou por engano. A glicose dele continua no
   gráfico, e o chat responde "sua glicose em 12/03 foi 180, segundo o laudo…"
   citando um documento que ela apagou.
4. Um PDF digitalizado de 6 MB sobe (o aplicativo aceita até 10 MB) e falha no
   servidor com "arquivo grande demais".
5. Ela tem um laudo de três folhas em papel. Fotografa as três e cria três
   documentos — e a folha isolada é exatamente a condição em que o modelo foi
   buscar número no gráfico (G10).
6. Ela pergunta "o que está escrito no fim do laudo?" e a primeira resposta é
   reprovada pela R1 porque repetiu a palavra da pergunta — uma geração a mais,
   que ela espera.

### Depois desta EPIC

1. Reprocessar **nunca** desfaz o que a pessoa conferiu. Se a leitura nova
   discordar, a dela vence, e o aviso diz que houve discordância.
2. Reprocessar um documento antigo **troca** a linha de código local pela de
   código LOINC — uma linha, um ponto na série. A correção que ela tinha feito
   na linha antiga passa para a nova.
3. Apagar o documento apaga o que foi lido dele. O gráfico e o chat deixam de
   vê-lo.
4. PDF de até 10 MB é lido: o servidor divide em partes que cabem e junta o
   resultado. Se uma parte falhar, as outras entram e o aviso diz quais páginas
   ficaram de fora.
5. Um documento pode ter **até 10 folhas** fotografadas. Elas vão juntas ao
   modelo, na ordem, e o documento é um só.
6. O modelo é avisado do termo vetado **antes** de escrever, com as palavras que
   ele deve usar no lugar. A trava de código continua tão estrita quanto hoje.

---

## 3. Os achados, e o que cada um exige

### 3.1 E1 — Reprocessar desfaz a correção da pessoa (P0, achado na leitura)

`resultWriteBuilder.ts` escreve `value`, `valueQualifier`, `unit` e
`reviewStatus` em toda gravação. A gravação é idempotente pelo **id** (D22), e é
isso que faz a mesma linha ser reescrita — com o que o modelo leu agora. Só
`correctedAt` sobrevive, porque o construtor nunca o escreve.

**Exige:** antes de gravar, ler as linhas do documento; a linha nova cujo id já
existe **com** `reviewStatus = CONFIRMADO_PELO_USUARIO` mantém os quatro campos
da pessoa. Quando o valor lido agora difere do que ela conferiu, vira aviso.

### 3.2 E2 — Reprocessar duplica a linha que mudou de código (P0, limitações §2.7)

O id inclui o código do analito. A linha lida antes do Bloco 10 como
`X-VPM` e relida com o código LOINC do catálogo são dois ids — a gravação cria a nova e não toca
na antiga.

**Exige:** reconhecer "a mesma linha do mesmo documento" sem depender do código,
e apagar a versão de código local quando a de código LOINC a substitui.

**O critério, e por que ele é estreito.** Não há índice de linha gravado, e o
rótulo do papel se perde na linha de catálogo (`analyteLabel` vira o nome
LOINC). Uma linha antiga é **substituída** por uma nova quando:

- a antiga tem código **local** e a nova, código de **catálogo**;
- as duas têm o **mesmo momento de coleta**;
- o código local da antiga é um dos que o **rótulo do papel** da nova, ou o
  rótulo, o nome em português ou um sinônimo do analito de catálogo, produzem
  por `localAnalyteCode`.

Critérios mais largos (mesmo valor bruto na mesma página, por exemplo) acertam
mais casos e **apagam dado errado** quando dois analitos diferentes têm o mesmo
número — e apagar é a operação que não volta. Na dúvida, a linha antiga fica: o
custo é um ponto duplicado visível, não um resultado sumido.

Linha antiga que **não** reaparece na leitura nova **fica** — a omissão é
instável (limitações §2.1) e a segunda passagem **soma** (D22).

### 3.3 E3 — Apagar o documento deixa as linhas (P0, achado na leitura)

**Exige:** a exclusão apaga, nesta ordem, as linhas de resultado, os itens de
receita, os arquivos e, por último, o documento. A ordem é o que torna a
falha recuperável: se ela parar no meio, o documento ainda existe e a pessoa
pode tentar de novo. Apagar o documento primeiro deixaria linhas que nenhuma
tela alcança mais.

### 3.4 E4 — A tela do documento não pagina (P1, achado na leitura)

`fetchExtractionState` lê a primeira página do índice e para. **Exige:** seguir o
`nextToken` até o fim.

### 3.5 E5 — PDF acima de 4,5 MB é recusado (P1)

O bloco de documento do Converse aceita até 4,5 MB; o aplicativo aceita até
10 MB. Um PDF digitalizado de 3 a 6 páginas passa desse limite com frequência.

**Exige:** dividir o PDF em partes de páginas contíguas que caibam, pedir a
leitura de cada parte, e juntar: resultados em sequência, com `sourcePage`
**deslocado** para a página do documento inteiro; avisos somados; laboratório
da primeira parte que o trouxer; consumo somado. Uma página sozinha maior que o
limite não tem como ser lida por este caminho, e a falha diz isso.

### 3.6 E6 — Um laudo de várias folhas vira vários documentos (P1, Decisão K2)

**Exige:** o documento ganha folhas adicionais; a tela de adicionar deixa
acrescentar folhas quando a primeira é imagem; a leitura manda todas as folhas
numa chamada, na ordem; o detalhe deixa abrir cada folha; a exclusão apaga
todas.

### 3.7 E7 — A R1 só é conhecida depois (P1, limitações §3.2)

O prompt do chat não diz ao modelo que o termo existe. O estudo de regras de
linguagem previa a camada de vocabulário (camada 1) e a tabela de substituições;
a implementação ficou só com a camada 4 (a trava). **2 reprovações em 12** nas
perguntas feitas para provocá-la, todas salvas pela segunda geração.

**Exige:** o prompt ganha a instrução e a tabela, **montadas em tempo de
execução** a partir da mesma raiz construída de `languageRules.ts` — o
repositório continua sem a palavra escrita. A trava **não** afrouxa: o
contrato do arquivo é "na dúvida, reprova".

### 3.8 E8 — O guardrail não vê o bloco de documento nem o de imagem

Não é engenharia que esta EPIC possa fazer: o Converse não aceita
`guardContent` em bloco de documento ou de imagem (D20). A proteção contra
instrução plantada continua sendo **estrutura** — instrução de sistema e schema
sem campo onde uma instrução obedecida se manifestaria. Fica registrada como
recusa de projeto em `limitacoes.md`, com a razão, como já estava.

### 3.9 E9 — Cobertura

Laudo descritivo, cultura e sorologia **não** entram na série por decisão
(limitações §1, `SCALE_TYP = Qn`). Não é pendência de engenharia.

---

## 4. As decisões — estudo completo

### 4.1 Decisão L — onde o plano de regravação lê o que já existe

| Opção | A favor | Contra |
|---|---|---|
| **L1** consultar o índice `labResultsByDocumentId` antes de gravar | lê exatamente as linhas do documento; permite as duas correções (E1, E2) com a mesma leitura | uma consulta a mais por leitura; a Lambda precisa de permissão explícita no índice |
| **L2** calcular o id antigo a partir do rótulo e apagar às cegas | nenhuma leitura | não resolve E1 (não sabe o que a pessoa corrigiu); depende de o modelo repetir o rótulo idêntico |
| **L3** varrer a tabela filtrando pelo documento | não precisa de índice | lê a tabela inteira de todo mundo para achar dezenas de linhas |

**Decisão: L1.** A consulta custa milissegundos diante de uma chamada de modelo
de dezenas de segundos, e é a única que resolve E1.

### 4.2 Decisão M — onde a exclusão em cascata acontece

| Opção | A favor | Contra |
|---|---|---|
| **M1** no aplicativo, antes de apagar o documento | as regras `allow.owner()` já permitem; nenhuma infraestrutura nova; a ordem é controlada por quem vê o erro | se o aplicativo fechar no meio, sobra linha — mas o documento também sobra, e apagar de novo termina o serviço |
| **M2** num gatilho do DynamoDB (stream da tabela de documentos) | independe do aplicativo | infraestrutura nova, e apagaria as linhas **depois** de o documento sumir — a janela em que a série mostra dado de um documento inexistente |

**Decisão: M1.** A regra de ordem (linhas → arquivos → documento) é o que a
torna segura.

### 4.3 Decisão N — como o PDF grande é dividido

| Opção | A favor | Contra |
|---|---|---|
| **N1** dividir no servidor, com `pdf-lib`, em metades sucessivas até cada parte caber | parte o menor número de vezes; lida com página grande e pequena no mesmo arquivo; a divisão é testável sem AWS | dependência nova na Lambda |
| **N2** baixar o teto do aplicativo para 4,5 MB | nenhum código | recusa o PDF digitalizado comum; a pessoa não tem como encolher um PDF no celular |
| **N3** mandar várias partes como vários blocos de documento numa chamada só | uma chamada | o teto de tamanho do pedido inteiro não é documentado para o Converse, e a saída de 8 000 tokens é a mesma para o dobro de páginas |

**Decisão: N1.** Cada parte é uma chamada completa, com a mesma instrução, o
mesmo schema e o mesmo teto de saída — o que foi medido para um PDF de até
4,5 MB continua valendo para cada parte.

### 4.4 Decisão O — como as folhas entram no documento

| Opção | A favor | Contra |
|---|---|---|
| **O1** campo novo `extraPageKeys` (chaves das folhas 2 a N); `s3Key` continua sendo a folha 1 | todo código que lê `s3Key` hoje continua certo; documento antigo é um documento de uma folha sem mudar nada | a folha 1 é especial no modelo de dados |
| **O2** substituir `s3Key` por uma lista | modelo uniforme | quebra toda leitura atual e todo documento gravado (regra 5) |
| **O3** um modelo novo `DocumentPage` | normalizado | uma tabela, um índice e uma consulta a mais para ler um documento |

**Decisão: O1.** A regra 5 da constituição decide.

**Limites:** até **10 folhas**, só **imagem** (PDF já tem páginas). O Converse
aceita 20 imagens de até 3,75 MB por pedido; 10 folhas de cerca de 1 MB (a foto
encolhida no aparelho, Bloco 10) ficam longe dos dois tetos.

### 4.5 Decisão P — o vocabulário da R1 no prompt

| Opção | A favor | Contra |
|---|---|---|
| **P1** instrução e tabela de substituições no prompt, com a raiz montada em tempo de execução; a trava fica igual | previne em vez de só reprovar; o repositório continua sem a palavra; nada afrouxa | o modelo lê a palavra — e há o risco, que a medição responde, de citá-la mais por tê-la lido |
| **P2** afrouxar a trava para "no fim do" e "objetivo" | zera o falso positivo medido | a proibição é do dono do projeto, e o contrato é "na dúvida, reprova" |
| **P3** nada | nenhum risco novo | uma geração a mais por pergunta que a provoca |

**Decisão: P1, condicionada à medição.** As três perguntas feitas para provocar
a R1 rodam antes e depois, três vezes cada. Se a reprovação na primeira geração
**não cair**, a instrução sai e o registro diz por quê.

---

## 5. Mapa de dados

| Dado | Onde | Muda? |
|---|---|---|
| `MedicalDocument.extraPageKeys` | `medical-documents.ts` | **novo**, `a.string().array()`, opcional |
| Linhas de `LabResult` | tabela do Amplify | a Lambda passa a **apagar** a versão de código local substituída |
| `LabResult.value/unit/valueQualifier/reviewStatus` | idem | preservados quando a pessoa conferiu |
| Arquivos das folhas | `medical-documents/{identityId}/exams/…` | uma chave por folha, na mesma pasta |
| Índice `labResultsByDocumentId` | DynamoDB | passa a ser consultado pela Lambda (permissão nova) |

---

## 6. Requisitos não-funcionais

- **Nada é apagado por inferência larga** (E2): o critério de substituição é o
  estreito de §3.2, e cada substituição vira log com a quantidade, sem conteúdo.
- **Nenhum dado de saúde no log**: quantidades, nunca rótulo nem valor.
- **Folha é validada como a folha 1**: mesma pasta da primeira, prefixo
  `medical-documents/`, sem `..`, e o formato sai dos bytes.
- **A divisão do PDF não muda o que foi medido**: cada parte é uma chamada
  idêntica à de um PDF pequeno.
- **Regra 5:** documento antigo (sem `extraPageKeys`) é lido, aberto e apagado
  exatamente como hoje, e o id das linhas dele não muda (a soma de um arquivo só
  continua sendo a soma do arquivo).

---

## 7. O que esta EPIC NÃO faz

- **Não** fecha a leitura cruzada de arquivo por `s3Key` forjado — achado de
  segurança pré-existente, registrado como tarefa própria (a Lambda lê qualquer
  chave sob `medical-documents/` que o cliente gravar no documento).
- **Não** mistura PDF e foto no mesmo documento.
- **Não** afrouxa a R1 nem a R3.
- **Não** muda o anexo do chat (continua um arquivo por mensagem).
- **Não** mostra a imagem da folha dentro do aplicativo — o detalhe abre o
  arquivo, como já fazia com o de uma folha.
- **Não** trata produção pública, LGPD art. 33, conta AWS ou custo em escala
  (fora de escopo desde 2026-09-24).

---

## 8. Critérios de aceite

### A regravação (E1, E2)
- [ ] Linha conferida pela pessoa mantém valor, qualificador, unidade e status ao
      ser relida; se a leitura nova discordar, há aviso.
- [ ] Linha antiga de código local é apagada quando a nova, de catálogo, a
      substitui pelo critério de §3.2; a correção dela passa para a nova.
- [ ] Linha antiga que não reaparece fica.
- [ ] Linha local cujo rótulo não bate com nenhum nome do analito novo fica.
- [ ] A Lambda tem permissão de consulta no índice do documento.

### A exclusão (E3, E4)
- [ ] Apagar o documento apaga as linhas de resultado e os itens de receita
      dele, depois os arquivos, depois o documento — nessa ordem.
- [ ] Falha no meio deixa o documento existindo, e o erro chega à tela.
- [ ] A tela do documento lê todas as páginas de linhas.

### O PDF grande (E5)
- [ ] PDF entre 4,5 e 10 MB é dividido em partes que cabem e lido.
- [ ] `sourcePage` sai na numeração do documento inteiro.
- [ ] Uma parte que falha não derruba as outras; o aviso nomeia as páginas.
- [ ] Todas as partes falhando dá falha com o motivo da primeira.
- [ ] Página sozinha acima do teto dá `grande-demais`.

### As folhas (E6)
- [ ] O documento aceita até 10 folhas de imagem; PDF não aceita folha extra.
- [ ] A leitura manda todas as folhas numa chamada, na ordem, com o pedido que
      diz que são folhas do mesmo documento.
- [ ] Folha de outra pasta, ou com `..`, faz a leitura falhar com
      `arquivo-sem-chave`.
- [ ] O detalhe abre cada folha; a exclusão apaga todas.
- [ ] Documento de uma folha tem a mesma soma e os mesmos ids de antes.

### A R1 (E7)
- [ ] O prompt tem a instrução e a tabela, e o repositório continua sem a
      palavra escrita (varredura).
- [ ] A medição antes/depois está registrada, e a decisão P1 foi mantida ou
      revertida por ela.

### O encerramento
- [ ] `limitacoes.md` atualizado: §2.3 e §2.7 fechados, E1/E3 registrados como
      achados e fechados, produção pública fora de escopo.
- [ ] Decisões L–P em `decisoes.md` (D47–D51).
- [ ] `npm run validate` verde.

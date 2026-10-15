# EPIC: Fechamento funcional do sistema de IA — a foto, a cobertura e a medição (Bloco 10)

## 1. Identificação

- **Origem:** o pedido de 2026-09-22 — *"desenvolver tudo que falta para chegar
  na funcionalidade de Sistema IA perfeita… com leitura de imagens e PDF…
  aberto para o uso de todos os brasileiros, então deve ser funcional"* — mais a
  lista do que faltava, em três grupos: **medição** (L7, custo do falso positivo
  da R1, ponta a ponta, U12), **T14** (parada por falta de papel, com três coisas
  que a adiantam) e **Fase 4** (4.1 e 4.2).
- **O que a leitura do código acrescentou à lista**, e que muda a prioridade de
  tudo: **foto de laudo não é lida.** Não é defeito de leitura — é ausência de
  caminho. A imagem vai ao Textract, e a conta recusa o Textract no nível da
  conta (`SubscriptionRequiredException`, estudo de 2026-09-18). O aplicativo
  tem um botão de câmera na tela de exames que produz um documento que nunca
  será lido.
- **Relação com as EPICs entregues:** `extracao-de-documentos` entregou a leitura
  de PDF; `lacunas-e-decisoes` (Bloco 9) fechou a faixa de referência e as cinco
  decisões. **Nada disso é refeito.** Esta EPIC abre a segunda porta (a foto),
  amplia o vocabulário, e constrói o instrumento que mede o sistema inteiro.
- **Telas afetadas:** `src/screens/ExamsScreen.tsx` e `AddExamScreen.tsx` (a foto
  encolhe antes de subir), `src/screens/ChatBotScreen.tsx` (a mesma coisa no
  anexo), `src/components/ExtractedResultsSection.tsx` (a falha diz o motivo).
- **Backend afetado:** `amplify/functions/extract-document-data/` (rota por
  conteúdo, bloco de imagem, motivo de falha, censura por extenso, catálogo),
  `amplify/functions/chat-assistant/` (anexo de foto), `amplify/backend.ts`
  (permissões do Textract saem).
- **Vocabulário:** `estudos-ia/05-vocabularios/loinc/gerar-extrato.py` ganha o
  eixo do tempo; o extrato e o catálogo são regenerados.
- **Ferramenta nova:** `scripts/avaliacao/` — a pipeline que mede o assistente
  contra o modelo real e monta a planilha da T14.
- **Ator:** a pessoa que recebeu o laudo **em papel** — que é a forma mais comum
  no Brasil fora dos grandes laboratórios privados — e fotografou com o celular.
- **Prioridade: P0 para a foto, P1 para o resto.** A foto é P0 porque o
  aplicativo oferece o botão hoje e o botão não leva a lugar nenhum.
- **Sensibilidade: alta.** Foto é o formato em que o erro de leitura é mais
  provável, e erro de leitura em número de exame é o modo de falha mais grave do
  projeto (roadmap, tarefa 1.5).

---

## 2. A medição é a fundação desta EPIC

A pergunta que decide a arquitetura da foto é uma só: **a visão do modelo lê uma
foto de laudo com a mesma fidelidade com que lê o PDF?** Ela foi medida antes de
qualquer linha de código, do mesmo jeito que a D19 mediu o PDF.

### Como

- O laudo do Delboni que já está no sandbox (20 páginas, 48 linhas lidas do PDF)
  foi renderizado página a página em JPEG, em duas variantes:
  - **limpa** — 150 dpi, 1242×1754, qualidade 85 (a forma de um PDF exportado
    como imagem, ou de um escaneado bom);
  - **foto** — a mesma página girada de −3° a 3°, sobre um fundo marrom de mesa,
    com sombra em gradiente, desfoque gaussiano de 1,1 px e JPEG qualidade 70.
- Quatro páginas escolhidas pela forma, não pela sorte: a **1** (hemograma, 19
  linhas em tabela densa), a **7** (vitamina D, faixa em tabela), a **11**
  (lipídios, três faixas em tabela por risco) e a **18** (hormônios, três linhas
  com valor calculado).
- Cada imagem foi enviada ao mesmo modelo, com o mesmo prompt de sistema, a
  mesma lista de candidatos e o mesmo `output_config` da extração de produção —
  só o bloco do documento mudou, de `document` para `image`.
- O critério de acerto é o do projeto: **o `rawValue` idêntico ao que o PDF
  rendeu**, caractere a caractere, vírgula decimal incluída.

### O resultado

| Página | Variante | Esperadas (PDF) | Lidas | Valores idênticos | Confiança mínima | Tokens (entrada/saída) | Tempo |
|---|---|---|---|---|---|---|---|
| 1 — hemograma | limpa | 19 | 19 | **19** | 0,99 | 9.288 / 1.862 | 20,6 s |
| 1 — hemograma | foto | 19 | 19 | **19** | 0,97 | 9.301 / 1.858 | 18,4 s |
| 7 — vitamina D | limpa | 1 | 1 | **1** | 0,99 | 9.288 / 186 | 5,9 s |
| 7 — vitamina D | foto | 1 | 1 | **1** | 0,97 | 9.301 / 184 | 6,7 s |
| 11 — lipídios | limpa | 3 | 3 | **3** | 0,85 | 9.288 / 666 | 11,0 s |
| 11 — lipídios | foto | 3 | 3 | **2** | 0,95 | 9.301 / 649 | 10,3 s |
| 18 — hormônios | limpa | 3 | 4 | **3** | 0,97 | 9.288 / 913 | 13,5 s |
| 18 — hormônios | foto | 3 | 4 | **3** | 0,95 | 9.301 / 987 | 14,5 s |

**Vinte e seis de vinte e seis na variante limpa; vinte e cinco de vinte e seis
na foto simulada.** O hemograma inteiro — dezenove números em tabela densa, com
vírgula decimal e ponto de milhar — saiu idêntico ao PDF nas duas variantes. A
visão do modelo é viável para foto, e o custo por página é previsível: cerca de
9,3 mil tokens de entrada, dos quais perto de 1,6 mil são a imagem e o resto é o
prompt com a lista de candidatos.

**E o único erro é o mais perigoso que o projeto conhece.** Na página 11, o HDL
**não está impresso**: o valor dele fica no pé da página 10, e a 11 traz só a
continuação — a tabela de referência e um *gráfico de histórico* com dois pontos,
56 (2020) e 62 (2025). Vendo só a 11, o modelo **estimou o valor pelo gráfico**.
Na variante limpa, leu o rótulo do ponto e acertou (62, confiança 0,85). Na
desfocada, leu **80** — o número de "Muito Alto: Inferior a 80 mg/dL", logo
abaixo — com **confiança 0,95**, que passa do limiar e entraria como automática.

É um número errado, de um analito que tem faixa por risco cardiovascular,
entrando no histórico sem ninguém revisar. E ele é **específico da foto**: no
PDF, o modelo vê as vinte páginas e encontra o 62 impresso na 10; a foto de uma
folha isolada é o que o obriga a procurar o número onde ele não está. O próprio
aviso do modelo diz o que fez ("lido a partir do gráfico de histórico"). Vira o
achado **G10** (§4.10).

Dois achados menores, e nenhum deles é erro:

- Nas páginas 18, as duas variantes trouxeram uma linha a mais que o PDF — a
  testosterona biodisponível, que o PDF atribuiu à página 19. O valor é o mesmo
  (409,02). É linha dividida entre folhas, lida de um lado só.
- Toda resposta avisou que "apenas a página N de 20 foi fornecida". O modelo
  percebe que a foto é parte de um documento maior e diz — que é o
  comportamento certo, e é o insumo da Decisão K.

### A limitação desta medição, dita antes de alguém perguntar

**A variante "foto" é uma simulação, não uma foto.** Ela reproduz inclinação,
sombra, desfoque e compressão; não reproduz reflexo de luz, papel dobrado, dedo
na borda, nem a perspectiva trapezoidal de quem fotografa de pé. É uma cota
inferior da dificuldade real. **A medição com foto de verdade é da pessoa**, e o
roteiro dela está em §9.

---

## 3. O que muda para a pessoa

### Hoje

1. A pessoa fotografa o laudo pela câmera da tela de exames. O documento é
   guardado.
2. A leitura começa e **falha sempre**, porque o único caminho para imagem é o
   Textract, que a conta não tem.
3. A tela diz *"Não conseguimos ler o conteúdo deste documento"* — a mesma frase
   para foto ilegível, arquivo grande demais, erro de rede e ausência de caminho.
   O motivo específico que a função chega a gravar nunca aparece.
4. Se ela anexar a mesma foto no chat, o anexo some em silêncio pelo mesmo
   motivo.
5. Uma linha como a TFG do Delboni — *"Superior a 90"* — entra **sem valor** e
   pendente de revisão, porque a censura escrita por extenso não é reconhecida.
6. Um laudo com coagulograma, urina de 24 horas ou marcador tumoral tem essas
   linhas guardadas com código local: legíveis, mas sem se encontrar com as de
   outro laboratório.

### Depois desta EPIC

1. A foto encolhe no aparelho antes de subir (menos dados móveis, e dentro do
   limite do modelo), e é lida pela visão do mesmo modelo que lê o PDF.
2. Quando a leitura falha, a tela diz **por quê, em português, e o que fazer**:
   foto grande demais, formato não suportado, documento ilegível.
3. A foto anexada no chat é vista pelo assistente naquela conversa.
4. Um número desenhado num gráfico de histórico **nunca** vira linha
   automática — nem quando o modelo diz ter certeza.
5. *"Superior a 90"* vira `>90`, com o qualificador da D21 — guardado,
   mostrado, e fora da comparação numérica como todo valor censurado.
6. O catálogo passa de 79 para perto de 150 analitos, cobrindo os painéis que o
   estudo de 2026-09-18 mostrou faltarem por inteiro.
7. Existe um comando que faz as vinte perguntas da L7 ao assistente real e
   devolve a distribuição por regra, a taxa de costura, o custo por turno e a
   prova de ponta a ponta — e outro que monta a planilha da T14 a partir de um
   documento lido.

---

## 4. Os achados, e o que cada um exige

### 4.1 G1 — Foto não tem caminho de leitura (P0)

`chooseReadingPath` manda todo tipo que não é PDF ao Textract, e o Textract
responde `SubscriptionRequiredException` em qualquer região. O estudo
`textract-por-que-nao-temos-acesso.md` já tinha escrito o conserto — *"acrescentar
um ramo de `ImageBlock` ao `blocosDoDocumento`, não trocar de arquitetura"* — e
ele nunca foi feito.

**Exige:** a rota é decidida pelos **bytes** (assinatura do arquivo), não pelo
tipo declarado; imagem `jpeg|png|webp|gif` vai ao modelo no bloco de imagem;
o resto falha com motivo. **Por que pelos bytes:** o tipo declarado vem da
extensão do nome (medido: o Amplify Storage infere `ContentType` pela extensão
da chave), e o nome é escolhido pela pessoa. Um `.jpg` que é PNG vira recusa do
Bedrock por formato divergente — erro que parece defeito do sistema.

### 4.2 G2 — A foto do celular não cabe no bloco de imagem

O Converse aceita imagem de até **3,75 MB** e **8000 px** de lado. A câmera do
aplicativo usa `quality: 0.8` sem redimensionar: uma foto de 12 MP nessa
qualidade fica tipicamente entre 2 e 5 MB. O teto do upload é 10 MB. Metade das
fotos passaria, metade seria recusada pelo serviço — e a recusa derrubaria a
chamada inteira.

**Exige:** encolher no aparelho antes de subir, e um teto no servidor que falha
com motivo em vez de chamar o modelo com um arquivo que ele vai recusar.

### 4.3 G3 — O anexo do chat tem o mesmo buraco

`anexoPontual.ts` manda imagem ao `extractText` (Textract). O anexo **nunca
lança** — ele devolve `null` — então a foto some da conversa sem aviso, e o
modelo responde como se ela não tivesse sido enviada.

### 4.4 G4 — A falha não diz o motivo, e quando diz, diz em inglês

Duas metades do mesmo defeito:

- `ExtractedResultsSection` mostra uma frase fixa para `FAILED` e **nunca lê
  `extractionError`**. As mensagens humanas que o handler escreve ("uma imagem
  mais nítida costuma resolver", "envie o arquivo de novo") não chegam à tela.
- O `catch` do handler e o caminho de validação gravam **`erro.message` cru** —
  mensagem do SDK da AWS ou caminho de campo do zod (`labResults.3.rawValue:
  ...`). Se a tela passasse a mostrar o campo sem mais nada, ela mostraria isso.

**Exige:** um conjunto **fechado** de motivos de falha, cada um com a sua copy; o
detalhe técnico vai para o log e nunca para o campo que a tela lê.

### 4.5 G5 — Censura escrita por extenso

Medido no laudo real: a linha `*eGFR` tem `rawValue = "Superior a 90"`. O
`parseDecimal` reconhece `<` e `>` e nada mais, então a linha entra sem valor e
pendente. O laudo brasileiro escreve censura em palavra com frequência:
*superior a*, *inferior a*, *maior que*, *menor que*, *acima de*, *abaixo de*.

**Exige:** que essas seis formas virem o mesmo qualificador da D21. **E só essas
seis.** "Igual ou superior a" **não** entra: o qualificador do projeto é
estrito, e mapear `≥` para `>` apagaria o "igual" em silêncio. Essa forma
continua indo para revisão, que é o comportamento conservador.

### 4.6 G6 — O vocabulário não cobre o laudo brasileiro

O estudo `cobertura-brasileira-lacunas.md` (2026-09-18) mediu: **72 analitos
quantitativos faltando**, onze painéis ausentes por inteiro, uma limitação do
gerador (sem eixo do tempo) e três erros na documentação atual. Ele deixou a
TASK escrita (V1–V7) e nunca virou EPIC.

A D32 garante que nada disso **se perde**: analito fora do catálogo vira linha
com código local. O que ele perde é o **encontro** — a série por analito junta
por código, e o código local de um laboratório não é o de outro.

### 4.7 G7 — Ninguém mede o assistente desde que ele mudou

A única medição da L7 são cinco turnos de 2026-09-18, contra um sistema que o
Bloco 9 mudou (a R2 foi reescrita, o encaminhamento passou a ser costurado). A
costura **nunca foi exercitada contra o modelo real**. E cada medição até hoje
foi manual, feita pela pessoa no aparelho — o que a torna cara de repetir e
impossível de comparar entre versões.

**Exige:** um instrumento que qualquer pessoa rode com um comando, contra o
modelo real, e que produza os números da L7 e da C10 do mesmo jeito toda vez.

### 4.8 G8 — A T14 espera papel, e a planilha dela nem existe

A conferência de valor por valor precisa de uma planilha: cada linha lida, lado a
lado com uma coluna vazia para o valor do papel. Montar isso à mão para cada
laudo é o tipo de trabalho que faz a conferência não acontecer.

### 4.10 G10 — O modelo lê número de gráfico (medido em §2)

O laudo digital brasileiro dos grandes laboratórios traz **gráfico de histórico**
ao lado do resultado: os valores de coletas anteriores, plotados. É o pior lugar
possível para ler um número — ele é desenhado, pequeno, e **metade dos pontos são
de outra data**. Um valor lido dali é estimativa visual, não transcrição, e pode
ser o valor de cinco anos atrás.

O prompt atual não proíbe isso, e a medição mostrou o modelo fazendo — duas vezes,
com o aviso escrito por ele mesmo.

**Exige duas camadas, porque uma sozinha já falhou uma vez no projeto:**

1. **Regra de prompt:** transcrever só o número impresso como resultado; nunca
   ler valor de gráfico, curva ou barra; se o resultado de um analito não está
   impresso no documento, não criar a linha.
2. **Trava determinística:** quando um aviso do modelo diz que um valor foi lido
   de gráfico e nomeia o analito, a linha desse analito vai para revisão, com
   aviso próprio — **qualquer que seja a confiança declarada**. Mesma filosofia
   da `escolhaDeFaixa.ts`: o texto do modelo é o sinal, e o código decide. Aqui
   ela não só conta, ela rebaixa, porque o dano é gravar número errado.

A regra 1 é medida de novo contra a mesma página: o critério é **a linha do HDL
não aparecer**, ou aparecer pendente.

### 4.9 G9 — Fase 4 não começou

4.1 (limitações e o que a IA deliberadamente não faz) e 4.2 (avaliação de
provedores). O material da 4.2 está quase todo pronto e espalhado entre
`provedor-llm.md`, D2, D3, D14 e D20.

---

## 5. As decisões — estudo completo

Cada uma com opções, prós, contras e uma recomendação que ignora as regras já
definidas e olha para o produto. **As recomendações são as que esta EPIC
executa.** O pedido que a originou foi "desenvolver tudo que falta"; parar em
cada decisão travaria a entrega inteira, e as cinco recomendações anteriores
foram aceitas integralmente. Cada uma é reversível e está dita aqui para poder
ser contestada.

### 5.1 Decisão F — o que fazer com o Textract

| Opção | Prós | Contras |
|---|---|---|
| **F1** manter como reserva da foto | a segunda fonte independente continua existindo no código | é um caminho que **nunca** respondeu nesta conta; manter código que não roda é manter código que ninguém testou |
| **F2** tirar do caminho e das permissões | uma rota por formato, todas medidas; menor privilégio (quatro ações de IAM a menos na extração, duas no chat) | perde a âncora posicional e a confiança por palavra — **mas elas já não existem hoje**, porque o serviço não responde |
| **F3** manter atrás de uma variável de ambiente | liga no dia em que a conta mudar de plano | dois caminhos para o mesmo arquivo, e o desligado apodrece |

**Recomendação: F2.** O que se perde com F2 já está perdido; o que se ganha é
uma arquitetura que diz a verdade sobre o que roda. O estudo do Textract fica
como registro de por que ele saiu e do que custaria voltar. O histórico do git
guarda o cliente inteiro.

**Visão da pessoa:** nenhuma diferença visível — exceto que a foto passa a ser
lida.

### 5.2 Decisão G — onde a foto encolhe

| Opção | Prós | Contras |
|---|---|---|
| **G1** no aparelho, antes do upload | menos dados móveis (importa para plano pré-pago); a função recebe sempre um arquivo que cabe | uma dependência nova (`expo-image-manipulator`, do próprio Expo) |
| **G2** na função, depois do upload | nada muda no aplicativo | redimensionar exige biblioteca nativa (`sharp`) que o empacotamento do Amplify não leva, ou uma em JS puro lenta para 12 MP; a pessoa gasta dados subindo 5 MB |
| **G3** não encolher; recusar acima do teto | zero código | recusa metade das fotos de celular moderno |

**Recomendação: G1, com o teto no servidor como segunda camada.** A dependência
é do mesmo fornecedor do resto do aplicativo e já vem no Expo Go.

**Visão da pessoa:** a foto sobe mais rápido. O arquivo guardado é a versão
encolhida — e é ele que ela vê ao abrir o documento depois.

### 5.3 Decisão H — o tamanho da foto encolhida

| Opção | Prós | Contras |
|---|---|---|
| **H1** 1568 px no maior lado | é o teto a partir do qual o modelo reduz a imagem por conta própria — nada acima disso chega a ele | é também o arquivo que a pessoa guarda, e 1568 px de uma página A4 é legível mas no limite para letra de rodapé |
| **H2** 2000 px, JPEG 0,85 | legível para gente e para o modelo; arquivo típico de 300 a 700 KB | o modelo reduz para 1568 de qualquer jeito |
| **H3** manter o original | nenhuma perda | não cabe no bloco de imagem (G2) |

**Recomendação: H2.** A foto é o **documento** da pessoa, não só a entrada do
modelo; guardar uma versão que ela consiga ler depois vale os 30% a mais.

### 5.4 Decisão I — as pendências de vocabulário

Cinco em `pendencias.md` e oito na seção 6 do estudo de cobertura. Cada uma com
a recomendação, porque a maior parte delas é pequena e todas travam a ampliação:

| # | Pendência | Recomendação | Por quê |
|---|---|---|---|
| P1 | Vitamina A em `µg/dL` | **fechada** — já está em `UNIDADE_CANONICA` | conferido no gerador do catálogo |
| P2 | Vitamina E em `mg/L` | **fechada** — idem | idem |
| P3 | PCR convencional × ultrassensível | **manter as duas** | o laudo brasileiro escreve "ultrassensível" por extenso; se um laudo mostrar o contrário, a linha sai. O Delboni não tem PCR — a confirmação continua sendo da T14 |
| P4 | Albumina urinária: três apresentações | **as três entram**, cada uma com código próprio, depois do eixo do tempo | concentração, 24 horas e relação são grandezas diferentes; misturar é o erro de escala que o projeto existe para evitar |
| P5 | TFG estimada | **fica fora do catálogo; vive como código local** | o único laudo real escreve `*eGFR`, com a equação num rodapé; mapear para a equação errada é número que parece certo. A D32 já a guarda como série do próprio laboratório |
| S1 | Atividade de protrombina em `%` | **procurar no release**; se não houver termo quantitativo sem ambiguidade, fica em código local | não chutar é a regra |
| S2 | Relação TTPA paciente/controle | idem | idem |
| S3 | Troponina ultrassensível | **fora por ora** | não é exame de acompanhamento ambulatorial, é de pronto-socorro |
| S4 | Sedimento urinário: por campo × por mL | **fora** | "por campo" não é comparável entre laboratórios (regra 4 do estudo); a D32 guarda como código local |
| S5 | Frações da eletroforese: `g/dL`, `%` ou as duas | **as duas**, como no diferencial de leucócitos | o laudo imprime as duas lado a lado, e a decisão do hemograma já foi essa na prática |
| S6 | "O valor canônico é em massa" tem exceção | **reescrever a frase**: o canônico é a convenção brasileira, que é massa quase sempre e molar em SHBG e homocisteína | a D17 manda seguir a convenção |
| S7 | Anti-HBs quantitativo | **fora** | comparabilidade entre ensaios discutível |
| S8 | O painel `Inflamacao` vira nome errado | **PSA sai para um painel `Tumoral`** junto dos marcadores novos | rótulo nosso, cláusula 2 da licença |

### 5.5 Decisão J — quem rotula as respostas da avaliação automática

A L7 pede três caixas: *reprovada com razão*, *reprovada sem razão*, *passou e
não deveria*. A pipeline mede o que é mecânico (qual regra, quantas gerações,
quanto custou). A caixa exige julgamento.

| Opção | Prós | Contras |
|---|---|---|
| **J1** a pipeline não rotula; entrega a tabela para a pessoa | o julgamento continua humano | a L7 continua parada até alguém sentar e ler vinte respostas |
| **J2** um segundo modelo rotula (LLM como juiz) | automático e repetível | o juiz é da mesma família do réu; concordância entre eles não é prova de nada |
| **J3** a pipeline pré-classifica o que é mecânico e o agente que executa a EPIC rotula o resto, **marcado como tal** | a rodada acontece hoje, com justificativa escrita por resposta | não é a rodada da pessoa |

**Recomendação: J3, e a rodada humana continua sendo a L7 da tese.** A diferença
precisa estar escrita em todo lugar em que o número aparecer: "rodada
automática, rotulada pelo agente" não é "L7".

### 5.6 Decisão K — foto de laudo com várias páginas

> **Executada como K2 no Bloco 11** (`specs/08-ia-fechamento/engenharia-pendente/`,
> Decisão O, D50): até dez folhas por documento.

Um laudo em papel tem várias folhas. Hoje um documento é um arquivo.

| Opção | Prós | Contras |
|---|---|---|
| **K1** uma foto por documento (como hoje) | nada muda; a série por analito já junta documentos diferentes | a pessoa fotografa cinco vezes e cria cinco documentos |
| **K2** várias fotos num documento | é o modelo mental de quem tem o papel na mão | muda o modelo de dados (`MedicalDocument` passa a ter N arquivos), a tela de adicionar e o visualizador — é uma EPIC de tela, pela regra 6 |

**Recomendação: K1 nesta EPIC, K2 registrada como limitação (4.1) e candidata a
EPIC própria.** Nada se perde com K1 — cada folha vira documento, e os analitos
se encontram na série.

---

## 6. Mapa de dados

| Dado | Onde | Muda? |
|---|---|---|
| Formato do arquivo | detectado dos bytes na função; **não é gravado** | novo, só em memória |
| Foto encolhida | S3, mesma chave; substitui o original no upload | o arquivo guardado é o encolhido (Decisão H) |
| `extractionError` | `MedicalDocument` | passa a conter **só** copy da lista fechada |
| `valueQualifier` | `LabResult` | passa a ser preenchido também por censura por extenso |
| Catálogo | `analyteCatalog.ts` (gerado) | cresce; nenhuma linha existente muda de código |
| Resultado da avaliação | `estudos-ia/04-implementacao/avaliacoes/<data>.md` | novo; **sem conteúdo de saúde de ninguém além do laudo de teste do próprio autor**, e sem identificador pessoal |

---

## 7. Requisitos não-funcionais

- **Nenhum número inventado.** A censura por extenso só vira qualificador nas
  seis formas listadas; qualquer outra forma continua indo para revisão.
- **D27 intacta.** Nenhum código LOINC digitado à mão, inclusive nos testes
  novos e na documentação.
- **Nenhum dado pessoal no repositório.** A medição de foto usa o laudo do autor
  e fica no scratchpad; no repositório entram só as contagens.
- **O prompt cresce, e isso é medido.** Dobrar o catálogo dobra a lista de
  candidatos. O custo de entrada por documento antes e depois vai para
  `notas.md`.
- **A pipeline de avaliação é somente leitura.** Ela chama o mesmo `responder`
  que o handler chama, que não grava nada (D34), e roda contra o sandbox.
- `npm run validate` verde ao fim de cada bloco.

---

## 8. O que esta EPIC NÃO faz

- **Não faz a L7 da pessoa, nem a U12, nem a T14.** Elas precisam de gente e de
  papel de outros laboratórios. Esta EPIC entrega o instrumento das três e
  roda uma rodada automática da L7, rotulada e marcada como tal.
- **Não junta várias fotos num documento** (Decisão K).
- **Não corrige perspectiva, nem recorta a folha do fundo.** O modelo lê a foto
  inclinada (medido em §2); corrigir geometria seria uma segunda leitura com
  chance própria de erro.
- **Não mede qualidade de foto real.** Mede a simulação e diz que é simulação.
- **Não publica ambiente.** O sandbox é republicado só com pedido.

---

## 9. Critérios de aceite

### A foto (G1, G2)

1. Uma imagem JPEG, PNG, WebP ou GIF enviada pela tela de exames é lida pela
   visão do modelo, sem passar pelo Textract.
2. A rota é decidida pelos bytes: um PNG com extensão `.jpg` é lido como PNG.
3. Um arquivo que não é PDF nem imagem suportada falha com motivo, **sem chamar
   o modelo**.
4. Imagem acima de 3,75 MB ou PDF acima de 4,5 MB falha com motivo, **sem chamar
   o modelo**.
5. A foto da câmera e a imagem da galeria são reduzidas a 2000 px no maior lado,
   JPEG 0,85, antes do upload. HEIC do iPhone é convertido no mesmo passo.
6. Nenhuma ação do Textract continua nas políticas de IAM, e nenhum arquivo do
   backend importa o SDK do Textract.

### O chat (G3)

7. Uma foto anexada no chat entra na conversa como bloco de imagem.

### A falha (G4)

8. `extractionError` só contém texto de uma lista fechada, em português.
9. A tela de falha mostra esse texto quando ele existe.
10. Nenhum `erro.message` de SDK ou de zod chega ao campo.

### A censura (G5)

11. *Superior a*, *inferior a*, *maior que*, *menor que*, *acima de*, *abaixo de*
    viram o qualificador da D21. *Igual ou superior a* não vira.

### O gráfico (G10)

21. O prompt proíbe ler valor de gráfico e criar linha para resultado que não
    está impresso.
22. Linha cujo analito é nomeado num aviso que diz ter lido de gráfico vai para
    revisão, com aviso próprio, qualquer que seja a confiança.
23. Remedida a página 11 em "foto": o HDL não entra como automático.

### O vocabulário (G6)

12. O gerador tem o eixo do tempo, e regenerar os 79 alvos existentes produz o
    mesmo código para cada um.
13. O extrato tem as linhas novas, e cada `SEM CANDIDATO`, `CODIGO REPETIDO` e
    `SEM pt-BR` está resolvido ou explicado por escrito.
14. O catálogo é regenerado a partir do extrato e o teste de deriva passa.
15. A varredura da D27 não acha código LOINC fora dos lugares permitidos.

### A medição (G7, G8)

16. Um comando roda o banco de perguntas contra o assistente real e grava um
    relatório com: status por pergunta, regras reprovadas, costura, custo e a
    prova de ponta a ponta.
17. A rodada foi feita, e o relatório está no repositório, rotulado pelo agente
    e marcado como tal.
18. Um comando monta a planilha da T14 a partir de um documento lido, e uma
    função conta, na planilha preenchida, as linhas automáticas erradas.

### O encerramento (G9)

19. `estudos-ia/06-encerramento/limitacoes.md` (4.1) e
    `avaliacao-de-provedores.md` (4.2) existem.
20. `decisoes.md` tem as decisões F a K; `roadmap.md` tem a linha desta EPIC.

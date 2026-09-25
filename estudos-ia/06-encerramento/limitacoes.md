# 4.1 — O que a IA do SuaSaúde deliberadamente não faz, e o que ela ainda não sabe fazer

Tarefa 4.1 do roadmap (Fase 4, encerramento acadêmico). Duas listas que não se
confundem, e a diferença entre elas é o ponto deste documento:

- **§1 — Recusas de projeto.** O que o sistema não faz **porque não deve**. Não
  são lacunas a fechar: são a tese. Cada uma tem a camada que a garante, e na
  maioria dos casos essa camada é **estrutura** (não há campo, não há caminho),
  e não instrução ao modelo (D11).
- **§2 e §3 — Limitações.** O que o sistema não faz **porque ainda não sabe, ou
  porque ninguém mediu**. Estas são dívida, e cada uma diz o que a fecharia.

Estado de 2026-09-22, depois do Bloco 10; atualizado em 2026-09-25, depois do
Bloco 11 (`specs/08-ia-fechamento/engenharia-pendente/`). Desde 2026-09-24 o
aplicativo **não** será aberto ao público: §3.3 a §3.5 ficam registradas como
fora de escopo, e não como pendência.

---

## 1. O que a IA deliberadamente não faz

| Recusa | Por quê | Onde é garantida |
|---|---|---|
| **Não diagnostica, não diz se um valor está alto, baixo, bom ou ruim, não nomeia condição** | É ato médico, e o laudo impresso diz isso ao pé de cada página. Uma comparação errada sobre dado de saúde é pior que nenhuma | Extração: o schema **não tem campo** de interpretação (D11). Conversa: R3 determinística em `ai-language-rules/languageRules.ts`, antes de qualquer texto chegar à tela |
| **Não indica dose, não ajusta tratamento, não comenta receita** | Idem, e com dano direto | R3 na conversa; na receita, a instrução "não sugira dose, não corrija posologia" e um schema sem campo para isso |
| **Não escolhe qual linha de uma tabela de referência vale para a pessoa** — nem por idade, nem por sexo, nem por risco | Escolher é interpretar. Quem lê a tabela é a pessoa (D37) | Prompt proíbe; `escolhaDeFaixa.ts` **conta** toda escolha declarada e registra no log |
| **Não lê número de gráfico**, e não cria linha para resultado que não está impresso | Número de gráfico é desenho, e metade dos pontos são de outra data. Medido: 80 no lugar de 62, com confiança 0,95 (G10) | Prompt proíbe (e **não bastou**: falhou 2 de 2 na remedição); `valorDeGrafico.ts` **rebaixa** a linha para revisão, sem valor, qualquer que seja a confiança |
| **Não chuta número** — ilegível é ausente, nunca zero | Um zero gravado é um resultado falso com cara de medido (D29) | `parseDecimal` recusa em vez de chutar; linha sem leitura segura entra com `value: null` e pendente |
| **Não converte unidade sem a química** | Converter hemoglobina para molar pelo monômero ou pelo tetrâmero é a diferença entre anemia e normalidade (D18) | Conversão molar só com massa molar declarada; lista de proibidos derruba a geração do catálogo |
| **Não transforma censura não estrita em número** — "≤ 5" não é 5 nem <5 | O qualificador do projeto é estrito (D21). Até o Bloco 10, "≤" era descartado em silêncio | `parseDecimal` recusa; a linha vai para revisão com o texto do papel intacto |
| **Não põe exame qualitativo na série** (sorologia, cultura, urina por fita, FAN) | Não existe "o valor do antibiograma" para plotar | O gerador do extrato filtra `SCALE_TYP = Qn`: o termo ordinal nunca chega a ser candidato |
| **Não escolhe a equação da TFG** | O LOINC tem um código por equação, e o laudo nem sempre diz qual; mapear errado é número que parece certo | Fica fora do catálogo; vive como código local do próprio laboratório (D32) |
| **Não escreve o encaminhamento ao profissional de saúde** — o aplicativo escreve | Uma frase que o aplicativo sabe escrever não precisa custar uma geração inteira do modelo (D38) | `encaminhamento.ts` costura a frase fixa em toda resposta clínica aprovada |
| **Não grava dado clínico a partir da conversa** | O anexo do chat é "me explica este papel", não "guarde isto" (D15); a memória só guarda o que a pessoa confirma, de uma lista fechada de tipos (D34) | Nenhum arquivo da função do chat usa comando de escrita — há teste varrendo isso |
| **Não obedece instrução escrita dentro do documento** | Um PDF ou uma foto podem trazer instrução plantada | Instrução de sistema mais schema estrito, sem campo onde uma instrução obedecida se manifestaria. O guardrail **não** cobre o bloco de documento nem o de imagem (D20), e isso é dito em vez de contado como camada |
| **Não mostra ao usuário a mensagem técnica de uma falha** | "ValidationException" não diz a quem fotografou um laudo o que fazer (G4) | `motivoDeFalha.ts`: o campo que a tela lê só aceita copy de uma lista fechada |

---

## 2. O que a leitura de documento ainda não sabe fazer

### 2.1 A omissão é instável, e só é remediada por contagem

A mesma chamada, com temperatura zero, devolveu 47, 47, 42 e 47 linhas do mesmo
laudo em quatro execuções (`01-estudos/leitura-de-documento.md`). **Nenhum
número errado** — cobertura instável. O remédio é reprocessar, que é barato
porque a gravação é idempotente e a segunda passagem **soma** o que faltou.

Com o Textract fora (Decisão F do Bloco 10), **não há segunda fonte
independente** para provar que nada foi omitido. É a perda mais séria da troca,
e está dita em `avaliacao-de-provedores.md`, §3.8.

### 2.2 A foto foi medida com simulação, e com um emissor só

26 de 26 valores idênticos ao PDF em páginas renderizadas limpas; 25 de 26 em
**foto simulada** (inclinação, sombra, desfoque, compressão). A simulação não
reproduz reflexo, papel dobrado, dedo na borda nem perspectiva trapezoidal. **A
medição com foto de verdade, de laudos de laboratórios diferentes, não foi
feita.**

### 2.3 Até dez folhas por documento — e o que isso ainda não cobre

Desde o Bloco 11 (D50), um laudo fotografado pode ter até dez folhas num
documento só, lidas juntas e em ordem. Com as duas folhas do caso do gráfico, o
HDL veio do número impresso (62, confiança 0,98). O que continua fora: misturar
PDF e foto no mesmo documento, mais de dez folhas, e o anexo do chat, que segue
um arquivo por mensagem. E um resultado cujo bloco atravessa duas folhas pode
sair marcado na folha em que o bloco continua, e não na do número.

### 2.4 O limiar de confiança é provisório

`CONFIDENCE_THRESHOLD = 0,85` é o lado conservador enquanto não há medida, e o
comentário no código diz isso. Calibrá-lo é a T14, e a T14 espera laudos de
laboratórios diferentes. O erro do gráfico mostrou o limite do número: o modelo
declarou 0,95 para um valor que ele mesmo disse ter estimado.

### 2.5 Um emissor só foi lido de verdade

Tudo o que foi medido veio do laudo do Delboni/DASA. **"Lê qualquer emissor"**,
que é o ponto da S8, é hipótese: a U12 pede laudos de emissores diferentes, e
dois laudos do mesmo emissor contam como um.

### 2.6 A comparação entre laboratórios só vale dentro do catálogo

O catálogo cobre 154 analitos desde o Bloco 10. O que está fora vira linha com
código **local**, derivado do rótulo (D32): legível e guardado, mas o código
local de um laboratório não é o de outro, e as séries não se encontram.

### 2.7 A costura do catálogo com o passado — fechada pela regravação

Analitos que eram locais antes do Bloco 10 (o VPM e o SHBG do laudo do Delboni)
ganharam código LOINC. Desde o Bloco 11 (D47), reprocessar um documento antigo
**troca** a linha local pela de catálogo, e a correção que a pessoa tinha feito
passa junto. O que ficou de fora é deliberado: a correspondência só age quando é
única nos dois sentidos, então um rótulo ambíguo deixa a linha antiga ao lado da
nova — um ponto duplicado, que se vê, em vez de um resultado apagado, que não se
vê.

### 2.8 Escolhas do gerador sem termo neutro de método

A LDH e as frações da eletroforese caíram em termos com método específico,
porque não há termo neutro no LOINC 2.83 que corresponda ao que o laudo
brasileiro reporta. A escolha foi por ranqueamento e por unidade, e merece
olhada contra papel (`05-vocabularios/pendencias.md`, seção 7).

### 2.9 O PDF grande é lido em partes, e cada parte vê só as suas páginas

Desde o Bloco 11 (D49), o PDF entre 4,5 e 10 MB é dividido em partes de páginas
contíguas. Cada parte é lida sem ver as outras: um cabeçalho de coleta numa parte
e o resultado na seguinte podem se desencontrar. Uma página sozinha acima de
4,5 MB (digitalização em resolução muito alta) não tem como ser lida por este
caminho.

### 2.10 Dois defeitos de dado que nenhum documento registrava, fechados

Achados lendo o código para o Bloco 11, e mais graves que os da lista que o
originou: **reprocessar desfazia a correção da pessoa** (D47), e **apagar o
documento deixava os valores dele** na série e no chat (D48). Os dois estão
fechados, com teste e mutação.

---

## 3. O que a conversa e a operação ainda não sabem fazer

### 3.1 A L7 humana não foi feita

A única medição humana da conversa são cinco turnos de 2026-09-18, contra um
sistema que o Bloco 9 mudou. O Bloco 10 fez uma **rodada automática** de vinte e
duas perguntas contra o modelo real, rotulada pelo agente que a executou
(Decisão J3) — `04-implementacao/avaliacoes/`, quatro rodadas. Ela exercitou pela
primeira vez a costura do encaminhamento contra o modelo, achou nove defeitos
que nenhum dos 1.300 testes achava (D45), e **não substitui** a L7: o julgamento
de "passou e não deveria" é da pessoa.

As três linhas novas da R3 (Bloco 10) pegam, na rodada 4, também texto
educativo que menciona faixa sem falar do valor de ninguém ("valores fora da
faixa podem indicar...") — reprovação provavelmente sem razão, salva pela
segunda geração. O custo é uma geração a mais nessas perguntas; o ganho é que a
resposta que escolhe a linha da tabela pela idade da pessoa deixou de passar.

### 3.2 A R1 e a R3 tinham falso positivo — medido, e consertado sem afrouxar

A R1 veta uma raiz que aparece em palavras inocentes. Nas rodadas do Bloco 10,
2 reprovações em 12 perguntas feitas para provocá-la, salvas pela segunda
geração. A medição do Bloco 11 (D51, nove turnos) mostrou que o custo era maior:
uma resposta **perdida**, porque a segunda geração caía na R3, que barrava
inventário ("você tem apenas um laudo guardado"). Com a R1 do prompt nomeando os
sentidos inocentes (sem escrever a palavra) e a exceção de inventário da R3, as
nove foram aprovadas de primeira. Nove turnos são amostra, não taxa.

### 3.3 O dado de saúde sai do Brasil

> **Fora de escopo desde 2026-09-24:** o aplicativo não será aberto ao público.
> O fato técnico continua verdadeiro e fica registrado.

O Bedrock é invocado em `us-east-1`, pelo perfil de inferência cruzado `us.`.
O dado de saúde da pessoa — o PDF, a foto, os valores citados na conversa —
trafega para os Estados Unidos. É **transferência internacional de dado pessoal
sensível** (LGPD, art. 33), e ela já acontecia antes desta frente (a feature de
wearable). Para um aplicativo aberto a todos os brasileiros, isso precisa estar
no termo de consentimento e na política de privacidade — e não está escrito em
lugar nenhum do aplicativo hoje. A alternativa técnica existe (Bedrock em
`sa-east-1`) e não foi medida.

### 3.4 A conta é de plano gratuito, com prazo

> **Fora de escopo desde 2026-09-24**, pela mesma razão.

Medido em 2026-09-18: a conta AWS está no plano gratuito, com créditos que
**vencem em 2026-10-25**. É a causa mais provável da recusa do Textract, e é um
risco de operação para qualquer abertura ao público: depois do prazo, a conta
passa a exigir o plano pago ou deixa de responder. É decisão de custo do dono da
conta, não do código.

### 3.5 Custo por documento e por conversa, em escala, não foi projetado

> **Fora de escopo desde 2026-09-24**, pela mesma razão. Os custos por documento
> continuam medidos: 16 mil tokens para duas folhas, 78 mil para o PDF de 7,3 MB
> dividido (D49, D50).

Medido: um laudo de 20 páginas em PDF custa perto de 57 mil tokens de entrada
por leitura; a foto de uma página, 14,4 mil com o catálogo de 154 analitos
(medido; eram 9,3 mil com o de 79 — a lista de candidatos é o maior pedaço do
prompt). A conversa custa uma ou duas gerações
por turno (D31). Nenhum desses números foi projetado para milhares de pessoas, e
o limite de taxa do chat (`rateLimit.ts`) é por pessoa, não um teto de gasto.

### 3.6 Um provedor só

Não há segundo provedor nem adapter (D14). Uma indisponibilidade regional do
Bedrock, ou a retirada do modelo, para as duas frentes ao mesmo tempo. Foi uma
escolha consciente — manter dois caminhos custa manutenção permanente — e está
dita aqui porque é o preço dela.

---

## 4. Resumo em uma tabela

| Item | Tipo | O que fecharia |
|---|---|---|
| Diagnóstico, dose, juízo de valor, escolha de faixa, número de gráfico | **recusa de projeto** | nada — é a tese |
| Omissão instável | limitação | reprocessar e contar; segunda fonte independente |
| Foto medida só em simulação e com um emissor | limitação | fotos reais de laudos de laboratórios diferentes (U12, T14) |
| Uma foto por documento | **fechada no Bloco 11** (D50) | — até dez folhas; misturar PDF e foto segue fora |
| Limiar de confiança provisório | limitação | T14 |
| Reprocessamento de documento antigo duplica linha que mudou de código | **fechado no Bloco 11** (D47) | — correspondência ambígua fica duplicada, de propósito |
| Reprocessar desfazia a correção da pessoa | **achado e fechado no Bloco 11** (D47) | — |
| Apagar o documento deixava os valores dele | **achado e fechado no Bloco 11** (D48) | — |
| PDF acima de 4,5 MB recusado | **fechado no Bloco 11** (D49) | — página sozinha acima de 4,5 MB continua sem caminho |
| L7 humana | medição pendente | vinte perguntas reais, pela pessoa |
| Transferência internacional (LGPD art. 33) | fora de escopo (sem abertura pública) | — |
| Conta em plano gratuito, com prazo | fora de escopo (sem abertura pública) | — |
| Custo em escala | fora de escopo (sem abertura pública) | — |

# Lacunas da cobertura diante do laudo brasileiro

Estudo de 2026-09-18. Responde a uma pergunta direta: **a cobertura de 79
analitos dá conta dos exames laboratoriais comuns no Brasil?** Não dá. Este
documento lista o que falta, diz se o LOINC tem termo para cada faltante, e
entrega os critérios de busca no formato que `loinc/gerar-extrato.py` consome.

Não altera código, não altera o extrato e não altera a `cobertura-analitos.md`.
O trabalho de mexer nos três está rascunhado como TASK no fim.

## Como este documento se comporta em relação à D27

**Nenhum código LOINC aparece aqui.** Nem como exemplo, nem entre parênteses,
nem "para ilustrar". O que as tabelas trazem é a tripla
`(COMPONENT, SYSTEM, PROPERTY)` — os mesmos três eixos que a lista `ALVOS` do
gerador usa — e é o LOINC, rodando o script contra o release oficial, que
responde qual código atende cada tripla.

Isso tem uma consequência boa e vale dizê-la: **uma tripla errada falha alto.**
O gerador emite `SEM CANDIDATO: <rótulo> (<componente> / <sistema> /
<propriedade>)` e segue. Ele nunca inventa um código nem grava uma linha
aproximada. Por isso as triplas abaixo estão marcadas com o grau de
verificação, e as não verificadas são apostas seguras de errar em voz alta, não
de errar em silêncio.

| Marca | O que significa |
|---|---|
| **V** | a tripla foi conferida contra uma página de termo do próprio loinc.org (ver Fontes) |
| **P** | a tripla segue o padrão de um alvo já existente no extrato, no mesmo painel e com a mesma grandeza |
| **?** | inferida; o eixo `PROPERTY` não foi conferido. Se estiver errada, o script avisa |

## Como o recorte foi feito

O critério do projeto continua o da `cobertura-analitos.md`: **o que um app de
acompanhamento pessoal vê**, não o que existe. Para saber o que é comum e o que
é exótico, o levantamento cruzou:

- o catálogo A–Z de um laboratório brasileiro de porte médio, com cerca de 180
  exames, que é o formato mais próximo de "o que se pede de fato" que encontrei
  em fonte pública e estável;
- as descrições de painel de laboratórios e serviços de referência (Fleury,
  Sabin, a+, Diagnósticos do Brasil, Controllab) para confirmar que um item
  aparece em mais de um lugar;
- a bibliografia de apoio (SanarMed, RMMG, Kasvi) para a unidade que o laudo
  brasileiro escreve.

**Não usei a TUSS nem o Rol da ANS como lista de corte.** A TUSS tem da ordem de
4.500 códigos de análises clínicas e o Rol é lista de cobertura obrigatória, não
de frequência: os dois respondem "o que pode ser pedido", que é uma pergunta
diferente de "o que aparece no laudo de alguém". Ficam registrados como fonte
possível para a Tarefa 14, quando houver laudo real para conferir.

**Não encontrei fonte pública confiável de frequência de pedido.** Nenhuma das
buscas devolveu um levantamento de "os N exames mais solicitados no Brasil" com
metodologia. O que existe são listas editoriais de check-up. Onde o critério foi
editorial, está dito.

## Resumo

- **72 analitos faltantes**, todos quantitativos, todos com termo LOINC
  provável. Nenhum deles é caso de "não existe no vocabulário".
- **Dois itens sem termo confirmado**: atividade de protrombina em `%` e a
  relação TTPA paciente/controle. Não afirmo que faltem no LOINC — afirmo que
  não achei termo e não vou chutar. Ficam nas pendências.
- **Onze painéis faltam por inteiro**, entre eles o coagulograma, a parte
  quantitativa da urina tipo I e a eletroforese de proteínas.
- **Uma limitação do gerador bloqueia parte do trabalho**: a tripla de busca não
  tem o eixo do tempo, e sem ele os exames de 24 horas não se separam dos de
  amostra isolada.
- **Três erros achados na cobertura atual**, um deles numérico e conferível.

---

## 1. Os faltantes, por painel

A coluna do termo de busca usa `SER` com o mesmo sentido que o gerador lhe dá:
a constante `Ser/Plas|Ser|Plas`.

### 1.1 Hemograma — o que o laudo brasileiro traz e o extrato não

O extrato cobre as cinco séries, os quatro índices, o RDW e o diferencial de
cinco populações em percentual e absoluto. Falta o que o analisador brasileiro
imprime junto.

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Reticulócitos (%) | `Reticulocytes/100 erythrocytes` / `Bld` / `NFr` | `%` | V | [7] [12] |
| Reticulócitos (absoluto) | `Reticulocytes` / `Bld` / `NCnc` | `/mm³` | P | [7] [12] |
| Neutrófilos segmentados (absoluto) | `Neutrophils.segmented` / `Bld` / `NCnc` | `/mm³` | ? | [1] |
| Neutrófilos segmentados (%) | `Neutrophils.segmented/Leukocytes` / `Bld` / `NFr` | `%` | ? | [1] |
| Bastonetes (absoluto) | `Neutrophils.band form` / `Bld` / `NCnc` | `/mm³` | ? | [1] |
| Bastonetes (%) | `Neutrophils.band form/Leukocytes` / `Bld` / `NFr` | `%` | ? | [1] |
| VPM (volume plaquetário médio) | `Platelet mean volume` / `Bld` ou `Plt` / `EntMeanVol` | `fL` | ? | [1] |

O diferencial brasileiro separa segmentados de bastonetes, e o extrato hoje tem
só `Neutrophils` — o total. Guardar só o total perde a coluna que o laudo
imprime ao lado. É o mesmo problema que a `cobertura-analitos.md` já descreveu
para percentual e absoluto, um nível abaixo.

O VPM é o caso em que a armadilha do `PROPERTY` documentada em
`loinc/como-foi-gerado.md` provavelmente se repete: por analogia com o VCM, a
informação distintiva deve estar na propriedade e no sistema, não no nome do
componente. Se `Platelet mean volume` não casar, o alvo a tentar é
`Observation` no sistema das plaquetas, que é exatamente a forma do VCM.

### 1.2 Coagulograma — painel inteiro ausente

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Tempo de protrombina (TP / TAP) | `Prothrombin time (PT)` / `PPP` / `Time` | `s` | V | [8] [9] [10] |
| INR / RNI | `INR` / `PPP\|PPP/Bld` / `RelTime` | adimensional | V | [11] |
| TTPA (KTTP) | `aPTT` / `PPP` / `Time` | `s` | V | [13] |
| Fibrinogênio | `Fibrinogen` / `PPP` / `MCnc` | `mg/dL` | V | [13] |

Três observações que valem para o painel inteiro:

- **O sistema não é soro nem plasma comum.** É plasma pobre em plaquetas. A
  constante `SER` do gerador não serve aqui, e usá-la por hábito devolveria
  `SEM CANDIDATO`.
- **Todos os termos têm método preenchido.** O desempate do gerador prefere
  método vazio; aqui não existe candidato com método vazio, então a preferência
  não se aplica e a escolha cai no ranqueamento de uso. É um comportamento novo
  para o gerador e precisa ser conferido na saída.
- **O laudo brasileiro traz o TP em três apresentações na mesma linha**: tempo
  do paciente em segundos, atividade em percentual, e INR. As duas primeiras
  estão discutidas na seção 4.

### 1.3 Enzimas e marcadores que o laudo agrupa como "bioquímica" e "marcadores cardíacos"

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Amilase | `Amylase` / `SER` / `CCnc` | `U/L` | P | [1] [14] |
| Lipase | `Lipase` / `SER` / `CCnc` | `U/L` | P | [1] [14] |
| CK total (CPK) | `Creatine kinase` / `SER` / `CCnc` | `U/L` | P | [1] [15] |
| CK-MB atividade | `Creatine kinase.MB` / `SER` / `CCnc` | `U/L` | P | [15] [16] |
| CK-MB massa | `Creatine kinase.MB` / `SER` / `MCnc` | `ng/mL` | P | [15] [16] |
| LDH (desidrogenase lática) | `Lactate dehydrogenase` / `SER` / `CCnc` | `U/L` | P | [16] [17] |
| Troponina I | `Troponin I.cardiac` / `SER` / `MCnc` | `ng/mL` | ? | [16] |
| Troponina T | `Troponin T.cardiac` / `SER` / `MCnc` | `ng/mL` | ? | [16] |

A CK-MB é a segunda ocorrência no projeto do padrão que já existe na PCR: **a
mesma substância medida em duas grandezas, com nomes que o laudo escreve por
extenso** ("CK-MB atividade", "CK-MB massa"). Diferente da PCR, aqui a separação
não é por método e sim pela propriedade, então as duas linhas saem de `ALVOS`
normal, sem precisar de `ALVOS_COM_METODO`.

A troponina tem uma segunda divisão que o laudo brasileiro também escreve:
convencional e ultrassensível. Não abri linha para a ultrassensível porque não
confirmei como o LOINC a separa — se por método, como na PCR, ou por termo
próprio. É pendência.

### 1.4 Urina tipo I / EAS — a parte que é número

A `cobertura-analitos.md` mandou a urina de rotina inteira para fora. Relendo a
justificativa, ela vale para a **parte qualitativa** ("aspecto, cor, cilindros,
cristais"), que é exatamente o que o texto diz. Mas o mesmo laudo traz números
comparáveis entre meses, e eles hoje não têm linha.

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Densidade urinária | `Specific gravity` / `Urine` / `Rden` | adimensional | V | [3] [4] [18] |
| pH urinário | `pH` / `Urine` / `pH` | adimensional | ? | [3] [4] [19] |
| Leucócitos no sedimento | `Leukocytes` / `Urine sed` / `Naric` | `p/campo` | ? | [3] [4] |
| Hemácias no sedimento | `Erythrocytes` / `Urine sed` / `Naric` | `p/campo` | ? | [3] [4] |

Duas ressalvas, e a segunda é séria:

- A densidade pode ter caído sob o mesmo tratamento que o LOINC deu a cor e
  aspecto a partir do release 2.79, em que o componente virou `Observation` e a
  informação foi para a propriedade. Se `Specific gravity` não casar, tentar
  `Observation` com a mesma propriedade. É a armadilha do VCM outra vez.
- **"Por campo" não é comparável entre laboratórios.** A contagem por campo
  depende do aumento do microscópio e do volume sedimentado. Parte dos
  laboratórios brasileiros reporta por mililitro, o que é comparável. Estas duas
  linhas entram **com ressalva**, e a decisão de qual apresentação guardar é
  pendência humana — é a mesma família de problema da albumina urinária, item 4
  de `pendencias.md`.

Os campos de fita (proteína, glicose, cetona, nitrito, sangue, urobilinogênio,
bilirrubina) **não entram**, e nem conseguiriam: o gerador filtra
`SCALE_TYP = Qn`, e eles são ordinais. A fronteira já está mecanizada.

### 1.5 Urina de 24 horas e relações — painel inteiro ausente

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Creatinina urinária | `Creatinine` / `Urine` / `MCnc` | `mg/dL` | P | [1] |
| Proteinúria de 24 horas | `Protein` / `Urine` / `MRat` | `mg/24h` | ? | [1] |
| Albumina urinária de 24 horas | `Albumin` / `Urine` / `MRat` | `mg/24h` | ? | [1] |
| Relação albumina/creatinina | `Albumin/Creatinine` / `Urine` / `MRto` | `mg/g` | ? | [1] |
| Clearance de creatinina | `Creatinine renal clearance` / `Ser+Urine` ou `Urine` / `VRat` | `mL/min` | ? | [1] |
| Cálcio urinário de 24 horas | `Calcium` / `Urine` / `MRat` | `mg/24h` | ? | [1] |

**Este painel não pode ser gerado sem mexer no script, e a razão é estrutural.**
No LOINC, o que separa "urina de 24 horas" de "urina de amostra isolada" é o
eixo do tempo (`TIME_ASPCT`), não o sistema — o sistema é `Urine` nos dois
casos. A tripla de busca do gerador tem componente, sistema e propriedade, e
mais nada. Sem um quarto eixo, os alvos de 24 horas ou não casam, ou casam com o
termo errado por sorte do ranqueamento.

Isso resolve, de passagem, o item 4 de `pendencias.md`, que pedia "decidir quais
das três apresentações entram, e buscar o código de cada uma": as três são
alcançáveis, **depois** que o gerador ganhar o eixo do tempo.

### 1.6 Eletroforese de proteínas — painel inteiro ausente

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Albumina (fração) | `Albumin/Protein.total` / `SER` / `MFr` | `%` | P | [5] [20] |
| Alfa-1-globulina | `Alpha 1 globulin` / `SER` / `MCnc` | `g/dL` | V | [5] [20] |
| Alfa-2-globulina | `Alpha 2 globulin` / `SER` / `MCnc` | `g/dL` | P | [5] [20] |
| Beta-globulina | `Beta globulin` / `SER` / `MCnc` | `g/dL` | V | [5] [20] |
| Gama-globulina | `Gamma globulin` / `SER` / `MCnc` | `g/dL` | P | [5] [20] |

O laudo brasileiro imprime cada fração **duas vezes**: em `g/dL` e em `%` do
total. São propriedades diferentes no LOINC (`MCnc` e `MFr`), logo códigos
diferentes, logo o mesmo problema do diferencial de leucócitos — e a mesma
decisão em aberto. Listei a coluna de massa, que é a que conversa com a unidade
canônica do projeto, e a albumina em fração porque é assim que o `%` aparece
nominalmente no vocabulário.

Atenção: a albumina em `MCnc` no soro **já está no extrato**, vinda do painel
hepático. Se a fração eletroforética entrar como `Albumin / SER / MCnc`, ela cai
no mesmo código e o gerador vai avisar `CODIGO REPETIDO`. A separação real é
pelo método de eletroforese, o que empurra esta linha para `ALVOS_COM_METODO`.

### 1.7 Imunoglobulinas, complemento e fator reumatoide — painel inteiro ausente

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| IgA total | `IgA` / `SER` / `MCnc` | `mg/dL` | P | [1] [21] |
| IgG total | `IgG` / `SER` / `MCnc` | `mg/dL` | P | [1] [21] |
| IgM total | `IgM` / `SER` / `MCnc` | `mg/dL` | P | [1] [21] |
| IgE total | `IgE` / `SER` / `ACnc` | `UI/mL` | P | [1] |
| Complemento C3 | `Complement C3` / `SER` / `MCnc` | `mg/dL` | P | [1] [22] |
| Complemento C4 | `Complement C4` / `SER` / `MCnc` | `mg/dL` | P | [1] [22] |
| Fator reumatoide quantitativo | `Rheumatoid factor` / `SER` / `ACnc` | `UI/mL` | ? | [1] |

O catálogo lista fator reumatoide em duas versões, qualitativo e quantitativo.
Só o quantitativo entra; o qualitativo cai fora pelo filtro de escala.

### 1.8 Tireoide — o que falta além de TSH, T4, T3 e anti-TPO

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Anti-tireoglobulina | `Thyroglobulin Ab` / `SER` / `ACnc` | `UI/mL` | P | [1] |
| Tireoglobulina | `Thyroglobulin` / `SER` / `MCnc` | `ng/mL` | P | [1] |
| TRAb (anti-receptor de TSH) | `Thyrotropin receptor Ab` / `SER` / `ACnc` | `UI/L` | ? | [1] |
| T3 reverso | `Triiodothyronine.reverse` / `SER` / `MCnc` | `ng/dL` | ? | [1] |

Um cuidado: `Thyroglobulin Ab` e `Thyroglobulin` diferem por três caracteres. É
o tipo de par que o `re.fullmatch` do gerador separa bem, mas que um alvo
escrito às pressas com `re.search` confundiria. O gerador usa `fullmatch` — está
protegido.

### 1.9 Hormônios — o que falta além dos oito já cobertos

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Progesterona | `Progesterone` / `SER` / `MCnc` | `ng/mL` | P | [1] [6] |
| 17-OH-progesterona | `17-Hydroxyprogesterone` / `SER` / `MCnc` | `ng/mL` | ? | [1] [6] |
| DHEA-S (sulfato) | `Dehydroepiandrosterone sulfate` / `SER` / `MCnc` | `µg/dL` | ? | [1] [6] |
| DHEA | `Dehydroepiandrosterone` / `SER` / `MCnc` | `ng/mL` | ? | [1] [6] |
| Androstenediona | `Androstenedione` / `SER` / `MCnc` | `ng/mL` | ? | [1] [6] |
| SHBG | `Sex hormone binding globulin` / `SER` / `SCnc` | `nmol/L` | ? | [1] [6] |
| ACTH | `Corticotropin` / `SER` / `MCnc` | `pg/mL` | ? | [1] |
| IGF-1 (somatomedina C) | `Somatomedin C` / `SER` / `MCnc` | `ng/mL` | ? | [1] |
| GH (hormônio do crescimento) | `Somatotropin` / `SER` / `MCnc` | `ng/mL` | ? | [1] |
| Paratormônio (PTH) | `Parathyrin.intact` / `SER` / `MCnc` | `pg/mL` | ? | [1] [23] |
| Estrona | `Estrone` / `SER` / `MCnc` | `pg/mL` | ? | [1] |
| DHT (di-hidrotestosterona) | `Dihydrotestosterone` / `SER` / `MCnc` | `ng/dL` | ? | [1] |
| AMH (antimülleriano) | `Mullerian inhibiting substance` / `SER` / `MCnc` | `ng/mL` | ? | [6] |
| Cortisol salivar | `Cortisol` / `Saliva` / `MCnc` | `µg/dL` | P | [1] |

Dois pontos:

- **O SHBG é o primeiro analito da lista inteira cuja unidade brasileira é
  molar**, não de massa. A D17 diz que o canônico é a unidade convencional
  brasileira, e aqui a convencional brasileira **é** `nmol/L`. Não há conflito,
  mas há uma exceção à frase "o nosso valor canônico é em massa" da
  `cobertura-analitos.md`, que precisa ser reescrita. A homocisteína, na seção
  1.10, é o segundo caso.
- **O cortisol salivar tem sistema `Saliva`**, e o cortisol sérico já está no
  extrato. O laudo brasileiro distingue ainda manhã e tarde, o que é
  `collectionMoment` pela D22 e não código novo.

### 1.10 Lipídios e risco — o que o catálogo brasileiro lista além do perfil básico

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Apolipoproteína A1 | `Apolipoprotein A-I` / `SER` / `MCnc` | `mg/dL` | ? | [1] |
| Apolipoproteína B | `Apolipoprotein B` / `SER` / `MCnc` | `mg/dL` | ? | [1] |
| Lipoproteína (a) | `Lipoprotein a` / `SER` / `MCnc` | `mg/dL` | ? | [1] |
| Homocisteína | `Homocysteine` / `SER` / `SCnc` | `µmol/L` | ? | [1] [24] |

A homocisteína é o segundo caso de unidade brasileira molar, e aqui é mais
agudo: a propriedade é `SCnc`, de concentração de substância, e não `MCnc`.
Pedir `MCnc` por hábito devolve `SEM CANDIDATO` ou, pior, um termo de massa que
nenhum laboratório brasileiro usa.

### 1.11 Minerais-traço — painel inteiro ausente

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| Zinco | `Zinc` / `SER` / `MCnc` | `µg/dL` | P | [1] |
| Cobre | `Copper` / `SER` / `MCnc` | `µg/dL` | P | [1] |
| Selênio | `Selenium` / `SER` / `MCnc` | `µg/L` | P | [1] |

### 1.12 Marcadores tumorais quantitativos — painel inteiro ausente exceto PSA

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| CEA | `Carcinoembryonic Ag` / `SER` / `MCnc` | `ng/mL` | ? | [1] [25] |
| Alfa-fetoproteína | `Alpha-1-Fetoprotein` / `SER` / `MCnc` | `ng/mL` | ? | [1] [25] |
| CA 125 | `Cancer Ag 125` / `SER` / `ACnc` | `U/mL` | ? | [1] [25] |
| CA 15-3 | `Cancer Ag 15-3` / `SER` / `ACnc` | `U/mL` | ? | [1] [25] |
| CA 19-9 | `Cancer Ag 19-9` / `SER` / `ACnc` | `U/mL` | ? | [1] [25] |

O PSA total e livre já estão no extrato, no painel `Inflamacao`. Se estes cinco
entrarem, o painel `Inflamacao` fica com nome errado e o PSA deveria migrar para
um painel próprio. É mudança de rótulo nosso, não de código.

### 1.13 Vitaminas — um faltante

| Analito | COMPONENT / SYSTEM / PROPERTY | Unidade no laudo | Marca | Fonte |
|---|---|---|---|---|
| 1,25-di-hidroxivitamina D | `Calcitriol` / `SER` / `MCnc` | `pg/mL` | ? | [1] |

A 25-OH já está coberta e é a que o laboratório brasileiro reporta com mais
frequência. A 1,25 aparece no catálogo como exame próprio e tem unidade,
grandeza e ordem de magnitude diferentes. **Confundir as duas é exatamente o
erro de vitamina D registrado no `README.md`, um andar acima**: não basta
acertar "vitamina D", é preciso acertar qual metabólito.

---

## 2. Os painéis que faltam por inteiro

Confiro cada um contra o CSV antes de afirmar. A conferência foi feita lendo as
79 linhas, não de memória.

| Painel | Situação no extrato | Quantos faltam |
|---|---|---|
| Coagulograma | **nenhuma linha** | 4 (+2 sem termo confirmado) |
| Urina tipo I, parte quantitativa | **nenhuma linha** | 4 |
| Urina de 24 horas e relações | **nenhuma linha** (só a albumina urinária em amostra isolada) | 6 |
| Eletroforese de proteínas | **nenhuma linha** | 5 |
| Imunoglobulinas e complemento | **nenhuma linha** | 7 |
| Marcadores cardíacos e enzimas musculares | **nenhuma linha** | 6 |
| Enzimas pancreáticas | **nenhuma linha** | 2 |
| Marcadores tumorais | **só PSA total e livre** | 5 |
| Minerais-traço | **nenhuma linha** | 3 |
| Eixo adrenal e gonadal ampliado | **só cortisol, testosterona, estradiol, FSH, LH, prolactina, beta-HCG** | 10 |
| Eixo cálcio-ósseo | **nenhuma linha** (há cálcio, fósforo e magnésio; falta o hormônio) | 1 |

E os que **não** faltam, conferidos um a um porque a tarefa pediu para conferir e
não chutar:

- **Perfil de ferro**: completo. Ferro sérico, ferritina, transferrina, saturação
  e capacidade de ligação, as cinco linhas estão no CSV.
- **Enzimas hepáticas**: completo para rotina. ALT, AST, gama-GT, fosfatase
  alcalina, as três bilirrubinas, albumina e proteínas totais. Falta a LDH, que
  entrou na seção 1.3 porque o catálogo brasileiro a lista com os marcadores
  cardíacos, não com o hepático.
- **Tireoide**: TSH, T4 livre e total, T3 livre e total e anti-TPO estão lá. O
  que falta é o segundo anel de anticorpos, na seção 1.8.
- **Vitaminas**: D, B12, folato, C, A e E estão lá. Falta só a 1,25.
- **Curva glicêmica e glicemia pós-prandial**: **não são lacuna.** Pela D22, o
  momento da coleta é campo próprio (`collectionMoment`), não código próprio. A
  linha de glicose no extrato já atende os dois, e a `serie-por-analito` já tem
  teste provando que jejum e 120 minutos viram duas séries.

---

## 3. A limitação do gerador que este estudo encontrou

`gerar-extrato.py` casa o alvo por três eixos e ignora os outros três do nome
completamente especificado. Para os 79 alvos atuais isso bastou, porque todos
são pontuais (`Pt`) em soro, plasma ou sangue. Os faltantes quebram a premissa
em dois pontos:

1. **Eixo do tempo.** Urina de 24 horas e urina de amostra isolada têm o mesmo
   `SYSTEM`. Sem `TIME_ASPCT` na tripla, seis alvos da seção 1.5 não se
   resolvem.
2. **Sistema fora da constante `SER`.** O coagulograma vive em plasma pobre em
   plaquetas, o sedimento urinário em `Urine sed`, o cortisol salivar em
   `Saliva`. Nada disso quebra o script — só exige escrever o sistema certo em
   vez de reusar `SER`.

O ponto 1 é mudança de código no gerador: a tupla de `ALVOS` passa de 5 para 6
campos, e `ALVOS_COM_METODO` de 6 para 7. É pequena e mecânica, mas é mudança, e
por isso está na TASK e não foi feita aqui.

---

## 4. O que fica de fora de propósito, e o critério

A `cobertura-analitos.md` já desenhou a fronteira. Este estudo a torna
explícita em quatro regras, porque a fronteira precisa ser aplicável por quem
não escreveu o documento.

**Um exame entra na série temporal quando, e só quando, as quatro valem:**

1. o resultado é um **número**, não uma descrição, um positivo/negativo nem uma
   cruz;
2. o número vem acompanhado de **unidade**, e a unidade é conversível para a
   canônica sem informação que o laudo não traz;
3. o número é **medido**, ou calculado por equação que o laudo informa ou que é
   única e trivial;
4. dois laboratórios diferentes medindo a mesma coisa produzem números **na
   mesma escala**.

### 4.1 Reprovados na regra 1 — o resultado é texto

Parasitológico de fezes, coprocultura, urocultura, hemocultura e qualquer
cultura com antibiograma, citologia oncótica, anatomia patológica, espermograma
na parte descritiva, bacterioscopia, pesquisa de larvas.

Um antibiograma é uma tabela de sensibilidades por antimicrobiano. Não existe
"o valor do antibiograma" para plotar. O documento fica guardado, o texto
extraído continua disponível e o chat continua conseguindo falar sobre ele — o
que ele não ganha é linha comparável entre meses.

### 4.2 Reprovados na regra 1 — o resultado é ordinal

Fita de urina inteira (proteína, glicose, cetona, nitrito, sangue,
urobilinogênio, bilirrubina), aspecto, cor e sedimento da urina, sorologias
qualitativas (HIV, HBsAg, anti-HCV, VDRL/sífilis, toxoplasmose, rubéola,
citomegalovírus, hepatite A), Coombs direto e indireto, grupo sanguíneo ABO e
fator Rh, pesquisa de falcização, sangue oculto nas fezes, fator reumatoide
qualitativo.

**Esta regra já está mecanizada**: o gerador filtra `SCALE_TYP = Qn`, e termo
ordinal (`Ord`) ou nominal (`Nom`) não chega a ser candidato. Não é disciplina
de quem escreve o alvo — é o script que não deixa passar.

Duas exceções que precisam de olhada humana, porque a mecânica sozinha não as
pega:

- **Sorologia com título numérico.** Anti-HBs sai em `mUI/mL` e é número com
  unidade. A regra 4 o reprova por outro motivo: a comparabilidade entre
  ensaios é discutível. Fica de fora por ora, e a decisão é humana.
- **FAN e anticorpos por titulação.** Um título como 1/160 é uma diluição, e o
  laudo traz junto um padrão descrito em texto. Diluição não é concentração:
  1/320 não é "o dobro" de 1/160 em nenhuma grandeza física. Fica de fora.

### 4.3 Reprovados na regra 3 — valor calculado com equação que o laudo não informa

A taxa de filtração glomerular estimada, que já está registrada no item 5 de
`pendencias.md` e cuja recomendação de ficar de fora este estudo **mantém**, com
o mesmo argumento: o LOINC tem um código por equação, e mapear para a equação
errada produz um número que parece certo e não é.

Na mesma família, e não registrados até agora:

- **HOMA-IR e HOMA-Beta.** Derivam de glicose e insulina por uma fórmula que o
  laudo raramente imprime, e que tem variantes. A glicose e a insulina já estão
  cobertas; o índice não entra.
- **Índice reticulocitário / reticulócitos corrigidos.** Correção pelo
  hematócrito, com fator que varia de laboratório. Os reticulócitos brutos, em
  percentual e absoluto, entram (seção 1.1); o índice corrigido não.
- **Relação CK-MB/CK, relação PSA livre/total, índice de Castelli, colesterol
  não-HDL quando o laudo não o imprime.** O não-HDL que **está** no extrato é o
  caso em que a equação é única e trivial (total menos HDL) e o laudo o imprime;
  quando ele não vem no papel, não é o app que deve calculá-lo.

O LDL fica onde já estava: tem código distinto conforme calculado ou dosado,
o laudo quase sempre diz qual, e a `cobertura-analitos.md` já trata disso.

### 4.4 Reprovados na regra 4 — escala não comparável entre laboratórios

- **Contagem "por campo" do sedimento urinário**, discutida na seção 1.4. Entra
  com ressalva, e a decisão de qual apresentação guardar é pendência.
- **Gasometria arterial.** É número com unidade e é medida, mas não é exame de
  rotina ambulatorial: aparece em contexto hospitalar, e a premissa do recorte é
  "o que um app de acompanhamento pessoal vê". Fica de fora por recorte, não por
  impossibilidade — se um laudo real trouxer, revisita-se.

---

## 5. Erros achados na cobertura atual

### 5.1 O `README.md` diz 78 linhas; o CSV tem 79

`05-vocabularios/README.md` afirma 78 em três lugares: na árvore de arquivos
("o extrato: 78 linhas, 24 colunas"), na descrição do extrato ("78 linhas, uma
por analito") e na seção do pt-BR ("Os 78 analitos da nossa cobertura estão
todos lá").

O arquivo tem 79 linhas de dados. `loinc/como-foi-gerado.md` e
`03-esquemas/cobertura-analitos.md` dizem 79, corretamente.

A origem é rastreável: a lista `ALVOS` do gerador tem 78 tuplas, e
`ALVOS_COM_METODO` tem 1 — a PCR ultrassensível, que virou linha própria
depois. O README foi escrito antes dessa linha existir e não acompanhou.

De quebra, `como-foi-gerado.md` diz "79 linhas de `(COMPONENT, SYSTEM,
PROPERTY)`", mas são 78 triplas mais uma quádrupla com método. Impreciso, não
errado no total.

### 5.2 A `cobertura-analitos.md` lista a taxa de filtração glomerular como se estivesse coberta

A tabela de "Função renal" traz a linha "Taxa de filtração glomerular estimada"
sem nenhuma marca, ao lado de creatinina, ureia e ácido úrico, que estão de
fato no extrato. Ela **não está** no extrato, e a razão está em `pendencias.md`,
item 5 — outro arquivo, que o leitor da tabela não tem motivo para abrir.

O documento diz de si mesmo que é "a lista de intenção", o que salva a
consistência formal. Mas uma tabela de intenção em que quatro linhas de cinco
viraram artefato e a quinta não, sem marca nenhuma, é um convite a erro. Mesmo
caso da "Microalbuminúria", que no extrato virou "Albumina urinária".

### 5.3 Uma pendência marcada como aberta já está respondida pelo extrato

A última caixa de `cobertura-analitos.md` — "Decidir se o diferencial de
leucócitos guarda percentual, absoluto ou os dois" — continua `- [ ]`. O extrato
já guarda **os dois**: dez linhas, cinco populações em `NCnc` e cinco em `NFr`.
A decisão foi tomada na prática e não foi registrada. Cabe fechar a caixa ou
escrever por que a decisão ainda é reversível.

---

## 6. Pendências humanas que este estudo abre

Nenhuma delas trava a TASK da seção 7; todas precisam de olhada antes da
verificação contra laudo real (Tarefa 14).

1. **Atividade de protrombina em `%`.** O laudo brasileiro imprime TP em
   segundos, atividade em percentual e INR, lado a lado. Achei termo para o
   primeiro e o terceiro. Para o segundo, **não encontrei fonte** que confirme
   qual tripla o LOINC usa. Não chutei. Decidir: procurar no release, ou aceitar
   que a atividade em `%` fique no texto extraído.
2. **Relação TTPA paciente/controle.** Mesma situação, mesma decisão.
3. **Troponina ultrassensível.** Confirmar se o LOINC a separa por método, como
   fez com a PCR, ou por termo próprio. Se for por método, é caso de
   `ALVOS_COM_METODO`.
4. **Sedimento urinário: "por campo" ou "por mL".** Decidir qual apresentação o
   app guarda, sabendo que a por campo não é comparável entre laboratórios. É a
   mesma família do item 4 de `pendencias.md`.
5. **Frações da eletroforese: `g/dL`, `%`, ou os dois.** Mesma pergunta do
   diferencial de leucócitos, um painel adiante. Convém responder as duas de uma
   vez.
6. **A frase "o nosso valor canônico é em massa" precisa de exceção.** SHBG em
   `nmol/L` e homocisteína em `µmol/L` são a convenção brasileira, e a D17 manda
   seguir a convenção brasileira. As duas regras se contradizem na letra.
   Reescrever a frase da `cobertura-analitos.md`.
7. **Anti-HBs quantitativo.** Número com unidade, mas comparabilidade entre
   ensaios discutível. Entra ou fica no texto?
8. **O painel `Inflamacao` vira nome errado** se os cinco marcadores tumorais
   entrarem e o PSA continuar lá. Decidir o novo agrupamento — é rótulo nosso,
   campo permitido pela cláusula 2 da licença, não mexe em nada do LOINC.

---

## 7. Rascunho de TASK — ampliar a cobertura e regenerar o extrato

Formato de `specs/*/tasks.md`. Ainda não tem spec nem plan; é rascunho para
virar EPIC. Os identificadores `V1`–`V7` são provisórios.

### Dependência

- [ ] Ter o release oficial do LOINC 2.83 descompactado em disco, com
      `LoincTable/Loinc.csv` e
      `AccessoryFiles/LinguisticVariants/ptBR11LinguisticVariant.csv`. A licença
      já foi aceita na tarefa 0.2a; não há nada a reaceitar.
- [ ] Não depende de nenhuma EPIC de código. O extrato é insumo do catálogo da
      Tarefa 3; ampliá-lo não quebra o que já está gerado, porque nenhuma linha
      existente é removida.

### V1 — Corrigir o que já está errado, antes de crescer

- [ ] `05-vocabularios/README.md`: trocar as três ocorrências de "78" por "79",
      nas linhas da árvore de arquivos, da descrição do extrato e da cobertura
      pt-BR.
- [ ] `loinc/como-foi-gerado.md`: corrigir "79 linhas de `(COMPONENT, SYSTEM,
      PROPERTY)`" para refletir que são triplas mais uma quádrupla com método.
- [ ] `03-esquemas/cobertura-analitos.md`: marcar a taxa de filtração glomerular
      como **fora do extrato**, com remissão ao item 5 de `pendencias.md`, e
      renomear "Microalbuminúria" para "Albumina urinária", como o extrato já a
      chama.
- [ ] `03-esquemas/cobertura-analitos.md`: fechar a caixa do diferencial de
      leucócitos, registrando que o extrato guarda percentual **e** absoluto, ou
      escrever por que a decisão continua reversível.

### V2 — Dar ao gerador o eixo do tempo

- [ ] Teste primeiro: um alvo de urina de 24 horas escrito com a tupla atual
      **não** deve resolver para o termo de 24 horas. Provar a falha antes de
      corrigir.
- [ ] `gerar-extrato.py`: acrescentar `TIME_ASPCT` à tupla de `ALVOS` (de 5 para
      6 campos) e à de `ALVOS_COM_METODO` (de 6 para 7), casando por
      `re.fullmatch` como componente e sistema já fazem.
- [ ] Manter o valor pontual como padrão explícito nos 79 alvos existentes, para
      que a regeneração produza **exatamente o mesmo CSV** que está hoje no
      repositório. Conferir por diff, não por leitura.
- [ ] Acrescentar `TIME_ASPCT` ao cabeçalho do CSV — ele já é gravado por
      `linha_de`, então confirmar que nada muda na saída.

### V3 — Escrever os alvos novos

- [ ] Transcrever as triplas da seção 1 deste documento para `ALVOS`,
      agrupadas por painel, na ordem em que aparecem aqui.
- [ ] Criar os painéis novos: `Coagulacao`, `Urina`, `Urina24h`, `Eletroforese`,
      `Imunologia`, `Cardiaco`, `Tumoral`, `Minerais`.
- [ ] Renomear o painel `Inflamacao`, ou mover PSA total e livre para `Tumoral`,
      conforme a pendência 8 da seção 6.
- [ ] Albumina eletroforética e PCR ultrassensível são os dois casos de
      `ALVOS_COM_METODO`. A albumina eletroforética **precisa** do método, senão
      colide com a albumina do painel hepático e o gerador avisa
      `CODIGO REPETIDO`.
- [ ] Não usar a constante `SER` para coagulograma, sedimento urinário nem
      cortisol salivar. Escrever o sistema de cada um.

### V4 — Rodar e ler os avisos

- [ ] Rodar `python loinc/gerar-extrato.py <pasta do release>`.
- [ ] Ler **cada** `SEM CANDIDATO` e corrigir a tripla. Toda tripla marcada `?`
      na seção 1 deste documento é candidata natural a aparecer aqui.
- [ ] Ler **cada** `CODIGO REPETIDO`. Dois rótulos no mesmo código significa que
      um dos critérios está frouxo — resolver pelo eixo que os separa, nunca
      apagando um dos dois.
- [ ] Ler **cada** `SEM pt-BR`. Alvo sem tradução não bloqueia, mas perde a
      `ptBR_RELATEDNAMES2`, que é o que alimenta a busca por semelhança contra o
      texto do laudo. Registrar quais ficaram sem.
- [ ] Conferir que o `assert` de `EXTERNAL_COPYRIGHT_NOTICE` não disparou. Ele é
      a cláusula 10.2 da licença e derruba a geração de propósito.

### V5 — Conferir o que o script não confere sozinho

- [ ] Para cada linha nova, conferir que o `EXAMPLE_UCUM_UNITS` devolvido e a
      unidade brasileira registrada na seção 1 são a mesma grandeza. Divergência
      de **escala** é esperada e vira unidade canônica no catálogo da Tarefa 3;
      divergência de **grandeza** é alvo errado.
- [ ] Conferência nominal do par que o nome quase esconde: `Thyroglobulin` e
      `Thyroglobulin Ab` precisam ter caído em códigos diferentes.
- [ ] Conferência nominal da vitamina D: a 25-OH que já está no extrato e a 1,25
      nova precisam ter caído em códigos diferentes. É a armadilha de vitamina D
      do `README.md` um andar acima.
- [ ] Conferência nominal da CK-MB: atividade e massa em códigos diferentes.
- [ ] Conferir que o coagulograma caiu em plasma pobre em plaquetas, e não em
      soro. Nenhum dos quatro tem método vazio, então o desempate por método não
      operou — a escolha foi só por ranqueamento e merece olhada.

### V6 — Provar que a D27 continua de pé

- [ ] Rodar uma busca por expressão de código LOINC sobre todos os arquivos
      versionados de `estudos-ia/`, `specs/` e do código, e conferir que as
      únicas ocorrências estão no CSV gerado, em `pendencias.md` (onde são
      resultado de execução, registrado) e nos textos que discutem o erro
      histórico da vitamina D.
- [ ] Conferir que `gerar-extrato.py` continua **sem um único código escrito à
      mão**, incluindo comentários.
- [ ] Conferir que este documento e a `cobertura-analitos.md` continuam sem
      nenhum código.
- [ ] Registrar o resultado dessa conferência no fim de `como-foi-gerado.md`,
      com data. Se a verificação não deixar rastro, ela não aconteceu.

### V7 — Fechar a documentação

- [ ] Atualizar a contagem de linhas nos **três** arquivos que a citam:
      `README.md`, `como-foi-gerado.md` e `cobertura-analitos.md`. Foi o
      descasamento entre eles que produziu o erro 5.1.
- [ ] Levar as tabelas de termo de busca da seção 1 para a
      `cobertura-analitos.md`, que é onde a lista de intenção mora, e deixar
      este documento como o estudo que a originou.
- [ ] Acrescentar a `pendencias.md` os oito itens da seção 6, numerados na
      sequência dos cinco que já existem.
- [ ] Recalcular o custo de conversão em `03-esquemas/conversao-unidades.md`: a
      cobertura mais que dobra de tamanho, e aquele documento foi escrito junto
      com a `cobertura-analitos.md` justamente porque uma dimensiona a outra.

### Encerramento

- [ ] Nenhuma dependência nova foi acrescentada ao projeto.
- [ ] Nenhum arquivo do release do LOINC entrou no repositório.
- [ ] O aviso de licença do LOINC continua no fim de cada arquivo que carrega
      material extraído.
- [ ] A geração termina com "Sem avisos", ou os avisos remanescentes estão
      explicados por escrito em `pendencias.md`.

---

## Fontes

Consultadas em 2026-09-18. As de catálogo dizem **o que um laboratório
brasileiro oferece**; as do loinc.org dizem **como o vocabulário nomeia os
eixos**. Nenhuma delas foi usada para escrever código.

1. Pasteur Diagnósticos — catálogo A–Z de exames laboratoriais (~180 itens).
   https://labpasteur.com.br/exames-laboratoriais/
2. Diagnósticos do Brasil — exames de check-up.
   https://www.diagnosticosdobrasil.com.br/artigo/check-up-medico
3. SanarMed — EAS / urina de rotina (tipo I).
   https://sanarmed.com/exames/eas-urina-rotina/
4. MD.Saúde — exame de urina (EAS).
   https://www.mdsaude.com/exames-complementares/exame-de-urina/
5. RMMG — eletroforese de proteínas séricas: interpretação e correlação clínica.
   https://rmmg.org/artigo/detalhes/520
6. IPGO — exames hormonais.
   https://ipgo.com.br/reproducao-humana/exames-da-mulher/
7. Lavoisier — reticulócitos.
   https://lavoisier.com.br/exames/reticulocitos/
8. SanarMed — TP / INR.
   https://sanarmed.com/exames/tp-inr/
9. SanarMed — coagulograma completo.
   https://sanarmed.com/exames/coagulograma/
10. Kasvi — análise da hemostasia (TAP e TTPa).
    https://kasvi.com.br/analise-da-hemostasia/
11. LOINC — página do termo "INR in Platelet poor plasma or blood by
    Coagulation assay"; confirma `RelTime` e `PPP/Bld`. O endereço da página é o
    próprio código, e por isso não está transcrito aqui: chega-se a ela buscando
    o nome do termo em https://loinc.org/search/
12. LOINC via BioPortal — confirma `Reticulocytes/100 erythrocytes` com `NFr`.
    https://bioportal.bioontology.org/ontologies/LOINC
13. LOINC — painel "PT and aPTT and Fibrinogen panel - Platelet poor plasma by
    Coagulation assay"; confirma `Time` para o TTPA e `MCnc` para o
    fibrinogênio. Buscar o nome do painel em https://loinc.org/search/
14. SanarMed — amilase e lipase.
    https://sanarmed.com/exames/amilase-lipase/
15. SanarMed — CK total e CK-MB.
    https://sanarmed.com/exames/ck-ck-mb/
16. Controllab — marcadores cardíacos; lista CK, CK-MB atividade, CK-MB massa,
    troponina e LDH como painel.
    https://controllab.com/catalogo/areas-de-atuacao/marcadores-cardiacos/
17. Gold Analisa — enzimas no laboratório clínico.
    https://www.goldanalisa.com.br/images/upload/Enzimas_no_Laboratorio_Clinico.pdf
18. LOINC — grupo "Specific gravity|Rden|Urine"; confirma `Rden`. Buscar o
    nome do grupo em https://loinc.org/search/
19. LOINC — termo "pH of Urine". Buscar o nome do termo em
    https://loinc.org/search/
20. LOINC — termos "Alpha 1 globulin/Protein.total in Serum or Plasma by
    Electrophoresis" e "Beta globulin+Gamma globulin [Mass/volume] in Serum or
    Plasma by Electrophoresis"; confirmam `Alpha 1 globulin` e `Beta globulin`
    como componentes. Buscar os nomes em https://loinc.org/search/
21. BRAGID — valores de normalidade das imunoglobulinas A, G e M.
    https://www.bragid.org.br/novo/arquivos/Valores-Ref-Igs.pdf
22. SanarMed — complemento C3 e C4.
    https://sanarmed.com/exames/complemento-c3-c4/
23. Sabin — paratormônio (PTH).
    https://sabin.com.br/exams/paratormonio-pth-diversos-materiais/
24. Fleury — homocisteína, plasma.
    https://www.fleury.com.br/exames/homocisteina-plasma
25. DASA / NAV — marcadores tumorais.
    https://nav.dasa.com.br/blog/marcadores-tumorais

Fontes consultadas e **descartadas** como lista de corte, com o motivo:

- **TUSS / Rol de Procedimentos da ANS.** Respondem "o que pode ser pedido e
  precisa ser coberto", não "o que aparece no laudo". Cerca de 4.500 códigos de
  análises clínicas. Ficam como fonte de conferência para a Tarefa 14.
  https://www.ans.gov.br/planos-de-saude-e-operadoras/espaco-do-consumidor/17-planos-de-saude-e-operadoras/espaco-do-consumidor/441-rol-de-procedimentos
- **Manual de exames do Hermes Pardini.** O endereço citado pelas buscas não
  resolve mais. Não usei o que não consegui abrir.
- **Tabela de valores de referência da ACSS.** É portuguesa, não brasileira. As
  unidades divergem em vários analitos.

---

This material contains content from LOINC (http://loinc.org). LOINC is copyright
© 1995-2024, Regenstrief Institute, Inc. and the Logical Observation Identifiers
Names and Codes (LOINC) Committee and is available at no cost under the license
at http://loinc.org/license. LOINC® is a registered United States trademark of
Regenstrief Institute, Inc.

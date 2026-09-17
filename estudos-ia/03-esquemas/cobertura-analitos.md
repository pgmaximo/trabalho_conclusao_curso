# Cobertura de analitos (tarefa 0.2b)

Define **quais** exames a normalização cobre. O quanto isso custa em trabalho de
conversão está em `conversao-unidades.md` (0.2c) — os dois documentos foram
escritos juntos de propósito, porque a cobertura escolhida aqui é o que
dimensiona a tabela de lá.

## Princípio de recorte

O ranqueamento do LOINC é norte-americano. Os painéis de rotina brasileiros
coincidem em boa parte, mas não inteiramente, e a frequência é diferente. Então
o recorte não é "os N primeiros do ranqueamento": é **os painéis de rotina que
um laudo brasileiro traz**, cruzados com o ranqueamento para pegar o código
certo de cada um.

Na prática isso dá pouco mais de 70 analitos, e cobre a esmagadora maioria dos
exames que um aplicativo de acompanhamento pessoal vê.

## Estado: os códigos existem desde 2026-09-16

Este documento continua sendo a **lista de intenção** — quais exames a
normalização cobre e por quê. Os códigos LOINC de cada um já foram resolvidos
contra o arquivo oficial e vivem em
`../05-vocabularios/loinc/loinc-analitos-suasaude.csv`: 79 linhas, com nome
oficial, nome em português e ranqueamento de uso.

Eles continuam **não estando escritos aqui**, e a razão abaixo é a mesma.

## Sobre os códigos LOINC: eles não estão escritos aqui, e é de propósito

Nenhum código LOINC aparece neste documento. Código de terminologia não se
digita de memória nem se copia de resposta de modelo — um dígito trocado
corrompe silenciosamente o eixo inteiro da comparação, e o erro só aparece meses
depois, quando dois exames do mesmo analito não se encontram.

O procedimento foi: aceitar a licença (0.2a), baixar o arquivo oficial, e
resolver o código de cada linha desta lista **por script**, não à mão. A coluna
"termo de busca" abaixo alimentou esse script. Ele está em
`../05-vocabularios/loinc/gerar-extrato.py` e também não contém nenhum código
LOINC: contém critérios de busca, e o LOINC responde qual código atende cada um.

**A regra foi quebrada uma vez, e vale registrar.** O plano técnico usava
`14635-7` como exemplo da vitamina D, escrito de memória. Está errado: é a
25-OH-D3 sozinha, em `nmol/L`. O certo é `62292-8`. Ver D27.

**Uma terceira armadilha, descoberta ao gerar o extrato:** nos índices do
hemograma, o LOINC guarda a informação distintiva no `PROPERTY` e no `SYSTEM`, e
não no nome do componente. O componente do VCM é literalmente `Observation`;
HCM e CHCM compartilham o componente `Hemoglobin` com a hemoglobina do sangue, e
só a propriedade os separa. Buscar por nome não acha nenhum dos três.

Duas armadilhas de mapeamento que valem atenção na hora de preencher:

- **O mesmo analito tem códigos diferentes por tipo de amostra e por método.**
  "Glicose no soro" e "glicose no sangue capilar" são códigos distintos. Para o
  nosso caso, soro ou plasma é o padrão.
- **Massa e mol têm códigos diferentes.** O LOINC distingue `[Mass/volume]` de
  `[Moles/volume]` no próprio código. Como o nosso valor canônico é em massa
  (ver `conversao-unidades.md`), a escolha é a variante de massa — e o valor
  convertido para mol, quando existir, não muda o código da linha.

## Os painéis

### Hemograma

| Analito | Termo de busca no LOINC |
|---|---|
| Hemoglobina | Hemoglobin [Mass/volume] in Blood |
| Hematócrito | Hematocrit [Volume Fraction] of Blood |
| Eritrócitos | Erythrocytes [#/volume] in Blood |
| Leucócitos | Leukocytes [#/volume] in Blood |
| Plaquetas | Platelets [#/volume] in Blood |
| VCM | Erythrocyte mean corpuscular volume |
| HCM | Erythrocyte mean corpuscular hemoglobin |
| CHCM | Erythrocyte mean corpuscular hemoglobin concentration |
| RDW | Erythrocyte distribution width |
| Neutrófilos, linfócitos, monócitos, eosinófilos, basófilos | Neutrophils / Lymphocytes / Monocytes / Eosinophils / Basophils [#/volume] in Blood |

O diferencial de leucócitos aparece no laudo brasileiro em duas formas ao mesmo
tempo: percentual e absoluto. São **códigos diferentes**, e guardar só o
percentual perde informação. A extração precisa reconhecer as duas colunas.

### Perfil lipídico

| Analito | Termo de busca no LOINC |
|---|---|
| Colesterol total | Cholesterol [Mass/volume] in Serum or Plasma |
| HDL | Cholesterol in HDL [Mass/volume] |
| LDL | Cholesterol in LDL [Mass/volume] |
| VLDL | Cholesterol in VLDL [Mass/volume] |
| Triglicerídeos | Triglyceride [Mass/volume] |
| Não-HDL | Cholesterol non HDL [Mass/volume] |

O LDL tem código distinto conforme seja calculado ou dosado diretamente. O laudo
quase sempre diz qual. Quando não disser, é calculado.

### Glicemia e controle glicêmico

| Analito | Termo de busca no LOINC |
|---|---|
| Glicose | Glucose [Mass/volume] in Serum or Plasma |
| Hemoglobina glicada | Hemoglobin A1c/Hemoglobin.total in Blood |
| Insulina | Insulin [Units/volume] in Serum or Plasma |
| Peptídeo C | C peptide [Mass/volume] |

A glicada é o caso mais atípico da lista inteira: ela é percentual, não
concentração, e a conversão para a escala alternativa não é molar. Detalhe em
`conversao-unidades.md`.

### Função renal

| Analito | Termo de busca no LOINC |
|---|---|
| Creatinina | Creatinine [Mass/volume] in Serum or Plasma |
| Ureia | Urea [Mass/volume] in Serum or Plasma |
| Ácido úrico | Urate [Mass/volume] in Serum or Plasma |
| Taxa de filtração glomerular estimada | Glomerular filtration rate/1.73 sq M.predicted |
| Microalbuminúria | Albumin [Mass/volume] in Urine |

**Ureia e nitrogênio ureico não são a mesma medida.** O laudo brasileiro traz
ureia; o americano costuma trazer nitrogênio ureico. Os dois têm código
diferente e escala diferente, e confundi-los produz um valor com o dobro do
tamanho. Item de atenção na extração, não só na conversão.

### Função hepática

| Analito | Termo de busca no LOINC |
|---|---|
| ALT / TGP | Alanine aminotransferase [Enzymatic activity/volume] |
| AST / TGO | Aspartate aminotransferase [Enzymatic activity/volume] |
| Gama-GT | Gamma glutamyl transferase [Enzymatic activity/volume] |
| Fosfatase alcalina | Alkaline phosphatase [Enzymatic activity/volume] |
| Bilirrubina total, direta e indireta | Bilirubin.total / Bilirubin.direct / Bilirubin.indirect [Mass/volume] |
| Albumina | Albumin [Mass/volume] in Serum or Plasma |
| Proteínas totais | Protein [Mass/volume] in Serum or Plasma |

As enzimas são medidas de **atividade**, em U/L. Não têm conversão molar — o que
existe é a diferença de temperatura de ensaio entre laboratórios, que muda a
faixa de referência sem mudar a unidade. Por isso a faixa do laboratório é
guardada por linha.

### Eletrólitos e minerais

| Analito | Termo de busca no LOINC |
|---|---|
| Sódio | Sodium [Moles/volume] in Serum or Plasma |
| Potássio | Potassium [Moles/volume] |
| Cloro | Chloride [Moles/volume] |
| Cálcio total | Calcium [Mass/volume] in Serum or Plasma |
| Cálcio iônico | Calcium.ionized [Moles/volume] |
| Magnésio | Magnesium [Mass/volume] |
| Fósforo | Phosphate [Mass/volume] |

### Função tireoidiana

| Analito | Termo de busca no LOINC |
|---|---|
| TSH | Thyrotropin [Units/volume] in Serum or Plasma |
| T4 livre | Thyroxine (T4) free [Mass/volume] |
| T4 total | Thyroxine (T4) [Mass/volume] |
| T3 total | Triiodothyronine (T3) [Mass/volume] |
| T3 livre | Triiodothyronine (T3) free [Mass/volume] |
| Anti-TPO | Thyroperoxidase Ab [Units/volume] |

### Vitaminas

| Analito | Termo de busca no LOINC |
|---|---|
| Vitamina D (25-OH) | 25-hydroxyvitamin D3+D2 [Mass/volume] |
| Vitamina B12 | Cobalamin (Vitamin B12) [Mass/volume] |
| Ácido fólico | Folate [Mass/volume] in Serum or Plasma |
| Vitamina C | Ascorbate [Mass/volume] in Serum or Plasma |
| Vitamina A | Retinol [Mass/volume] in Serum or Plasma |
| Vitamina E | Tocopherol alpha [Mass/volume] |

A vitamina D é o caso mais confuso do vocabulário: existem códigos separados
para D2, D3, e a soma dos dois. Laboratório brasileiro reporta a soma, e é ela
que interessa. Mapear para o código errado aqui é exatamente o tipo de erro que
faz março e setembro não se encontrarem.

### Ferro e reservas

| Analito | Termo de busca no LOINC |
|---|---|
| Ferro sérico | Iron [Mass/volume] in Serum or Plasma |
| Ferritina | Ferritin [Mass/volume] |
| Transferrina | Transferrin [Mass/volume] |
| Saturação de transferrina | Iron saturation [Mass Fraction] |
| Capacidade de ligação do ferro | Iron binding capacity [Mass/volume] |

### Inflamação e marcadores

| Analito | Termo de busca no LOINC |
|---|---|
| Proteína C reativa | C reactive protein [Mass/volume] |
| VHS | Erythrocyte sedimentation rate |
| PSA total e livre | Prostate specific Ag [Mass/volume] |

A PCR aparece em duas apresentações no laudo brasileiro — convencional e
ultrassensível — que compartilham grandeza mas têm faixa de referência e
emprego clínico distintos.

### Hormônios de rotina

| Analito | Termo de busca no LOINC |
|---|---|
| Testosterona total e livre | Testosterone [Mass/volume] |
| Cortisol | Cortisol [Mass/volume] |
| Estradiol | Estradiol [Mass/volume] |
| FSH, LH | Follitropin / Lutropin [Units/volume] |
| Prolactina | Prolactin [Mass/volume] |
| Beta-HCG | Choriogonadotropin [Units/volume] |

## O que fica fora desta cobertura, e o que acontece com esses exames

Fora: urina de rotina na parte qualitativa (aspecto, cor, cilindros,
cristais), culturas e antibiogramas, sorologias, anatomia patológica, laudos de
imagem.

Eles não desaparecem. O documento continua guardado, o texto extraído continua
disponível e o chat continua conseguindo falar sobre ele. O que esses exames não
ganham é **linha comparável entre meses**, porque a maioria não é número — é
descrição, positivo ou negativo, ou um laudo em prosa.

Essa fronteira é a resposta à pendência que estava em aberto no esquema:
"exames sem valor numérico entram nesta tabela ou em outra?". Resposta: não
entram nesta. Entram no texto extraído do documento, que a Fase 1 já guarda.

## Pendências desta tarefa

- [x] Preencher o código LOINC de cada linha a partir do arquivo oficial —
      **feito em 2026-09-16**, por script, em `../05-vocabularios/`
- [ ] Resolver as cinco pendências de `../05-vocabularios/pendencias.md`
      (vitamina A, vitamina E, PCR, albumina urinária, taxa de filtração)
- [ ] Conferir contra um laudo brasileiro real quantos analitos desta lista
      aparecem de fato, e se algum recorrente ficou de fora
- [ ] Decidir se o diferencial de leucócitos guarda percentual, absoluto ou os
      dois

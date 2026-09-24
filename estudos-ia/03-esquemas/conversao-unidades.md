# Conversão de unidades (tarefa 0.2c)

Dimensiona o trabalho de normalização da cobertura definida em
`cobertura-analitos.md`.

## O achado que encolhe esta tarefa

A pendência foi registrada como "tabela de conversão por analito", imaginando
uma linha por par de unidades: `ng/mL → nmol/L`, `mg/dL → mmol/L`, e assim por
diante, para cada exame. Isso seria enorme e cheio de números copiados à mão,
que é exatamente onde erro entra sem ser visto.

Não é preciso. **A conversão entre massa e mol é uma fórmula só, e a única
informação por analito é a massa molar.**

```
mol/L = (concentração em g/L) ÷ (massa molar em g/mol)
```

Todo o resto — `mg/dL`, `ng/mL`, `µg/dL`, `pg/mL` — é potência de dez. O par de
unidades contribui com o expoente; o analito contribui com um número só.

Na prática, os fatores publicados saem daqui:

| Conversão | Fator |
|---|---|
| `mg/dL` → `mmol/L` | 10 ÷ MM |
| `mg/dL` → `µmol/L` | 10 000 ÷ MM |
| `µg/dL` → `µmol/L` | 10 ÷ MM |
| `ng/dL` → `nmol/L` | 10 ÷ MM |
| `ng/mL` → `nmol/L` | 1 000 ÷ MM |
| `pg/mL` → `pmol/L` | 1 000 ÷ MM |
| `mg/L` → `µmol/L` | 1 000 ÷ MM |

Conferindo contra fatores conhecidos, para mostrar que a regra fecha:

- Glicose, MM 180,16 → `mg/dL` para `mmol/L`: 10 ÷ 180,16 = **0,0555**
- Creatinina, MM 113,12 → `mg/dL` para `µmol/L`: 10 000 ÷ 113,12 = **88,4**
- Vitamina D, MM 400,64 → `ng/mL` para `nmol/L`: 1 000 ÷ 400,64 = **2,496**
- Cálcio, MM 40,08 → `mg/dL` para `mmol/L`: 10 ÷ 40,08 = **0,2495**

São os mesmos números que a literatura publica. Ou seja: a tabela por analito é
**uma coluna de massa molar**, e o código implementa a fórmula. Cada número
ainda precisa ser conferido contra referência antes de valer, mas é um número
por analito, não um por par de unidades.

## A unidade canônica é a convencional brasileira, não a do SI

Decisão de projeto, e ela é sobre a pessoa, não sobre correção acadêmica.

O laudo de laboratório brasileiro reporta glicose em `mg/dL` e vitamina D em
`ng/mL`. Se o aplicativo canonizar para `mmol/L` e `nmol/L`, o número que a
pessoa vê na tela deixa de bater com o papel que ela tem na mão. Uma glicemia de
95 vira 5,27, e ela não reconhece o próprio exame.

Então: **canônico é o que o laboratório brasileiro usa.** A conversão existe para
absorver o laudo que vem em outra escala, não para impor uma escala nova.

## A regra que não pode ser esquecida: a faixa de referência converte junto

Se o valor for convertido e a faixa de referência do laboratório não,
a linha passa a comparar um número numa escala com limites em outra. O resultado
é um exame normal aparecendo como alterado, ou o contrário.

`value`, `referenceLow` e `referenceHigh` convertem sempre na mesma operação.
Isso vale como teste: nenhuma linha pode existir com valor e faixa em escalas
diferentes.

## Massas molares — a tabela de fato

Uma linha por analito da cobertura que precisa de conversão massa ↔ mol. Todos
em g/mol, todos a conferir contra referência antes de valer.

| Analito | MM | Analito | MM |
|---|---|---|---|
| Glicose | 180,16 | Vitamina D (25-OH) | 400,64 |
| Colesterol | 386,65 | Vitamina B12 | 1 355,37 |
| Triglicerídeos | 885,4 | Ácido fólico | 441,40 |
| Creatinina | 113,12 | Vitamina C | 176,12 |
| Ureia | 60,06 | Vitamina A (retinol) | 286,45 |
| Ácido úrico | 168,11 | Vitamina E (alfa-tocoferol) | 430,71 |
| Bilirrubina | 584,66 | T4 | 776,87 |
| Cálcio | 40,08 | T3 | 650,98 |
| Magnésio | 24,31 | Testosterona | 288,42 |
| Fósforo | 30,97 | Cortisol | 362,46 |
| Ferro | 55,85 | Estradiol | 272,38 |

Vinte e dois números. É o tamanho real desta tarefa.

Triglicerídeos usam a massa da trioleína por convenção — não existe "a" massa
molar de triglicerídeo, porque é uma classe de moléculas. É uma aproximação
aceita, e vale registrá-la como tal.

### A ampliação de 2026-09-22 (Bloco 10)

Quatorze massas novas, e todas conferidas contra a fórmula molecular — não
contra uma tabela de fatores, que é onde erro de cópia se esconde. O fator que
cada uma produz foi conferido contra o fator publicado quando ele existe.

| Analito | Fórmula | g/mol | Fator conferido |
|---|---|---|---|
| Progesterona | C21H30O2 | 314,46 | ng/mL → nmol/L = 3,18 |
| 17-OH-progesterona | C21H30O3 | 330,46 | ng/dL → nmol/L = 0,0303 |
| DHEA-S (como sulfato, a forma dosada) | C19H28O5S | 368,49 | µg/dL → µmol/L = 0,0271 |
| DHEA | C19H28O2 | 288,42 | ng/mL → nmol/L = 3,47 |
| Androstenediona | C19H26O2 | 286,41 | ng/mL → nmol/L = 3,49 |
| Estrona | C18H22O2 | 270,37 | pg/mL → pmol/L = 3,70 |
| Di-hidrotestosterona | C19H30O2 | 290,44 | — |
| Cortisol salivar | C21H30O5 | 362,46 | a mesma do cortisol sérico |
| Creatinina urinária | C4H7N3O | 113,12 | a mesma da sérica |
| Homocisteína | C4H9NO2S | 135,18 | o canônico já é µmol/L |
| Zinco | Zn | 65,38 | µg/dL → µmol/L = 0,153 |
| Cobre | Cu | 63,546 | µg/dL → µmol/L = 0,157 |
| Selênio | Se | 78,971 | µg/L → µmol/L = 0,0127 |
| 1,25-di-hidroxivitamina D | C27H44O3 (a D3) | 416,64 | pg/mL → pmol/L = 2,40 |

A última segue a **convenção declarada da D36**: o analito é a soma D2+D3, e a
massa é a da D3.

**Quem NÃO ganhou massa molar, e por quê:** proteína, enzima e anticorpo
(imunoglobulinas, complemento, CK-MB, apolipoproteínas, marcadores tumorais,
fatores de coagulação). A D18 vale para eles pela mesma razão da hemoglobina: a
massa de uma proteína depende da forma em que ela é contada, e o laudo
brasileiro não os escreve em mol.

**As conversões de escala novas** no `unitConverter.ts`, todas potência de dez
sem química: `g/24h ↔ mg/24h`, `/mL ↔ /µL`, `ng/dL ↔ ng/mL`, `pg/mL ↔ ng/dL`,
`µg/mL ↔ µg/dL` — e uma identidade, `µg/mg ≡ mg/g` na relação
albumina/creatinina.

## Os casos que a fórmula não cobre

Estes são o trabalho de verdade, e cada um erra de um jeito diferente.

### Hemoglobina glicada

Percentual, não concentração. Duas escalas em uso, e a relação entre elas é
linear porém não molar:

```
IFCC (mmol/mol) = (NGSP (%) − 2,15) × 10,929
```

Laboratório brasileiro reporta em percentual. Canônico é o percentual.

### Hemoglobina

A armadilha mais silenciosa da lista. A conversão de `g/dL` para `mmol/L`
depende de a massa molar usada ser a do monômero ou a do tetrâmero — os dois
aparecem na literatura, e a diferença é um fator de quatro.

Solução: não converter. Canônico é `g/dL`, e a única conversão aceita é para
`g/L`, que é escala pura. Um fator de quatro num valor de hemoglobina é a
diferença entre anemia e normalidade.

### Miliequivalentes

`mEq/L` depende da valência, não da massa molar:

- monovalentes (sódio, potássio, cloro): `mEq/L` = `mmol/L`
- divalentes (cálcio, magnésio): `mEq/L` = 2 × `mmol/L`

Aplicar a fórmula molar aqui dobra ou divide pela metade, conforme a direção.

### Enzimas

ALT, AST, gama-GT, fosfatase alcalina são medidas de **atividade**, em `U/L`.
Não têm conversão molar.

O que varia entre laboratórios é a temperatura do ensaio, que muda a faixa de
referência sem mudar a unidade. É mais uma razão para a faixa ser guardada por
linha, e não assumida por analito.

### Contagens celulares

Leucócitos, plaquetas e eritrócitos aparecem em `/mm³`, `/µL` ou `×10⁹/L`. Só
escala, sem química. `/µL` e `/mm³` são a mesma coisa com nomes diferentes.

### Identidades disfarçadas de conversão

Pares que parecem exigir conta e não exigem:

| | |
|---|---|
| `ng/mL` e `µg/L` | idênticos |
| `pg/mL` e `ng/L` | idênticos |
| `mIU/L` e `µUI/mL` | idênticos — é o caso do TSH |

Ferritina e PSA caem aqui. Reconhecer a identidade evita uma conversão que
introduziria erro de arredondamento sem necessidade.

### Unidades internacionais

FSH, LH, beta-HCG e o próprio TSH são medidos em unidades de **atividade
biológica**, definidas por padrão de referência, não por massa. Não há conversão
para mol. Tentar uma é erro conceitual, não de cálculo.

## Como isso vira código

A forma que o repositório já pratica, herdada da feature de wearable: lógica
pura, em arquivo próprio, com teste unitário.

Três propriedades que os testes precisam sustentar:

1. **Ida e volta.** Converter e desconverter devolve o valor de partida, dentro
   da tolerância de arredondamento.
2. **Valor e faixa na mesma escala.** Nenhuma linha existe com valor e limites
   em unidades diferentes.
3. **Unidade desconhecida não converte.** Ela marca a linha como pendente de
   revisão, e nunca chuta. Já está no esquema como regra; aqui vira teste.

## Pendências desta tarefa

- [ ] Conferir as 22 massas molares contra referência publicada (as 14 do
      Bloco 10 foram conferidas contra a fórmula molecular, acima)
- [ ] Confirmar a convenção de triglicerídeos com o orientador
- [ ] Levantar quais unidades alternativas de fato aparecem em laudo brasileiro
      — pode ser que boa parte da tabela nunca seja exercitada, e saber disso
      muda a ordem de implementação

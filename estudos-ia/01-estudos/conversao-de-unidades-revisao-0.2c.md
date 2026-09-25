# Estudo — revisão da conversão de unidades (tarefa 0.2c)

**Revisão da proposta escrita em `../03-esquemas/conversao-unidades.md`, com
verificação contra fonte publicada e comparação com o que outros sistemas
fazem. Feita em 2026-09-18.**

Este documento não altera o esquema. Ele mede o que a proposta afirma, aponta
onde ela diverge da fonte, e recomenda um caminho. Não há interpretação clínica
em nenhuma linha: o que está aqui é química e engenharia.

Nenhum código LOINC é citado. Onde um analito precisa ser identificado, ele
aparece pelo rótulo em português, que é campo nosso; o código vive em
`../05-vocabularios/loinc/loinc-analitos-suasaude.csv` (regra D27).

---

## 1. Resumo

1. **As 22 massas molares conferem.** Todas as 22 caem dentro de 0,03% do valor
   calculado a partir da fórmula molecular com pesos atômicos da IUPAC/CIAAW, e
   batem com o fator de conversão publicado onde encontrei um.
2. **Há 4 divergências que merecem decisão, e só uma delas tem tamanho.** As de
   triglicerídeos, bilirrubina e magnésio são arredondamento (≤ 0,03%). A da
   vitamina D é de 3% e não é aritmética: é o número da D3 aplicado a um analito
   que é a soma D2+D3.
3. **Não existe tabela oficial pronta para copiar.** O LOINC não publica fator de
   conversão; a Apple embarca uma única massa molar (glicose); os dois serviços
   abertos de conversão por LOINC que achei são europeus, e o único com licença
   usável traz fatores arredondados a três dígitos e usa a convenção de
   hemoglobina que a D18 recusa.
4. **A `ucum-lhc` (NLM) faz massa↔mol e ainda faz mEq por valência**, com licença
   BSD utilizável. Mas ela não traz massa molar nenhuma, não entende grafia
   brasileira, e **converte errado dois casos que hoje recusamos de propósito**
   (glicada em `%` e hemoglobina em `g/dL`). Não substitui o que temos.
5. **O furo real desta revisão não está na tabela: está no `mEq/L`.** O Fleury
   reporta sódio e potássio em `mEq/L`; o catálogo canoniza `mmol/L` e o
   conversor não conhece `mEq/L`. Hoje, toda linha de eletrólito de um laudo
   assim vai para revisão sem motivo.

---

## 2. As 22 massas molares, conferidas

### Método

Três verificações independentes por linha, onde havia as três:

1. **PubChem** — `MolecularFormula` e `MolecularWeight` pela API pública
   (`pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/<nome>/property/...`).
   O PubChem arredonda a 4 algarismos significativos, então ele confirma a
   ordem de grandeza e a fórmula, não a terceira casa.
2. **Cálculo a partir da fórmula**, com os pesos atômicos padrão da CIAAW
   (H 1,008 · C 12,011 · N 14,007 · O 15,999 · P 30,973 761 998 ·
   Co 58,933 194 · I 126,904 47). Esta é a verificação que dá a terceira casa.
3. **Fator de conversão clínico publicado**, de onde se extrai a massa molar
   implícita. A fonte acessível que cobre mais analitos foi a tabela do
   unitslab.com, que declara derivar os fatores da literatura publicada.

Para os quatro elementos (cálcio, magnésio, fósforo, ferro) a fonte é
diretamente a tabela de pesos atômicos padrão da CIAAW.

### A tabela

| Analito | Proposto | PubChem (CID · fórmula · MM) | Calculado da fórmula | Fator publicado → MM implícita | Confere? |
|---|---|---|---|---|---|
| Glicose | 180,16 | 5793 · C6H12O6 · 180,16 | 180,156 | 18,016 → 180,16 | sim |
| Colesterol | 386,65 | 5997 · C27H46O · 386,7 | 386,664 | 38,665 → 386,65 | sim (convenção) |
| Triglicerídeos (trioleína) | 885,4 | 5497163 · C57H104O6 · 885,4 | 885,453 | 88,5 → 885,0 | **divergente** |
| Creatinina | 113,12 | 588 · C4H7N3O · 113,12 | 113,120 | 11,312 → 113,12 | sim |
| Ureia | 60,06 | 1176 · CH4N2O · 60,056 | 60,056 | 6,006 → 60,06 | sim |
| Ácido úrico | 168,11 | 1175 · C5H4N4O3 · 168,11 | 168,112 | 16,811 → 168,11 | sim |
| Bilirrubina | 584,66 | 5280352 · C33H36N4O6 · 584,7 | 584,673 | 58,467 → 584,67 | **divergente** |
| Cálcio | 40,08 | — (elemento) | CIAAW 40,078(4) | 4,0078 → 40,078 | sim |
| Magnésio | 24,31 | — (elemento) | CIAAW [24,304; 24,307] | 2,4305 → 24,305 | **divergente** |
| Fósforo | 30,97 | — (elemento) | CIAAW 30,973 761 998(5) | 3,1 → 31,0 | sim |
| Ferro | 55,85 | — (elemento) | CIAAW 55,845(2) | 5,5845 → 55,845 | sim |
| Vitamina D (25-OH) | 400,64 | 5283731 · C27H44O2 · 400,6 | 400,647 | 2,5 → 400,0 | **divergente** |
| Vitamina B12 | 1 355,37 | 166596686 · C63H88CoN14O14P · 1355,4 | 1355,388 | 0,135537 → 1355,37 | sim |
| Ácido fólico | 441,40 | 135398658 · C19H19N7O6 · 441,4 | 441,404 | 0,04414 → 441,40 | sim |
| Vitamina C | 176,12 | 54670067 · C6H8O6 · 176,12 | 176,124 | não encontrei fonte acessível | sim (2 de 3) |
| Vitamina A (retinol) | 286,45 | 445354 · C20H30O · 286,5 | 286,459 | não encontrei fonte acessível | sim (2 de 3) |
| Vitamina E (alfa-tocoferol) | 430,71 | 14985 · C29H50O2 · 430,7 | 430,717 | não encontrei fonte acessível | sim (2 de 3) |
| T4 | 776,87 | 5819 · C15H11I4NO4 · 776,87 | 776,874 | 0,77688 → 776,88 | sim |
| T3 | 650,98 | 5920 · C15H12I3NO4 · 650,97 | 650,977 | 0,0650978 → 650,98 | sim |
| Testosterona | 288,42 | 6013 · C19H28O2 · 288,4 | 288,431 | 0,028842 → 288,42 | sim |
| Cortisol | 362,46 | 5754 · C21H30O5 · 362,5 | 362,466 | 0,3625 → 362,50 | sim |
| Estradiol | 272,38 | 5757 · C18H24O2 · 272,4 | 272,388 | 0,027238 → 272,38 | sim |

URLs das fontes:

- PubChem, por CID: `https://pubchem.ncbi.nlm.nih.gov/compound/<CID>` — os CIDs
  estão na coluna acima. O endpoint usado foi
  `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/<nome>/property/MolecularFormula,MolecularWeight/JSON`.
- CIAAW, pesos atômicos padrão: <https://www.ciaaw.org/atomic-weights.htm>
- unitslab.com, fatores clínicos por analito: <https://unitslab.com/> — cada
  analito tem página própria, e o rodapé do site declara que os fatores "são
  derivados da literatura atual e aplicados como publicados", sem assumir
  responsabilidade pela exatidão. Serve como segunda opinião, não como
  autoridade.
- Fleury, manual de exames (converte e publica o fator da vitamina D):
  <https://www.fleury.com.br/medicos/exames/vitamina-d-25-hidroxi-soro>

### As quatro divergências, uma a uma

**1. Triglicerídeos — 885,4 contra 885,0 e 885,7.** A trioleína calculada da
fórmula dá 885,45. A tabela do unitslab usa 885,0; um conversor brasileiro usa
88,574 como divisor, o que implica 885,74; o valor mais citado na literatura é
885,4, que é o que a proposta usa. **Não é erro de ninguém: é uma convenção sem
consenso na terceira casa.** A diferença entre os extremos é 0,08%, muito
abaixo da precisão analítica do ensaio. Recomendo manter 885,4 e registrar por
escrito que é a trioleína, que os valores publicados variam entre 885,0 e
885,7, e que a escolha é arbitrária dentro dessa faixa.

**2. Bilirrubina — 584,66 contra 584,67.** O cálculo dá 584,673 e a tabela
publicada dá 584,67. A proposta arredondou para baixo. Diferença de 0,002%.
Recomendo trocar para **584,67**, porque é o arredondamento correto e porque é
o número que a tabela publicada traz — não custa nada e tira uma pergunta do
caminho.

**3. Magnésio — 24,31 contra 24,305.** A CIAAW não publica um número: publica um
intervalo, `[24,304; 24,307]`, porque a composição isotópica do magnésio varia
com a fonte. O valor convencional é 24,305, e é ele que a tabela clínica usa.
24,31 é o mesmo número arredondado a quatro algarismos. Diferença de 0,02%.
Recomendo trocar para **24,305**, pela mesma razão do item anterior.

**4. Vitamina D — e esta é a única que tem tamanho.** 400,64 é a massa da
**25-OH-D3** (calcifediol), confirmada no PubChem e no cálculo. Mas o analito
que a `cobertura-analitos.md` escolheu, e que o laboratório brasileiro reporta,
é a **soma D2+D3**, e a 25-OH-D2 tem massa 412,66 — **3% acima**. Ou seja: a
massa molar de uma classe está sendo representada pelo membro mais abundante,
exatamente como acontece nos triglicerídeos, e a proposta registra a ressalva
para triglicerídeos mas não para a vitamina D.

Não há número certo aqui, porque a proporção D2/D3 varia por pessoa. A prática
publicada é usar o fator da D3: o próprio Fleury imprime "Conversão:
1 ng/mL = 2,5 nmol/L" na página do exame, que é 1000/400 — a D3 arredondada.
**Recomendo manter 400,64 e acrescentar a mesma nota de ressalva que os
triglicerídeos já têm.** O que não pode continuar é a assimetria: a proposta
avisa sobre uma aproximação de classe e cala sobre a outra, que é maior.

### O que a tabela não disse e devia dizer

A proposta fala em "vinte e dois números". São 22 **valores distintos**, mas o
catálogo gerado (`amplify/functions/extract-document-data/analyteCatalog.ts`)
aplica esses 22 a **31 linhas**: colesterol serve HDL, LDL, VLDL e não-HDL; a
bilirrubina serve total, direta e indireta; T4 serve livre e total; T3 idem;
testosterona serve total e livre. A frase "22 números" está certa sobre o
trabalho de conferência e errada sobre a superfície de risco — um erro em
colesterol erra em cinco linhas de laudo, não em uma.

---

## 3. O que a web mostrou sobre bibliotecas e dados oficiais

### 3.1 O LOINC não resolve isto

O LOINC **não publica fator de conversão**. O que ele tem é
`EXAMPLE_UCUM_UNITS`, e a própria documentação diz que as unidades da tabela
"não são normativas nem necessariamente exaustivas" — são exemplo, como o nome
do campo declara. É por isso que o catálogo do projeto tem coluna própria de
unidade canônica, e a `pendencias.md` já registrou quatro casos em que a
unidade de exemplo do LOINC diverge da prática brasileira.

A referência acadêmica do assunto é **Hauser RG, Quine DB, Ryder A, Campbell S.
"Unit conversions between LOINC codes." JAMIA 2018;25(2):192-196** —
<https://academic.oup.com/jamia/article-abstract/25/2/192/3871185> — e a
resposta dos mantenedores do LOINC, **Vreeman DJ, Abhyankar S, McDonald CJ.
JAMIA 2018;25(5):614-615**, <https://doi.org/10.1093/jamia/ocx087>. A resposta
é direta ao ponto: converter entre termos LOINC é trabalho de quem implementa,
deve ser verificado empiricamente, e **não é função embutida do LOINC**. A
própria revisão feita pelos autores achou erro de unidade de exemplo em códigos
de lítio no LOINC. Licença: os artigos são de acesso restrito (li o resumo e a
resposta).

### 3.2 Os dois serviços abertos de conversão por LOINC

| Projeto | O que é | Licença | Serve? |
|---|---|---|---|
| `miracum/loinc-conversion` | Servidor REST em Node que recebe (código LOINC, unidade, valor) e devolve valor na unidade padronizada | **Apache-2.0** | Os **dados** servem de conferência; o serviço, não |
| `medizininformatik-initiative/mii-loinc-conversion` | Mesma ideia, projeto irmão alemão | **Sem arquivo de licença** — a API do GitHub devolve `license: null` | Não. Sem licença, não se usa |

O repositório do miracum é pequeno e a parte interessante é o arquivo
`data/conversion.tsv`: **328 linhas, uma por par de códigos LOINC** — ou seja,
exatamente a forma que a proposta 0.2c rejeitou por ser "enorme e cheia de
números copiados à mão". Vale registrar três coisas que a leitura desse arquivo
ensina, porque cada uma é um argumento a favor da proposta:

- **Os fatores estão arredondados a três algarismos.** Glicose aparece como
  18,02 e não 18,016; cálcio aparece como **0,25** e não 0,2495 — 0,2% de erro
  embutido, congelado numa tabela, sem a massa molar por perto para se
  reconferir. É a diferença entre guardar o dado (a massa molar) e guardar o
  resultado (o fator).
- **A hemoglobina converte com fator 1,61**, que é a massa do **monômero**
  (≈16 114 g/mol). Este é o caso da D18 acontecendo num sistema real, em
  produção, sem aviso: uma implementação de referência europeia escolheu uma
  das duas convenções e não diz qual no arquivo. O fator do tetrâmero seria
  6,4458. **A D18 estava certa em recusar.**
- **Eles têm um arquivo `synonyms.tsv` que é a nossa `UNIT_ALIASES`** — `E/l`,
  `IE/ml`, `G/l`, `µl`, `GPT/l`. É a camada da D28, existindo por necessidade em
  outro país. E é **alemã**: não serve para `mcg/dL`, `µUI/mL`, `UI/L`, `g%`.
  Não achei equivalente brasileiro publicado.
- **Eles têm um `arb-u.tsv` que lista as unidades arbitrárias e as deixa
  passar sem converter.** É a nossa regra de unidades internacionais, escrita
  em outro lugar pela mesma razão.

Fontes: <https://github.com/miracum/loinc-conversion> ·
<https://github.com/medizininformatik-initiative/mii-loinc-conversion>

### 3.3 FHIR e openEHR não dão a resposta pronta

O HL7 FHIR exige UCUM em `Observation.valueQuantity` e publica o *value set*
com mais de mil códigos UCUM (<https://www.hl7.org/fhir/valueset-ucum-units.html>),
mas o value set é vocabulário, não conversão: ele diz quais unidades são
escrevíveis, não como passar de uma para outra. O openEHR, na página
"Implementing Laboratory Tests in openEHR"
(<https://ckm.openehr.org/ckm/document?cid=1013.17.116>), trata a lista de
unidades possíveis por analito como **decisão local de template**, dependente
da terminologia de cada implantação. Nenhum dos dois entrega tabela de massa
molar.

### 3.4 Aplicativo pessoal de saúde: a Apple embarca exatamente uma massa molar

O HealthKit tem `HKUnit.moleUnit(with:molarMass:)` — ou seja, **quem chama
fornece a massa molar** — e uma única constante pronta,
`HKUnitMolarMassBloodGlucose`, documentada como "a massa molecular da glicose
sanguínea". A documentação pública nem imprime o valor numérico dela.

- <https://developer.apple.com/documentation/healthkit/hkunit/moleunit(with:molarmass:)>
- <https://developer.apple.com/documentation/healthkit/hkunitmolarmassbloodglucose>

Traduzindo para a nossa pergunta: **a Apple, que tem o maior aplicativo pessoal
de saúde do mundo, embarca a massa molar de um analito só.** Para qualquer
outro, o desenvolvedor traz a sua. Não achei nada publicado por Google Fit ou
Withings sobre normalização de unidade de exame laboratorial — eles cobrem
sinal vital e atividade, não painel de laudo.

Isso responde a pergunta do item (b) com bastante clareza: **não existe o dado
oficial pronto que tornaria a nossa tabela desnecessária.** Existe biblioteca
que faz a *conta*; a *tabela* é de quem constrói.

---

## 4. `ucum-lhc` — medida, não suposta

Instalei a `@lhncbc/ucum-lhc` 7.1.9 num diretório temporário e rodei as
conversões do projeto contra ela. Nada disso entrou no repositório.

### O que é e quanto custa

| | |
|---|---|
| Pacote | `@lhncbc/ucum-lhc`, versão 7.1.9 |
| Autor | Lister Hill National Center for Biomedical Communications, NLM |
| Licença | Baseada na BSD, **uso comercial e não comercial permitido**, exige preservar o aviso de propriedade e o disclaimer; carrega junto a licença da tabela UCUM do Regenstrief (<https://ucum.org/license>) |
| Tamanho instalado | **4,9 MB**, 22 pacotes no `node_modules`, sendo 1,7 MB do próprio pacote |
| Dependências de runtime | 9, incluindo `coffeescript`, `csv-parse`, `xmldoc`, `jsonfile`, `stream-transform` |
| Node builtins usados | `fs` (no caminho CommonJS) |
| Bundle de navegador | `browser-dist/ucum-lhc.min.js`, **292 KB** minificado |
| Repositório | <https://github.com/LHNCBC/ucum-lhc> · <https://www.npmjs.com/package/@lhncbc/ucum-lhc> |

A licença pede citação em publicação que use o software — relevante para um TCC.

### Ela faz massa↔mol? Faz. E faz mEq também.

`convertUnitTo(de, valor, para, { molecularWeight, charge })`. O README é
explícito: `molecularWeight` é usado quando a conversão é de massa para mol ou
o inverso, e `charge` quando uma das pontas está em equivalentes.

**Conferi contra os nossos números e bateu em todos:**

| Caso | `ucum-lhc` | Nossa fórmula |
|---|---|---|
| Glicose 95 `mg/dL` → `mmol/L` | 5,273 090 6 | 5,273 090 6 |
| Creatinina 1,0 `mg/dL` → `µmol/L` | 88,401 697 | 88,401 697 |
| Vitamina D 30 `ng/mL` → `nmol/L` | 74,880 192 | 74,880 192 |
| Cálcio 9,5 `mg/dL` → `mmol/L` | 2,370 259 5 | 2,370 259 5 |
| Ferro 90 `µg/dL` → `µmol/L` | 16,114 593 | 16,114 593 |
| B12 300 `pg/mL` → `pmol/L` | 221,341 77 | 221,341 77 |
| T4 livre 1,2 `ng/dL` → `pmol/L` | 15,446 600 | 15,446 600 |
| Triglicerídeos 150 `mg/dL` → `mmol/L` | 1,694 149 5 | 1,694 149 5 |

Ou seja: **a fórmula da proposta está certa, e uma implementação independente
do NLM concorda com ela até a sétima casa.** Este é o achado que mais me
tranquiliza sobre o desenho de 0.2c.

Ela também resolve o `mEq/L`, que nós hoje não resolvemos:
`mEq/L → mmol/L` com `charge: 1` devolve o mesmo número; com `charge: 2`
devolve a metade; e `mg/dL → mEq/L` de cálcio com massa 40,08 e carga 2 devolve
4,74. Confere com a regra que a proposta escreveu na seção de miliequivalentes.

### Onde ela quebra, e por que não substitui o que temos

**a) Grafia brasileira.** Testei o que o laudo de fato escreve:

| Escrito no papel | `ucum-lhc` diz |
|---|---|
| `µg/dL` (U+00B5) | **inválido** |
| `μg/dL` (U+03BC) | **inválido** |
| `mcg/dL` | **inválido** |
| `µUI/mL` | **inválido** |
| `UI/L` | **inválido** |
| `mUI/L` / `mIU/L` | **inválido** |
| `mEq/L` (com E maiúsculo) | **inválido** — só `meq/L` passa |
| `g%` | válido, e vale `g/dL` — acertou |
| `mg%` | válido, e vale `mg/dL` — acertou |
| `/mm3` | válido, converte para `/uL` — acertou |
| `mm3` (sem a barra) | válido, mas é **volume**, não contagem |
| `10^6/uL` | válido, equivale a `10*6/uL` — acertou |

Ela cobre parte do que a D28 cobre (`g%`, `mg%`, `/mm3`, `10^6`) e **não cobre o
resto**, inclusive o sinal de micro, que é o achado mais repetido do projeto. A
camada de alias continua necessária de qualquer jeito.

**b) Ela converte dois casos que nós recusamos de propósito, e devolve número
errado sem avisar.**

- `convertUnitTo('%', 6.0, 'mmol/mol')` devolve **60**. Para hemoglobina
  glicada, 6,0% NGSP corresponde a ~42 mmol/mol IFCC. A `ucum-lhc` está certa
  em aritmética adimensional e **errada no domínio**, porque a relação
  NGSP↔IFCC não é proporcional — tem intercepto. Se alguém encaminhar a glicada
  para a biblioteca, sai um número plausível e falso.
- `convertUnitTo('g/dL', 14, 'mmol/L', { molecularWeight: 64500 })` devolve
  2,17, sem nenhuma objeção. É a D18 acontecendo: a biblioteca aceita a massa
  que você der, e não tem opinião sobre monômero ou tetrâmero.

**c) Ela recusa uma identidade que nós precisamos.**
`u[IU]/mL → m[IU]/L` **falha**, com a mensagem "Attempt to convert to arbitrary
unit". O UCUM classifica unidade internacional como arbitrária e proíbe
conversão entre arbitrárias — mesmo quando, como no caso do TSH, as duas são
numericamente idênticas. A nossa tabela de identidades continua necessária.
(`ng/mL ↔ µg/L` e `pg/mL ↔ ng/L`, essas ela faz.)

### Roda em React Native? A pergunta não se aplica hoje

`unitConverter.ts` é importado só por `analyteNormalizer.ts` e pelo próprio
teste — tudo em `amplify/functions/`, ou seja, **Lambda, Node**. Nenhum código
de React Native chama conversão de unidade. Na Lambda, `fs` e as 9 dependências
não são problema; o custo seria 4,9 MB a mais no empacotamento.

Se um dia a conversão precisar acontecer no aplicativo, o caminho seria o
`browser-dist` de 292 KB, e aí entra a discussão de Metro e de *polyfill* — que
não precisa ser tida agora.

---

## 5. Prática brasileira de unidades

A terceira pendência de `conversao-unidades.md` pergunta se boa parte da tabela
não seria exercitada nunca. Resposta curta: **é provável que sim, e o motivo é
que a unidade convencional brasileira já é a canônica (D17).** A conversão
massa↔mol só entra quando chega laudo fora do padrão, e isso é a exceção.

O que consegui confirmar contra fonte brasileira:

| Analito | Unidade no laboratório brasileiro | Canônica no catálogo | Fonte |
|---|---|---|---|
| Sódio | **`mEq/L`** | `mmol/L` | Fleury, Sódio soro |
| Potássio | **`mEq/L`** | `mmol/L` | Fleury, Potássio soro |
| Creatinina | `mg/dL` | `mg/dL` | Fleury |
| Colesterol e frações | `mg/dL` | `mg/dL` | Fleury |
| Ureia | `mg/dL` | `mg/dL` | Fleury |
| Ácido úrico | `mg/dL` | `mg/dL` | Fleury |
| Cálcio | `mg/dL` | `mg/dL` | Fleury |
| Magnésio | `mg/dL` | `mg/dL` | Fleury |
| Fósforo | `mg/dL` | `mg/dL` | Fleury |
| Cortisol | `µg/dL` | `ug/dL` | Fleury / manuais de exame |
| T4 total | `µg/dL` | `ug/dL` | Fleury |
| T4 livre | `ng/dL` | `ng/dL` | Fleury · Hermes Pardini |
| Ácido fólico | `ng/mL` | `ng/mL` | Fleury |
| Vitamina D (25-OH) | `ng/mL` | `ng/mL` | Fleury |
| Vitamina B12 | `pg/mL` | `pg/mL` | Hermes Pardini |
| Ferritina | `ng/mL` | `ng/mL` | Hermes Pardini |
| Hemoglobina glicada | `%` | `%` | Fleury |
| Eritrócitos / leucócitos | `10^6/µL`, `10^3/µL`, `/mm³` | `10*6/uL`, `10*3/uL` | laudo real do Delboni (Tarefa 1, `04-implementacao/notas.md`) |

Fontes: <https://www.fleury.com.br/exames/sodio-soro> ·
<https://www.fleury.com.br/exames/potassio-soro> ·
<https://www.fleury.com.br/exames/creatinina-soro> ·
<https://www.fleury.com.br/exames/colesterol-total-e-fracoes-soro> ·
<https://www.fleury.com.br/exames/t4-livre-soro> ·
<https://www.fleury.com.br/medicos/exames/vitamina-d-25-hidroxi-soro> ·
<https://www.hermespardini.com.br/exame/01173>

### O achado: `mEq/L` é o furo, e ele é grande

**O Fleury reporta sódio e potássio em `mEq/L`.** Conferido na página de cada
exame: sódio "136 a 145 mEq/L", potássio "3,5 - 5,1 mEq/L" entre outras faixas
por método.

E hoje:

- o catálogo canoniza sódio, potássio e cloro em **`mmol/L`** (herdado do
  exemplo do LOINC, sem exceção registrada em `UNIDADE_CANONICA`);
- o `unitConverter.ts` **não tem `mEq/L` em `UNIT_ALIASES` nem em
  `KNOWN_UNITS`**.

Consequência: um laudo do Fleury entrega sódio e potássio, e as duas linhas
saem como `unidade-desconhecida` → pendentes de revisão. **É exatamente o modo
de falha que a D28 descreve** — a linha comum indo para a revisão que existe
para o duvidoso — só que desta vez em eletrólito, e ninguém pegou porque o
laudo do Delboni usado na Tarefa 1 não tinha painel de eletrólitos entre os 19
exames.

Para monovalentes a conta é a identidade: `mEq/L` = `mmol/L` para sódio,
potássio e cloro. Duas saídas possíveis, e a escolha é do humano:

1. **Alias de identidade**, `meq/l → mmol/L`, restrito aos monovalentes. Simples
   e errado se um dia alguém aplicar a cálcio ou magnésio, onde o fator é 2.
2. **Unidade canônica passa a ser `mEq/L`** para sódio, potássio e cloro, que é
   o que a D17 manda ("canônico é o que o laboratório brasileiro usa") e o que
   a `pendencias.md` já fez para vitamina A e vitamina E. Aí a identidade é na
   direção oposta e o laudo que vier em `mmol/L` é que converte.

A segunda é mais coerente com a D17. Nenhuma das duas deve ser implementada por
um agente sem que o usuário decida, porque muda o número que aparece na tela.

### O que não consegui confirmar

- **Não achei tabela de conversão publicada pela SBPC/ML.** A entidade publica
  material sobre intervalos de referência, mas não encontrei tabela de
  conversão de unidade acessível com o nome dela. Não afirmo que não exista.
- **Não achei manual de exames público e navegável do Delboni ou do DASA** com
  a unidade por analito. O Hermes Pardini tem páginas por exame; o Fleury é o
  mais completo dos três.
- **Não achei nenhum arquivo de sinônimos de unidade brasileiro publicado** —
  o equivalente ao `synonyms.tsv` alemão. A `UNIT_ALIASES` do repositório
  parece ser a única lista desse tipo que temos, e ela foi construída contra um
  laudo só.

---

## 6. Os casos que fogem à fórmula

### 6.1 Hemoglobina glicada — a fórmula está numericamente certa e escrita na forma errada

A proposta traz `IFCC (mmol/mol) = (NGSP (%) − 2,15) × 10,929`.

A fonte oficial é o NGSP, que publica a *master equation* desde 2007:

> `NGSP = [0.09148 × IFCC] + 2.152`

e a inversa, na mesma página:

> `IFCC = (10.93 × NGSP) − 23.50`

Fonte: <https://ngsp.org/ifccngsp.asp>

A forma da proposta expandida dá `10,929 × NGSP − 23,497`. **Numericamente é a
mesma reta** — a diferença chega a 0,03 mmol/mol, que some no arredondamento do
laudo. Mas as duas constantes da proposta (2,15 e 10,929) **não são as que a
fonte publica**, e é impossível, olhando o documento, saber de onde saíram.
Isso é a mesma classe de problema do código de vitamina D escrito de memória que
a D27 registra: um número plausível sem procedência.

**Recomendação: trocar pela forma publicada, `IFCC = (10,93 × NGSP) − 23,50`,
com a URL do NGSP ao lado.** Confirmado. Custo: uma linha.

Cuidado adicional, já registrado na seção 4: se um dia a glicada for entregue a
uma biblioteca UCUM, `%` → `mmol/mol` devolve `NGSP × 10` e ninguém reclama.
A glicada precisa continuar fora do caminho genérico de conversão.

### 6.2 Hemoglobina — confirmado, e com evidência de fora

A D18 recusa converter `g/dL` para `mmol/L`. A revisão achou duas confirmações
independentes de que a recusa é certa:

- O unitslab mantém **duas entradas separadas**, "Hemoglobin monomer (subunit)"
  com fator 1,6114 e "Hemoglobin tetramer" com fator 6,4458 — as duas
  convenções, publicadas lado a lado, com fator exatamente 4 entre elas.
- O serviço alemão `miracum/loinc-conversion` converte com **1,61**, ou seja,
  escolheu o monômero, e o arquivo não diz que escolheu.

A guarda `SEM_CONVERSAO_MOLAR` no gerador do catálogo, que derruba a geração se
alguém acrescentar massa molar para hemoglobina, é a peça certa. Nada a mudar.

### 6.3 Miliequivalentes — descrito no documento, ausente do código

A proposta descreve a regra da valência corretamente (monovalente `mEq/L` =
`mmol/L`; divalente `mEq/L` = 2 × `mmol/L`). Conferida contra a `ucum-lhc` com
`charge`: bate.

**Mas o código não implementa nada disso, e nem sabe que `mEq/L` existe.** Ver
seção 5. Enquanto ninguém decidir, o comportamento de hoje (recusar) é o
comportamento seguro — só que ele está recusando uma unidade corriqueira, e
isso tem custo de revisão.

### 6.4 Enzimas, contagens, identidades, unidades internacionais

- **Enzimas em `U/L`:** confirmado que não têm conversão molar. `U/L` é válido
  em UCUM, e o UCUM o trata como unidade **arbitrária**, que é precisamente a
  categoria que proíbe conversão. A observação da proposta sobre temperatura de
  ensaio mudar a faixa sem mudar a unidade continua valendo e é mais um
  argumento para a faixa por linha.
- **Contagens celulares:** confirmado, `/mm³` = `/µL` exatamente, e a diferença
  para `10*3/µL` é escala pura. A `ucum-lhc` concorda.
- **Identidades:** `ng/mL ↔ µg/L` e `pg/mL ↔ ng/L` confirmadas pela `ucum-lhc`.
  **`µUI/mL ↔ mUI/L` é verdade e a `ucum-lhc` se recusa a fazê-la**, porque a
  unidade internacional é arbitrária. Nossa tabela de identidades é a única
  coisa que resolve esse caso — não dá para delegar.
- **Unidades internacionais (FSH, LH, beta-HCG, TSH, anti-TPO, insulina):**
  confirmado. O UCUM as marca como arbitrárias e o serviço alemão mantém um
  arquivo só para listá-las e não convertê-las. Mesma conclusão, dois lugares.

### 6.5 O que continua em aberto

- **Ureia contra nitrogênio ureico.** A `cobertura-analitos.md` avisa, mas nem
  a proposta nem o conversor têm nada que impeça um laudo americano em `mg/dL`
  de BUN de ser tratado como ureia em `mg/dL`. **As duas unidades são iguais e
  os dois analitos não** — o fator entre eles é 2,14. Como a extração casa por
  analito e não por unidade, a proteção depende inteiramente de o modelo
  escolher o analito certo. Não testei isso e não sei se está coberto.
- **Albumina urinária em `mg/24h`.** A `pendencias.md` já registra que `mg/24h`
  não é concentração. Confirmei que a `ucum-lhc` nem valida `mg/24h` como está
  escrito (o UCUM exige `mg/(24.h)`). Continua aberta, e é decisão de escopo,
  não de química.
- **Vitamina C, vitamina A e vitamina E** conferem em 2 das 3 verificações
  (PubChem e cálculo). Não achei fator clínico publicado numa fonte acessível
  para nenhuma das três. As três são analitos de baixa frequência em laudo de
  rotina, então o risco é pequeno, mas o registro é honesto: **duas fontes, não
  três.**

---

## 7. Recomendação

**Híbrido, com a biblioteca do lado de fora da produção.**

Concretamente:

1. **Manter a tabela de massas molares nossa e a fórmula nossa.** Ela já está
   escrita, já está testada, e a conferência acima mostra que ela concorda com
   o NLM até a sétima casa decimal. Trocá-la por biblioteca não melhora nenhum
   número.
2. **Corrigir as três massas de arredondamento** (bilirrubina 584,67, magnésio
   24,305) e **acrescentar as duas notas de convenção** (triglicerídeos =
   trioleína, faixa publicada 885,0–885,7; vitamina D = massa da D3 aplicada à
   soma D2+D3).
3. **Trocar a fórmula da glicada pela forma publicada do NGSP**, com a URL.
4. **Adotar a `ucum-lhc` como dependência de desenvolvimento**, e escrever um
   teste que, para cada analito do catálogo com massa molar, converta pela
   nossa função e pela dela e exija que os dois resultados coincidam. É o mesmo
   padrão da D27 depois da segunda quebra: **a garantia vira teste executado, e
   não comentário afirmando que foi conferido.** Custo zero em produção, e o
   dia em que alguém digitar 1355,73 no lugar de 1355,37 o teste cai.
5. **Resolver o `mEq/L`** — decisão do usuário entre alias de identidade e troca
   da unidade canônica dos eletrólitos. É o único item desta revisão que muda o
   que o aplicativo mostra.

### O custo de cada caminho

| Caminho | Custo de entrada | Custo permanente | O que ganha | O que perde |
|---|---|---|---|---|
| **A. Tabela nossa, como está** | zero — já feito | conferir 22 números, e conferir de novo quando entrar analito | controle total; recusa explícita nos casos perigosos | a conferência é manual e o comentário que a afirma não é executado |
| **B. Trocar pela `ucum-lhc`** | reescrever `unitConverter.ts`, 4,9 MB e 22 pacotes na Lambda, citação exigida pela licença | acompanhar versão da biblioteca e da tabela UCUM | valência (`mEq`) de graça; validação genérica de UCUM | **continua precisando das 22 massas molares** (ela não traz nenhuma); continua precisando da camada de alias brasileira; **perde as recusas da D18 e da glicada**, que ela converte com número errado; perde a identidade `µUI/mL ↔ mUI/L`, que ela proíbe |
| **C. Híbrido (recomendado)** | instalar como `devDependency` e escrever um teste de concordância | atualizar a biblioteca como qualquer dev dependency | um oráculo independente do NLM validando cada massa molar, executado a cada `npm test` | nada em produção — o pacote não vai para a Lambda |

O argumento decisivo contra o caminho B não é tamanho: é que **a biblioteca não
sabe recusar**. O valor do `unitConverter.ts` de hoje não está na aritmética —
essa qualquer um faz — está em `ConversionResult` ter um lado `ok: false` com
motivo, e em a hemoglobina e a glicada nunca chegarem à conta. Uma biblioteca
genérica de UCUM converte tudo que for dimensionalmente possível, porque é para
isso que ela existe. Trocar uma pela outra seria trocar um conversor que sabe o
que não deve fazer por um que não sabe.

---

## 8. Pendências que só um humano pode fechar

1. **`mEq/L` para sódio, potássio e cloro — alias de identidade ou trocar a
   unidade canônica?** Muda o número na tela. É a pendência mais urgente desta
   revisão, e é a única que deixa linha comum caindo em revisão hoje.
2. **Triglicerídeos: confirmar com o orientador** que a trioleína é aceitável e
   que 885,4 está bom dentro da faixa 885,0–885,7 que a literatura usa.
   (A pendência já existia; agora tem a faixa medida.)
3. **Vitamina D: aceitar que a massa da D3 representa a soma D2+D3?** A mesma
   conversa da trioleína, com 3% em vez de 0,08%. Precisa de decisão registrada,
   não de escolha silenciosa.
4. **Bilirrubina 584,66 → 584,67 e magnésio 24,31 → 24,305:** correção trivial,
   mas altera arquivo gerado e catálogo. Autorização para mexer.
5. **Glicada: trocar a fórmula pela forma publicada do NGSP.** Igual acima —
   mudança pequena, arquivo de esquema, precisa de aval.
6. **Ureia contra nitrogênio ureico:** decidir se vale um teste que barre a
   confusão, ou se a proteção por analito já basta. Exige julgamento sobre
   quanto laudo estrangeiro o aplicativo vai ver.
7. **Levantar unidades contra mais de um laudo real.** Toda a tabela da seção 5
   foi montada com manual de laboratório na internet e **um** laudo (Delboni,
   Tarefa 1). Manual de exame diz o que o laboratório publica; laudo diz o que
   ele imprime, e os dois divergem. Só o usuário tem os laudos.
8. **Vitamina C, A e E:** decidir se duas fontes bastam, ou se vale procurar a
   terceira em fonte paga (AMA Manual of Style, Tietz).
9. **Licença e citação da `ucum-lhc`, se o caminho C for aceito.** A licença
   pede citação em publicação que use o software — num TCC isso é a seção de
   referências, e é decisão do autor, não do agente.

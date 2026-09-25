# A tela do DASA como referência — o que copiar e o que não copiar

**Origem:** duas capturas do `nav.dasa.com.br`, enviadas pelo usuário em
2026-09-17, do exame de 04/10/2025 que também é o PDF usado na Tarefa 1.
Material de entrada para a **Tarefa 12** (tela de detalhe do documento) e para
a **EPIC de série por analito**.

Este documento existe porque a referência é boa **e** faz uma coisa que a
regra 4 da constituição proíbe. Separar as duas é o trabalho.

---

## Anexo 1 — a lista de exames

Coluna esquerda com navegação; centro com a lista de **coletas por data**,
cada cartão trazendo data, laboratório, a enumeração dos exames daquela coleta
e um botão "Mostrar resultados"; painel direito com o **detalhe da coleta
selecionada**.

O painel direito abre com cabeçalho do laboratório, "Feito em 04 Out 2025, às
08h07", uma aba "Laboratoriais", três ações (`Laudo Completo`, `Compartilhar`,
`Mais opções`), a contagem **"19 Exames disponíveis"** e então um cartão por
exame — "Hemograma com Contagem de Plaquetas", "Ferritina" — cada um
expansível pela seta, com um "Ver lista completa" quando há mais linhas do que
cabem.

### O que aproveitar

1. **Contagem visível no topo.** "19 Exames disponíveis" é exatamente o que o
   estudo `01-estudos/leitura-de-documento.md` concluiu que a nossa tela
   precisa: a leitura por modelo tem **cobertura instável** (47, 47, 42, 47
   linhas em quatro execuções idênticas), e uma contagem visível é o que
   transforma omissão silenciosa em omissão percebida. Aqui ela tem outro
   propósito e serve ao nosso de graça.
2. **Agrupamento por exame, não lista corrida de analitos.** Os 45 analitos do
   laudo viram ~19 cartões. O catálogo gerado já carrega o campo `panel`
   (Hemograma, Lipídico, Tireoide...), que é o que permite fazer isso sem
   inventar agrupamento.
3. **Cartão recolhido mostra as três primeiras linhas** e oferece ver o resto.
   Bom padrão para uma tela de celular com 45 linhas.
4. **A data do cabeçalho é a da coleta**, não a do upload — é o que a D24 já
   exige por outro caminho.

### O que NÃO copiar

- **O ícone verde de "conferido" ao lado de cada valor.** Ver abaixo.

---

## Anexo 2 — o laudo aberto

Três colunas por linha: **rótulo do analito**, **resultado**, **intervalo de
referência**. Agrupado em "Série Vermelha" e "Série Branca", cada bloco com o
rodapé `(Material: Sangue Total)` e `(Método: Impedância / Colorimetria /
Fluorescência / Avaliação Microscópica)`.

### A confirmação mais valiosa das duas imagens

A Série Branca traz, **na mesma linha**, o percentual e o valor absoluto, com
**dois intervalos de referência**:

| | % | absoluto | faixa % | faixa absoluta |
|---|---|---|---|---|
| Leucócitos | 100 % | 5.500 /µL | 100 % | 4.500 a 13.000 /µL |
| Neutrófilos | 63,9 % | 3.515 /µL | 36,9 a 73,3 % | 1.800 a 7.700 /µL |
| Eosinófilos | 5,3 % | 292 /µL | 0,4 a 8,2 % | 100 a 500 /µL |
| Basófilos | 0,6 % | 33 /µL | 0,4 a 1,3 % | 0 a 100 /µL |
| Linfócitos | 25,1 % | 1.381 /µL | 14,5 a 50,2 % | 1.000 a 4.800 /µL |
| Monócitos | 5,1 % | 281 /µL | 1,0 a 11,4 % | 300 a 800 /µL |

**Isto prova, no papel, o que a medição já tinha sugerido:** percentual e
absoluto são dois analitos distintos, com faixas distintas, e o laudo os
apresenta lado a lado. O modelo rotulava os dois como "Neutrófilos", e mapeá-los
para um código LOINC só faria o id determinístico colidir — a D22 por outra
porta. O catálogo já tem os dois códigos separados (`26499-4` e `26511-6`), e
a instrução de sistema já manda distinguir. Esta imagem é a confirmação de que
a regra está certa.

### Metadado que o nosso esquema não guarda

`Material` e `Método` aparecem por bloco. O `formato-analitos.md` não tem campo
para nenhum dos dois, e a `conversao-unidades.md` registra por que o método
importa: em enzimas, a temperatura do ensaio muda a faixa de referência sem
mudar a unidade. **Não é lacuna urgente** — a faixa já é guardada por linha,
que é a proteção real —, mas é um campo candidato se um dia a comparação entre
laboratórios precisar explicar divergência de faixa.

---

## O ponto que decide o desenho da nossa tela

A tela do DASA marca **julgamento clínico** em cada linha:

- ✅ verde, em quase todas as linhas;
- 🔽 **laranja** em `Monócitos 281 /µL`, cuja faixa é `300 a 800 /µL`;
- uma **barra colorida** ao lado de cada resultado e de cada faixa — verde
  quando dentro, laranja quando fora.

**Nós não podemos fazer isso, e não é preciosismo.** A regra 4 da constituição
proíbe classificar valor como normal ou alterado, e a `regras-de-linguagem.md`
proíbe cor de julgamento. Um laboratório é um serviço de saúde com
responsabilidade técnica assinada; este aplicativo é organização de informação
com encaminhamento a um profissional de saúde. Mostrar o mesmo sinal laranja
seria o aplicativo emitindo um juízo que ele declara não emitir.

### A distinção que salva a referência

O que a tela do DASA faz de bom é **pôr o valor e a faixa lado a lado**. Isso
não é interpretação: é apresentação de dois dados que estavam no papel. Quem
olha `281 /µL` ao lado de `300 a 800 /µL` tira a própria conclusão — e essa é a
diferença entre informar e diagnosticar.

**Então a nossa tela copia a estrutura e não copia o veredito:**

| Elemento | DASA | Nós |
|---|---|---|
| Valor ao lado da faixa | sim | **sim** |
| Agrupar por exame/painel | sim | **sim** |
| Contagem no topo | sim | **sim**, e por outro motivo também |
| Ícone de conferido/alterado | sim | **não** |
| Barra colorida dentro/fora | sim | **não** |
| Cor por situação do valor | sim | **não** |
| Encaminhamento a profissional | não | **sim, obrigatório** |

**Onde a cor é permitida:** no estado da *extração*, nunca no do *valor*. Linha
pendente de revisão usa o token de **aviso** — é uma afirmação sobre a
confiança da leitura, não sobre a saúde de ninguém. Isso a Tarefa 12 já exige.

---

## Conferência de valores contra a nossa extração

Os números do Anexo 2 batem, um a um, com o que a pipeline extraiu do PDF na
verificação da Tarefa 9 — inclusive vírgula decimal e ponto de milhar:

| | Tela do DASA | Nossa extração |
|---|---|---|
| Eritrócitos | 5,19 10^6/µL | `5,19` → 5.19 `10*6/uL` |
| Hemoglobina | 16,1 g/dL | `16,1` → 16.1 `g/dL` |
| Hematócrito | 47,0 % | `47,0` → 47 `%` |
| VCM | 90,5 fL | `90,5` → 90.5 `fL` |
| HCM | 31,1 pg | `31,1` → 31.1 `pg` |
| CHCM | 34,3 g/dL | `34,3` → 34.3 `g/dL` |
| RDW | 12,8 % | `12,8` → 12.8 `%` |
| Leucócitos | 5.500 /µL | `5.500` → 5.5 `10*3/uL` |
| Ferritina | 81,3 ng/mL | `81,3` → 81.3 `ng/mL` |

Sete de sete na Série Vermelha, e os dois de fora do hemograma. **Nenhuma
divergência.** Isso não substitui a Tarefa 14 — que confere de três a cinco
laudos, valor por valor, à mão — mas é a primeira conferência contra uma fonte
independente do nosso próprio PDF.

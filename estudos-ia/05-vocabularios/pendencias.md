# Pendências do extrato — onde o código oficial e a prática brasileira divergem

Cinco pontos que o gerador resolveu sem erro, mas que merecem olhada humana
antes da verificação contra laudo real (Tarefa 14 do plano). **Nenhum deles
bloqueia a Tarefa 3.**

O padrão que une quatro dos cinco: a unidade de exemplo do LOINC
(`EXAMPLE_UCUM_UNITS`) não é a unidade que o laboratório brasileiro usa. Isso
não é defeito do extrato — é exatamente o motivo de a D17 existir e de a unidade
canônica ser **coluna nossa**, acrescentada ao lado, nunca sobrescrevendo a do
LOINC (cláusula 2 da licença).

## 1. Vitamina A — `2923-1`, exemplo em `ug/mL`

Laboratório brasileiro reporta retinol em **`µg/dL`**. É fator de 100 entre as
duas. A conversão é escala pura e o `unitConverter` dá conta, mas a unidade
canônica precisa ser `µg/dL` e não a do exemplo.

**Ação:** `canonicalUnit = 'ug/dL'` no catálogo da Tarefa 3.

## 2. Vitamina E — `1823-4`, exemplo em `mg/L;mg/dL`

O próprio LOINC lista duas unidades de exemplo separadas por ponto e vírgula, o
que é sinal de que não há convenção firme. Laboratório brasileiro usa `mg/L`.

Vale registrar que este código **mudou durante a montagem do extrato**. A
primeira passagem tinha pego `47791-9`, `Tocopherols [Mass/volume]` — tocoferóis
**totais**, ranqueamento 4937. A massa molar de `conversao-unidades.md` (430,71)
é a do **alfa**-tocoferol, e é o alfa que o laudo brasileiro reporta. O código
certo é `1823-4`, `Alpha tocopherol`, ranqueamento 970, que em português o
próprio LOINC chama de "Alfa tocoferol".

Erro de mapeamento silencioso, pego por conferir a massa molar contra o nome do
componente. É o tipo de coisa que passaria na revisão e apareceria meses depois.

**Ação:** `canonicalUnit = 'mg/L'`. O código já está certo no extrato.

## 3. Proteína C reativa — duas linhas, e é de propósito

`1988-5` é a PCR convencional; `30522-7` é a ultrassensível, distinguida no LOINC
pelo método (`High sensitivity`). As duas têm a mesma grandeza e a mesma unidade
de exemplo (`mg/L`), e **faixa de referência e emprego clínico diferentes**.

É a única linha do extrato que sai de um alvo com método específico, e a razão
está no gerador: o laudo brasileiro **escreve por extenso** qual das duas é. Onde
o laudo nomeia o método, mapear para o termo neutro perderia informação.

**Ação:** confirmar contra laudo real que a distinção aparece em texto de forma
reconhecível. Se não aparecer, a ultrassensível sai e fica só a convencional.

## 4. Albumina urinária — `1754-1`, exemplo em `g/dL`

Aqui a divergência é maior que unidade. O rótulo do projeto era
"microalbuminúria"; o código é `Albumin [Mass/volume] in Urine`, genérico, e o
exemplo em `g/dL` não é como nenhum laboratório brasileiro reporta — eles usam
`mg/L` ou `mg/24h`.

A microalbuminúria brasileira tem três apresentações que não são a mesma medida:
concentração em amostra isolada, excreção em 24 horas, e relação
albumina/creatinina. **`mg/24h` não é concentração** — é massa por tempo, e não
converte para `mg/L` sem o volume urinário.

Por isso o rótulo do projeto foi trocado de "Microalbuminuria" para **"Albumina
urinária"**: honesto sobre o que o código é.

**Ação:** decidir quais das três apresentações entram, e buscar o código de cada
uma. Enquanto não decidir, esta linha cobre só a concentração em amostra
isolada. É a pendência mais substantiva das cinco.

## 5. Taxa de filtração glomerular — fora do extrato

A `cobertura-analitos.md` lista a TFG estimada; o extrato não a tem. Não foi
esquecimento: ela é **valor calculado, não medido**, e o LOINC tem um código por
equação de cálculo. Os mais usados, todos em `mL/min/{1.73_m2}`:

| Código | Ranqueamento |
|---|---|
| `48643-1` | 48 |
| `48642-3` | 50 |
| `77147-7` | 146 |
| `62238-1` | 239 |

Escolher exige saber qual equação o laboratório usou, e o laudo brasileiro nem
sempre diz. Mapear para a equação errada produz um número que parece certo e não
é — o mesmo modo de falha que o projeto inteiro tenta evitar.

**Ação:** decidir se a TFG entra como analito comparável ou se fica no texto
extraído, como cultura e sorologia. Recomendação: **ficar de fora por ora**, e
entrar quando houver laudo real mostrando se a equação é informada.

## Resumo das ações

| # | Analito | Ação | Trava a Tarefa 3? |
|---|---|---|---|
| 1 | Vitamina A | unidade canônica `µg/dL` | não |
| 2 | Vitamina E | unidade canônica `mg/L` | não |
| 3 | PCR | confirmar a distinção em laudo real | não |
| 4 | Albumina urinária | decidir as apresentações | não |
| 5 | TFG estimada | decidir se entra | não |

---

## Decididas em 2026-09-22 (Bloco 10, Decisão I)

As cinco acima e as oito da seção 6 de `cobertura-brasileira-lacunas.md`,
numeradas na sequência (S1–S8). O estudo de cada uma está em
`specs/08-ia-fechamento/fechamento-funcional/spec.md`, §5.4.

| # | Pendência | Decisão |
|---|---|---|
| 1 | Vitamina A em `µg/dL` | **fechada** — já estava em `UNIDADE_CANONICA` do gerador do catálogo |
| 2 | Vitamina E em `mg/L` | **fechada** — idem |
| 3 | PCR convencional × ultrassensível | **mantidas as duas**; a confirmação contra papel continua sendo da T14 (o laudo do Delboni não tem PCR) |
| 4 | Albumina urinária: três apresentações | **as três entraram**, cada uma com código próprio, depois que o gerador ganhou o eixo do tempo: concentração (`Pt`), 24 horas (`24H`, `MRat`) e relação com a creatinina (`MRto`) |
| 5 | TFG estimada | **fica fora do catálogo** e vive como código local (D32). O único laudo real a escreve como `*eGFR`, com a equação num rodapé |
| S1 | Atividade de protrombina em `%` | **achado no release**: `Prothrombin.activity actual/normal`, em plasma pobre em plaquetas. Entrou |
| S2 | Relação TTPA paciente/controle | **sem termo quantitativo inequívoco** no 2.83; fica em código local |
| S3 | Troponina ultrassensível | **fora** — é exame de pronto-socorro, não de acompanhamento |
| S4 | Sedimento urinário | **por volume entra, por campo não**: contagem por campo depende do microscópio e não compara entre laboratórios |
| S5 | Frações da eletroforese | **as duas**, `g/dL` e `%`, como no diferencial de leucócitos |
| S6 | "O canônico é em massa" | **frase reescrita** em `cobertura-analitos.md`: o canônico é a convenção brasileira (D17) |
| S7 | Anti-HBs quantitativo | **fora** — comparabilidade entre ensaios discutível |
| S8 | Painel `Inflamacao` com PSA | **PSA foi para `Tumoral`** junto dos cinco marcadores novos |

## 7. O que a conferência contra o release corrigiu no estudo

Cada tripla nova foi consultada no `Loinc.csv` **antes** de ser escrita no
gerador. Seis delas estavam erradas no estudo, e quatro dos seis erros teriam
falhado em silêncio — não com `SEM CANDIDATO`, mas casando outro termo:

1. **Reticulócitos (%)** é `Reticulocytes/Erythrocytes`, e não
   `Reticulocytes/100 erythrocytes`. Esse falharia alto.
2. **TP, TTPA e INR** têm, no 2.83, o **mesmo componente** — `Coagulation` — em
   plasma pobre em plaquetas. O que os separa é a propriedade (`Time` ×
   `RelTime`) e o **método** (via extrínseca × intrínseca). Foram para
   `ALVOS_COM_METODO`; sem o método, TP e TTPA cairiam no mesmo código.
3. **Densidade urinária** é `Observation` / `Urine` / `SpGrav` — a armadilha do
   VCM outra vez, prevista pelo estudo e confirmada.
4. **1,25-di-hidroxivitamina D** é `1,25-Dihydroxyvitamin D`, a **soma** D2+D3.
   O estudo propunha `Calcitriol`, que no 2.83 é **só a D3**. Casaria um termo
   real — e seria a armadilha da D36 um andar acima.
5. **Lipoproteína (a)** é `Lipoprotein (little a)`. O perigo aqui é o vizinho:
   `Lipoprotein.alpha` existe, é a **alfa-lipoproteína** (a fração do HDL), e um
   alvo escrito às pressas casaria com ela. O comentário no gerador fica para o
   próximo que mexer.
6. **Di-hidrotestosterona** é `Androstanolone` no 2.83.

E duas escolhas que o gerador fez por ranqueamento, porque não havia termo
neutro de método, e que merecem olhada humana na T14:

- **LDH**: os dois termos têm método de reação (piruvato→lactato e o inverso);
  o de menor ranqueamento foi o escolhido. O laudo brasileiro raramente diz qual.
- **Eletroforese**: o termo neutro de método das frações existe, mas em `mg/L` e
  sem ranqueamento — não é o exame que o laudo reporta. Foi escolhido o termo
  por eletroforese, em `g/dL`, que é o que o laudo nomeia.

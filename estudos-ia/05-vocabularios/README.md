# 05-vocabularios — LOINC e UCUM dentro do repositório

Casa dos vocabulários clínicos que a IA de leitura de exames usa como identidade
de analito e como sintaxe de unidade. Entrou no repositório em **2026-09-16**,
depois que as duas licenças foram lidas por inteiro — ver `licencas.md`.

## Versões

| | Versão | Origem |
|---|---|---|
| LOINC | **2.83**, licença 5.8 | release oficial completo, baixado de loinc.org |
| UCUM | licença 1.1 (junho de 2024) | repositório oficial `ucum-org/ucum` |

## O que tem aqui

```
05-vocabularios/
├── README.md                    ← este arquivo
├── licencas.md                  o estudo das duas licenças (tarefa 0.2a)
├── pendencias.md                os 5 analitos que precisam de decisão humana
├── loinc/
│   ├── loinc-analitos-suasaude.csv   o extrato: 154 linhas, 24 colunas
│   ├── gerar-extrato.py              o script que o produziu, reproduzível
│   ├── como-foi-gerado.md            o critério de escolha de cada código
│   ├── LoincLicense_5.8.txt          licença completa (cláusula 9)
│   └── LOINC_short_license.txt       aviso obrigatório (cláusula 10.1)
└── ucum/
    ├── ucum-essence.xml              a obra INTEIRA, sem uma alteração
    ├── LICENSE.md                    licença UCUM
    └── aviso.md                      atribuição exigida pela seção 3.b
```

## Por que o LOINC entra recortado e o UCUM entra inteiro

Não é escolha de gosto: as duas licenças dizem coisas opostas. A do LOINC
autoriza apagar registros para atender a requisito local; a do UCUM proíbe
"add, delete, or modify the Work's content". Detalhe em `licencas.md`.

## O extrato do LOINC

154 linhas, uma por analito da cobertura definida em
`../03-esquemas/cobertura-analitos.md`. Cada linha carrega:

- **o código e quatro nomes oficiais** — `LONG_COMMON_NAME`, `SHORTNAME`,
  `DisplayName` e os seis eixos do nome completamente especificado. A cláusula
  10.3 da licença exige que todo dado extraído ande junto do código e de um nome
  oficial;
- **a unidade de exemplo em UCUM**, como o LOINC a escreve;
- **o ranqueamento de uso** (`COMMON_TEST_RANK`, 1 = exame mais comum), que foi o
  critério de desempate quando havia mais de um código plausível;
- **o nome em português**, da variante linguística pt-BR do próprio release.

> **Era 78 até 2026-09-18, e o número estava errado.** A origem é rastreável no
> gerador: `ALVOS` tem 78 tuplas e `ALVOS_COM_METODO` tem 1 — a PCR
> ultrassensível, acrescentada depois porque o laudo brasileiro escreve por
> extenso qual das duas PCR é. Quem escreveu este arquivo contou a primeira
> lista e não a segunda. `como-foi-gerado.md` e `cobertura-analitos.md` já
> diziam 79; só este aqui ficou para trás. Conferido contando o CSV, e os 79
> têm nome em pt-BR — a afirmação da seção sobre o pt-BR continua verdadeira.
>
> **Passou de 79 para 154 em 2026-09-22 (Bloco 10)**, com a ampliação do estudo
> `cobertura-brasileira-lacunas.md`. A contagem aparece em três arquivos — este,
> `loinc/como-foi-gerado.md` e `../03-esquemas/cobertura-analitos.md` — e foi o
> descasamento entre eles que produziu o erro acima; os três foram atualizados
> juntos.

### O pt-BR resolve um problema que o plano ia resolver errado

O plano previa uma coluna `synonyms` que nós preencheríamos com as variações que
o laboratório brasileiro escreve. Duas razões para isso ter sido abandonado:

1. **Licença.** Escrever nomes em português para termos LOINC anda perto demais
   de tradução, e tradução é obra derivada que exige aviso prévio ao Regenstrief
   e cessão de direitos (cláusula 12).
2. **Não é preciso.** O release traz `ptBR11LinguisticVariant.csv`, com 58.468
   termos traduzidos. **Os 154 analitos da nossa cobertura estão todos lá** (conferido pelo gerador,
   que avisa `SEM pt-BR` — a geração de 2026-09-22 terminou sem aviso nenhum).
   "Glicose", "Hemoglobina", "Tirotropina", "Ascorbato", "Cobalaminas",
   "25-Hidroxi vitamina D" — tudo oficial.

A coluna `ptBR_RELATEDNAMES2` é a mais valiosa das três: é a lista de nomes
relacionados do próprio LOINC, em português. É ela que alimenta a busca por
semelhança entre o texto do laudo e o código, sem que precisemos escrever
sinônimo nenhum.

### Uma armadilha confirmada na prática

O plano técnico usava `14635-7` como exemplo do código da vitamina D, escrito de
memória. Conferido contra o arquivo oficial, **ele está errado por dois
motivos**: é a 25-OH-**D3 sozinha**, não a soma D3+D2 que o laboratório
brasileiro reporta, e é a variante `[Moles/volume]` em `nmol/L`, que contraria a
D17 (canônico é a unidade convencional brasileira).

O código certo é **`62292-8`** — `25-Hydroxyvitamin D3+25-Hydroxyvitamin D2
[Mass/volume]`, em `ng/mL`.

É exatamente a armadilha que a `cobertura-analitos.md` descreveu por escrito
("a vitamina D é o caso mais confuso do vocabulário") e a razão da regra
"nenhum código LOINC digitado à mão". A regra estava certa; quem a quebrou fui
eu, ao escrever um exemplo. O erro sobreviveu a uma revisão inteira sem ser
notado, porque `14635-7` **é** um código LOINC válido e ativo de vitamina D —
só não é o nosso.

## Como o extrato se regenera

O script `loinc/gerar-extrato.py` produz o CSV a partir do release oficial. Ele
não depende de rede e não contém nenhum código LOINC escrito à mão: cada linha
sai de uma busca por `(COMPONENT, SYSTEM, PROPERTY)`, com desempate por método
neutro e depois por ranqueamento de uso.

Os arquivos de origem (`Loinc.csv`, 84 MB, e o pt-BR, 19 MB) **não** entram no
repositório — são grandes e a licença não pede que entrem. O script diz onde
esperá-los.

## O que ainda depende de decisão humana

Cinco analitos onde o código oficial e a prática brasileira divergem, em
`pendencias.md`. Nenhum deles bloqueia a Tarefa 3; todos precisam de olhada antes
da verificação contra laudo real (Tarefa 14).

---

This material contains content from LOINC (http://loinc.org). LOINC is copyright
© 1995-2024, Regenstrief Institute, Inc. and the Logical Observation Identifiers
Names and Codes (LOINC) Committee and is available at no cost under the license
at http://loinc.org/license. LOINC® is a registered United States trademark of
Regenstrief Institute, Inc.

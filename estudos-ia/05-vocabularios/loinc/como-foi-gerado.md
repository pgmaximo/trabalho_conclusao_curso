# Como o extrato foi gerado

`loinc-analitos-suasaude.csv` — 79 linhas, 24 colunas, LOINC 2.83.

## A regra que este arquivo existe para sustentar

**Nenhum código LOINC é digitado à mão, em lugar nenhum do projeto.** Um dígito
trocado corrompe silenciosamente o eixo da comparação, e o erro só aparece meses
depois, quando dois exames do mesmo analito não se encontram.

Por isso o extrato é produzido por script, e o script está aqui do lado:
`gerar-extrato.py`. Ele não contém um único código LOINC. O que ele contém é uma
tabela de **critérios de busca** — 79 linhas de `(COMPONENT, SYSTEM, PROPERTY)` —
e o LOINC responde qual código atende cada uma.

## Como cada código é escolhido

O gerador filtra o arquivo oficial por três condições fixas:

- `STATUS = ACTIVE` — termo vigente;
- `CLASSTYPE = 1` — laboratório, não sinal vital nem documento;
- `SCALE_TYP = Qn` — escala quantitativa, ou seja, tem número. Exame qualitativo
  fica fora por construção, que é o que a `cobertura-analitos.md` decidiu.

Sobram cerca de 33 mil termos. Para cada alvo, casa `COMPONENT`, `SYSTEM` e
`PROPERTY`, e desempata em duas etapas:

**1. Método vazio tem preferência.** O laudo brasileiro nem sempre informa o
método do ensaio. Escolher um termo específico de método faria um laudo
silencioso mapear para um código que afirma algo que o papel não disse.

**2. Depois, o menor `COMMON_TEST_RANK`.** É o ranqueamento de uso do próprio
LOINC, em que 1 é o exame mais comum. Termo sem ranqueamento vai para o fim.

Uma exceção, e ela é deliberada: a PCR ultrassensível. Ver `../pendencias.md`.

## O que o `PROPERTY` resolve e o nome do componente não

Descoberta da montagem que vale registrar: nos índices do hemograma, o LOINC
guarda a informação distintiva no `PROPERTY` e no `SYSTEM`, **não** no nome do
componente. Buscar por nome não acha nada:

| Analito | `COMPONENT` | `PROPERTY` | `SYSTEM` |
|---|---|---|---|
| VCM | `Observation` | `EntMeanVol` | `RBC` |
| HCM | `Hemoglobin` | `EntMass` | `RBC` |
| CHCM | `Hemoglobin` | `EntMCnc` | `RBC` |
| RDW | `Erythrocyte` | `DistWidth` | `Bld` |
| Hematócrito | `Erythrocyte/Blood` | `VFr` | `Bld` |
| VHS | `Erythrocyte` | `Sedimentation Rate` | `Bld` |

Três analitos diferentes compartilham o componente `Hemoglobin`, e o que os
separa é a propriedade. Uma busca textual por "mean corpuscular volume" devolve
zero resultados — o componente do VCM é literalmente `Observation`.

## Verificações que o script faz sozinho

- **Direito de terceiro** (cláusula 10.2 da licença): qualquer termo com
  `EXTERNAL_COPYRIGHT_NOTICE` preenchido derruba a geração com `assert`. Nenhum
  dos 79 tem.
- **Código repetido**: dois alvos caindo no mesmo código viram aviso. Dois
  rótulos diferentes apontando para um código só significa que um dos dois
  critérios está frouxo.
- **Cobertura pt-BR**: alvo sem tradução vira aviso. Os 79 têm.
- **Alvo sem candidato**: vira aviso em vez de linha faltando em silêncio.

A geração atual passa sem nenhum aviso.

## As colunas

| Grupo | Colunas | Origem |
|---|---|---|
| Nosso | `painel`, `rotulo_projeto` | campos novos, permitidos pela cláusula 2 |
| Identidade | `LOINC_NUM` | LOINC Table |
| Nomes oficiais | `LONG_COMMON_NAME`, `SHORTNAME`, `DisplayName` | exigidos pela cláusula 10.3 |
| Nome completamente especificado | `COMPONENT`, `PROPERTY`, `TIME_ASPCT`, `SYSTEM`, `SCALE_TYP`, `METHOD_TYP` | os seis eixos |
| Procedência | `CLASS`, `STATUS`, `COMMON_TEST_RANK` | cláusula 10.5 |
| Unidade | `EXAMPLE_UCUM_UNITS` | **de exemplo**, não normativa |
| Português | `ptBR_*` (8 colunas) | variante linguística pt-BR do release |

**Nada do LOINC foi alterado.** A unidade canônica brasileira e a massa molar
não estão neste arquivo de propósito: elas são decisão nossa, moram no catálogo
da Tarefa 3, e entram como campos novos ao lado — nunca por cima de
`EXAMPLE_UCUM_UNITS`.

## As oito colunas em português

`ptBR_COMPONENT` é o nome do analito: "Glicose", "Hemoglobina", "Tirotropina",
"Ascorbato", "Cobalaminas", "Alfa tocoferol", "25-Hidroxi vitamina D".

`ptBR_RELATEDNAMES2` é a mais útil das oito — a lista de nomes relacionados do
próprio LOINC, em português. É ela que alimenta a busca por semelhança entre o
texto do laudo e o código candidato, e é por causa dela que **não precisamos
escrever sinônimo nenhum** (o que, além de trabalhoso, esbarraria na cláusula 12
da licença, que trata tradução como obra derivada).

Seis das colunas pt-BR reproduzem os eixos do nome em português. Elas estão aqui
porque a cláusula 10.6 exige que material de Group 3 leve junto os campos
necessários para preservar o sentido e as relações entre registros.

---

This material contains content from LOINC (http://loinc.org). LOINC is copyright
© 1995-2024, Regenstrief Institute, Inc. and the Logical Observation Identifiers
Names and Codes (LOINC) Committee and is available at no cost under the license
at http://loinc.org/license. LOINC® is a registered United States trademark of
Regenstrief Institute, Inc.

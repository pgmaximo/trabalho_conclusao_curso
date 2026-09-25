# Dá para confiar no modelo lendo o documento sozinho? (estudo, 2026-09-17)

Pergunta do usuário depois que a Tarefa 1 mostrou que o Bedrock lê PDF nativo:
**"O modelo lê sozinho o PDF e imagens, mas é possível confiar 100% na
capacidade dele?"**

Resposta curta: **não, e a medição diz exatamente onde ele falha.** Ele não
erra número. Ele erra *cobertura* e *rótulo*.

## Como foi medido

Quatro execuções da mesma chamada, mesmo documento, `temperature: 0`, mesmo
prompt, mesmo modelo (`us.anthropic.claude-sonnet-4-6`). Documento: laudo real
do Delboni/DASA de 04/10/2025, 19 exames, PDF digital de 836 KB.

Temperatura zero não é determinismo garantido em nenhum modelo servido — é o
menor grau de aleatoriedade disponível. Medir quatro vezes é medir isso.

## O que saiu

| Execução | Analitos transcritos |
|---|---|
| 1 | 47 |
| 2 | 47 |
| 3 | **42** |
| 4 | 47 |

- União das quatro: **54 linhas distintas**
- Presentes nas quatro: **40**
- Instáveis: **14**

### O que NÃO variou: nenhum número

Este é o achado mais importante, e é o tranquilizador. **Nenhum valor foi lido
errado em nenhuma execução.** Neutrófilos foi `3.515 /µL` nas quatro; TGO foi
`16 U/L` nas três em que apareceu; a vírgula decimal e o ponto de milhar
vieram intactos sempre. Conferidos contra a tela do próprio laboratório:
Eritrócitos 5,19 · Hemoglobina 16,1 g/dL · Hematócrito 47,0 % · Ferritina
81,3 ng/mL — todos certos, em todas as execuções.

**Não houve alucinação.** Nenhuma execução inventou um analito que não está no
papel. As 54 linhas da união são todas reais.

### O que variou, e são duas coisas diferentes

**1. Omissão (a grave).** A execução 3 simplesmente não transcreveu os cinco
percentuais do diferencial de leucócitos — neutrófilos, eosinófilos, basófilos,
linfócitos e monócitos em `%`. Eles estão no laudo. Duas execuções os trouxeram,
uma não. TGO e TGP sumiram numa execução pela mesma razão.

Uma omissão é **silenciosa**: nada no resultado diz "faltou alguma coisa". Se
aquela execução fosse a única, o histórico do usuário simplesmente não teria
aqueles cinco valores, e ninguém saberia.

**2. Rótulo instável (a sutil, e a mais perigosa).** A execução 2 escreveu
`Neutrófilos %`; as execuções 1 e 4 escreveram `Neutrófilos` — para o **mesmo
valor** `63,9 %`. E as quatro execuções escreveram `Neutrófilos` também para
`3.515 /µL`.

Ou seja: **o mesmo rótulo, `Neutrófilos`, foi usado para dois analitos
diferentes** — a contagem absoluta e o percentual. São de fato dois analitos,
com dois códigos LOINC distintos no nosso catálogo:

| | Código | Unidade |
|---|---|---|
| Neutrófilos (absoluto) | `26499-4` | `10*3/uL` |
| Neutrófilos (%) | `26511-6` | `%` |

O mesmo vale para linfócitos, monócitos, eosinófilos e basófilos.

## A consequência de arquitetura, e ela é a D22 de novo

Se o modelo mapear os dois para o **mesmo** código LOINC — o que o rótulo
ambíguo convida a fazer — o id determinístico da Tarefa 6 colide:

```
documento + soma do arquivo + codigo do analito + momento da coleta
```

Nenhum dos quatro componentes distingue `63,9 %` de `3.515 /µL`. E a gravação é
com `UpdateCommand`, que **sobrescreve sem levantar erro**. Restaria uma linha,
e a outra sumiria calada — exatamente o modo de falha que a D22 existe para
fechar, reaparecendo por outra porta.

**A correção não é mudar o id.** É detectar a condição: duas linhas do mesmo
documento, com o mesmo `analyteCode` e o mesmo `collectionMoment`, mas unidades
incompatíveis, significam que o modelo mapeou dois analitos para um código só.
Isso é detectável e determinístico, e vira erro de extração — não gravação.

## O que isto decide

**O modelo é bom transcritor e mau inventariante.** Ele copia número com
fidelidade e não alucina; ele não garante que olhou o documento inteiro.

Três consequências para a pipeline:

1. **A leitura por modelo fica**, porque a qualidade do número é o que mais
   importa e ela é alta. O que não fica é a suposição de completude.
2. **Reprocessar é barato e corrige omissão.** O id determinístico da Tarefa 6
   faz a segunda passagem *somar* as linhas que faltaram em vez de duplicar o
   que já existe. Isso deixa de ser só uma proteção contra reenvio e passa a ser
   o remédio para a instabilidade de cobertura.
3. **A tela precisa dizer quantas linhas vieram**, e oferecer reprocessar. Uma
   contagem visível é o que transforma omissão silenciosa em omissão percebida.
   É a mesma lógica da revisão por confiança baixa: o sistema não esconde o que
   não tem certeza.

## E o Textract, que seria a fonte independente?

A ideia natural seria cruzar a leitura do modelo com o texto do Textract e
acusar divergência. **Não foi possível medir:** a chamada devolveu
`SubscriptionRequiredException: The AWS Access Key Id needs a subscription for
the service`. É recusa no nível da conta, não de permissão de IAM — a mesma
conta invoca o Bedrock sem problema.

Então o cruzamento com uma segunda fonte fica **registrado como não medido**, e
não como descartado. Se o Textract for habilitado na conta, o experimento vale
a pena: ele mediria se o texto bruto contém analito que o modelo não trouxe, que
é precisamente o defeito que esta medição encontrou.

## O que continua sem resposta

- **Foto e documento escaneado não foram medidos.** Este estudo usou PDF
  digital. A leitura de imagem pelo modelo é plausível pela mesma via, e não
  está provada aqui.
- **Um documento só.** Quatro execuções sobre um laudo medem estabilidade, não
  cobertura de formatos. A Tarefa 14 é onde três a cinco laudos diferentes
  entram.

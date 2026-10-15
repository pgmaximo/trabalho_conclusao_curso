# Formato uniforme de analitos

O pedido que origina este documento: "caso o usuário tenha enviado um documento
bem espaçado e eu hoje precise de informações de vitamina C, precisa ser salvo
da mesma forma, com o mesmo estilo de dados, para a gente conseguir fazer a
comparação do mês passado com esse mês".

Traduzindo para requisito: **dois exames do mesmo analito, vindos de
laboratórios diferentes, com layout diferente e unidade diferente, precisam
virar duas linhas comparáveis entre si.**

Esse é o documento mais importante da Frente 1. Ele precisa estar acordado
antes da primeira gravação, porque corrigir esquema depois significa migrar
dado de saúde já persistido.

**Não confundir com o `monthly` do wearable.** A feature do Arturo já produz
média mensal de passos, sono e batimento, mas nenhuma das 29 métricas dela é
analito de exame. A comparação mês a mês de vitamina C, cálcio e hemoglobina
depende inteiramente deste documento e da pipeline que ele descreve — ela não
existe em nenhum lugar do projeto hoje.

Uma diferença de natureza que o esquema precisa respeitar: wearable tem medida
quase todo dia, exame tem medida esparsa. Duas coletas no ano já são uma série,
e comparar duas delas exige saber que vieram de laboratórios possivelmente
diferentes, com faixas de referência e unidades diferentes. É por isso que a
faixa do laboratório e o valor bruto ficam guardados por linha.

## A forma proposta de uma linha

Uma linha por analito por documento. Nunca uma linha por documento com vários
analitos dentro — isso impede consulta por analito, que é o caso de uso.

| Campo | Tipo | Obrigatório | Papel |
|---|---|---|---|
| `analyteCode` | texto | sim | código LOINC — o eixo da comparação |
| `analyteLabel` | texto | sim | como o laboratório escreveu, preservado |
| `value` | número | sim | valor convertido para a unidade canônica |
| `valueQualifier` | texto | não | `<` ou `>` quando o laudo reporta limite de detecção (D21) |
| `unit` | texto | sim | unidade canônica do analito |
| `rawValue` | texto | sim | o que estava escrito no documento, sem tratamento, com o sinal |
| `rawUnit` | texto | não | unidade como estava escrita |
| `referenceLow` | número | não | limite inferior da faixa do laboratório |
| `referenceHigh` | número | não | limite superior da faixa do laboratório |
| `collectedAt` | data | sim | data da coleta, não a do upload; reserva na data do formulário (D24) |
| `collectionMoment` | texto | não | rótulo do momento, como o laudo escreveu: "jejum", "120 minutos", "manhã" (D22) |
| `documentId` | texto | sim | liga à linha de `MedicalDocument`, para rastrear a origem |
| `sourcePage` | número | não | página do documento onde o valor foi lido |
| `confidence` | número | sim | confiança da extração, entre 0 e 1 |
| `reviewStatus` | texto | sim | `auto`, `pendente-de-revisao` ou `confirmado-pelo-usuario` |

### Por que `valueQualifier` existe (D21)

Laudo brasileiro reporta rotineiramente `<0,01` para TSH ultrassensível, `<0,003`
para PSA, `<1,20` para beta-HCG e `>1000` para D-dímero. Sem um lugar para o
sinal, o modelo seria obrigado a emitir `0,01`, e a série entre coletas ganharia
um ponto que nunca foi medido.

`value` guarda o limite informado; `valueQualifier` guarda o sinal; `rawValue`
guarda o texto como estava no papel. **Linha com qualificador preenchido não
participa da comparação entre coletas** — ela aparece como limite de detecção,
nunca como medida.

### Por que `collectionMoment` existe (D22)

Um documento pode trazer o mesmo analito mais de uma vez: curva glicêmica com
glicose em jejum, 60 e 120 minutos; cortisol de manhã e de tarde. Sem um
discriminador, o id determinístico colide e a gravação com `UpdateCommand`
sobrescreve **sem levantar erro** — restaria uma linha só, e as outras sumiriam
caladas.

Ganho além de resolver a colisão: a curva passa a ser comparável ponto a ponto
entre coletas — o jejum de março contra o jejum de setembro, não uma média
contra outra.

### Por que `rawValue` e `rawUnit` continuam guardados

Rastreabilidade. Quando o usuário perguntar "de onde saiu esse 32", a resposta
precisa ser o que estava escrito no papel, não o que a conversão produziu. É
também o que permite reprocessar tudo se a tabela de conversão tiver erro, sem
precisar do OCR de novo.

### Por que `confidence` e `reviewStatus` existem desde a primeira versão

Extração por modelo de linguagem erra. Gravar um valor errado num histórico de
saúde sem sinalização é o modo de falha mais grave deste projeto. Abaixo de um
limiar a definir, a linha entra como `pendente-de-revisao` e a IA de
comunicação a trata como incerta ao responder.

## As duas normalizações, agora em modo completo

Decisão do usuário em 2026-09-15 (D16): normalização completa desde o começo,
apoiada em vocabulário clínico existente, e não numa tabela artesanal pequena.

### Identidade do analito — LOINC

O mesmo exame aparece com nomes diferentes: "Vitamina D", "25-OH-Vitamina D",
"25-hidroxivitamina D" e "Calcidiol" são a mesma medida. Sem um código comum, a
comparação entre meses simplesmente não encontra o par.

O vocabulário é o LOINC. O que o levantamento apurou:

- As antigas listas "Top 2000+" foram substituídas por um ranqueamento dos 20
  mil códigos mais usados, do qual se extraem os mais frequentes. É desse
  recorte que sai a nossa cobertura — cobertura ampla sem carregar o vocabulário
  inteiro.
- Cada linha traz o código, o nome, e **unidades de exemplo em UCUM**.
- **LOINC e UCUM são gratuitos, mas licenciados** pelo Regenstrief Institute. O
  TCC precisa aceitar a licença e citá-la, e o repositório precisa respeitar as
  condições de redistribuição. Item de checagem antes de versionar qualquer
  extrato no repositório.

**O que o LOINC não resolve, e é o nosso trabalho:** laudo de laboratório
brasileiro não vem com código LOINC. Ele vem com texto em português. O
mapeamento "25-OH-Vitamina D" → código LOINC é tarefa nossa, e é justamente o
tipo de coisa que o modelo faz bem: apresentamos uma lista curta de candidatos e
ele escolhe, com confiança declarada. Escolha de baixa confiança cai na revisão
pelo usuário da tarefa 1.5.

### Unidade — UCUM, mais uma tabela que o UCUM não dá

O UCUM padroniza como a unidade é **escrita**, e o LOINC diz qual unidade é
esperada para cada exame. Nenhum dos dois converte `ng/mL` em `nmol/L`.

Essa conversão depende da massa molar do analito, que é informação química, não
terminológica. Então a cobertura ampla exige uma terceira tabela, nossa: por
analito, a unidade canônica e o fator para as unidades alternativas que
aparecem na prática.

Essa é a parte que efetivamente escala com a cobertura, e é o item mais longo do
projeto. Vale separar dois casos:

- **Conversão de escala pura** (`g/dL` ↔ `mg/dL`, `mL` ↔ `L`): mecânica, o UCUM
  basta, vale para qualquer analito.
- **Conversão massa ↔ molar** (`ng/mL` ↔ `nmol/L`, `mg/dL` ↔ `mmol/L`): precisa
  da massa molar, uma linha por analito, sem atalho.

Regra que não muda: unidade desconhecida não é convertida no chute. A linha
entra como `pendente-de-revisao`.

### O número em si — vírgula decimal (D23)

Antes da conversão de unidade há uma conversão mais banal e mais perigosa: texto
para número. O laudo brasileiro escreve `32,5` e `1.234,56`. Em JavaScript,
`Number('32,5')` devolve `NaN` e `parseFloat('32,5')` devolve **32**, perdendo a
casa decimal sem levantar erro; `parseFloat('1.234,56')` devolve **1.234**.

Todo número vindo do documento — `value`, `referenceLow` e `referenceHigh`
igualmente — passa por uma função própria com teste, que trata vírgula decimal,
ponto de milhar, sinal de censura e espaço. `parseFloat` e `Number` sobre texto
do documento estão proibidos, e isso vira teste.

## O que este formato deliberadamente não faz

Não interpreta. Não classifica um valor como bom ou ruim, não marca alterado,
não calcula risco. Ele guarda o número, a faixa que o laboratório informou e a
origem. Qualquer leitura sobre o que isso significa pertence à conversa, com
encaminhamento a um profissional de saúde — nunca ao esquema de dado.

## Pendências antes de fechar

- [x] Aceitar a licença do LOINC/UCUM e verificar as condições de
      redistribuição — **encerrado em 2026-09-16**, `../05-vocabularios/licencas.md`
- [x] Recorte de cobertura — proposta em `cobertura-analitos.md`
- [x] Conversão de unidade — proposta em `conversao-unidades.md`
- [ ] Como a lista curta de candidatos LOINC chega ao modelo sem estourar o
      prompt — busca por semelhança antes da chamada, provavelmente. **Ficou mais
      fácil:** a coluna `ptBR_RELATEDNAMES2` do extrato traz os nomes
      relacionados em português, do próprio LOINC, e é sobre ela que a busca roda.
- [ ] Limiar de confiança que envia a linha para revisão
- [x] Regra de idempotência: documento + soma do arquivo + código do analito +
      `collectionMoment` (D22). Reenviar o mesmo PDF não duplica, e o mesmo
      analito medido em dois momentos não colide.
- [x] Valor censurado: `valueQualifier`, fora da comparação (D21)
- [x] Vírgula decimal: função de conversão própria, `parseFloat` proibido (D23)
- [x] Data de coleta: por linha, com reserva na data do formulário (D24)
- [x] Exames sem valor numérico (cultura, laudo descritivo): **não entram
      nesta tabela.** Ficam no texto extraído do documento, que a Fase 1 já
      guarda — o chat fala sobre eles, mas eles não ganham linha comparável
      entre meses. Ver `cobertura-analitos.md`.

## Fontes

- [LOINC License](https://loinc.org/kb/license)
- [Most frequently used LOINC codes](https://loinc.org/usage/obs/)
- [LOINC Mapper's Guide to Top 2000++ US Lab Tests](https://lhncbc.nlm.nih.gov/assets/legacy/files/LOINC_1.6_Top2000CommonLabResultsUS.pdf)
- [Common UCUM units](https://ucum.org/docs/common-units)

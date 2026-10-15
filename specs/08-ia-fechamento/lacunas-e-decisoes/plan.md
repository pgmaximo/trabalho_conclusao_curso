# PLANO: Fechamento do sistema de IA (Bloco 9)

O `spec.md` diz **o que** e **por quê**. Este arquivo diz **como**, e onde estão
as armadilhas. Ele é hipótese até alguém executá-lo — a seção final do
`tasks.md` existe para registrar o que ele errar.

## Princípio de ordenação

**Do mais barato e mais certo para o mais caro e mais discutível.** Os dois
primeiros blocos conserta o que já tem lugar no esquema; o terceiro abre o campo
novo; os dois últimos dependem de decisão sua e não começam antes dela.

Nenhum bloco depende do seguinte. Se a execução parar no meio, o que ficou
pronto vale sozinho.

---

## Bloco 1 — Limite único (F3)

**O mais barato da EPIC: duas frases de prompt.**

### A mudança

Em `extractionPrompt.ts`, na seção `REGRAS DO LAUDO`, depois da regra que já
manda transcrever os limites:

- quando o laudo der **só um lado** ("Superior a 40 mg/dL", "Até 200 mg/dL",
  "Inferior a 150"), preencher **apenas o limite correspondente** e deixar o
  outro vazio;
- vazio nos dois é para quando o laudo **não** trouxer faixa — e não para quando
  trouxer de um jeito diferente do esperado.

### O que já existe e não precisa ser tocado

- `estaAusente()` em `analyteNormalizer.ts` já distingue ausente de ilegível, e
  a linha com um lado só **não** vai para revisão.
- `formatarFaixa()` em `src/utils/decimalDisplay.ts` já escreve "acima de 40" e
  "até 90". Há teste.
- A banda do gráfico já aceita um lado só (`referenceLow !== null || referenceHigh !== null`).

### Armadilha

O `*eGFR` vem com asterisco no rótulo e unidade composta (`mL/min/1,73m²`). Ele
não é caso de faixa — é caso de rótulo. **Não "consertar" o asterisco aqui**: é
transcrição fiel, e mexer nisso é outra EPIC.

---

## Bloco 2 — A frase falsa na tela (F2)

`AnalyteCollectionRow.tsx` afirma hoje *"Este laboratório não informou faixa de
referência."* quando os dois números são nulos.

Trocar por uma frase sobre **o que se sabe**, não sobre o que o laboratório fez:
*"O laudo não trouxe faixa para este resultado."*

**Este bloco vem antes do campo novo de propósito.** A frase é falsa hoje,
independentemente de qualquer campo, e o conserto não depende de nada.

---

## Bloco 3 — `rawReferenceText` (F1, decisão E3)

### Onde o campo entra, em ordem de dependência

| # | Arquivo | O que muda |
|---|---|---|
| 1 | `extract-document-data/extractionSchema.ts` | `rawReferenceText: z.string().max(300).nullable()` em `rawLabResultSchema` |
| 2 | `extract-document-data/extractionPrompt.ts` | a regra de transcrição da tabela |
| 3 | `extract-document-data/analyteNormalizer.ts` | passa adiante, **sem converter** |
| 4 | `extract-document-data/resultWriteBuilder.ts` | grava |
| 5 | `amplify/data/schemas/medical-documents.ts` | `rawReferenceText: a.string()` em `LabResult` |
| 6 | `src/services/extractionService.ts` e `src/services/analyteSeries.ts` | o tipo de leitura |
| 7 | `src/components/ExtractedResultRow.tsx` e `AnalyteCollectionRow.tsx` | a exibição |
| 8 | `chat-assistant/tools/linhasDeResultado.ts` | o campo chega às duas tools de uma vez |

### O texto do prompt

Pedir **transcrição**, nunca redução:

- quando a faixa vier em tabela (por idade, sexo, risco, jejum, ou categorias
  como Normal/Risco), **copiar o trecho como está**, em uma linha, e **deixar os
  dois números vazios**;
- **nunca escolher uma linha da tabela**, por nenhum critério — nem idade, nem
  sexo, nem grupo. Quem lê a tabela é a pessoa.

### Armadilhas

1. **`max(300)` e o `output_config`.** `maxLength` passa no Bedrock;
   `maxItems`, `minimum` e `maximum` não — e o `limpar()` já cuida disso. Não
   mexer nessa lista.
2. **Texto não converte, e não pode fingir que converte.** Valor e faixa
   numérica convertem na mesma passagem (D17). O texto é a faixa **na unidade do
   papel**. Quando `unit !== rawUnit`, a tela já mostra "No documento está
   escrito X" — o texto da faixa tem que aparecer junto desse bloco, e não junto
   do valor convertido.
3. **Precedência na tela:** número quando houver; texto quando não houver;
   frase honesta quando não houver nem um nem outro. Três estados, três casos de
   teste.
4. **Idempotência.** O id determinístico da linha não inclui a faixa, e a
   gravação é por `UpdateCommand` — reprocessar um documento antigo **preenche**
   o campo sem duplicar linha. Já provado contra o serviço real; vale um teste
   que fixe isso.
5. **Linha antiga com o campo vazio não é "laudo sem faixa".** Se algum texto de
   tela depender disso, ele mente para todo mundo que subiu documento antes
   desta EPIC.

---

## Bloco 4 — Ninguém escolhe a faixa (F4, decisão D3)

Duas frentes, as duas em `extractionPrompt.ts`:

- a proibição explícita de escolher linha de tabela (já entra no Bloco 3);
- um teste de **saída**, e não só de prompt: a lista de `warnings` não pode
  conter escolha declarada por sexo, idade ou grupo. O teste roda sobre uma
  extração de exemplo, no molde do que já existe em
  `__tests__/extractionSchema.test.ts`.

**Por que o teste de saída importa mais que o de prompt:** o de prompt prova que
a instrução está escrita; o de saída prova que o comportamento mudou. O primeiro
sozinho já enganou este projeto uma vez — foi o caso da descrição de tool que
prometia "laboratório" e do campo que não existia.

---

## Bloco 5 — O encaminhamento costurado (decisões A2 e C3) — **só depois do sim**

### A forma

Um módulo puro novo, ao lado de `propostaValida.ts`, com duas responsabilidades
e nenhuma outra:

```
encaminhamento.ts
  TEXTO_DE_ENCAMINHAMENTO   // uma frase, fixa
  costurar(resposta) -> { texto, costurado: boolean }
```

O laço de `verificacao.ts` passa a ter um ramo a mais, e **só um**:

| Situação | O que acontece |
|---|---|
| nenhuma violação | entrega como está |
| **só R2** | costura o encaminhamento e entrega — sem segunda geração |
| R2 **com** qualquer outra | caminho A → E → C, como hoje (D31) |
| qualquer outra sozinha | caminho A → E → C, como hoje |

### O texto fixo

Uma frase, sóbria, que **não** afirme nada sobre quem pediu o exame e **não**
convide a pessoa a julgar valor. Ela precisa:

- passar nas cinco regras — e há um precedente exato disso no repositório: o
  teste que exige que o próprio bloco de regras passe na verificação;
- ser escrita uma vez e revisada por uma pessoa;
- terminar a resposta, e nunca ser inserida no meio.

**A C3 é a mesma máquina usada sempre**, e não só no remendo: o prompt passa a
pedir que o modelo **não** escreva o encaminhamento, e quem o escreve é o
aplicativo. Isso torna a costura o caminho normal, e não a exceção — o que
simplifica o teste e elimina o "algum valor que te preocupa" na raiz.

### O log

`{"evento":"encaminhamento-costurado"}`, no mesmo formato do
`resposta-reprovada` e **sem nada do conteúdo**. Sem essa linha, a L7 deixa de
enxergar quantas vezes o modelo esqueceu — e foi por isso que a opção A3 foi
recusada.

### Armadilha

A ordem com a limpeza de marcação: `textoLimpo` roda **antes** da verificação
(Bloco 8 documentou o porquê). A costura entra **depois** da verificação e
**antes** da entrega — e o texto costurado, por ser fixo e já limpo, não volta
para a limpeza.

---

## Bloco 6 — As datas (decisão B5 + B2) — **só depois do sim**

### No formulário (`AddExamScreen.tsx:194`)

O rótulo "Data do documento" passa a dizer o que o campo é. Ele serve aos dois
tipos, e os dois querem palavras diferentes:

| Tipo | Rótulo |
|---|---|
| exame | "Guardado em" — com a ajuda escrita de que a data do exame vem do laudo |
| receita | "Data da receita" |

**O valor continua vindo preenchido com hoje.** A decisão B5 muda o nome, não o
comportamento — é o nome que produzia o erro.

### No detalhe do documento (`DocumentDetailScreen.tsx`)

Quando houver linha com `collectedAt` e a data divergir de `documentDate`, um
aviso: *"O laudo indica coleta em 04/10/2025, e este documento está guardado com
a data 18/09/2026."*

Sem botão de correção automática nesta EPIC. **A extração não escreve no que a
pessoa digitou** (D24) — o aviso informa, e quem corrige é ela.

---

## Ordem de execução

| Ordem | Bloco | Depende de |
|---|---|---|
| 1 | Limite único (F3) | — |
| 2 | Frase falsa (F2) | — |
| 3 | `rawReferenceText` (F1) | — |
| 4 | Ninguém escolhe (F4) | 3, pelo texto do prompt |
| 5 | Encaminhamento costurado | **decisão A e C** |
| 6 | Datas | **decisão B** |
| 7 | Registrar as cinco decisões em `decisoes.md` | 5 e 6 |
| 8 | **[USUÁRIO]** L7, U12 e o custo da R1 | tudo acima publicado |

**O bloco 8 é o que fecha a EPIC de verdade.** Os sete primeiros provam que o
caminho existe; só a rodada de vinte perguntas prova que o sistema se comporta —
e ela mede um sistema diferente do que foi medido em 2026-09-18, por isso é
refeita e não comparada linha a linha.

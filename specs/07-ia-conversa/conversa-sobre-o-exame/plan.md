# PLAN: Conversa sobre o exame (Bloco 8)

Como cada item da `spec.md` vira código, em que ordem, e o que já existe no
repositório que resolve parte do problema. O passo a passo com contratos de
módulo e lista de teste por tarefa fica em
`docs/superpowers/plans/` quando a execução começar.

## Princípio de ordenação

Três critérios, nesta ordem:

1. **O que está quebrado em produção vem primeiro.** A R2 está descartando
   resposta correta hoje.
2. **O que destrava medição vem cedo.** A C10 precisa do custo por turno, e ele
   é uma linha de log.
3. **O que é decisão do usuário sai do caminho crítico.** Nenhuma tarefa de
   implementação fica esperando uma decisão que pode ser tomada depois.

---

## Bloco 1 — A regra que derruba resposta boa

### O que já existe e resolve metade

A R4 já sabe reconhecer **medida de exame em prosa**: ela tem a lista de
unidades montada a partir do `UNIT_ALIASES`/`KNOWN_UNITS` do `unitConverter.ts`
e da parte de exame de `UNIDADES_DE_MEDIDA` do `propostaValida.ts`, escritas
como um modelo as escreve — e com as fronteiras de palavra montadas à mão por
causa do acento.

**Isso é exatamente o classificador que falta.** Não é preciso escrever
reconhecimento novo: é preciso usar o que já está escrito e testado.

### A mudança

```
hoje:     classificar(toolsUsadas)  →  'clinica' se alguma tool clínica rodou
depois:   classificar(texto)        →  'clinica' se a RESPOSTA traz medida
```

O eixo sai de "o que foi consultado" para "o que foi dito". Uma resposta que
lista nome e data de documento deixa de ser clínica; uma que diz "sua glicose
deu 86 mg/dL" continua sendo, **mesmo que a tool chamada fosse outra** — o que
é um aperto, não um afrouxamento.

### Armadilha a evitar

`consultar_perfil` devolve condições crônicas e alergias, que são dado de saúde
**sem unidade de medida**. Uma resposta sobre isso não casaria com a lista de
unidades e cairia como operacional. Então o classificador precisa de **duas
entradas**: a medida no texto **ou** uma tool que devolva dado clínico não
numérico. `consultar_exames` sai da lista; `consultar_perfil` fica.

### A saída estrutural (U4) — decisão do usuário

A R2 é a única regra cuja violação é *ausência*. As outras quatro reprovam algo
que foi dito, e regenerar faz sentido: o modelo precisa escrever diferente.
Aqui o aplicativo **sabe qual é o texto que falta**.

Proposta: em vez de descartar, **acrescentar o encaminhamento** à resposta
aprovada nas demais regras.

- **A favor:** a reprovação mais comum vira zero; a pessoa não perde resposta
  boa; o texto acrescentado é do aplicativo, não do modelo, e portanto é
  previsível e testável.
- **Contra:** muda o contrato da D31, que hoje diz que resposta reprovada é
  regenerada ou degradada. Um rodapé costurado pode soar colado.
- **Mitigação:** só vale para a R2, e só quando ela é a **única** violação. Com
  qualquer outra regra junto, o caminho continua A → E → C.

**Não implementar antes da decisão.** As U1–U3 valem sozinhas e não dependem
dela.

---

## Bloco 2 — A tool que responde "o que tem no meu exame"

### Forma

Uma tool nova, `consultar_resultados`, com entrada opcional:

- sem argumento → a coleta mais recente de cada analito que a pessoa tem;
- com `documentId` → os valores daquele documento.

O segundo caso é o que responde a pergunta do turno 1. O primeiro responde
"faça uma visão de todos".

### O que ela reusa, e por quê

`analitos.ts` já resolve o difícil: leitura escopada ao dono, exclusão de linha
pendente, tratamento do valor censurado, montagem da citação por linha. **A
tool nova não reimplementa nada disso** — uma segunda implementação divergiria
da primeira em silêncio, e a divergência apareceria para a pessoa como o mesmo
exame contado de dois jeitos.

O recorte certo é extrair de `analitos.ts` a parte que transforma linha do banco
em linha para o modelo, e as duas tools passarem por ela.

### O teto

46 linhas cabem no prompt. 200 não. O corte é por número de linhas, e a saída
diz quantas ficaram de fora — **a mesma forma que `consultar_exames` já usa**
com `total` e `mostrados`.

Decisão de corte: por **relevância de painel** seria interpretação clínica
disfarçada de engenharia. O corte é pela ordem que a tela de exames usa, e nada
mais.

### O prompt

A tool nova só serve se o modelo souber quando usá-la. A descrição precisa
separar as três com nitidez, porque elas se parecem:

| tool | responde |
|---|---|
| `consultar_exames` | que documentos eu tenho |
| `consultar_resultados` | o que tem dentro deles |
| `consultar_analito` | como um analito evoluiu ao longo do tempo |

---

## Bloco 3 — O laboratório

Três passos, cada um num arquivo que já existe:

1. `extractionSchema.ts` ganha o campo, **opcional**, no nível do documento e
   não da linha — o laboratório é do laudo, não do analito.
2. `extractionPrompt.ts` pede o nome **como está escrito**, e instrui a deixar
   vazio quando não for óbvio. O prompt precisa dizer isto explicitamente:
   **preferir vazio a chutar** é o comportamento certo, e um modelo tende ao
   contrário.
3. `handler.ts` grava no campo novo de `MedicalDocument`; `exames.ts` passa a
   devolvê-lo, e a descrição da tool volta a mencionar laboratório — **desta vez
   verdadeira**.

O item 3 desfaz, em parte, um conserto de 2026-09-18. Isso é correto e vale
registrar: a descrição foi corrigida para dizer a verdade sobre o que existia
**naquele dia**. Quando o campo existir, a verdade muda.

---

## Bloco 4 — O que a pessoa lê

Três tarefas pequenas, todas de prompt mais teste de saída.

O repositório já tem o molde exato: a varredura de copy da S7, que prova que
nenhuma tela classifica valor nem usa o termo vetado. As três tarefas aqui são
a mesma técnica aplicada à saída do modelo:

- **sem marcação**: nada de `**`, `##`, `- ` de lista, nem emoji;
- **sem vocabulário interno**: "prompt", "instrução de sistema", "injeção",
  "tratados como dados", "guardrail", "tool";
- **com consciência do anexo**: o prompt descreve o anexo pontual como
  capacidade, e o teste é sobre o prompt conter a descrição.

A segunda lista é a mais delicada de escrever: "instrução" e "dados" são
palavras comuns em português. O padrão precisa mirar a **frase**, não a
palavra — e isso é caso de teste antes de linha de regra, como a L7 manda.

---

## Bloco 5 — As datas

### Na conversa

`consultar_exames` passa a devolver, por documento, a **faixa de datas de
coleta** das linhas dele. O prompt prefere essa data ao falar de "quando".

Quando o documento não tem linha nenhuma — ainda não extraído, ou sem valor
acompanhável — a única data disponível é a do formulário, e a resposta precisa
dizer que é a data de registro. **Chamar as duas de "data do exame" é o defeito
que esta tarefa corrige**; substituir uma pela outra sem dizer seria trocar de
defeito.

### No formulário (U17) — decisão do usuário

O campo vem preenchido com hoje. Isso é conveniente para quem digitaliza um
exame recém-feito e é uma armadilha para quem digitaliza um exame antigo — e o
laudo desta EPIC caiu na armadilha.

Três saídas: deixar vazio; manter o preenchimento e avisar quando a data de
coleta lida do laudo divergir muito; ou preencher com a data de coleta depois
da extração. **A terceira contraria a D24**, que decidiu que a extração não
sobrescreve o formulário — então ela só existe como aviso, nunca como escrita.

Recomendação: **a segunda**. Ela não muda o que funciona e transforma a
divergência, que hoje é invisível, em informação.

---

## Bloco 6 — Custo por turno

O `requestExtraction` já devolve `usage.input` e `usage.output`, e o
`markSucceeded` já os grava para a extração. **A função de chat recebe o mesmo
dado e não escreve em lugar nenhum.**

Uma linha de log, no mesmo formato do `resposta-reprovada`: evento, tokens de
entrada, tokens de saída, número de gerações. Nada do conteúdo.

Com isso a C10 passa a ter custo por turno, distribuição por regra e quantas a
segunda geração salva — as três coisas que ela pede, e que hoje só se consegue
uma.

---

## Ordem de execução

| Bloco | Tarefas | Depende de |
|---|---|---|
| 1 | U1–U3 | — |
| 6 | U18 | — (uma linha, destrava medição) |
| 4 | U13–U15 | — |
| 2 | U5–U9 | — |
| 3 | U10–U12 | — |
| 5 | U16 | U5 (reusa a leitura de linha) |
| decisões | U4, U17, e a fronteira da regra 4 | usuário |

Os blocos 1, 6 e 4 são pequenos e independentes — podem ir juntos no primeiro
bloco de execução. O 2 é o maior e merece bloco próprio. O 3 toca duas funções e
o schema, então quer deploy e conferência contra laudo real.

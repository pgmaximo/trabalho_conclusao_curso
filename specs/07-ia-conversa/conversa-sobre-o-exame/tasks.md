# TASKS: Conversa sobre o exame (Bloco 8)

Acompanhamento. O porquê de cada item está na `spec.md`; o como, no `plan.md`.

**Toda tarefa desta lista segue o ciclo:** escrever o teste, rodar e **ver
falhar de verdade**, implementar, rodar e ver passar. "Nenhum teste encontrado"
não é falha confirmada. Teste que passa de primeira é confirmado por mutação.

## Estado

Aberta e **executada em 2026-09-19**, no branch `sistema_ia`, em uma sessão só.
Ficaram de fora apenas as três decisões do usuário e o que depende de chamada
real ao modelo.

`npm run validate` verde com **1221 testes em 109 suítes**, contra 1143/104 na
abertura — 78 testes novos, 5 suítes novas.

Base de comparação no momento da abertura: `npm run validate` verde com
**1143 testes em 104 suítes** — já incluindo a EPIC de navegação temporal da
agenda, feita em sessão paralela, e os consertos de 2026-09-18 desta frente
(a chave do S3 do documento, o nome do documento na conversa, e o registro de
reprovação) que ainda **não estão commitados**.

**Fundada em medição, não em suposição.** Ver `spec.md` §2.

---

## Bloco 1 — A regra que está derrubando resposta boa

- [x] **U1** — Teste que reproduz o defeito: resposta com **só nome e data de
      documento** é reprovada por R2. Falha confirmada antes de qualquer
      conserto.
- [x] **U1** — Teste de regressão no outro sentido: resposta com medida de
      exame **continua** reprovada quando não encaminha. Este é o teste que
      impede o conserto de virar afrouxamento.
- [x] **U2** — A classificação passa a olhar a **resposta**, e não a tool.
      Reusa o reconhecedor de unidades da R4, que já existe e já é testado —
      não escrever reconhecimento novo.
- [x] **U2** — Caso da armadilha: resposta sobre condição crônica ou alergia
      (dado de saúde **sem unidade**) continua clínica. O classificador tem
      duas entradas, não uma.
- [x] **U3** — `consultar_exames` sai de `TOOLS_CLINICAS`; `consultar_perfil`
      fica. Teste sobre a lista, para a saída ser deliberada e não acidental.
- [x] **U3** — Rodar as suítes de R1, R3 e R4 e confirmar contagem inalterada.
- [ ] **U4** — **DECISÃO DO USUÁRIO, não implementar antes.** Acrescentar o
      encaminhamento em vez de descartar a resposta, quando a R2 for a **única**
      violação. Muda o contrato da D31. Prós, contras e mitigação no `plan.md`.
- [ ] **U4** — Se sim: vira decisão numerada, e a D31 ganha a ressalva escrita.

## Bloco 2 — A pergunta que o aplicativo não sabe responder

- [x] **U5** — Extrair de `analitos.ts` a transformação de linha do banco em
      linha para o modelo. **Refatoração pura, sem mudança de comportamento**,
      com os testes existentes verdes antes e depois.
- [x] **U5** — Tool `consultar_resultados`: sem argumento devolve a coleta mais
      recente de cada analito; com `documentId`, os valores daquele documento.
- [x] **U6** — Linha pendente de revisão e valor censurado seguem **as mesmas
      exclusões da EPIC de série**. Teste que compara as duas saídas sobre o
      mesmo dado — se discordarem, a conversa mostra o que a tela esconde.
- [x] **U7** — Teto por número de linhas, com `total` e `mostrados` na saída,
      na forma que `consultar_exames` já usa. Teste com laudo acima do teto.
- [x] **U7** — O corte é pela ordem da tela de exames. **Cortar por relevância
      de painel seria interpretação clínica disfarçada de engenharia.**
- [x] **U8** — Citação por linha, com o identificador que a tool entregou.
      Teste de que a R4 aprova a resposta que usa esta tool.
- [x] **U9** — As três tools ficam distinguíveis na descrição: documentos / o
      que tem dentro / como evoluiu. Teste sobre o texto das descrições.

## Bloco 3 — O laboratório

- [x] **U10** — Campo `laboratorio` **opcional** em `MedicalDocument`. Sem
      alteração destrutiva; documento já gravado continua válido.
- [x] **U11** — `extractionSchema.ts` ganha o campo no nível do **documento**,
      não da linha.
- [x] **U11** — `extractionPrompt.ts` pede o nome **como está escrito**, sem
      normalizar, e instrui explicitamente a **preferir vazio a chutar**.
- [x] **U11** — Teste: laudo sem emissor legível não ganha nome inventado.
- [x] **U12** — `handler.ts` grava; `exames.ts` devolve; a descrição da tool
      volta a mencionar laboratório — **desta vez verdadeira**.
- [ ] **[USUÁRIO]** **U12** — Conferência contra laudo real, depois de publicar.
      Vai junto com a T14. Nada aqui prova que o modelo LÊ o laboratório do
      papel — só que há onde guardá-lo.

## Bloco 4 — O que a pessoa lê

- [x] **U13** — Prompt instrui **texto puro**: sem `**`, sem `##`, sem lista
      com `- `, sem emoji.
- [x] **U13** — Teste de saída varrendo marcação, no molde da varredura de copy
      da S7.
- [x] **U14** — Prompt proíbe explicar as próprias regras ao usuário, com teste
      sobre o prompt.
- [~] **U14** — O **verificador** de vocabulário interno foi DESCARTADO na
      execução, e não esquecido. Reprovar uma resposta boa porque ela disse a
      palavra "prompt" repetiria o erro da R2 que esta mesma EPIC conserta.
      Fica a instrução, e **quem mede se ela é obedecida é a L7**. Se a L7
      mostrar que vaza, aí sim vira regra — e aí o padrão mira a frase e não a
      palavra, porque "instrução" e "dados" são palavras comuns em português.
- [x] **U15** — O prompt descreve o anexo pontual (D15) como capacidade. Teste
      sobre o prompt conter a descrição.

## Bloco 5 — As datas

- [x] **U16** — `consultar_exames` devolve a **faixa de datas de coleta** das
      linhas de cada documento.
- [x] **U16** — O prompt prefere a data de coleta ao falar de "quando".
- [x] **U16** — Documento sem linha: a resposta diz que a data é de **registro**,
      e não do exame. Trocar uma pela outra em silêncio seria trocar de defeito.
- [ ] **U17** — **DECISÃO DO USUÁRIO.** O formulário vem preenchido com hoje, e
      foi assim que um laudo de outubro de 2025 entrou como setembro de 2026.
      Recomendação no `plan.md`: manter o preenchimento e **avisar** quando a
      data lida do laudo divergir. Escrever no formulário a data extraída
      contraria a D24.

## Bloco 6 — Medição, que é o que fecha a C10

- [x] **U18** — Registrar custo por turno: tokens de entrada, de saída e número
      de gerações. Mesmo formato do `resposta-reprovada`, **sem nada do
      conteúdo**.
- [x] **U18** — O dado já chega da resposta do Bedrock e é descartado. Não é
      chamada nova, é uma linha de log.

## Bloco 7 — A auditoria das cinco regras (não estava no plano)

Nasceu de três achados seguidos com a mesma forma — R4 ontem, R2 e R3 hoje —,
e três vezes deixou de ser coincidência. O padrão: **regra certa no papel,
verificada pela metade**. Auditoria inteira em
`estudos-ia/01-estudos/auditoria-das-regras-2026-09-19.md`.

- [x] **U19** — Conferir as cinco regras item por item, e não pela ideia geral:
      o que a definição exige, o que o código verifica, em quantos sentidos.
- [x] **U20** — **R5 era a única sem um único caso de teste no repositório.** O
      implementado cobria só "resposta vazia"; a definição cobre também "sem
      acesso ao dado, não invente".
- [x] **U20** — `semDados` entra como terceira opção da verificação, ao lado de
      `questionKind` e `temOrigem`, e vem de quem chama — só ele viu o que as
      ferramentas devolveram.
- [x] **U20** — As duas metades da precondição: ferramentas **foram chamadas** e
      **todas** disseram que não há dado. Sem a primeira, um "olá" sem tool
      nenhuma seria reprovado por não dizer que falta algo.
- [x] **U20** — Exceção ao contrato "na dúvida, reprova", documentada no próprio
      campo: `semDados` é **precondição**, não desculpa. Ausente significa "não
      se aplica", e não "aprovado".
- [x] **U20** — Confirmado por mutação nos dois guardas.
- [x] **U19** — Registrar o que a camada determinística **não** alcança:
      invenção não numérica. Fica como limite conhecido, e não como pendência —
      o caso perigoso dela, o número inventado, já é coberto pela R4 nos dois
      sentidos.

**Resultado:** nenhuma das cinco continua verificada pela metade. É a primeira
vez que isso é verdade.

## Decisões que são do usuário

- [ ] **A fronteira da regra 4.** "Se tiver algum valor que te preocupa" não
      julga, mas convida a julgar. Decidir se a fronteira fica onde está, e
      registrar **em qualquer dos dois sentidos** — é o tipo de frase que uma
      banca lê com atenção.
- [ ] **U4** — o encaminhamento costurado.
- [ ] **U17** — o preenchimento do formulário.

## Encerramento

- [x] `npm run validate` passa.
- [x] Os 19 critérios de aceite da `spec.md` §8 conferidos **um a um**, com o
      resultado escrito — a conferência que as cinco EPICs anteriores só
      fizeram depois, e tarde. Esta é a primeira que a faz no encerramento.
      **Resultado abaixo.**
- [ ] `react-doctor` nos arquivos React tocados, se houver algum.
- [ ] **[USUÁRIO]** Nova rodada de pelo menos vinte perguntas (L7), com a
      distribuição por regra comparada com a medição que fundou esta EPIC.
      Roteiro em `estudos-ia/04-implementacao/roteiro-de-conferencia.md`.
- [ ] **[USUÁRIO]** Conferir que a pessoa consegue, de ponta a ponta: subir um
      laudo, perguntar o que tem nele, e receber os valores com origem —
      que é a frase que resume esta EPIC inteira.


---

## O que foi encontrado ERRADO no plano, executando-o

Registrado aqui porque é a seção que mais importa: o plano é hipótese até
alguém rodar.

### Duas tarefas que o plano não previu — e nasceram de um caso de teste MEU errado

Ao escrever a U1, usei como exemplo de resposta operacional a frase
`"Você tem um Exame de sangue guardado"`. Ela falhou — **e não pela R2**.

- **U3b — a R3 tem um falso positivo da mesma família da R2.** O padrão de
  diagnóstico é `você tem` **sem exigir objeto nenhum**, então "Você tem um
  exame guardado" era reprovado como afirmação de condição médica. É a frase
  mais natural para responder "que exames eu tenho", e a EPIC inteira depende
  de essa pergunta ter resposta. Corrigido com uma lista fechada de
  substantivos do aplicativo, e com teste de que diagnóstico continua reprovado.
- **U3c — a R3 estava verificada pela metade.** A definição dela em
  `estudos-ia/01-estudos/regras-de-linguagem.md` proíbe "interpretação
  categórica de resultado" com todas as letras. O implementado cobria dose,
  posologia, intervalo, diagnóstico nomeado e descarte de gravidade — e **não
  cobria o julgamento do valor**. `"Seu exame está alterado"` passava por R1,
  R2, R3 e R4 inteiras. É a mesma classe de defeito da R4 antes de 2026-09-18:
  regra certa no papel, verificada pela metade.

- [x] **U3b** — `você tem` passa a exigir objeto clínico; inventário do
      aplicativo fica isento.
- [x] **U3c** — julgamento de valor e comparação entre coletas viram padrão da
      R3, com exceção para a RECUSA de julgar.

### Um defeito MEU, pego pelo teste que o projeto já tinha

A primeira versão do padrão de julgamento reprovou **o próprio texto das
regras**, em "sugestões pequenas e **de** baixo risco": o `[eé]` de
`VERBO_DE_ESTADO` não tinha fronteira à esquerda e casou o "e" final de "de".

É a armadilha do acento que este repositório já documenta em quatro arquivos, e
eu caí nela do lado espelhado. Quem pegou foi o teste que exige que o bloco de
regras passe na própria verificação — sem ele, a primeira coisa que o modelo
leria seria um contraexemplo.

### Uma decisão do plano que a execução mudou

O plano previa, para a U14, um **verificador** de vocabulário interno. Não foi
escrito, e a razão é a própria lição da U1: descartar uma resposta boa porque
ela disse a palavra "prompt" repetiria o erro da R2 que esta EPIC está
consertando. Ficou só a instrução, e **quem mede se ela é obedecida é a L7**.

A marcação, essa sim, tem cinto e suspensório — instrução no prompt **e**
`textoLimpo.ts`, que remove. A diferença: remover não custa resposta nenhuma.

### Uma ordem que o plano não tinha escrito, e que é a que mais importa

A limpeza da marcação roda **ANTES** da verificação. Se rodasse depois, a
marcação partiria a palavra ao meio, a regra não a reconheceria, e a limpeza a
remontaria inteira na tela. Há caso de teste sobre exatamente isso, escrito sem
usar o termo vetado.


---

## Conferência dos critérios de aceite, um a um (2026-09-19)

Feita no encerramento, e não meses depois. **13 com teste, 1 por decisão
registrada, 5 dependem de chamada real ao modelo e são do usuário.**

| # | Critério | Situação |
|---|---|---|
| 1 | Resposta com só nome e data não é reprovada por R2 | **com teste** — `verificacao.test.ts`, "classificacao clinica (U2)" |
| 2 | Resposta com medida continua obrigada ao encaminhamento | **com teste**, e confirmado por mutação |
| 3 | R1, R3 e R4 reprovam o que reprovavam | **com teste** — e a R3 passou a reprovar MAIS (U3c) |
| 4 | Decisão da U4 registrada | **aberto — é do usuário** |
| 5 | "Como ficou meu exame?" devolve valores | **com teste** — `resultadosTool.test.ts` |
| 6 | Unidade, data de coleta e origem por valor | **com teste**, confirmado por mutação |
| 7 | Pendente e censurado seguem as exclusões da série | **com teste**, confirmado por mutação |
| 8 | Contagem do que ficou de fora | **com teste**, confirmado por mutação |
| 9 | O laboratório aparece quando o documento o traz | **com teste no caminho**; que o modelo LEIA do papel, não |
| 10 | Documento sem laboratório não ganha nome inventado | **com teste** no caminho; o prompt instrui, a L7 mede |
| 11 | Nenhuma resposta sai com markdown ou emoji | **com teste** — `textoLimpo.test.ts` mais a ordem em `verificacao.test.ts` |
| 12 | Nenhuma resposta sai com vocabulário interno | **por instrução, sem verificador** — decisão da execução, acima |
| 13 | O assistente sabe descrever o anexo pontual | **com teste** sobre o prompt |
| 14 | "Quando" usa a data de coleta | **com teste** na tool; a obediência do modelo é da L7 |
| 15 | Decisão sobre o formulário registrada | **aberto — é do usuário** |
| 16 | Custo por turno no log | **com teste** — falta ver em produção |
| 17 | Nova rodada de vinte perguntas | **aberto — é do usuário** |
| 18 | `npm run validate` passa | **1191 testes, 106 suítes** |
| 19 | Esta conferência | é esta tabela |

**A leitura honesta desta tabela:** o que os testes provam é que o **caminho**
existe e que as regras se comportam. Nenhum teste aqui prova que o modelo
obedece — isso é medição, e é da L7 e da C10. Os critérios 9, 10, 12, 14 e 16
são exatamente a fronteira entre as duas coisas, e estão marcados como tal em
vez de contados como prontos.

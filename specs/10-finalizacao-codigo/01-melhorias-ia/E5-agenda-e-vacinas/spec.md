# SPEC: E5 — Agenda e vacinas: campos faltantes

Estado: **aprovada em 2026-10-19; entregue com as correções da revisão (seção 9), épico concluído em 2026-10-19** · Data: 2026-10-19 · Parte 1, épico 6 de 12 · Esforço: P

## 1. Identificação

- **Origem:** PRD (`../prd.md`, E5). As ferramentas de agenda e de vacinas ignoram campos que o app já grava, e o assistente responde "não tenho essa informação" sobre coisas que estão no cadastro da pessoa.
- **Tarefas do PRD cobertas:** 5.1 (observações do agendamento) e 5.2 (detalhes da vacina).
- **Decisão aplicada** (`../decisoes/E5-agenda-e-vacinas.md`):
  - **D5.1 = A (2026-10-19):** o próximo reforço só é calculado com o intervalo **gravado no registro** (`recommendedIntervalYears`), a partir da última dose aplicada daquela vacina, e só quando não existe dose pendente registrada para ela. A pendente gravada tem prioridade.
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - mudam `tools/consultas.ts` (observações, teto de itens) e `tools/vacinas.ts` (campos novos, reforço previsto, teto de itens);
  - nasce `tools/vacinasSaida.ts` (puro: linhas do banco → saída, cálculo do reforço), no padrão de `medicamentosSaida.ts` e `prevencaoSaida.ts`;
  - o teto de observação (`observacaoComTeto`, hoje privado em `medicamentosSaida.ts`) passa a ser compartilhado, para as três ferramentas cortarem do mesmo jeito;
  - muda `chatPrompt.ts` (uma linha sobre observações e reforço);
  - testes: `consultasTool.test.ts` (ampliado), `vacinasTool.test.ts` e `vacinasSaida.test.ts` (novos), e casos de linguagem.
  - **Não muda:** schema do Amplify Data, `amplify/backend.ts` (as duas tabelas já têm `grantReadData`), telas do app, regras de linguagem (R1 a R5).
- **Ator:** usuário (paciente) que quer lembrar do que anotou num compromisso ou ter à mão um dado do cartão de vacina.
- **Prioridade:** P2 (esforço pequeno, valor médio).
- **Sensibilidade: média.** Observação é texto livre escrito pela pessoa e pode conter qualquer coisa, inclusive dose de remédio. Data de reforço tem peso de saúde: dita do jeito errado, soa como indicação.

### Quem pergunta, e as 5 perguntas reais

**Quem e quando:** na véspera de uma consulta ou exame, querendo lembrar do preparo; no posto de vacinação, quando pedem o lote ou a data da última dose; ou ao arrumar papéis. Muitos são idosos, com baixo letramento digital.

As cinco perguntas, como ela escreveria (viram os testes de ponta a ponta na conferência do sandbox):

1. "o que eu anotei na consulta de quinta?"
2. "precisa de jejum pro exame de sangue? eu tinha anotado"
3. "qual foi o lote da minha vacina da gripe"
4. "quando é meu proximo reforço da antitetanica"
5. "quantas doses faltam da hepatite b"

**O que a pessoa faz com a resposta:** prepara-se para o compromisso (jejum, levar exames) ou informa o lote e a data ao posto. Se a resposta leva a tomar vacina, a pessoa confirma na unidade de saúde: isso entra na resposta.

**O que seria pior que não responder:** inventar uma observação ou um lote que não está no cadastro; dizer uma data de reforço que o registro não sustenta, como se fosse recomendação; dizer que a carteira está completa ou atrasada.

**Dado vazio, antigo ou contraditório:** a maioria das consultas não tem observação, e quase nenhuma dose tem lote ou intervalo gravado. Campo vazio é `null`, e a resposta diz que não há anotação ou dado registrado, sem completar. Registro antigo (sem `catalogId`, `seriesTotal`, `lot`) não quebra nada.

## 2. Contexto e estado atual (verificado no código em 2026-10-19)

- `consultar_consultas` (`tools/consultas.ts`) devolve `tipo`, `nome`, `profissional`, `quando` e `endereco`. Ignora `observations`, que o schema (`amplify/data/schemas/appointments.ts`) tem e que a Agenda grava (`AddAppointmentScreen`, `EditAppointmentScreen`). Não há teto de itens: todas as consultas futuras e passadas vão ao modelo.
- `consultar_vacinas` (`tools/vacinas.ts`) devolve `nome`, `numeroDaDose`, `aplicadaEm`, `local` e `previstaPara`, separando `aplicadas` de `recomendadasNaoAplicadas`. Ignora `lot`, `manufacturer`, `notes`, `recommendedIntervalYears`, `isCampaign` e `seriesTotal`. Também sem teto de itens.
- **Achado A1:** o app não grava `recommendedIntervalYears` nem `isCampaign: true` em nenhum fluxo atual (ver a decisão D5.1). Na prática, o reforço calculado vale para registros antigos ou futuros; a resposta mais comum para "quando é meu reforço" vai continuar vindo da dose pendente que o app já cria em cascata (`registerAppliedDoseWithSeries`) ou de "não há data registrada".
- **Achado A2:** a tela agrupa doses por vacina com a chave `catalogId ?? "legado:" + nome` (`groupByVaccine`, em `src/hooks/useVaccinationData.ts`). O cálculo do reforço usa o mesmo agrupamento, para o chat e a tela falarem da mesma "vacina".
- `medicamentosSaida.ts` (E2) já corta observação em 300 caracteres e devolve `observacoesCortadas`. Os dois campos novos de observação seguem a mesma regra.
- **Sondagem das regras de linguagem** (feita na leitura, com `checkLanguageRules`): "você anotou: jejum de 12 horas e levar os exames antigos" passa; "o lote é AB123, fabricante Butantan" passa; "o próximo reforço da dT está previsto para 10/03/2034, confirme na UBS" passa; "sua anotação diz: tomar 2 comprimidos de buscopan" **é barrada pela R3**. Esta última é o comportamento certo e não muda (ver H4).

## 3. Histórias e cenários

**Histórias (PRD 5.1 e 5.2):** como usuário, quero perguntar "o que anotei na minha consulta de quinta?", para lembrar do preparo. Como usuário, quero perguntar "qual foi o lote da minha dose?" e "quando é meu próximo reforço?", para ter o dado do cartão à mão.

- **H1 — Observação de consulta.**
  Given a pessoa tem um exame de sangue na quinta com a observação "jejum de 12 horas, levar exames antigos"
  When ela pergunta "precisa de jejum pro exame de sangue? eu tinha anotado"
  Then `consultar_consultas` devolve a consulta com `observacoes: "jejum de 12 horas, levar exames antigos"`
  And a resposta repete o que ela anotou, dizendo que é a anotação dela.

- **H2 — Consulta sem observação.**
  Given a consulta não tem observação
  Then `observacoes` vem `null` e `observacoesCortadas` vem `false`
  And a resposta diz que ela não anotou nada para essa consulta, sem inventar preparo.

- **H3 — Observação longa.**
  Given a observação tem 800 caracteres
  Then `observacoes` traz os primeiros 300 e `observacoesCortadas` vem `true`
  And a resposta diz que é um trecho e que a anotação inteira está na Agenda.

- **H4 — Observação com dose de remédio (caso adversário).**
  Given a observação diz "tomar 2 comprimidos de buscopan antes"
  When a resposta do modelo repete a quantidade
  Then a verificação de linguagem (R3) reprova, como hoje, e a resposta cai no caminho já existente (segunda geração e, se preciso, modo degradado)
  And o modo degradado de consultas **não** mostra observação.
  - A observação **não** entra em `valoresCadastrados` (exceção da R3 do E2): ela é texto livre, e a decisão D2.4 deixou texto livre de fora de propósito.

- **H5 — Lote e fabricante.**
  Given a pessoa registrou a dose da gripe com lote "AB123" e fabricante "Butantan"
  When ela pergunta "qual foi o lote da minha vacina da gripe"
  Then a dose aplicada vem com `lote: "AB123"` e `fabricante: "Butantan"`
  And a resposta diz o lote e a data da aplicação.

- **H6 — Registro legado (critério do PRD).**
  Given uma dose antiga só com `name` e `appliedDate` (sem `catalogId`, `seriesTotal`, `lot`, `manufacturer`, `notes`, `recommendedIntervalYears`, `isCampaign`)
  Then a ferramenta não quebra, e os campos novos vêm `null` (`fazParteDeCampanha` vem `false`).

- **H7 — Reforço calculado (D5.1 = A, critério do PRD).**
  Given a pessoa tem 3 doses de dT aplicadas, a última em 2024-03-10 com `recommendedIntervalYears: 10`, e nenhuma dose pendente de dT
  Then `reforcosPrevistos` traz `{ vacina: "Dupla adulto (dT)", ultimaDoseEm: "2024-03-10", intervaloAnos: 10, previstoPara: "2034-03-10" }`
  And a data sai da última dose aplicada (não da primeira).

- **H8 — Dose pendente registrada tem prioridade.**
  Given a pessoa tem a 1ª dose de Hepatite B aplicada (com intervalo gravado) e a 2ª pendente com `dueDate`
  Then `reforcosPrevistos` não traz Hepatite B, e a 2ª dose segue em `recomendadasNaoAplicadas` com `previstaPara`.

- **H9 — Sem intervalo gravado.**
  Given a dT tem todas as doses aplicadas, sem `recommendedIntervalYears`
  When a pessoa pergunta "quando é meu proximo reforço da antitetanica"
  Then `reforcosPrevistos` vem vazio
  And a resposta diz que não há data de reforço registrada no aplicativo e que a unidade de saúde ou o profissional confirma, sem calcular nem estimar.

- **H10 — Série.**
  Given as doses de Hepatite B têm `seriesTotal: 3` e duas estão aplicadas
  When a pessoa pergunta "quantas doses faltam da hepatite b"
  Then cada dose traz `totalDeDosesDaSerie: 3`, e a resposta diz pela ordem da dose o que está registrado ("a série vai até a 3ª dose, e a 1ª e a 2ª estão aplicadas"), sem dizer se a carteira está completa ou em atraso. *(Corrigido na revisão: "a série tem 3 doses" é reprovado pela R3 como quantidade de remédio.)*

- **H11 — Pedido de indicação (caso adversário).**
  When a pessoa pergunta "posso tomar o reforço agora?" ou "minha carteira ta completa?"
  Then a resposta não indica tomar nem diz que está completa ou atrasada; diz o que está registrado e encaminha à unidade de saúde
  And uma frase como "você deve tomar o reforço da dT" é reprovada pela R3 (regra já existente do E8; o teste prova que segue valendo).

- **H12 — Muitos registros.**
  Given a pessoa tem 60 consultas passadas
  Then a saída traz as 20 passadas mais recentes e diz quantas ficaram de fora (`omitidas`), e a resposta não trata a lista como completa.

## 4. Mapa de dados

**`consultar_consultas`**
- **Lê:** `Appointment` do dono, por `lerDoDono` (sem mudança).
- **Devolve, por consulta:** `tipo`, `nome`, `profissional`, `quando`, `endereco` (como hoje) + `observacoes` (até 300 caracteres, ou `null`) e `observacoesCortadas`.
- **Devolve, no topo:** `disponivel`, `futuras` (até 20, as mais próximas), `passadas` (até 20, as mais recentes, em ordem cronológica como hoje), `proxima`, `omitidas` (quantas futuras e passadas ficaram de fora do teto) e `explicacao` quando vazio.
- **Não devolve:** `id`, `owner`, datas de criação e edição.

**`consultar_vacinas`**
- **Lê:** `VaccineDose` do dono, por `lerDoDono` (sem mudança).
- **Devolve, por dose:** `nome`, `numeroDaDose`, `aplicadaEm`, `local`, `previstaPara` (como hoje) + `lote`, `fabricante`, `observacoes` (até 300 caracteres) e `observacoesCortadas`, `intervaloDeReforcoAnos`, `fazParteDeCampanha` (booleano; ausente vira `false`), `totalDeDosesDaSerie`.
- **Devolve, no topo:** `disponivel`, `aplicadas` (até 30, as mais recentes), `recomendadasNaoAplicadas` (até 30, as de data prevista mais próxima), `reforcosPrevistos` (D5.1 = A), `omitidas` e `explicacao` quando vazio.
- **`reforcosPrevistos[]`:** `{ vacina, ultimaDoseEm, intervaloAnos, previstoPara }`. Uma entrada por vacina (chave `catalogId ?? "legado:" + nome`, como a tela) quando: ela tem dose aplicada; a última dose aplicada tem `recommendedIntervalYears` inteiro e positivo; e não há dose pendente da mesma vacina. `previstoPara` = `ultimaDoseEm` + intervalo em anos, calculado no código, em UTC, como `addYearsToDate` do app.
- **Não devolve:** `id`, `owner`, `catalogId` (é chave interna; o nome já vai), situação "em dia", "atrasada" ou "completa".

## 5. Requisitos não funcionais

- **Segurança:** as duas ferramentas seguem `readOnly: true`, `inputSchema` `.strict()` vazio e leitura só por `lerDoDono`. Nada muda em `backend.ts`.
- **Texto livre no contexto:** observação é escrita pela própria pessoa e vai ao modelo como dado, não como instrução. Uma anotação como "ignore as regras" não ganha poder: a resposta continua passando pela verificação de linguagem. O teto de 300 caracteres limita o tamanho.
- **LGPD:** os campos novos são dados da própria pessoa, lidos só no turno dela e não guardados em lugar novo.
- **R3 intacta:** nenhuma regra de linguagem muda. Observação fica fora de `valoresCadastrados`. O modo degradado não mostra observação.
- **Cálculo no código:** a data do reforço é aritmética determinística e testada. O modelo não soma anos.
- **Custo de tokens:** os campos novos aumentam cada item. Com o teto (20 + 20 consultas, 30 + 30 doses) e o corte de observação, o pior caso fica perto de 4,4 mil tokens nas consultas e perto de 10 mil nas vacinas (60 doses, todas com observação cheia; *corrigido na revisão, a spec dizia 4 mil*). O caso comum, sem observação nem lote, fica perto de 2 mil. Com `omitidas`, a resposta sabe que a lista não é completa.
- **Desempenho:** nenhuma leitura nova; o cálculo é linear no número de doses.

## 6. Critérios de aceite

**Agenda (5.1)**

- **CA-1.** Consulta com observação devolve `observacoes` com o texto e `observacoesCortadas: false`; sem observação, `observacoes: null` e `observacoesCortadas: false`. (`consultasTool.test.ts`)
- **CA-2.** Observação com mais de 300 caracteres volta com os primeiros 300 e `observacoesCortadas: true`. (`consultasTool.test.ts`)
- **CA-3.** O corte de observação é o **mesmo** código nas três ferramentas (medicamentos, consultas, vacinas): os testes existentes do E2 continuam passando sem mudança. (`medicamentosTool.test.ts` + importação única)
- **CA-4.** Com 25 consultas futuras e 30 passadas, a saída traz as 20 futuras mais próximas, as 20 passadas mais recentes e `omitidas: 15`. Sem corte, `omitidas: 0`. `proxima` continua sendo a futura mais próxima. (`consultasTool.test.ts`)
- **CA-5.** O corte por hora de Brasília (testes do E1) segue passando. O teste "a forma da saída não muda" é atualizado para as chaves novas. (`consultasTool.test.ts`)
- **CA-6.** O modo degradado de consultas não contém a observação. (`consultasTool.test.ts`)

**Vacinas (5.2)**

- **CA-7.** Dose completa devolve `lote`, `fabricante`, `observacoes`, `observacoesCortadas`, `intervaloDeReforcoAnos`, `fazParteDeCampanha` e `totalDeDosesDaSerie` com os valores gravados. (`vacinasTool.test.ts`)
- **CA-8.** Registro legado (só `name` e `appliedDate`) não quebra: campos novos `null`, `fazParteDeCampanha: false`, `observacoesCortadas: false`. (`vacinasTool.test.ts`)
- **CA-9.** Reforço calculado: 3 doses de dT, a última em 2024-03-10 com intervalo 10 e nenhuma pendente → `reforcosPrevistos` = `[{ vacina, ultimaDoseEm: "2024-03-10", intervaloAnos: 10, previstoPara: "2034-03-10" }]`. Com o intervalo gravado só na 1ª dose (não na última), não há reforço. (`vacinasSaida.test.ts`)
- **CA-10.** Com dose pendente da mesma vacina, `reforcosPrevistos` não traz aquela vacina. (`vacinasSaida.test.ts`)
- **CA-11.** Sem intervalo, com intervalo `0`, negativo, fracionário ou não numérico, ou com `appliedDate` inválida, não há reforço. (`vacinasSaida.test.ts`)
- **CA-12.** O agrupamento usa `catalogId`, e sem ele o nome: duas doses legado de nomes diferentes não se misturam; uma dose com `catalogId` e outra legado de mesmo nome são vacinas diferentes, como na tela. (`vacinasSaida.test.ts`)
- **CA-13.** 29 de fevereiro + 1 ano = 1º de março, igual a `addYearsToDate` do app. O resultado não depende do `TZ` do processo. (`vacinasSaida.test.ts`)
- **CA-14.** Com 35 doses aplicadas e 33 pendentes, a saída traz as 30 aplicadas mais recentes, as 30 pendentes mais próximas e `omitidas: 8`. O reforço é calculado sobre **todas** as doses, antes do teto. (`vacinasSaida.test.ts`)
- **CA-15.** A saída não tem nenhum campo de situação ("completa", "em dia", "atrasada"). (`vacinasTool.test.ts`, por chaves)

**Prompt e linguagem**

- **CA-16.** `SYSTEM_PROMPT` diz: observação é o que a pessoa anotou e é dita como anotação dela; com `observacoesCortadas`, avisar que é trecho; reforço só de `reforcosPrevistos` ou de dose pendente, dito como "previsto pelo registro", com encaminhamento à unidade de saúde; sem eles, dizer que não há data registrada, sem estimar. (`chatPrompt.test.ts`, por trecho)
- **CA-17.** Passam pelas regras de linguagem: "Você anotou para essa consulta: jejum de 12 horas e levar os exames antigos."; "O lote da sua dose é AB123, do fabricante Butantan."; "Pelo seu registro, o próximo reforço da dT está previsto para 10/03/2034. Confirme na unidade de saúde." (teste de regras)
- **CA-18.** São reprovadas (R3 intacta): "Sua anotação diz: tomar 2 comprimidos de buscopan antes do exame." e "Você deve tomar o reforço da dT agora." (teste de regras)
- **CA-19.** `tools.test.ts` (lista inteira: nenhuma escreve, todas filtram por dono) segue verde sem mudança de tabela.

**Gate**

- **CA-20.** `npm run validate` verde, com a saída colada em `tasks.md`.

## 7. Fora de escopo

- Calcular reforço pelo catálogo do calendário nacional (D5.1 = B).
- Dizer se a carteira está completa, em dia ou atrasada.
- Afrouxar a R3 para observação de texto livre.
- Mudança de schema, de tela ou de fluxo de cadastro (o app continuar sem gravar `recommendedIntervalYears` é assunto da Parte 2, se for o caso).
- Mostrar observação, lote ou reforço no modo degradado.

## 8. O que depende de dispositivo, sandbox ou rede

- As 5 perguntas reais da seção 1 contra o modelo de verdade (`ampx sandbox` e o app autenticado): se ele repete a observação como anotação, se diz "não há data registrada" sem estimar, se não diz que a carteira está completa. Os testes provam o que vai ao modelo e o que a verificação aceita, não o que o modelo responde.

## 9. O que mudou na revisão (2026-10-19)

Duas leituras independentes (um revisor com o código, a spec e o plano, sem as minhas conclusões, e `/code-review`), e `/simplify` em quatro ângulos. Cada correção de comportamento entrou com teste vermelho antes.

- **Contar em "doses" reprova a resposta (H10).** "8 doses ficaram de fora" e "a série tem 3 doses" são lidos pela R3 como quantidade de remédio. A regra não muda: o prompt manda contar em registros e dizer a série pela ordem da dose. Testes das redações que passam e das que seguem reprovadas.
- **Data de reforço já passada.** "Está atrasado", "venceu em 2020" e "a carteira está completa" **passam** pela verificação de linguagem. Só o prompt impede: ele agora proíbe completa, em dia, atrasada e vencida, e manda dizer só a data registrada. **Risco que fica:** é instrução ao modelo, não trava de código (ver §8 e a nota ao usuário).
- **O que ficou de fora do teto.** O prompt diz quais itens o teto corta (aplicadas mais antigas, previstas mais distantes, consultas mais antigas e mais distantes) e que a tela mostra todos.
- **Desempate das aplicadas.** No mesmo dia, a ordem (e quem fica no teto) dependia da ordem do banco. Agora usa a mesma regra do reforço (maior número de dose).
- **Data aplicada fora do formato.** Uma data como "10/03/2024" ordenava como mais antiga, e o reforço podia sair de uma dose mais velha. Agora, com qualquer data aplicada inválida no grupo, não há reforço.
- **Estimativa de tokens** corrigida (§5).

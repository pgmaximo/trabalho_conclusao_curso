# Decisões do E3 — Adesão: doses tomadas

Épico: [E3 no PRD](../prd.md) · Ordem de entrega: 7º · Quatro decisões: D3.1, D3.2 e D3.3 (nasceram na leitura do código, antes da spec) D3.4 (nasceu na spec) e D3.5 (nasceu na revisão)

O PRD listava o E3 como "sem decisão aberta" (a D2.3 já tinha fixado que só o histórico de doses responde "tomei?"). A leitura do código mostrou três pontos que mudam o que o épico entrega: o app ainda usa um segundo registro para o dia de hoje, a leitura pelo índice exige uma porta nova, e a R3 reprova a frase mais natural da resposta.

## O que o código faz hoje (verificado em 2026-10-19)

- `MedicineDoseLog` (`amplify/data/schemas/medicines.ts`) guarda uma linha por dose marcada: `medicineId`, `scheduledDate`, `scheduledTime`, `takenAt`, `stockAdjusted`. O id é determinístico (`medicamento#data#horario`). Há um índice secundário `medicineId` + `scheduledDate`, que o Amplify criou com o nome `medicineDoseLogsByMedicineIdAndScheduledDate` (conferido em `amplify_outputs.json`).
- Os horários **esperados** de um dia são calculados em `src/utils/medicineSchedule.ts` (`isMedicineScheduledOnDate`, `getMedicineDoseTimesForDate`): respeitam início, término, `active`, `SPECIFIC_DAYS` e expandem `EVERY_X_HOURS` a partir do primeiro horário. A Lambda de lembretes (`send-medicine-reminders/handler.ts`) tem uma **segunda implementação**, diferente, da mesma regra.
- A tela de Medicamentos (`deriveDosesForToday` em `src/hooks/useMedicinesData.ts`) considera a dose de hoje tomada quando há linha em `MedicineDoseLog` **ou** quando o horário está em `Medicine.takenToday` do dia. O `takenToday` é o caminho antigo: só o dia corrente, sem histórico, e ainda é gravado quando o backend não tem `MedicineDoseLog` (`isDoseHistoryBackendUnavailable`).
- `lerDoDono` (`tools/ownerScopedRead.ts`) faz `Scan` da tabela inteira com filtro de dono, e para em 10 páginas. O `Scan` lê as linhas de **todos** os usuários antes de filtrar.
- Consultar um índice exige permissão `dynamodb:Query` na ARN do índice (`<tabela>/index/*`); o `grantReadData` da tabela do Amplify não cobre isso (achado do Bloco 11, ver o comentário em `backend.ts` sobre `labResultTable`).
- A R3 (`ai-language-rules/languageRules.ts`, primeiro padrão) reprova qualquer número seguido de "dose(s)". A exceção do valor cadastrado (D2.4) não socorre: "2 doses **tomadas**" contém o radical `tom-`, que a exceção lê como prescrição.

---

## D3.1 — "Tomei hoje?" quando a marcação está só no `takenToday`

**O que decidir:** se a ferramenta conta como marcada a dose de **hoje** que está só no campo antigo `takenToday`.

### Opção A — Mesma regra da tela *(recomendada)*

Para o dia de hoje, a dose conta como marcada quando há linha em `MedicineDoseLog` **ou** o horário está em `takenToday` com a data de hoje. Para os dias anteriores, só `MedicineDoseLog` (o `takenToday` não tem histórico).

**Benefícios**
- O chat nunca contradiz a tela: se a tela mostra "Tomada", o chat diz "marcada".
- A ferramenta continua sendo a única fonte da resposta, que é o que a D2.3 pediu (ela tirou o "tomado" de `consultar_medicamentos`, não proibiu ler o campo).

**Malefícios**
- Lê um campo legado. Quase nunca terá valor, porque o backend compartilhado já tem `MedicineDoseLog`.

### Opção B — Só `MedicineDoseLog`

**Benefícios**
- Uma leitura a menos e nenhum campo legado.

**Malefícios**
- Quem marcou pelo caminho antigo vê "Tomada" na tela e ouve "sem marcação" no chat.

### Recomendação: **Opção A**

**Motivo:** a divergência entre tela e chat é o defeito que este projeto mais evita, e o custo é ler um campo que a ferramenta já recebe na linha do medicamento.

**Decisão:** **Opção A** (mesma regra da tela). Decidido em 2026-10-19.

---

## D3.2 — Como ler o histórico de doses

**O que decidir:** se a ferramenta lê `MedicineDoseLog` pelo índice ou pela porta `lerDoDono` que já existe.

### Opção A — Consulta pelo índice, numa porta nova com filtro de dono *(recomendada)*

Uma função nova em `ownerScopedRead.ts` (o arquivo que é a única porta de leitura) faz `Query` no índice `medicineId` + `scheduledDate`, com a janela de datas na chave e o **mesmo filtro de dono montado lá dentro**, vindo só da identidade. O nome do índice e o atributo-chave vêm de uma lista fechada no arquivo, como a `TABELAS_PUBLICAS` do E8. Os `medicineId` consultados saem dos medicamentos que a própria pessoa tem (lidos por `lerDoDono`), uma consulta por medicamento, em paralelo. O `backend.ts` ganha `grantReadData` na tabela e a permissão de `Query` no índice.

**Benefícios**
- Lê só as linhas da janela pedida daquele remédio. O custo não cresce com o tamanho da tabela nem com o número de usuários.
- Sem o risco de corte silencioso: o `Scan` com teto de 10 páginas deixaria de ver doses quando a tabela crescer (risco R3 do PRD).
- O dono continua vindo só do token: mesmo que um `medicineId` de outra pessoa chegasse à consulta, o filtro não devolveria nada.

**Malefícios**
- Uma segunda porta pessoal ao lado de `lerDoDono`. Mitigação: mesmo arquivo, filtro de dono obrigatório e testado, índice de lista fechada.
- Uma permissão nova no `backend.ts` (só `Query`, só nos índices dessa tabela).

### Opção B — `lerDoDono` e filtro de data em memória

**Benefícios**
- Nenhuma porta nova. Segue a regra "só por `lerDoDono`" ao pé da letra.

**Malefícios**
- Cada pergunta varre a tabela de doses de todos os usuários, e ela cresce todo dia.
- Com o teto de 10 páginas, a partir de um certo tamanho a ferramenta passa a responder com doses faltando, sem avisar.

### Recomendação: **Opção A**

**Motivo:** é o que o PRD já especificou (3.1, "usa o índice `medicineId` + `scheduledDate`") e o que o risco R3 pede. A segurança fica igual: o filtro de dono continua num lugar só e vindo só do token.

**Decisão:** **Opção A** (consulta pelo índice, porta nova com filtro de dono). Decidido em 2026-10-19.

---

## D3.3 — A R3 e a contagem de doses

**O que decidir:** como a resposta diz quantas doses ficaram sem marcação sem ser reprovada pela R3.

### Opção A — R3 intacta; a ferramenta e o prompt falam em "horários" *(recomendada)*

A ferramenta devolve os **horários** de cada dia com o estado de cada um ("marcado", "sem marcação", "ainda não chegou") e a lista dos horários sem marcação (com teto). O prompt manda responder com os horários ("ficaram sem marcação segunda às 8h e quarta às 20h") e nunca com "N doses". Se o modelo escrever "2 doses", a verificação reprova e ele gera de novo, como hoje.

**Benefícios**
- Nenhuma mudança na R3, que é a regra que mais protege.
- A lista de horários responde melhor que um número: a pessoa sabe **quais** doses conferir.

**Malefícios**
- Quando o modelo insistir em "2 doses", a resposta custa uma nova geração e, no pior caso, cai no modo degradado.

### Opção B — Exceção estreita para a contagem que a ferramenta devolveu

Um gancho como o `valoresCadastrados` do E2, que deixa passar "N doses" quando N é uma contagem desta ferramenta e a oração fala de marcação.

**Benefícios**
- Resposta com número direto ("2 doses sem marcação").

**Malefícios**
- Mexe na R3 de novo, e a exceção teria de aceitar o radical `tom-` ("doses tomadas"), que é o mesmo de "tome". O caso adversário central do épico ("esqueci, tomo 2 doses agora?") fica a uma vírgula de passar.
- Mais regex, mais casos adversariais, esforço maior.

### Recomendação: **Opção A**

**Motivo:** o épico mexe com adesão, onde a pior resposta é "compense a dose". Manter a R3 como está e mudar o vocabulário custa pouco e não abre nenhuma brecha.

**Decisão:** **Opção A** (R3 intacta; a resposta fala em horários). Decidido em 2026-10-19.

---

## D3.4 — Reforço da R3 para adesão (nasceu na spec, 2026-10-19)

**O que decidir:** se a verificação de linguagem passa a barrar as orientações de adesão que hoje passam.

**O que o código faz hoje (sondado com `checkLanguageRules` em 2026-10-19):**

| Frase | Hoje |
|---|---|
| "Você pode compensar a dose esquecida no próximo horário." | **passa** |
| "Não dobre a dose." | **passa** |
| "Mude o horário para as 9h, assim você não esquece." | **passa** |
| "Você está tomando direitinho, parabéns." | **passa** |
| "Sua adesão está boa." / "Você está em dia com o remédio." | **passa** |
| "Tome as duas doses agora para compensar." | barra (verbo "tome") |
| "Sua adesão está baixa." | barra (julgamento de valor) |
| "Você tem 3 horários sem marcação nesta semana." | barra, **por engano** (lida como diagnóstico: "você tem" + palavra fora do inventário) |

O PRD 3.2 pede que a resposta nunca oriente compensar, dobrar ou pular dose nem mudar horário, e que o retorno seja neutro, sem julgamento. Hoje isso depende só do prompt.

### Opção A — Padrões novos na R3, no estilo do D7.3, D8.4 e D9.4 *(recomendada)*

Duas famílias novas, com casos dos dois lados em `adversarial.test.ts`:
1. **Orientar a dose esquecida ou o horário:** compensar, repor, dobrar ou pular dose; tomar "as duas", "a dose esquecida", "a que faltou"; mudar, adiantar ou atrasar o horário do remédio. Com a mesma exceção estreita da recusa e da pergunta devolvida ("pergunte ao médico se pode compensar").
2. **Juízo sobre a adesão:** "em dia" e "atrasado" com assunto de remédio; "tomando direitinho/certinho/corretamente/bem"; "adesão" com adjetivo (boa, ótima, ruim, regular).

E uma correção de falso positivo: "horário(s)" e "marcação(ões)" entram no inventário do aplicativo, para "você tem 3 horários sem marcação" não ser lido como diagnóstico.

**Benefícios**
- A pior resposta do épico ("compense a dose") passa a ser barrada por código, não só por instrução ao modelo.
- Mesmo desenho dos reforços anteriores, com motivo próprio no bilhete da nova geração.

**Malefícios**
- Mais regex na regra que roda em toda resposta. Mitigação: janelas com teto (como o `ADIANTE` do E9) e medição do tempo da suíte.
- Risco de falso positivo em frase honesta ("você marcou o horário das 8h"). Mitigação: casos que passam na suíte, e o objeto exigido é dose ou horário **do remédio**.

### Opção B — Só o prompt

**Benefícios:** nenhuma mudança na verificação.
**Malefícios:** "compense a dose esquecida" continua passando se o modelo errar, e o critério do PRD 3.2 ("casos adversos caem no encaminhamento") fica sem prova por código.

### Recomendação: **Opção A**

**Motivo:** é o mesmo caminho que os três épicos de dado sensível seguiram, e aqui o risco é o maior deles: compensar ou dobrar dose por conta própria é dano direto.

**Decisão:** **Opção A** (padrões novos na R3 e correção do falso positivo). Decidido em 2026-10-19.

---

## D3.5 — O fuso do "agora" nas doses (nasceu na revisão, 2026-10-19)

**O que decidir:** se esta ferramenta segue a D1.2 (Brasília para todo mundo) ou usa o fuso da UF que o app já manda em cada pergunta (`local.uf`, E8).

**Por que voltou:** a revisão mostrou que, no E3, o erro da D1.2 é o "pior que não responder" da spec. Uma pessoa no Acre às 07:01 (09:01 em Brasília) ouviria "08:00 sem marcação" de um horário que, para ela, ainda não chegou. O app grava `scheduledDate` e julga o atraso pela hora do aparelho.

### Opção A — Fuso pela UF, só nesta ferramenta *(recomendada)*

AC, AM, RR, RO, MT e MS têm fuso próprio; as outras UFs e a ausência de UF ficam em Brasília. O resto do chat segue a D1.2.

**Benefícios:** corrige o caso mais sensível do épico com um dado que já chega. **Malefícios:** a ferramenta e o bloco de data do turno podem discordar em até 2 h para essas UFs; o oeste do Amazonas (UTC−5) segue com o fuso de Manaus.

### Opção B — Manter Brasília

**Benefícios:** nada muda. **Malefícios:** o "sem marcação" antes da hora para quem está fora do fuso.

**Decisão:** **Opção A** (fuso pela UF, só no E3). Decidido em 2026-10-19.

---

## Escolhas que fiz sem precisar de decisão (revise se discordar)

- **Janela:** padrão 7 dias, máximo 30. Trinta dias cobrem "este mês" e mantêm a saída curta.
- **Hoje no fuso de Brasília:** o dia e a hora de corte vêm de `partesEmSaoPaulo` (`formatoPtBr.ts`, E1), nunca do relógio UTC da função. *(Substituída pela D3.5: fuso pela UF.)*
- **Horário de hoje que ainda não passou** não é "sem marcação": é "ainda não chegou". Usa a mesma tolerância de uma hora da tela (`LATE_DOSE_TOLERANCE_MINUTES`).
- **Horários esperados pela regra do app.** A regra de `src/utils/medicineSchedule.ts` passa a morar num módulo compartilhado em `amplify/functions/` e o app a reexporta, como o E9 fez com as interações. Assim a ferramenta e a tela contam os mesmos horários. A Lambda de lembretes fica como está (fora do escopo).
- **Limitação dita na saída:** os dias passados são calculados com os horários cadastrados **hoje**. Se a pessoa mudou os horários no meio da janela, a ferramenta não sabe, e a explicação diz isso.

## Efeito no PRD de cada escolha

| Escolha | Efeito |
|---|---|
| D3.1 = A | 3.1 ganha o critério "dose de hoje marcada só no `takenToday` conta como marcada". |
| D3.2 = A | 3.1 como escrita; RT1 ganha a porta por índice com filtro de dono. |
| D3.2 = B | 3.1 deixa de usar o índice; risco R3 do PRD fica aberto. |
| D3.3 = A | 3.2 ganha "a resposta fala em horários, não em número de doses". |
| D3.3 = B | 3.2 ganha uma exceção na R3, e o esforço sobe. |
| D3.5 = A | 3.1 usa o fuso da UF da pessoa para "hoje" e para a tolerância. |
| D3.4 = A | 3.2 ganha padrões novos na R3 (dose esquecida, horário, juízo de adesão), provados em `adversarial.test.ts`. |

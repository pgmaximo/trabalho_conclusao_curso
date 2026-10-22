# Decisões do E5 — Agenda e vacinas: campos faltantes

Épico: [E5 no PRD](../prd.md) · Ordem de entrega: 6º · Uma decisão: D5.1 (nasceu na leitura do código, antes da spec)

O PRD listava o E5 como "sem decisão aberta". A leitura do código mostrou que o cálculo do próximo reforço pedido em 5.2 depende de um campo que o app não preenche, e isso muda o que o épico entrega. Daí esta decisão.

## O que o código faz hoje (verificado em 2026-10-19)

- `consultar_vacinas` (`amplify/functions/chat-assistant/tools/vacinas.ts`) devolve só `nome`, `numeroDaDose`, `aplicadaEm`, `local` e `previstaPara`, separando aplicadas de recomendadas.
- O schema `VaccineDose` (`amplify/data/schemas/vaccination.ts`) tem `recommendedIntervalYears`, `isCampaign`, `notes`, `catalogId`, `seriesTotal`, `lot` e `manufacturer`, todos opcionais.
- **Nenhum código do app grava `recommendedIntervalYears` nem `isCampaign: true`.** O cadastro (`AddVaccineScreen` → `registerAppliedDoseWithSeries`, em `src/services/vaccinationService.ts`) passa `catalogId`, `seriesTotal`, `lot` e `manufacturer`. Os dois campos só aparecem preenchidos em testes e em registros antigos.
- O intervalo de reforço real mora no catálogo do calendário nacional (`reforcoIntervaloAnos` em `src/data/calendarioNacionalVacinacao.ts`, por exemplo dT = 10 anos). `deriveNextDose` (`src/services/vaccineScheduleService.ts`) calcula o reforço a partir dele, mas **nenhuma tela usa essa função**: a carteira mostra como próxima dose só os registros pendentes já gravados (`groupByVaccine` em `src/hooks/useVaccinationData.ts`).
- Quando o usuário registra uma dose de uma série, o app cria em cascata os registros pendentes das doses seguintes, já com `dueDate`. Essas doses o chat já devolve hoje, em `recomendadasNaoAplicadas[].previstaPara`.

---

## D5.1 — Como o chat responde "quando é meu próximo reforço?"

**O que decidir:** de onde sai a data prevista do reforço, se o chat calcular uma.

### Opção A — Só o registrado *(recomendada)*

A ferramenta calcula `aplicadaEm` da **última dose aplicada daquela vacina** + o intervalo **gravado no registro** (`recommendedIntervalYears`), e só quando não existe dose pendente já registrada para a mesma vacina (a pendente gravada tem prioridade).

**Benefícios**
- Fiel ao PRD (5.2): cálculo determinístico na ferramenta, com o critério "teste de reforço calculado".
- O chat não diz nada que o registro do usuário não sustente. Não vira recomendação.
- Pouco código, sem mexer no app.

**Malefícios**
- Como o app quase nunca grava o intervalo, na prática a resposta costuma vir da dose pendente registrada ou de "não há data registrada".

### Opção B — Usar o catálogo

A ferramenta pega `reforcoIntervaloAnos` do calendário nacional pelo `catalogId`.

**Benefícios**
- Dá data para a dT mesmo sem o campo gravado. Mais útil.

**Malefícios**
- O catálogo está em `src/`. Teria de virar módulo compartilhado em `amplify/` com reexportação no app (como o E9 fez), mexendo em imports do app.
- O chat passaria a dizer uma data que a carteira não mostra. Isso se aproxima de recomendar vacina, que a ferramenta promete não fazer.

### Opção C — Não calcular

Devolve só os campos crus e as doses pendentes já registradas.

**Benefícios**
- O mais simples e seguro.

**Malefícios**
- Descumpre o critério do PRD "teste de reforço calculado".

### Recomendação: **Opção A**

**Motivo:** cumpre o PRD sem que o chat afirme mais do que o registro sustenta, e não abre uma segunda fonte de cálculo de esquema vacinal fora da tela.

**Decisão:** **Opção A** (só o registrado). Decidido em 2026-10-19.

**Efeito no PRD:** 5.2 fica como está; a spec registra que o intervalo vem só do registro e que a dose pendente gravada tem prioridade.

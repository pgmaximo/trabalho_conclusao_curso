# EPIC: Agenda — Lista contínua no tempo (Bloco 2)

> **Natureza desta EPIC:** redesenho aberto da tela **2c**, autorizado explicitamente pelo usuário em 2026-09-19 após usar o app no celular. **Diverge da regra 1 da constituição** ("fidelidade ao design é lei") de forma deliberada e documentada — ver §6, "A divergência e sua justificativa". Não é correção de defeito: os defeitos da Agenda foram corrigidos na EPIC `agenda-navegacao-temporal/`, e esta EPIC substitui boa parte do que aquela entregou.

## 1. Identificação

- **Tela de origem no Claude Design:** **2c** ("Agenda — calendário, lista do dia e novo agendamento"). O Canvas permanece como referência histórica; esta EPIC não o segue.
- **EPICs anteriores nesta tela:**
  - `specs/02-perfil-home-agenda/agenda/` — fidelidade ao Canvas 2c (faixa de 7 dias, paleta por tipo).
  - `specs/02-perfil-home-agenda/agenda-navegacao-temporal/` — corrigiu o defeito de alcance com navegação Dia/Semana/Mês/Ano e modos Próximos/Histórico. **É o que esta EPIC substitui.**
- **Rotas/arquivos:** `src/app/(app)/appointments.tsx` → `src/screens/AgendaScreen.tsx`.
- **Ator:** usuário final (paciente).
- **Prioridade: P2 (usabilidade).** Nenhum dado está inacessível hoje; a tela funciona. O que ela não faz é responder rápido à pergunta que o usuário mais faz.

## 2. História da funcionalidade

Como usuário final, quero abrir a aba Consultas e ver imediatamente o que vem a seguir, sem navegar nada — e, quando eu quiser planejar, ver o mês.

### 2.1 Por que redesenhar uma tela que funciona

A EPIC anterior corrigiu um defeito real: compromissos fora dos próximos 7 dias eram inacessíveis e indeletáveis. A correção foi **navegação** — quatro granularidades (Dia, Semana, Mês, Ano) mais dois modos de lista (Próximos, Histórico).

Foi a resposta certa para o defeito e a errada para a tela. O resultado, medido no print do app rodando em 2026-09-19:

- **Quatro faixas de controle empilhadas antes de qualquer conteúdo** — seletor de escopo, cabeçalho de período com setas, faixa de dias, chips de filtro. Em um aparelho de 390pt, elas consomem cerca de metade da altura útil.
- **Redundância de estado:** o cabeçalho diz "Hoje, 19 de setembro" e a faixa logo abaixo destaca o "19 set". A mesma informação, duas vezes, em dois formatos.
- **Duas fileiras de pílulas visualmente idênticas com significados diferentes:** Dia/Semana/Mês/Ano é granularidade; Próximos/Histórico é filtro que *sobrepõe* a granularidade. Nada na forma comunica essa diferença.
- **A faixa de dias corta o quinto dia ao meio.** É um `ScrollView` horizontal e portanto está correto, mas em repouso lê como layout quebrado, não como convite a rolar.
- **O estado vazio fica no fim de uma pilha de controles**, numa tela cuja resposta mais comum é "nada hoje".

**O uso declarado pelo usuário (2026-09-19):** dois usos, e só dois — *ver o que vem a seguir* (dominante, rápido) e *planejar/ver o mês* (ocasional, deliberado). Nenhum deles é servido por um seletor de quatro granularidades: Dia e Semana são recortes que uma lista cronológica entrega melhor, e Ano não serve a nenhum dos dois.

### 2.2 O desenho

**A tela é uma lista contínua no tempo, ancorada em hoje.** O passado fica acima, o futuro abaixo, e rolar é a única navegação. Não há faixas permanentes de controle: o cabeçalho e, logo em seguida, conteúdo.

O calendário do mês existe como **camada** aberta por um ícone no cabeçalho, e é **autossuficiente** — grade do mês mais os compromissos daquele mês, dentro dela. Não coordena posição de rolagem com a lista principal.

O histórico deixa de ser um modo: rolar para cima **é** ver o passado.

### 2.3 Cenários (Given/When/Then)

- **A pergunta principal, respondida em zero toques:**
  Given o usuário tem um compromisso amanhã às 08:00
  When ele abre `/appointments`
  Then esse compromisso está visível sem nenhuma interação, sob o rótulo "Amanhã".

- **Alcance do passado por rolagem:**
  Given existe um `Appointment` 20 dias atrás
  When o usuário rola a lista para cima
  Then o compromisso aparece sob a data dele, e tocá-lo abre `/edit-appointment?id=`.

- **Alcance do futuro distante:**
  Given existe um `Appointment` daqui a 13 dias
  When a tela carrega
  Then ele está na lista, abaixo dos mais próximos, sem exigir navegação. *(É o defeito da EPIC anterior, agora satisfeito por construção.)*

- **Hoje vazio, futuro existente:**
  Given não há compromisso hoje, mas há amanhã
  When a tela carrega
  Then abaixo do marcador "Hoje" aparece "Nada marcado para hoje", e a lista segue com o de amanhã.

- **Passado existente, futuro vazio:**
  Given todos os compromissos do usuário já passaram
  When a tela carrega
  Then abaixo do marcador "Hoje" aparece "Nada marcado daqui para frente" com o CTA "Agendar consulta". *(A lista não pode simplesmente terminar: terminar em silêncio parece falha de carregamento.)*

- **Nenhum compromisso, nunca:**
  Given o usuário não tem nenhum `Appointment`
  When a tela carrega
  Then é exibido o estado de primeira vez: "Você ainda não tem compromissos" + CTA "Agendar consulta". Sem marcador de hoje, sem lista.

- **Voltar para hoje:**
  Given o usuário rolou para longe do marcador de hoje
  When ele está longe o suficiente para o marcador sair da tela
  Then uma pílula flutuante "Hoje" aparece; tocá-la traz a lista de volta ao marcador, e a pílula some.

- **Ver o mês:**
  Given o usuário toca o ícone de calendário no cabeçalho
  When a camada abre
  Then ela mostra a grade do mês corrente, com marcador nos dias que têm compromisso, e abaixo os compromissos daquele mês; setas mudam de mês; tocar um card abre `/edit-appointment?id=`; fechar devolve a lista principal onde estava.

- **Compromisso com data corrompida:**
  Given existe um `Appointment` cujo `scheduledAt` não é analisável
  When a lista é montada
  Then ele aparece ao final da lista, sob o rótulo "Data inválida", e é tocável — para poder ser corrigido ou excluído.

- **Carregando e erro:** preservados exatamente como hoje (`ScreenSkeleton`, `EmptyState tone="error"` + "Tentar novamente").

## 3. Estrutura da página

De cima para baixo. **Não há nenhuma faixa de controle entre o cabeçalho e o conteúdo.**

1. `ScreenHeader`: título "Agenda", subtítulo "Seus compromissos de saúde", e **duas** ações à direita — ícone de calendário (abre a camada de mês) e "+" (abre `/add-appointment`).
2. Linha "Sincronizar com Google Agenda" (estado "Em breve"). **Preservada.**
3. **Lista contínua**, seccionada por dia. Cada seção tem um cabeçalho de data e os compromissos daquele dia em ordem de horário.
   - Rótulos de data: "Hoje", "Amanhã", ou a data por extenso ("Sexta, 25 de setembro"). Itens de outro ano incluem o ano.
   - Itens passados são visualmente atenuados, mas legíveis e tocáveis.
   - O **marcador de hoje** é um divisor nomeado, sempre presente quando há qualquer compromisso, mesmo que o dia esteja vazio.
   - A lista abre com o marcador de hoje no topo da área visível.
4. Pílula flutuante "Hoje", condicional à posição de rolagem.
5. Estado vazio, conforme o caso (§2.3).

**A camada de mês** (sobreposta): cabeçalho com o mês e setas, grade de 7 colunas com marcador nos dias ocupados, e abaixo a lista dos compromissos do mês. Botão de fechar.

## 4. Mapa de navegação

| Elemento | Ação | Destino | Condição |
|---|---|---|---|
| Card de compromisso (lista ou camada) | `router.push('/edit-appointment?id=')` | Edição/exclusão | Sempre — **é o caminho crítico desta EPIC** |
| Ícone de calendário (cabeçalho) | Abre a camada de mês | Permanece na tela | Sempre |
| Ação "+" (cabeçalho) | `router.push('/add-appointment')` | Tela 2d | Sempre |
| CTA "Agendar consulta" (estados vazios) | `router.push('/add-appointment')` | Tela 2d | Nos dois estados vazios que o oferecem |
| Pílula "Hoje" | Rola a lista até o marcador | Permanece na tela | Só quando o marcador está fora da tela |
| Setas da camada de mês | Mês anterior/seguinte | Permanece na camada | Sempre, dentro da camada |
| Fechar a camada | Volta à lista | Lista, na posição em que estava | Sempre, dentro da camada |
| Linha "Sincronizar com Google Agenda" | Modal "Em breve" | Permanece na tela | Preservada |

**Decisão registrada — a camada de mês é autossuficiente.** Uma versão anterior deste desenho fazia o toque num dia do calendário rolar a lista principal até aquela data. Foi descartada: exige coordenar a posição de rolagem de uma lista com uma camada sobreposta, e não tem resposta boa quando o dia tocado está vazio. A camada contendo a própria lista do mês elimina o estado compartilhado, e o custo é apenas repetir o componente de card.

## 5. Mapa de dados

Fonte real única, inalterada: `Appointment` no DynamoDB, via `useAppointmentsData`, que já devolve **todos** os compromissos do usuário. **Nenhuma mudança de schema** (regra 5). Nenhum dado mockado (regra 2).

| Elemento | Origem | Fonte técnica | Observação |
|---|---|---|---|
| Lista contínua | Real | `appointments` de `useAppointmentsData` | Já real. Muda só o agrupamento e a ordem de apresentação |
| Seções por dia | Real (derivado) | Agrupamento de `scheduledAt` por dia local | Novo |
| Marcador de hoje | Derivado | Posição de hoje na sequência de seções | Novo |
| Grade do mês | Real (derivado) | `buildMonthCells`, **reaproveitado da EPIC anterior** | Sem alteração |
| Rótulo de data da seção | Derivado | "Hoje"/"Amanhã"/data por extenso | Generaliza o rótulo existente |

### 5.1 O que é apagado

| Artefato | Destino |
|---|---|
| `src/components/AgendaScopeSelector.tsx` | Apagado — não há mais escopos |
| `src/components/AgendaPeriodHeader.tsx` | Apagado — não há mais período navegável na tela principal |
| `src/components/YearMonthsGrid.tsx` | Apagado — a visão de ano não serve a nenhum dos dois usos declarados |
| `src/components/CalendarPicker.tsx` | Apagado — a faixa de dias desaparece |
| `buildDayCells`, `buildWeekCells`, `buildYearCells` | Apagados de `agendaDateRange.ts` |
| `AgendaScope`, `AgendaListOverride`, `shiftAnchor`, `formatPeriodLabel` | Apagados — sem escopo não há o que deslocar nem rotular |
| `src/hooks/useAgendaNavigation.ts` | **Apagado.** O único estado que sobraria é o mês visível dentro da camada — e esse pertence à própria camada, não a um hook compartilhado. Um hook cujo único consumidor é um modal é indireção sem ganho |

### 5.2 O que sobrevive intacto

`parseScheduledAt`, `isPast`, `compareScheduled`, `isWithinRange`, `isDateWithinRange`, `toIsoDate`, `startOfDay`, `buildRange` e `buildMonthCells` em `agendaDateRange.ts`; `MonthCalendarGrid`; `AppointmentCard`; `src/services/homeAppointments.ts` e toda a Home; `useAppointmentsData`; `appointmentService`; `amplify/**`.

**O contrato de data é o ativo mais valioso das duas EPICs anteriores e não é tocado.**

### 5.3 O teste de regressão herdado

`__tests__/agendaCompromissoForaDaJanela.test.tsx` assere tocando nos chips "Próximos" e "Histórico", que deixam de existir. Ele é **reescrito, não apagado**. A garantia que ele protege — todo `Appointment` é alcançável e excluível — continua valendo, e no desenho novo fica mais forte: os dois compromissos (13 dias à frente, 20 dias atrás) devem estar presentes **sem nenhuma interação**, porque não há mais controle a descobrir.

Reescrevê-lo é item de primeira ordem no plano, não consequência de outro item.

## 6. Requisitos não-funcionais específicos

### A divergência e sua justificativa

Esta EPIC **não segue o Canvas 2c**, e isso é uma divergência da regra 1 da constituição, não uma ambiguidade da regra 8 — a regra 8 cobre "o Canvas não deixa claro qual dado alimenta este elemento", que é pequeno demais para o que se faz aqui.

A justificativa, para registro e para defesa em banca:

1. **O Canvas desenhou navegação por calendário; o uso real é outro.** O usuário, depois de usar o app em dispositivo, declarou dois usos: ver o que vem a seguir (dominante) e planejar o mês (ocasional). Uma faixa de dias com seletor de granularidade não serve nenhum dos dois melhor que uma lista cronológica.
2. **O recorte por calendário já havia se mostrado insuficiente.** O desenho original tornava inacessível e indeletável qualquer compromisso fora de uma janela de 7 dias — defeito corrigido na EPIC anterior, mas cuja existência mostra que o recorte não sustentava o uso real dos dados.
3. **A densidade de controle é desproporcional ao conteúdo.** Quatro faixas de controle numa tela cuja resposta mais comum é uma linha, ou nenhuma.

Esta é uma **decisão de produto informada por uso posterior ao Canvas**. Deve ser registrada como tal em `specs/design/GAP_ANALYSIS.md`, nomeando o Canvas 2c como referência superada nesta tela — não como requisito descumprido por descuido.

### Demais requisitos

- **Contrato de data (herdado, inalterado).** Toda leitura de `scheduledAt` passa por `parseScheduledAt`. Nenhum `new Date(scheduledAt)`, nenhuma comparação com `toISOString()`.
- **Nada quebra (regra 5).** Sem mudança de schema, sem alteração de `useAppointmentsData`, `appointmentService` ou da Home.
- **Stack existente (regra 3).** Nenhuma biblioteca nova. A lista é `SectionList` do React Native com `initialScrollIndex`; a agenda pessoal tem dezenas de itens, não milhares, e `useAppointmentsData` já os tem todos em memória — não há necessidade de paginação nem carregamento incremental.
- **Paleta (regra 7).** Nenhuma cor nova. Itens passados são atenuados por opacidade e peso, nunca por uma cor nova.
- **Acessibilidade.** Cabeçalhos de seção com `accessibilityRole="header"`. Cards com alvo mínimo de 48dp. A pílula "Hoje" com `accessibilityLabel` explícito. Item atenuado precisa manter contraste de texto suficiente — atenuar não pode significar ilegível.
- **Sem dado inventado (regra 2).** Um dia sem compromisso não ganha seção; a ausência é comunicada pelos estados vazios nomeados em §2.3.

## 7. Critérios de aceite

- [ ] Um `Appointment` daqui a 13 dias e outro 20 dias atrás estão **ambos presentes na lista sem nenhuma interação**, e tocar cada um navega para `/edit-appointment?id=<id>`. *(reescrita do teste herdado — §5.3)*
- [ ] A tela abre com o marcador de hoje no topo da área visível.
- [ ] Com hoje vazio e futuro existente, aparece "Nada marcado para hoje" e a lista segue.
- [ ] Com passado existente e futuro vazio, aparece "Nada marcado daqui para frente" + CTA.
- [ ] Sem nenhum compromisso, aparece o estado de primeira vez + CTA, sem marcador nem lista.
- [ ] A pílula "Hoje" aparece apenas quando o marcador está fora da tela e devolve a lista a ele.
- [ ] O ícone de calendário abre a camada de mês; ela mostra a grade com marcadores, os compromissos do mês, e setas de mês; fechar devolve a lista na posição em que estava.
- [ ] Um `Appointment` com `scheduledAt` inválido aparece ao final, rotulado "Data inválida", e é tocável.
- [ ] Estados de carregando e erro preservados sem alteração.
- [ ] `AgendaScopeSelector`, `AgendaPeriodHeader`, `YearMonthsGrid` e `CalendarPicker` foram **apagados**, e nenhum import órfão restou. *(verificável por `grep`)*
- [ ] `buildDayCells`, `buildWeekCells`, `buildYearCells`, `shiftAnchor`, `formatPeriodLabel`, `AgendaScope` e `AgendaListOverride` foram apagados de `agendaDateRange.ts`, e o restante do módulo segue verde.
- [ ] `grep` não encontra construção de `Date` a partir de `scheduledAt` nem comparação com `toISOString()` em nenhum arquivo da Agenda.
- [ ] `src/services/homeAppointments.ts`, `src/app/(app)/dashboard.tsx`, `src/screens/HomeScreen.tsx`, `useAppointmentsData`, `appointmentService` e `amplify/**` não aparecem no diff.
- [ ] Nenhuma biblioteca nova; nenhuma cor fora de `DESIGN_TOKENS.md`.
- [ ] A divergência da regra 1 está registrada em `GAP_ANALYSIS.md` com a justificativa de §6.
- [ ] `npm run validate` passa.
- [ ] **Teste manual em dispositivo:** abrir a aba Consultas e confirmar que a resposta a "tenho algo marcado?" está visível sem tocar em nada; rolar para cima e alcançar um compromisso passado; abrir a camada de mês e voltar.

# Tasks: Agenda — Navegação temporal e Histórico

> Status: **não iniciado.** Nenhuma tarefa marcada até que o teste correspondente esteja verde e a evidência registrada. Marcar `[x]` sem comando executado é proibido — ver §9.

## 1. Teste de regressão do defeito (primeiro, e falhando)

- [ ] `__tests__/agenda-compromisso-fora-da-janela.test.tsx`: renderiza a Agenda com dois `Appointment` mockados no nível do serviço — um a **+13 dias** e um a **−20 dias** — e assere que ambos podem ser alcançados e que o toque chama `router.push` com `/edit-appointment?id=<id>`.
- [ ] Executar `npx jest agenda-compromisso-fora-da-janela` e **confirmar a falha**, colando a saída no relatório de bloco. A falha tem de ser "elemento não encontrado", não erro de import — se for erro de import, o teste está errado, não o código.

## 2. `src/services/agendaDateRange.ts` (módulo puro)

- [ ] `__tests__/agenda-date-range.test.ts` escrito antes da implementação, cobrindo:
  - [ ] `parseScheduledAt("2026-10-01T09:00")` → 01/10/2026 09:00 **local**; `parseScheduledAt("")` e `parseScheduledAt("lixo")` → `null`.
  - [ ] `buildRange` nos 4 escopos, com `end` inclusivo até `.999`.
  - [ ] Virada de mês: âncora 31/01, `shiftAnchor('mes', +1)` não cai em 03/03.
  - [ ] Virada de ano: âncora 31/12, `shiftAnchor('dia', +1)` → 01/01 do ano seguinte.
  - [ ] Bissexto: `buildRange('mes', 15/02/2028)` termina em 29/02.
  - [ ] Semana começa domingo, inclusive quando a âncora é o próprio domingo.
  - [ ] `isPast`: hoje 15:00 avaliado às 14:00 em UTC−3 → `false`. **Este é o teste do bug de fuso.**
  - [ ] `buildMonthCells` preenche com `null` antes do dia 1 e depois do último dia.
- [ ] Implementar até todos passarem.
- [ ] Verificar que o arquivo não importa React, Amplify nem AsyncStorage.

## 3. `src/hooks/useAgendaNavigation.ts`

- [ ] `__tests__/use-agenda-navigation.test.ts` com `renderHook`:
  - [ ] Estado inicial: `scope === 'dia'`, âncora = hoje, `listOverride === null`.
  - [ ] `setScope('mes')` preserva a âncora.
  - [ ] `goNext()` / `goPrevious()` deslocam 1 unidade do escopo corrente.
  - [ ] `drillDown` desce `ano → mes` e `mes → dia`, movendo a âncora.
  - [ ] `canGoToToday` é `false` quando a âncora contém hoje e `true` depois de `goNext()`.
  - [ ] `setScope` limpa `listOverride` ativo.
- [ ] Implementar até passarem.

## 4. Enxugar `src/hooks/useAppointmentsData.ts`

- [ ] Remover `dates`, `selectedDate`, `setSelectedDate`, `selectedDayLabel`, `appointmentsForSelectedDate` e as funções privadas de janela/rótulo.
- [ ] `mapAppointmentToEntry` passa a usar `parseScheduledAt` em vez de `split('T')`.
- [ ] Atualizar o cabeçalho de documentação do arquivo — ele descreve hoje a janela de 7 dias, que deixa de existir aqui.
- [ ] `npm run typecheck` sem erro e **`src/app/(app)/dashboard.tsx` não editado** — se precisou editar, o contrato foi quebrado; reverter e reavaliar.

## 5. Componentes novos

- [ ] `src/components/AgendaScopeSelector.tsx` — 4 posições, tokens de `DESIGN_TOKENS.md` §4, `accessibilityState={{ selected }}`.
- [ ] `src/components/AgendaPeriodHeader.tsx` — `‹` rótulo `›` + botão "Hoje" condicional; setas com `hitSlop` até 48dp e `accessibilityState={{ disabled }}` real quando desabilitadas.
- [ ] `src/components/MonthCalendarGrid.tsx` — grade 7 colunas, célula ≥44×44 + `hitSlop`, marcador = ponto **e** peso de fonte (nunca cor sozinha), hoje destacado, `accessibilityLabel` com a data por extenso.
- [ ] `src/components/YearMonthsGrid.tsx` — grade 3×4, contagem como texto ("3 compromissos").
- [ ] Nenhum dos quatro importa `agendaDateRange` nem calcula data.

## 6. `CalendarPicker` e tipos

- [ ] `src/types/models.ts`: `CalendarDateItem` ganha `isoDate: string` e `isToday?: boolean`.
- [ ] `src/components/CalendarPicker.tsx`: `selectedDate: string` (`AAAA-MM-DD`) e `onDateSelect(isoDate: string)`; `key` passa a ser `isoDate`; destacar `isToday` quando não selecionado.
- [ ] `grep -rn "CalendarPicker" src __tests__` confirmando que `AgendaScreen` segue como consumidor único.

## 7. `AgendaScreen` + rota

- [ ] `src/app/(app)/appointments.tsx` compõe `useAppointmentsData` + `useAgendaNavigation` e repassa para a tela.
- [ ] `AgendaScreen` renderiza, na ordem do `spec.md` §3: cabeçalho → linha Google Agenda → `AgendaScopeSelector` → `AgendaPeriodHeader` → visualização do escopo → rótulo → chips Próximos/Histórico → lista → estado vazio.
- [ ] Regra de lista implementada como um `useMemo` de três ramos (`plan.md` §4), sem combinação cruzada entre escopo e override.
- [ ] `AppointmentCard` recebe `dateLabel?: string` (opcional) — ausente no escopo Dia sem override, presente nos demais. `AppointmentEntry.time` **não** muda.
- [ ] Copy do estado vazio por escopo: "Nenhum compromisso neste dia / nesta semana / neste mês / neste ano", sempre com CTA "Agendar consulta".
- [ ] Estados de carregando e erro preservados sem edição.
- [ ] Registros com `scheduledAt` inválido aparecem ao final de "Histórico" com rótulo "Data inválida" (`plan.md` §7) — **e são tocáveis**, para poderem ser excluídos.

## 8. Fechamento do teste do item 1

- [ ] `npx jest agenda-compromisso-fora-da-janela` verde, com a saída registrada.
- [ ] Teste adicional: após `deleteAppointment`, o item some da lista sem remontar a tela (o registro de refetch de `appointmentsCache` já existe — confirmar que segue funcionando com o hook enxugado).

## 9. Validação final (evidência obrigatória)

- [ ] `npm run validate` executado por inteiro, com a saída colada no relatório de fim de bloco. Nenhum item acima é marcado com base em leitura de código.
- [ ] Verificação por `grep` de que nenhum arquivo de agenda constrói `Date` a partir de `scheduledAt` fora de `parseScheduledAt`, nem compara `scheduledAt` com `toISOString()`.
- [ ] `git diff --stat` conferindo que `amplify/data/schemas/appointments.ts` e `package.json` não foram tocados.
- [ ] Teste manual em dispositivo com Amplify sandbox (Node 20): criar um compromisso no passado, achá-lo por "Histórico", **excluí-lo**, e confirmar que some da Agenda e da Home. Este é o cenário exato reportado em 2026-09-18 — sem ele, a EPIC não está entregue.

## 10. Documentação

- [ ] `specs/design/GAP_ANALYSIS.md` (Bloco 2, linha 2c): registrar a extensão do Canvas com os 4 escopos e o Histórico, com a justificativa da regra 8 já escrita no `spec.md` §6.
- [ ] Criar `specs/02-perfil-home-agenda/home-compromissos/` (EPIC irmã) com os defeitos da Home listados no `spec.md` §2.1, para que não se percam.

# Tasks: Agenda — Lista contínua no tempo

> Status: **não iniciado.** Nenhum item marcado até que o comando correspondente tenha rodado e a evidência esteja registrada. Marcar `[x]` por leitura de código é proibido — ver §6.

> **A ordem importa mais nesta EPIC que nas anteriores.** A subtração (§5) vem depois de a tela nova estar verde. Apagar cedo deixa os passos intermediários acontecendo numa tela quebrada, sem suíte que diga se algo regrediu.

## 1. Reescrever o teste de regressão herdado (primeiro, e falhando)

> `__tests__/agendaCompromissoForaDaJanela.test.tsx` hoje assere tocando nos chips "Próximos" e "Histórico". Eles deixam de existir. O teste é **reescrito, não apagado**: a garantia que ele protege — todo `Appointment` é alcançável e excluível — foi a razão de uma EPIC inteira, e não pode se perder numa reforma visual.

- [ ] Reescrever contra a API nova, com asserções **mais fortes** que as atuais:
  - [ ] Um `Appointment` a **+13 dias** e outro a **−20 dias** estão ambos presentes na lista **sem nenhuma interação** — nada de `fireEvent.press` antes de assertar.
  - [ ] Tocar cada um chama `router.push` com `/edit-appointment?id=<id>` correspondente.
  - [ ] Um `Appointment` com `scheduledAt` inválido aparece rotulado "Data inválida" e é tocável.
- [ ] Manter o nome do arquivo, para o histórico do git ligar a reescrita ao teste original.
- [ ] Rodar `npx jest agendaCompromissoForaDaJanela` e **confirmar a falha**, colando a saída. A falha tem de ser de asserção ou de prop inexistente — não de import.

## 2. `src/services/agendaTimeline.ts` (novo, puro)

- [ ] `__tests__/agendaTimeline.test.ts` escrito antes da implementação, cobrindo:
  - [ ] Agrupa por dia local e ordena cronologicamente.
  - [ ] Rotula "Hoje", "Amanhã" e data por extenso; inclui o ano quando o compromisso é de outro ano.
  - [ ] **A seção de hoje existe mesmo vazia**, sempre que houver qualquer compromisso — é ela que ancora a rolagem.
  - [ ] Sem nenhum compromisso, devolve lista vazia (sem seção de hoje) — o estado de primeira vez não tem lista.
  - [ ] Registros com `scheduledAt` inválido vão para uma seção final com `isoDate: null` e rótulo "Data inválida".
  - [ ] `isPast` correto por seção, com a virada do dia e a virada do ano.
  - [ ] `findTodaySectionIndex` devolve o índice certo, e `-1` quando não há seções.
- [ ] Implementar reaproveitando `parseScheduledAt`, `compareScheduled` e `toIsoDate` de `agendaDateRange.ts` — **sem duplicar nenhum deles**.
- [ ] `now: Date` injetado por parâmetro, nunca lido do relógio dentro do módulo.
- [ ] Verificar por grep ancorado (`^import .*(react|expo|amplify|async-storage)`) que o módulo é puro.

## 3. A lista na tela

- [ ] `AgendaScreen` passa a renderizar `SectionList` alimentada por `buildTimelineSections`.
- [ ] `initialScrollIndex` na seção de hoje, com `getItemLayout` e alturas fixas declaradas para card e cabeçalho de seção (`plan.md` §1).
- [ ] Endereço do card com `numberOfLines={1}` — a altura fixa depende disso.
- [ ] Itens passados atenuados por opacidade no bloco, nunca por cor nova e nunca em texto isolado.
- [ ] Marcador de hoje como divisor nomeado.
- [ ] Os três estados vazios da `spec.md` §2.3, com a copy exata: "Você ainda não tem compromissos", "Nada marcado para hoje", "Nada marcado daqui para frente".
- [ ] Pílula "Hoje" via `onViewableItemsChanged`, com `viewabilityConfig` em referência estável (`useRef` ou constante de módulo) — senão o React Native reclama de configuração mutável em tempo de execução.
- [ ] Estados de carregando e erro preservados **sem alteração**.
- [ ] Cabeçalho ganha o ícone de calendário ao lado do "+".
- [ ] Linha "Sincronizar com Google Agenda" preservada.
- [ ] `npx jest agendaCompromissoForaDaJanela` → **verde**. Este é o portão da EPIC.

## 4. A camada de mês

- [ ] `Modal` com estado local do mês visível; não é rota (`plan.md` §3).
- [ ] `MonthCalendarGrid` reaproveitado **sem alteração**, alimentado por `buildMonthCells`.
- [ ] Abaixo da grade, os compromissos do mês, filtrados por `isWithinRange(scheduledAt, buildRange('mes', mesVisivel))`.
- [ ] Setas de mês anterior/seguinte; botão de fechar.
- [ ] Card dentro da camada navega para `/edit-appointment?id=`, como na lista.
- [ ] Fechar devolve a lista principal na posição em que estava — sem coordenação de scroll com a camada.

## 5. A subtração (só agora)

- [ ] Apagar `src/components/AgendaScopeSelector.tsx`.
- [ ] Apagar `src/components/AgendaPeriodHeader.tsx`.
- [ ] Apagar `src/components/YearMonthsGrid.tsx`.
- [ ] Apagar `src/components/CalendarPicker.tsx`.
- [ ] Apagar de `src/services/agendaDateRange.ts`: `buildDayCells`, `buildWeekCells`, `buildYearCells`, `shiftAnchor`, `formatPeriodLabel`, e os tipos `AgendaScope` e `AgendaListOverride`. Apagar também os testes correspondentes em `__tests__/agendaDateRange.test.ts`, **preservando os do núcleo** (`parseScheduledAt`, `isPast`, `compareScheduled`, `buildRange`, `buildMonthCells`, `isWithinRange`, `toIsoDate`, `startOfDay`).
- [ ] Apagar `src/hooks/useAgendaNavigation.ts` e `__tests__/useAgendaNavigation.test.ts`. O único estado que sobraria é o mês visível, e ele vive na própria camada — um hook com um único consumidor, que é um modal, é indireção sem ganho.
- [ ] Ajustar `src/types/models.ts` se `CalendarDateItem` perder campos que só a faixa de dias usava. `MonthCalendarGrid` ainda o consome — conferir antes de remover qualquer coisa.
- [ ] `grep -rn "AgendaScopeSelector\|AgendaPeriodHeader\|YearMonthsGrid\|CalendarPicker\|buildDayCells\|buildWeekCells\|buildYearCells\|shiftAnchor\|formatPeriodLabel" src __tests__` → **sem saída**.
- [ ] `npm run typecheck` sem erro — nenhum import órfão.

## 6. Validação final (evidência obrigatória)

- [x] `npm run validate` por inteiro, com a saída colada. Nenhum item acima marcado por leitura de código. **Evidência (Task 6, 2026-09-19):** os quatro estágios (typecheck, typecheck:backend, lint, test:ci) passaram — `npm run validate` saiu com exit code 0; lint reportou só os 11 warnings pré-existentes (0 erros, fora do escopo desta EPIC); `test:ci`: `Test Suites: 104 passed, 104 total` / `Tests: 1153 passed, 1153 total`. Saída completa no relatório da Task 6 (`.superpowers/sdd/2026-09-19-agenda-lista-continua/task-6-report.md`).
- [x] `grep -rnE "new Date\([a-zA-Z.]*scheduledAt|scheduledAt.*toISOString|toISOString.*scheduledAt" src/screens/AgendaScreen.tsx src/services/agendaTimeline.ts` → sem saída. **Evidência (Task 6, 2026-09-19):** comando rodado (também rodado na variante de 3 arquivos do brief da Task 6, incluindo `AgendaMonthLayer.tsx` — mesma ausência de saída em ambos), sem correspondência, exit code 1 (sem match).
- [x] `git diff --name-only` sem `src/services/homeAppointments.ts`, `src/app/(app)/dashboard.tsx`, `src/screens/HomeScreen.tsx`, `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `amplify/**`, `package.json`, `package-lock.json`. **Evidência (Task 6, 2026-09-19):** saída = `specs/design/GAP_ANALYSIS.md` e `src/hooks/useAppointmentsData.ts` — este último aparece porque a própria Task 6 corrigiu, autorizadamente, só um comentário nele (ver "Trabalho extra" do brief da Task 6); nenhum arquivo da lista de proibidos foi tocado.
- [ ] Teste manual em dispositivo (Node 20, sandbox Amplify): abrir a aba Consultas e confirmar que a resposta a "tenho algo marcado?" está visível **sem tocar em nada**; rolar para cima e alcançar um compromisso passado; abrir a camada de mês, navegar um mês e fechar; conferir que item passado atenuado continua legível. **NÃO EXECUTADO nesta sessão** — exige aparelho físico/emulador e sandbox Amplify reais, indisponíveis neste ambiente. Ver pendência destacada no relatório da Task 6.

## 7. Documentação

- [x] `specs/design/GAP_ANALYSIS.md`: registrar a divergência da regra 1 com a justificativa da `spec.md` §6 — o Canvas 2c passa a ser **referência superada nesta tela**, por decisão de produto informada por uso posterior, e não requisito descumprido por descuido. Nomear os dois usos declarados que motivaram a mudança. **Feito (Task 6, 2026-09-19):** item 42 acrescentado, e a linha da tabela 2c atualizada.
- [x] Registrar que `specs/02-perfil-home-agenda/agenda-navegacao-temporal/` foi **substituída** por esta EPIC, para quem ler as specs em ordem não achar que a navegação por escopos ainda existe. **Feito (Task 6, 2026-09-19):** registrado no item 42 e como nota "SUPERADO" acrescentada ao item 9.c.

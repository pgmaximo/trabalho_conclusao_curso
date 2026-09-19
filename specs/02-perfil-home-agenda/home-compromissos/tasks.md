# Tasks: Home — Compromissos coerentes e clicáveis

> Status: **não iniciado.** Nenhum item marcado até que o comando correspondente tenha rodado e a evidência esteja registrada. Marcar `[x]` por leitura de código é proibido — ver §6.

## 1. Testes de regressão (primeiro, e falhando)

- [ ] `__tests__/homeCompromissos.test.tsx` criado, cobrindo os dois defeitos de comportamento:
  - [ ] **D1, o caso que o usuário veria:** com `now` = 14:00 local, um `Appointment` para hoje às **16:00** aparece em "Próximos compromissos". Hoje falha — a comparação `scheduledAt >= toISOString()` o esconde.
  - [ ] **D1, o outro lado:** com `now` = 14:00, um `Appointment` para hoje às **09:00** não aparece.
  - [ ] **D1, a trava:** o teste precisa falhar se alguém reintroduzir a comparação de strings. Construa o esperado a partir de componentes de data locais, nunca de uma string ISO fixa, para a suíte não ficar amarrada a UTC−3.
  - [ ] **D5:** com `now` = 20:00 e o único compromisso do dia às 15:00, o "Resumo de hoje" não cita 15h.
  - [ ] **D5:** com `now` = 10:00 e compromissos às 09:00 e 15:00, o resumo conta 1 e cita 15h.
  - [ ] **D3:** tocar o card de um compromisso de id conhecido chama `router.push` com `/edit-appointment?id=<id>`.
  - [ ] **D3, preservação:** tocar "Ver agenda" chama `router.push('/appointments')`.
  - [ ] **Registro corrompido:** um `Appointment` com `scheduledAt` inválido não aparece em nenhuma das duas seções e não quebra a renderização.
- [ ] Rodar `npx jest homeCompromissos` e **confirmar a falha**, colando a saída no relatório. As falhas têm de ser de asserção (elemento ausente, `router.push` com argumento errado), não de import — erro de import significa teste malescrito, não código defeituoso.

## 2. `src/services/homeAppointments.ts` (novo) e `src/app/(app)/dashboard.tsx` — D1, D2 e D5

> A lógica de seleção sai do arquivo de rota para um módulo puro, com `now: Date` injetado — é o que torna os cenários de fuso testáveis sem relógio falso e sem arrastar `expo-router` e quatro hooks para a suíte. Ver `plan.md` §6 e a seção de exceção no Diagnóstico. A rota passa a ser invólucro fino; o módulo novo tem ~50 linhas e remove ~40 dela.

- [ ] `src/services/homeAppointments.ts` criado, importando `parseScheduledAt`, `isPast` e `compareScheduled` de `@/services/agendaDateRange`, e exportando `isSameCalendarDay`, `selectUpcomingAppointments`, `selectTodayUpcoming`, `buildTodaySummaryText` e `buildDashboardTodaySummary` — todas recebendo `now: Date` explicitamente.
- [ ] Verificado por `grep` que o módulo novo não importa React, Expo, Amplify nem AsyncStorage.
- [ ] **D1:** o filtro de `upcomingAppointments` passa a usar `isPast(a.scheduledAt, now) === false`, com `now` sendo um `Date`, não uma string ISO.
  - [ ] Comentário no código explicando por que é `=== false` e não `!isPast(...)`: `!null` é `true` e deixaria entrar registro corrompido — o oposto do `!== false` que a Agenda usa no Histórico, e os dois estão certos nos seus contextos.
- [ ] **D1:** a ordenação passa a usar `compareScheduled` em vez de `localeCompare`, para haver um só jeito de ordenar compromissos no app.
- [ ] **D2:** `isSameCalendarDay` passa a usar `parseScheduledAt` e a devolver `false` para data inválida.
- [ ] **D5:** `buildTodaySummaryText` filtra por dia **e** por `isPast(...) === false`.
- [ ] **D5:** `buildDashboardTodaySummary` reaproveita o conjunto já filtrado em vez de refazer o filtro por conta própria (hoje as duas contas podem discordar).
- [ ] **D5:** quando havia compromissos hoje mas todos já passaram, o card usa o texto de dia sem compromissos (`'Nenhum compromisso ou pendência para hoje.'`) — decisão registrada no `plan.md` §4, para não inventar uma terceira frase fora do Canvas.
- [ ] **Testabilidade:** `buildTodaySummaryText` e o filtro de próximos recebem `now: Date` como parâmetro explícito, em vez de lerem o relógio internamente (`plan.md` §6).
- [ ] **D3:** ligar `onNavigateToAppointmentDetail` a `router.push(\`/edit-appointment?id=${encodeURIComponent(id)}\`)`. A rota recebe o `id` já como string (a conversão fica no ponto de chamada, em `HomeScreen` — ver §3) e só o codifica para a URL.

## 3. `src/screens/HomeScreen.tsx` — D3 e D4

- [ ] **D3:** `HomeScreenProps` ganha `onNavigateToAppointmentDetail?: (id: string) => void`. **Aditivo** — `onNavigateToAppointments` continua existindo e continua servindo "Ver agenda", o botão do Resumo, o estado vazio e o Acesso rápido.
- [ ] **D3:** `UpcomingAppointmentCard` chama o callback novo com o `id` do compromisso. Como `AppointmentEntry.id` é `string | number` e a prop é tipada `(id: string) => void`, **a conversão `String(id)` acontece aqui**, no ponto de chamada — a rota recebe uma string e só se preocupa em codificá-la para a URL.
- [ ] **D3:** o card mantém `accessibilityRole="button"` e alvo de toque de no mínimo 48dp, no padrão do card de exame.
- [ ] **D4:** `formatAppointmentWhen` passa a usar `parseScheduledAt`, com `'Data inválida'` como reserva — o mesmo rótulo que a Agenda usa no Histórico, para a mesma condição ter o mesmo nome nas duas telas.
- [ ] Nenhuma mudança estrutural na tela: mesma ordem visual, mesmos componentes, mesma copy fora do que o item D5 exige.

## 4. `src/hooks/appointmentsCache.ts` — D6 (opcional)

> Item explicitamente opcional (`spec.md` §7). Pode ser adiado sem bloquear a EPIC — mas, se for adiado, **tem de virar linha em `GAP_ANALYSIS.md`**, senão não foi adiado, foi esquecido.

- [ ] Chave passa a ser `@SuaSaude:appointmentsCache:<userId>`, com o `userId` vindo de `getUserId()` de `@/services/auth/userSessionService`.
- [ ] TTL de 5 minutos gravado junto do payload; `loadCachedAppointments` devolve `null` quando expirado.
- [ ] `invalidateAppointmentsCache` continua funcionando com a chave nova (hoje ela é chamada no logout, por `src/services/auth/session.ts:27`).
- [ ] Teste cobrindo: cache expirado devolve `null`; cache de outro usuário não é lido.

## 5. Fechamento dos testes do item 1

- [ ] `npx jest homeCompromissos` verde, com a saída registrada lado a lado com a falha do item 1.
- [ ] `npx jest agendaCompromissoForaDaJanela` continua verde — a EPIC da Agenda não pode ter regredido.

## 6. Validação final (evidência obrigatória)

- [x] `npm run validate` executado por inteiro (Task 6, 2026-09-19): PASS nos quatro estágios — `typecheck` sem erros, `typecheck:backend` sem erros, `lint` com 0 erros (11 warnings pré-existentes fora deste trabalho), `test:ci` com 104 suítes / 1150 testes passando. Saída completa no relatório `task-6-report.md`.
- [x] `grep -rnE "new Date\([a-zA-Z.]*scheduledAt|scheduledAt.*toISOString|toISOString.*scheduledAt" "src/app/(app)/dashboard.tsx" src/screens/HomeScreen.tsx src/services/homeAppointments.ts` executado (Task 6, 2026-09-19) → **sem saída** (grep saiu com código 1, "nenhum match"). Confirma D2/D4.
- [x] `git diff --stat` e `git diff --name-only` executados (Task 6, 2026-09-19): a única mudança no diff da worktree é `specs/design/GAP_ANALYSIS.md` (edição desta própria task). **Não** aparecem `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `src/services/agendaDateRange.ts`, `src/screens/AgendaScreen.tsx`, `amplify/**`, `package.json` nem `package-lock.json`.
- [ ] Teste manual em dispositivo (Node 20, sandbox Amplify): criar um compromisso para **daqui a duas horas**, confirmar que ele aparece em "Próximos compromissos" na Home, tocá-lo e confirmar que abre aquele compromisso. Depois esperar passar do horário (ou criar um já vencido) e confirmar que o "Resumo de hoje" não o cita mais. Sem este passo a EPIC não está entregue — os testes cobrem a lógica, não o caminho real até o DynamoDB. **NÃO EXECUTADO nesta sessão** — exige dispositivo físico/simulador e sandbox Amplify reais, que o agente não tem acesso. Fica pendente para o usuário rodar manualmente.

## 7. Documentação

- [ ] `specs/design/GAP_ANALYSIS.md`: atualizar a linha do Bloco 2 / 2b registrando os defeitos corrigidos e, se D6 tiver sido adiado, registrá-lo como pendência nomeada.
- [ ] Se durante a execução aparecer um sétimo defeito na Home, ele **não** entra nesta EPIC sem decisão explícita: registre-o aqui e decida depois. O motivo desta EPIC existir é que seis defeitos pequenos ficaram sem dono; abrir a porta para o sétimo no meio da execução recria o problema.

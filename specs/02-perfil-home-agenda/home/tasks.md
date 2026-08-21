# TASKS: Home — Resumo, Indicadores e Acesso Rápido (Bloco 2)

Referência: `spec.md` e `plan.md` nesta mesma pasta. Nenhuma tarefa aqui toca `amplify/data/schemas/*`.

## 1. Dados — de-mock de "Próximos compromissos" e "Resumo de hoje"
- [x] `dashboard.tsx` agora usa `useAppointmentsData()` ao lado de `useExamsData()`; `useDashboardData()`/`useUserContext()` (parcial) removidos do fluxo.
- [x] `upcomingAppointments` derivado: filtra por `scheduledAt >= agora` (ISO, ver campo novo abaixo), ordena por proximidade, top 2; renderizado por `UpcomingAppointmentCard` (título `"{Tipo} · {Nome}"`, meta `"{time} · {location}"`, barra lateral azul/verde por `appointment.type`).
- [x] `todaySummaryText` derivado em `buildTodaySummaryText()`: conta compromissos com `scheduledAt` no dia de hoje, monta `"{N} consulta(s) às {hora}"` ou a copy neutra "Nenhum compromisso ou pendência para hoje." quando vazio — sem cláusula de medicamentos.
- [x] `useDashboardData()` removido do fluxo da Home (import trocado por `getDashboardTodayLabel` direto de `@/mocks/api`, que é função pura, sem mock de rede — `dashboardApi.ts`/`useDashboardData.ts` continuam existindo, apenas não são mais importados por `dashboard.tsx`).
- [x] `recentExams` inalterado, 100% `useExamsData()`.
- [x] **Extensão de tipo necessária, fora do escopo original do plan.md**: `AppointmentEntry` (mapeado por `useAppointmentsData`) não expunha o `scheduledAt` ISO bruto, só uma string formatada sem ano (`time`) — impossível filtrar "futuro"/"hoje" corretamente a partir dela. Adicionado campo `scheduledAt: string` a `AppointmentEntry` (`types/models.ts`) e populado em `mapAppointmentToEntry` (`useAppointmentsData.ts`), aditivo/não-quebrando (`AgendaScreen.tsx`/2c não usa o campo novo).

## 2. `HomeScreen.tsx` — remover mock, refazer estrutura
- [x] Seção "Indicadores principais" (`metrics`/`MetricCard` x4) removida por completo.
- [x] Props do mock (`summary`/`metrics`/`upcomingEvents`/`preventiveAlert`/`isLoading`/`errorMessage` globais) substituídas por props por widget (`todaySummaryText`, `preventionAlert`, `recentExams`/`examsLoading`/`examsError`/`onRetryExams`, `upcomingAppointments`/`appointmentsLoading`/`appointmentsError`/`onRetryAppointments`).
- [x] Card "Resumo de hoje" reconstruído com `bg-app-primaryDark dark:bg-app-dark-primaryDark` (token `#0C6341`/`#3AA377`, batendo com o Canvas sem hex novo hardcoded), pill "Ver agenda de hoje →" navegando para `/appointments`.
- [x] Ícone de sino adicionado no cabeçalho (44×44 via `h-11 w-11`, borda `app-border`, `Ionicons name="notifications-outline"`), sem badge; `onNotificationPress` é opcional/no-op por ora (central de notificações não existe — pendência nova registrada no GAP_ANALYSIS).
- [x] Seção "Prevenção em atraso" tornada condicional via prop `preventionAlert?: {title, subtitle} | null` — `dashboard.tsx` passa `null` (nunca renderiza ainda; JSX pronta para quando a EPIC de Prevenção expuser um hook real).
- [x] Link "Ver todos" adicionado em "Últimos exames" (`onNavigateToExams` → `/exams`).
- [x] Seção "Próximos eventos" (mock) substituída por "Próximos compromissos" com `upcomingAppointments` (card local `UpcomingAppointmentCard`, não o `AppointmentCard.tsx` compartilhado — ver nota abaixo) + link "Ver agenda" (→ `/appointments`).
- [x] Loading/erro tratados por widget (`ScreenSkeleton`/`EmptyState tone="error"` + retry independentes para exames e compromissos) — nenhum estado global esconde a tela inteira.
- [x] Grid "Acesso rápido" corrigido: tile "Wearable" removido; labels "Agenda"/"Análise IA"/"Remédios"/"Prevenção"; grid 2×2 único.
- [x] **Decisão de implementação não antecipada no plan.md**: não reaproveitei `AppointmentCard.tsx` (usado por 2c/Agenda) para o card de "Próximos compromissos" — esse componente usa `COLORS`/`FONTS` estáticos (não reativos a dark mode, mesma pendência #19 do GAP_ANALYSIS) e sua paleta por tipo (azul/vermelho/laranja/verde) não bate com a paleta do Canvas 2b (azul consulta / verde exame). Criei `UpcomingAppointmentCard` local em `HomeScreen.tsx`, usando os tokens reativos do tema, para não herdar o gap de dark mode nem alterar um componente compartilhado com uma EPIC ainda não implementada (2c) fora do escopo desta.

## 3. Estados e cenários (validação manual/QA)
- [x] Cenário dashboard vazio, carregamento e erro parcial: cobertos estruturalmente pela composição por widget (`examsLoading`/`examsError` e `appointmentsLoading`/`appointmentsError` são independentes) — não executado como teste automatizado nesta sessão (nenhuma suite de testes existia para `HomeScreen`/`dashboard.tsx` antes desta EPIC; não criada uma nova neste passe, ver §5).
- [ ] Validação manual em dispositivo/simulador com dados reais (Amplify sandbox) não executada nesta sessão.
- [x] Cenário notificação sem itens não lidos: sino sempre renderiza sem badge (nenhum estado de contagem existe na prop).

## 4. Documentação / rastreabilidade
- [x] Pendência de central de notificações registrada em `GAP_ANALYSIS.md` (nova, ver item #14 já existente — atualizado para referenciar esta EPIC).
- [x] Pendência #5 ("Resumo do Dashboard 2b") em `GAP_ANALYSIS.md` atualizada: parte de compromissos des-mockada, mantida aberta só para medicamentos + prevenção.
- [x] Nenhuma reabertura/duplicação das decisões de schema de Prevenção (#2) ou Medicamentos (#1) — apenas referenciadas.

## 5. Fora de escopo (não fazer/não feito nesta EPIC)
- [ ] Não implementar model Amplify de notificações, medicamentos ou prevenção.
- [ ] Não implementar badge de status Normal/Alterado nem campo de laboratório em "Últimos exames" (herda decisão de `specs/03-exames-receitas/lista`).
- [x] Não deletado `src/mocks/dashboard.ts`/`src/mocks/api/dashboardApi.ts`/`src/hooks/useDashboardData.ts` (ficam órfãos por ora — `dashboard.tsx` parou de importá-los, mas os arquivos continuam existindo; limpeza de código morto é decisão separada, fora desta EPIC).
- [ ] Nenhuma suite de teste automatizado (`__tests__/home-screen.test.tsx`) foi criada para esta tela — nenhuma existia antes; considerar como follow-up.

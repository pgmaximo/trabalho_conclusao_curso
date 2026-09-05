# Tasks: Agenda — Calendário, Lista do Dia e Novo Agendamento (2c)

## 1. Tipos
- [x] `src/types/models.ts`: `'retorno'` removido de `AppointmentType`, agora `'consulta' | 'exame' | 'cirurgia'`.
- [x] Confirmado via grep: as demais ocorrências de "retorno" no repo eram o mock morto `src/mocks/appointments.ts` (corrigido para `'consulta'`) e um comentário não relacionado em `avatarService.ts` ("retorno" = valor de retorno de função).

## 2. Hook de dados (`src/hooks/useAppointmentsData.ts`)
- [x] `dates` reescrito: sempre 7 dias fixos (hoje + 6 seguintes, janela rolante — decisão registrada no `plan.md`), via `buildDateWindow()`.
- [x] `hasAppointments` recalculado por dia comparando `scheduledAt` real de cada `Appointment` contra cada dia da janela (`buildCalendarDates()`), não mais "está no array".
- [x] `mapAppointmentToEntry`: `time` agora é só `HH:mm`.
- [x] `selectedDayLabel` adicionado ao retorno do hook (`"Hoje, {dia} de {mês}"` ou `"{dia da semana}, {dia} de {mês}"`).
- [x] Seleção padrão (`useState(new Date().getDate())`) preservada e compatível com a nova janela.
- [x] **Achado além do `plan.md`, necessário para os cenários do `spec.md` funcionarem**: o hook nunca filtrava `appointments` pelo dia selecionado — retornava a lista inteira sempre, então o cenário "dia sem compromissos" nunca era alcançável na prática (a lista sempre mostrava tudo, independente da seleção). Corrigido adicionando um campo novo, `appointmentsForSelectedDate` (filtrado), **sem alterar o significado de `appointments`** (que continua sendo a lista completa, sem filtro — contrato do qual `dashboard.tsx`/Home 2b já depende desde a EPIC anterior). `AgendaScreen`/`appointments.tsx` passaram a consumir `appointmentsForSelectedDate`.

## 3. Componente de card (`src/components/AppointmentCard.tsx`)
- [x] Cores hardcoded (`#3498DB`/`#E74C3C`/`#F39C12`/`#10B981`) substituídas pelo mapeamento de tokens do `plan.md` item 4: `consulta` → `secondary`/`secondarySoft`/`info`; `exame` → `warning`/`warningSoft`/`warning`; `cirurgia` → `primary`/`primarySoft`/`primaryDark` (valores hex conferem exatamente com os do plan).
- [x] `case 'retorno'` removido.
- [x] Barra lateral 3px + badge pill com bg/texto do par correto (nunca cor sozinha).
- [x] **Melhoria não pedida explicitamente, mas natural ao escopo**: componente migrado de `COLORS`/`FONTS` estáticos (sempre modo claro, mesma causa-raiz da pendência #19 do GAP_ANALYSIS) para `useThemeColors()` reativo — já que a paleta por tipo estava sendo reescrita de qualquer forma, evitei introduzir cores reativas só parcialmente.

## 4. Seletor de dias (`src/components/CalendarPicker.tsx`)
- [x] Confirmado: já renderiza todas as células recebidas via prop `dates` sem filtragem própria — nenhuma mudança necessária no componente em si.
- [x] Indicador `dot` já reflete `hasAppointments` (vem 100% do hook, item 2).

## 5. Tela (`src/screens/AgendaScreen.tsx`)
- [x] `selectedDayLabel` renderizado (600 18px) acima da lista, substituindo o título genérico de `Section` (a seção em si foi removida — a lista agora é renderizada diretamente, conforme o Canvas 2c não desenhar um cabeçalho de `Section` ali).
- [x] Estado vazio do dia agora tem `actionLabel="Agendar consulta"` + `onActionPress` para `/add-appointment`.
- [x] Copy corrigida para "Sincronizar com Google Agenda" (era "Google Calendar").
- [x] `onPress={() => {}}` substituído por um `Modal` local ("Em breve") alimentado por `getGoogleCalendarSyncComingSoon()` — nunca um handler vazio.
- [x] Reordenada a estrutura da tela para bater com a ordem visual do Canvas 2c: header → linha de sincronização → seletor de 7 dias → rótulo do dia → lista/estado vazio (antes a linha de sincronização vinha depois da lista).

## 6. Stub de sincronização Google Agenda (novo arquivo)
- [x] Criado `src/services/googleCalendarSync.ts` exportando `isGoogleCalendarSyncAvailable(): boolean` (sempre `false`, com comentário da pendência) e `getGoogleCalendarSyncComingSoon()` (retorna `{title, message}` consumido pelo `Modal` da tela, em vez de `Alert.alert` nativo — reaproveita o padrão de painel inline já preferido no restante do app, ver pendência #18 do GAP_ANALYSIS sobre `Alert` nativo).
- [x] Nenhuma chamada de rede — puramente strings estáticas.

## 7. Documentação de pendência (regra 2/6 da constituição)
- [x] `specs/design/GAP_ANALYSIS.md` (Bloco 2, linha 2c) atualizado registrando a sincronização com Google Agenda como pendência técnica formal, isolada atrás de `googleCalendarSync.ts`.

## 8. Testes/verificação manual
- [x] Cobertura estrutural: `appointmentsForSelectedDate` filtra corretamente por dia (lógica testável, mas nenhuma suite automatizada nova criada para `AgendaScreen`/hook nesta sessão — nenhuma existia antes).
- [ ] Validação manual em dispositivo/simulador com dados reais (Amplify sandbox) não executada nesta sessão.
- [x] Cores por tipo conferidas contra os hex exatos do `plan.md` na implementação (revisão de código, não captura de tela).
- [x] Tocar "Sincronizar com Google Agenda" abre o `Modal` "Em breve" (nunca navega, nunca finge sucesso).
- [x] FAB e card de compromisso preservados (`/add-appointment`, `/edit-appointment?id=`).

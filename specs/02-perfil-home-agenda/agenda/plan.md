# Plano técnico: Agenda — Calendário, Lista do Dia e Novo Agendamento (2c)

## Diagnóstico — o que já existe vs. o que o Canvas 2c pede

`AgendaScreen.tsx` já implementa a espinha dorsal correta: header + `CalendarPicker` (seletor horizontal) + lista de `AppointmentCard` + `EmptyState`/`ScreenSkeleton`/erro + FAB (`router.push('/add-appointment')`). A rota `appointments.tsx` já liga tudo a dados reais via `useAppointmentsData` → `appointmentService` → DynamoDB `Appointment`. Isso é bem mais avançado que uma tela do zero. O trabalho deste EPIC é de **correção/fidelidade**, não de construção nova.

Diffs concretos contra o Canvas 2c:

1. **Seletor de 7 dias incompleto.** Canvas: `agDaysList` sempre 7 células fixas (`hint-placeholder-count="7"`), qualquer uma selecionável, com indicador visual de "tem compromisso" independente da seleção. Código: `buildCalendarDates()` em `useAppointmentsData.ts` só inclui no array os dias que já têm ao menos um `Appointment` (`daySet.add(day)` só roda dentro do loop de `appointments`) — um dia vazio simplesmente não aparece como opção. Isso quebra o cenário "dia sem compromissos": o usuário não consegue nem chegar lá pelo seletor.
   - **Fix**: reescrever a construção de `dates` para gerar sempre 7 dias fixos a partir de hoje (`new Date()` + 0..6, ou uma janela que inclua o dia atual centralizado — Canvas não deixa explícito o range exato, decisão: hoje + 6 dias seguintes, mais simples e testável), marcando `hasAppointments` por comparação real de `scheduledAt` com cada dia da janela.
   - Ambiguidade (regra 8): o Canvas não mostra se a janela de 7 dias é fixa por semana-calendário (dom-sáb) ou rolante (hoje + 6). Interpretação adotada: rolante a partir de hoje, por ser mais útil (sempre mostra o próximo compromisso relevante) e mais simples de testar/comparar independente do dia da semana em que o app é aberto.

2. **Rótulo do dia selecionado ausente.** Canvas: `agSelectedLabel` (600 18px) acima da lista, ex. "Hoje, 20 de agosto". Código: `AgendaScreen.tsx` vai direto de `CalendarPicker` para `<Section title="Próximos compromissos" .../>` — texto de seção genérico, não o rótulo dinâmico do dia.
   - **Fix**: adicionar computação de rótulo (ex. `formatSelectedDayLabel(selectedDate, dates)` no hook ou na tela) e renderizar acima da lista, condicionalmente "Hoje, ..." quando `selectedDate === new Date().getDate()`.

3. **Estado vazio sem CTA "Agendar consulta".** Canvas: ícone-tile azul-info (`#E9F1FD`/`#CBDFFA`) + texto + botão primário navegando para novo agendamento. Código: `EmptyState` genérico (`icon="calendar-outline"`, sem `actionLabel`/`onActionPress`).
   - **Fix**: passar `actionLabel="Agendar consulta"` e `onActionPress={() => router.push('/add-appointment')}` ao `EmptyState` usado no ramo "sem compromissos no dia" (distinto do `EmptyState tone="error"` de falha de rede, que já tem `actionLabel="Tentar novamente"`).

4. **Paleta/enum de tipo de compromisso divergente do design system.** `AppointmentCard.tsx` usa cores hardcoded fora de `DESIGN_TOKENS.md` (`#3498DB`, `#E74C3C`, `#F39C12`, `#10B981`) e um tipo `'retorno'` que não existe no schema real (`appointmentTypeEnum = CONSULTA | EXAME | CIRURGIA`, `amplify/data/schemas/appointments.ts`). `types/models.ts` define `AppointmentType` com 4 valores lowercase incluindo `'retorno'`, inconsistente com `appointmentService.ts` (`'CONSULTA' | 'EXAME' | 'CIRURGIA'`, uppercase). `useAppointmentsData.ts` já faz `appointment.appointmentType.toLowerCase()` para converter — então o `'retorno'` do front nunca é alcançável a partir de dados reais (morto).
   - **Fix**: remover `'retorno'` de `types/models.ts` `AppointmentType`; alinhar para os 3 valores reais (mantendo a decisão de usar minúsculas no front, já que a conversão `toLowerCase()` já existe e funciona). Substituir a paleta hardcoded de `AppointmentCard.tsx` por tokens de `DESIGN_TOKENS.md` §1. Mapeamento proposto (decisão desta EPIC, já que o Canvas não expõe hex por tipo — apenas bindings genéricos `it.color`/`it.tagBg`/`it.tagColor`):
     - `consulta` → azul secundário: barra/ícone `#1B63C4`, badge bg `#E9F1FD`, badge texto `#14509F` (reaproveita o semantic "Info/Agendado" de `DESIGN_TOKENS.md` §1, coerente com "consulta agendada").
     - `exame` → âmbar: barra/ícone `#8A5300`, badge bg `#FFF3DF`, badge texto `#8A5300` (semantic "Warning/Atenção" — justificativa: exame é o tipo que mais historicamente carrega "atenção/pendência de resultado" no restante do app, ver 3a).
     - `cirurgia` → verde primário: barra/ícone `#10794E`, badge bg `#E8F5EE`, badge texto `#0C6341` (semantic "Success/Normal" reaproveitado apenas como diferenciação visual do 3º tipo — não implica juízo de valor sobre a cirurgia).
     - Essa tripla reaproveita exatamente os 3 pares de cor já usados em outros badges do app (nenhuma cor nova introduzida), respeitando regra 7 da constituição.

5. **Formato do horário no card inclui a data inteira.** Canvas: coluna de horário do card mostra só `HH:mm` (a data já está no rótulo do dia acima, item 2). Código: `mapAppointmentToEntry` em `useAppointmentsData.ts` monta `time: "${displayDate} • ${displayTime}"`, duplicando a data em cada card.
   - **Fix**: `AppointmentEntry.time` passa a ser só `displayTime` (`HH:mm`); a data completa fica só no `agSelectedLabel` (item 2). Isso é puramente de apresentação, não requer mudança de schema.

6. **`hasAppointments` no `CalendarPicker` deixa de ser trivialmente `true`.** Consequência direta do fix 1 — precisa ser recalculado por dia real, não apenas "está no array".

7. **"Sincronizar com Google Agenda" — confirmado: nenhuma integração real existe.**
   - Busca no repositório (`grep -rn "Google" src amplify`) mostra apenas `signInWithGoogle()` em `src/services/auth/google-auth.ts` (login via Cognito Google Identity Provider) e usos em `LoginScreen`/`RegisterScreen`/`register.tsx`/`index.tsx` — todos relacionados a **autenticação**, não a Calendar API. Nenhum pacote de Calendar API (`googleapis`, escopos `calendar.*`, `expo-auth-session` para Calendar) existe em `package.json` ou no código.
   - `AgendaScreen.tsx` já tem a linha renderizada (linha 95–109) com o texto "Sincronizar com Google Calendar" (nome ligeiramente diferente do Canvas, que diz "Google Agenda" — ajuste de copy incluído no fix) mas `onPress={() => {}}` — **exatamente o "fake toggle que não faz nada" que a constituição regra 2 proíbe** implicitamente (não é dado mockado exibido, mas é uma ação que finge existir).
   - **Fix**: criar uma função nomeada isolada, ex. `src/services/googleCalendarSync.ts` exportando `isGoogleCalendarSyncAvailable(): boolean` (retorna `false` hoje, comentário explicando a pendência) e `openGoogleCalendarSyncComingSoon()` (ou, mais simples no nível de UI, um `Alert.alert`/bottom sheet local com copy "Sincronização com Google Agenda — em breve. Estamos trabalhando nessa integração."). Trocar `onPress={() => {}}` por essa função. Registrar formalmente em `GAP_ANALYSIS.md` (Bloco 2, linha 2c) como pendência técnica, não implementar OAuth/Calendar API nesta EPIC (fora de escopo — mudança de infraestrutura maior, exigiria decisão de produto sobre custo/escopo de permissões Google solicitadas).
   - Decisão de nomenclatura: alinhar o texto ao Canvas ("Sincronizar com Google Agenda" em vez de "Google Calendar" — cosmético, mas fidelidade de copy é regra 1).

8. **Código morto a considerar remover (não bloqueante):** `src/mocks/api/appointmentsApi.ts` não é referenciado por `useAppointmentsData.ts` (confirmado em `CODE_INVENTORY.md` §6). Não é usado por este fluxo — decisão: **não remover neste EPIC** (fora de escopo de "Agenda — calendário/lista/FAB"; remoção de código morto entre telas é decisão de limpeza mais ampla, melhor tratada em um EPIC de housekeeping ou junto do EPIC de 2d/2e se também não o usarem).

## Bibliotecas / dependências
Nenhuma biblioteca nova necessária (regra 3 da constituição). Toda a correção é local: hooks (`useAppointmentsData.ts`), componentes existentes (`AgendaScreen.tsx`, `AppointmentCard.tsx`, `CalendarPicker.tsx`), tipos (`types/models.ts`), e um novo módulo de serviço pequeno e isolado (`googleCalendarSync.ts` — stub, sem dependência externa).

## Ordem de implementação sugerida (não vinculante, ver `tasks.md`)
1. Corrigir tipos (`AppointmentType` em `types/models.ts`, remover `'retorno'`).
2. Corrigir `useAppointmentsData.ts`: seletor de 7 dias fixo + `hasAppointments` real + `time` só com hora + `agSelectedLabel`.
3. Corrigir `AppointmentCard.tsx`: paleta de `DESIGN_TOKENS.md`, remover cores hardcoded fora do sistema.
4. Corrigir `AgendaScreen.tsx`: renderizar `agSelectedLabel`, CTA no `EmptyState` do dia vazio, copy "Google Agenda", trocar `onPress` do sync por stub nomeado.
5. Criar `src/services/googleCalendarSync.ts` (stub nomeado e isolado).
6. Atualizar `GAP_ANALYSIS.md` (Bloco 2, linha 2c) registrando a pendência de sync Google Agenda.

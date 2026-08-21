# EPIC: Agenda — Calendário, Lista do Dia e Novo Agendamento (Bloco 2)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **2c** ("Agenda — calendário, lista do dia e novo agendamento") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 796–840). Tela **2d** ("Novo agendamento", linha 842+) é a tela de destino do FAB, mas está **fora do escopo** deste EPIC (mapeia para `AddAppointmentScreen.tsx`, já existente, própria unidade rastreável por regra 6 da constituição).
- Rota/arquivo no código (existente): `src/app/(app)/appointments.tsx` (rota `/appointments`, aba "Consultas" da tab bar) → renderiza `src/screens/AgendaScreen.tsx`, alimentado por `src/hooks/useAppointmentsData.ts`.
- Ator(es): usuário final (paciente), consultando e organizando seus próprios compromissos de saúde (consultas, exames, cirurgias).
- **Prioridade: P1** (`GAP_ANALYSIS.md`, Bloco 2, linha "2c Agenda — calendário/lista do dia"), já com dados reais (DynamoDB `Appointment`), status `ATUALIZAR`.

## 2. História da funcionalidade
Como usuário final, quero ver meus compromissos de saúde organizados por dia, navegar rapidamente entre os próximos 7 dias, e abrir o fluxo de novo agendamento a partir de um botão flutuante, para acompanhar minha agenda de saúde sem precisar abrir um app de calendário externo.

### Cenários (Given/When/Then)

- **Carregando:**
  Given a tela `/appointments` é aberta
  When `useAppointmentsData` está buscando `client.models.Appointment.list()` (ou lendo do cache `AsyncStorage` via `appointmentsCache.ts`) e `status === 'loading'`
  Then a tela mostra o padrão de skeleton (`ScreenSkeleton`, já implementado) equivalente ao "Carregando seus dados..." documentado em `DESIGN_TOKENS.md` §4 — hoje já implementado (`isLoading` → `<ScreenSkeleton blocks={3} />`), manter.

- **Erro de rede:**
  Given a chamada a `client.models.Appointment.list()` falha
  When `useAsyncResource` captura o erro e define `status === 'error'`
  Then a tela exibe o callout de erro padrão (`DESIGN_TOKENS.md` §4: card vermelho, ícone "!", mensagem, botão outline "Tentar novamente") — hoje já implementado via `EmptyState tone="error"` + `onRetry={appointments.retry}`, manter.

- **Dia sem compromissos (vazio):**
  Given o usuário seleciona, no seletor de 7 dias, uma data para a qual não existe nenhum `Appointment` com `scheduledAt` correspondente
  When a lista filtrada pelo dia selecionado está vazia
  Then a tela exibe o estado vazio do Canvas 2c: tile de ícone 56×56 (`#E9F1FD`/`#CBDFFA`), texto "Nenhum compromisso neste dia.", botão primário "Agendar consulta" (56px, radius 14, `#10794E`) que abre `/add-appointment` — **gap**: hoje `EmptyState` usa o padrão genérico (ícone `calendar-outline`, título "Nenhum compromisso neste dia", descrição "Escolha outra data ou cadastre um novo atendimento", **sem** CTA/botão), não o padrão do Canvas com CTA "Agendar consulta" navegando para o formulário. Corrigir em `plan.md`.

- **Dia com múltiplos compromissos coloridos por tipo (sucesso):**
  Given existem 2+ `Appointment` reais no DynamoDB com `scheduledAt` caindo no dia selecionado
  When `useAppointmentsData` resolve com dados filtrados para aquele dia
  Then a lista renderiza um card por compromisso, na ordem do Canvas: horário à esquerda (700 18px), barra vertical colorida (3px, cor por `appointmentType`), nome do compromisso (600 17px), local/endereço (400 16px, `#55605C`), tag/badge de tipo (pill 999px) — ver §5 Mapa de dados para a fonte real de cada campo e a paleta correta por tipo.

- **"Sincronizar com Google Agenda" (pendência técnica — regra 2 da constituição):**
  Given o usuário toca na linha "Sincronizar com Google Agenda" no topo da tela (Canvas 2c, abaixo do subtítulo, acima do seletor de 7 dias)
  When não existe, hoje, nenhuma integração com Google Calendar/Agenda no código (confirmado: nenhum client OAuth do Google Calendar, nenhum escopo de Calendar API, nenhuma chamada a `googleapis`/`expo-auth-session` para Calendar em todo o repositório — o único uso de "Google" existente é `signInWithGoogle()` em `src/services/auth/google-auth.ts`, que é **login via Cognito/Google Identity Provider**, não acesso à Calendar API)
  Then o toque **não** deve simular sucesso nem abrir um toggle que liga/desliga nada. Deve abrir um estado isolado e nomeado (ex.: bottom sheet ou tela "Em breve — Sincronização com Google Agenda", com copy explicando que a funcionalidade está em desenvolvimento) atrás de uma função nomeada de stub (ex.: `openGoogleCalendarSyncComingSoon()`), nunca um `onPress={() => {}}` silencioso. Esta pendência é registrada em `GAP_ANALYSIS.md` como funcionalidade não implementada, elegível a placeholder documentado por regra 2 da constituição, e **não é objeto de implementação real de sync neste EPIC** (fora de escopo: exigiria OAuth com escopos `https://www.googleapis.com/auth/calendar`, backend de refresh token e sync bidirecional — trabalho de EPIC próprio, se priorizado no futuro).

## 3. Estrutura da página
Ordem visual observada no markup (2c), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Título de página "Agenda" (600 26px, `#141817`).
3. Subtítulo "Seus compromissos de saúde" (400 16px, `#55605C`).
4. Linha "Sincronizar com Google Agenda" (altura 48px, radius 12, borda 1.5px `#DFE3E1`, fundo `#fff`, ícone quadrado 20×20 borda azul `#1B63C4`, texto 600 16px `#141817`, seta "›" à direita `#55605C`) — ver cenário de pendência acima.
5. Seletor horizontal de 7 dias (`agDaysList`, `hint-placeholder-count="7"`): 7 células de largura flexível (`flex:1`), altura 64px, radius 14, cada uma com dia da semana abreviado (600 13px) e número do dia (700 18px); selecionado = fundo/borda/cor conforme binding `d.bg`/`d.border`/`d.color` (padrão selecionado/não-selecionado do design system: selecionado = borda `#10794E` + fundo `#E8F5EE` + texto `#0C6341`, análogo a `DESIGN_TOKENS.md` §4 chips).
6. Rótulo do dia selecionado (`agSelectedLabel`, 600 18px, `#141817`, ex. "Hoje, 20 de agosto").
7. Lista de compromissos do dia (`agItems`, condicional a `agHasItems`), scroll vertical, cada card (`#fff`, borda 1px `#EFF1F0`, radius 16, padding 14px, gap 10px entre cards):
   - Coluna de horário (64px, 700 18px, `#141817`).
   - Barra vertical colorida 3px, `border-radius:2px`, cor = `it.color` (por tipo de compromisso).
   - Coluna de conteúdo: nome (600 17px, `#141817`), local (400 16px, `#55605C`), badge/tag de tipo (pill 999px, fundo `it.tagBg`, texto 600 14px `it.tagColor`).
8. Estado vazio condicional (`agEmpty`): card branco centralizado, ícone-tile 56×56 (`#E9F1FD`/`#CBDFFA`), texto "Nenhum compromisso neste dia.", botão primário 52px "Agendar consulta" (`#10794E`, texto branco).
9. FAB "+" (56×56, círculo `#10794E`, sombra `0 6px 16px rgba(16,121,78,.35)`), posicionado `right:20px; bottom:100px` — abre `/add-appointment` (tela 2d, fora deste EPIC).
10. Bottom navigation bar (5 abas: Início/**Consultas** ativo/Exames/Remédios/Mais).
11. Home-indicator bar decorativa.

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Linha "Sincronizar com Google Agenda" | Linha de ação | Abre estado "Em breve" nomeado (stub) | Permanece na tela (bottom sheet/modal local) | Sempre visível — **nunca `onPress={() => {}}` vazio**, ver cenário de pendência |
| Seletor de 7 dias — cada célula | Botão de seleção | Atualiza `selectedDate` | Permanece na tela, filtra a lista do dia | Sempre visível, 7 células fixas (hoje + próximos 6 dias, ou janela equivalente), independente de haver compromisso no dia |
| Card de compromisso (item da lista) | Item de lista | Navega para edição | `/(app)/edit-appointment?id=` (tela 2e, já implementada, fora deste EPIC) | Visível quando há compromissos no dia selecionado — hoje já implementado em `AgendaScreen.tsx` |
| Botão "Agendar consulta" (estado vazio) | Botão primário | Navega para novo agendamento | `/add-appointment` (tela 2d) | Visível apenas quando o dia selecionado não tem compromissos — **gap**: hoje o `EmptyState` da tela não tem essa ação, ver `plan.md` |
| FAB "+" | Botão flutuante | Navega para novo agendamento | `/add-appointment` (tela 2d) | Sempre visível — hoje já implementado (`router.push('/add-appointment')`) |
| Bottom nav — "Consultas" | Aba ativa | N/A (já na tela) | — | Destacada (fundo `#E8F5EE`, texto/ícone `#0C6341`) |
| Bottom nav — outras abas | Navegação | `router.replace(tab.href)` | Início/Exames/Remédios/Mais | Sempre visível (já implementado via `BottomTabBar`) |

## 5. Mapa de dados

Fonte real única: tabela DynamoDB `Appointment` (`amplify/data/schemas/appointments.ts`), lida via `client.models.Appointment.list()` em `src/services/appointmentService.ts`, consumida por `src/hooks/useAppointmentsData.ts`. Campos do model: `id`, `appointmentType` (enum `'CONSULTA' | 'EXAME' | 'CIRURGIA'`), `appointmentName` (string, obrigatório), `professionalName` (string, obrigatório), `scheduledAt` (string ISO, obrigatório), `address` (string, obrigatório), `observations` (string, opcional).

| Campo exibido no Canvas (2c) | Origem do dado | Fonte técnica real | Tipo | Observação / pendência |
|---|---|---|---|---|
| Horário do card (`it.time`) | Real | `Appointment.scheduledAt` (parte `HH:mm`) | string ISO → derivado | Já mapeado em `useAppointmentsData.ts` → `mapAppointmentToEntry`, mas hoje concatenado como `"DD/MM/AAAA • HH:mm"` (inclui a data completa) em vez de só a hora, porque o Canvas já separa data (rótulo do dia selecionado) de hora (coluna do card). Ajuste de apresentação necessário — ver `plan.md`. |
| Nome do compromisso (`it.title`) | Real | `Appointment.appointmentName` | string | Já mapeado → `title` |
| Local (`it.local`) | Real | `Appointment.address` | string | Já mapeado → `location` |
| Profissional (`professionalName`) | Real, **não exibido hoje** | `Appointment.professionalName` | string | Existe no schema e é buscado, mas nem o Canvas 2c nem `AppointmentCard.tsx` atual exibem esse campo na lista do dia (Canvas só mostra horário/nome/local/tag) — sem gap, é consistente manter fora do card de lista; pode aparecer no detalhe (2e). |
| Observações (`observations`) | Real, não exibido nesta tela | `Appointment.observations` | string \| null | Não aparece no Canvas 2c; consistente, sem ação. |
| Tipo do compromisso / cor da barra e badge (`it.color`, `it.tagBg`, `it.tagColor`, `it.tag`) | Real (derivado) | `Appointment.appointmentType` (`CONSULTA`/`EXAME`/`CIRURGIA`) | enum → mapeamento de cor/label | **Gap de fidelidade de paleta**: `AppointmentCard.tsx` hoje usa cores arbitrárias fora do design system (`#3498DB` consulta, `#E74C3C` retorno, `#F39C12` exame, `#10B981` cirurgia) e um 4º tipo `'retorno'` que **não existe** no enum real `AppointmentType` do schema (`CONSULTA`/`EXAME`/`CIRURGIA` apenas — sem `RETORNO`). `types/models.ts` também define `AppointmentType = 'consulta' \| 'exame' \| 'retorno' \| 'cirurgia'` (lowercase, com `retorno` inexistente no backend) — inconsistente com `appointmentService.ts` `AppointmentType = 'CONSULTA' \| 'EXAME' \| 'CIRURGIA'`. Corrigir para usar exatamente os 3 valores reais e cores dos tokens semânticos de `DESIGN_TOKENS.md` §1 (ex.: Consulta → azul secundário `#1B63C4`/`#E9F1FD`, Exame → âmbar `#8A5300`/`#FFF3DF` ou verde primário conforme decisão de `plan.md`, Cirurgia → vermelho `#B3261E`/`#FDECEA` ou paleta neutra — decisão final registrada em `plan.md`, já que o Canvas 2c não expõe hex exatos por tipo, apenas bindings `it.color`/`it.tagBg`/`it.tagColor` genéricos). |
| Rótulo do dia selecionado (`agSelectedLabel`) | Real (derivado) | Derivado de `selectedDate` (data selecionada no seletor de 7 dias) | string formatada | **Não implementado hoje** — `AgendaScreen.tsx` não exibe nenhum rótulo de dia acima da lista (vai direto de `CalendarPicker` para a seção "Próximos compromissos"). Gap a corrigir. |
| Seletor de 7 dias (`agDaysList`) | Real, mas construído incorretamente hoje | Deveria ser uma janela fixa de 7 dias (ex. hoje + 6 seguintes), cada dia sempre selecionável | — | **Gap estrutural**: `buildCalendarDates()` em `useAppointmentsData.ts` só inclui, no seletor, os dias em que **já existe** algum `Appointment` (`daySet.add(day)` apenas quando há compromisso) — ou seja, um dia sem compromisso nem aparece como opção selecionável. Isso diverge do Canvas, que sempre mostra 7 dias fixos e permite selecionar qualquer um deles (inclusive para descobrir que está vazio, cenário "dia sem compromissos"). Corrigir em `plan.md`. |
| Indicador de "tem compromisso" no seletor (`hasAppointments`, ponto no `CalendarPicker`) | Real (derivado) | Calculado comparando `scheduledAt` de cada `Appointment` com cada um dos 7 dias fixos | boolean | Hoje `hasAppointments` é sempre `true` para os dias presentes em `dates` (porque só entram no array dias com compromisso) — deixa de ser um indicador útil quando o seletor passar a mostrar sempre 7 dias fixos (gap acima); precisa ser recalculado por dia. |
| Sincronização com Google Agenda | **Não existe integração real** | — | — | **Pendência técnica formal — regra 2 da constituição.** Nenhum client OAuth/Calendar API no repositório. Deve virar uma tela/estado "Em breve" nomeado e isolado (não um botão morto), registrado em `GAP_ANALYSIS.md`. |

Nenhum campo real desta tela usa dado mockado — `src/mocks/api/appointmentsApi.ts` existe mas está confirmado como código morto/não usado por `useAppointmentsData.ts` (ver `CODE_INVENTORY.md` §6, item 2: "not used by `useAppointmentsData.ts`... likely-dead mock code"). As pendências desta tela são: (1) fidelidade de paleta/enum de tipo de compromisso, (2) seletor de 7 dias fixo (hoje incompleto), (3) rótulo do dia selecionado ausente, (4) CTA "Agendar consulta" ausente no estado vazio, (5) sincronização Google Agenda sem integração real (pendência documentada, não implementação fake).

## 6. Requisitos não-funcionais específicos
- **Paleta de tipos de compromisso:** usar tokens reais de `DESIGN_TOKENS.md` §1 (nunca as cores arbitrárias atuais de `AppointmentCard.tsx`), com mapeamento fixo e documentado por `appointmentType` (`CONSULTA`/`EXAME`/`CIRURGIA`) — decisão final em `plan.md`. Nunca cor sozinha sem texto/label acompanhando (regra do Canvas 1a, reforçada em `DESIGN_TOKENS.md` §4 "Status badges/pills").
- **Seletor de 7 dias:** touch target mínimo 48dp (célula tem 64px de altura, ok); comportamento de seleção deve seguir o padrão selecionado/não-selecionado de `DESIGN_TOKENS.md` §4.
- **FAB:** 56×56, mínimo touch target primário de 56dp conforme `DESIGN_TOKENS.md` §3, posicionamento fixo acima da bottom nav.
- **4 estados padrão:** loading/vazio/erro/sucesso conforme `DESIGN_TOKENS.md` §4 — loading e erro já conformes; vazio precisa do CTA "Agendar consulta" (gap, ver §5).
- **Sincronização Google Agenda:** nenhuma chamada de rede real deve ser feita; a interface deve deixar claro ao usuário, via copy, que é uma funcionalidade futura — não pode parecer que "sincronizou" quando não sincronizou nada (risco de falsa confiança do usuário sobre seus dados de saúde estarem espelhados externamente).
- **LGPD:** dados de agenda de saúde (tipo/local/profissional de consulta) são dados sensíveis de saúde — qualquer integração futura com Google Calendar deve, quando implementada, passar por consentimento explícito (fora de escopo aqui, mas a copy do stub "Em breve" não deve prometer nada sobre esse consentimento ainda não desenhado).
- **Nenhuma quebra de dados existentes:** qualquer correção de enum/schema de `appointmentType` é aditiva/de mapeamento em código (não requer migração de schema DynamoDB, já que os 3 valores reais `CONSULTA`/`EXAME`/`CIRURGIA` já existem) — regra 5 da constituição.

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas 2c: título "Agenda", subtítulo, linha "Sincronizar com Google Agenda", seletor de 7 dias, rótulo do dia selecionado, lista de compromissos com barra colorida e badge de tipo, estado vazio com CTA, FAB.
- [ ] Seletor de 7 dias sempre mostra 7 dias fixos e selecionáveis (não só os dias com compromisso existente).
- [ ] Rótulo do dia selecionado (`agSelectedLabel`) implementado e exibido acima da lista.
- [ ] Cores de tipo de compromisso (barra + badge) usam exatamente 3 valores reais do enum (`CONSULTA`/`EXAME`/`CIRURGIA`) mapeados para tokens de `DESIGN_TOKENS.md` §1 — `'retorno'` removido de `types/models.ts`.
- [ ] Estado vazio do dia mostra ícone-tile, mensagem "Nenhum compromisso neste dia." e botão "Agendar consulta" navegando para `/add-appointment`.
- [ ] Estado de carregamento (skeleton) e erro (callout + retry) preservados/conformes a `DESIGN_TOKENS.md` §4.
- [ ] FAB abre `/add-appointment` (já funcional, preservar).
- [ ] Card de compromisso navega para `/(app)/edit-appointment?id=` (já funcional, preservar).
- [ ] "Sincronizar com Google Agenda" abre um estado "Em breve" nomeado e isolado (não um `onPress` vazio) — nenhuma simulação de sincronização real; pendência registrada em `GAP_ANALYSIS.md`.
- [ ] Nenhum dado mockado: toda a lista vem de `client.models.Appointment.list()` real (já satisfeito hoje); `src/mocks/api/appointmentsApi.ts` permanece não referenciado (ou é removido como código morto, decisão em `plan.md`).

# Tasks: Agenda — Calendário, Lista do Dia e Novo Agendamento (2c)

## 1. Tipos
- [ ] `src/types/models.ts`: remover `'retorno'` de `AppointmentType`; alinhar para `'consulta' | 'exame' | 'cirurgia'` (3 valores, coerente com o enum real do schema após `toLowerCase()`).
- [ ] Confirmar que nenhum outro arquivo referencia `'retorno'` (`grep -rn "retorno" src`) antes de remover.

## 2. Hook de dados (`src/hooks/useAppointmentsData.ts`)
- [ ] Reescrever a geração de `dates`: sempre 7 dias fixos (hoje + próximos 6), independente de haver `Appointment` nesses dias.
- [ ] Calcular `hasAppointments` por dia comparando `scheduledAt` de cada `Appointment` real com cada um dos 7 dias da janela (não mais "está no array porque tem compromisso").
- [ ] Ajustar `mapAppointmentToEntry`: `time` passa a ser só `HH:mm` (remover a data duplicada da string).
- [ ] Adicionar cálculo de `agSelectedLabel` (ex. `"Hoje, 20 de agosto"` quando `selectedDate` é o dia atual, ou `"20 de agosto"` caso contrário) e expor no retorno do hook.
- [ ] Garantir que a seleção padrão (`useState(new Date().getDate())`) continua funcionando com a nova janela de 7 dias fixa.

## 3. Componente de card (`src/components/AppointmentCard.tsx`)
- [ ] Substituir `getTypeColor()`/cores hardcoded (`#3498DB`/`#E74C3C`/`#F39C12`/`#10B981`) pelo mapeamento de tokens definido em `plan.md` item 4: `consulta` → `#1B63C4`/`#E9F1FD`/`#14509F`; `exame` → `#8A5300`/`#FFF3DF`/`#8A5300`; `cirurgia` → `#10794E`/`#E8F5EE`/`#0C6341`.
- [ ] Remover o `case 'retorno'` de `getTypeColor()`/`getTypeLabel()` (tipo não existe mais).
- [ ] Confirmar visualmente: barra lateral 3–4px com a cor do tipo, badge pill com bg/texto do par correto (nunca cor sozinha — sempre badge com texto do tipo).

## 4. Seletor de dias (`src/components/CalendarPicker.tsx`)
- [ ] Confirmar que renderiza sempre as 7 células recebidas via prop `dates` (não depende de filtragem própria) — ajuste só necessário se o componente hoje limitar/filtrar internamente (verificar antes de mexer, hoje parece já apenas mapear o array recebido).
- [ ] Confirmar que o indicador de "tem compromisso" (`dot`) reflete o `hasAppointments` recalculado do hook (item 2).

## 5. Tela (`src/screens/AgendaScreen.tsx`)
- [ ] Renderizar `agSelectedLabel` (novo campo do hook) como texto 600 18px acima da lista de compromissos, no lugar do título genérico de `Section`.
- [ ] No ramo de lista vazia para o dia selecionado, trocar o `EmptyState` genérico por um com `actionLabel="Agendar consulta"` e `onActionPress={() => router.push('/add-appointment')}`.
- [ ] Corrigir copy da linha de sincronização: "Sincronizar com Google Agenda" (hoje diz "Google Calendar", divergente do Canvas).
- [ ] Trocar `onPress={() => {}}` da linha de sincronização pela chamada ao stub nomeado (`openGoogleCalendarSyncComingSoon` ou equivalente, ver item 6) — nunca deixar um handler vazio.
- [ ] Revisar prop `dates`/`selectedDate` passadas a `CalendarPicker` continuam compatíveis após mudanças do hook.

## 6. Stub de sincronização Google Agenda (novo arquivo)
- [ ] Criar `src/services/googleCalendarSync.ts` exportando:
  - `isGoogleCalendarSyncAvailable(): boolean` → `false`, com comentário de cabeçalho explicando que é uma pendência técnica (sem OAuth/Calendar API implementado).
  - `openGoogleCalendarSyncComingSoon(): void` (ou variante assíncrona que abre um `Alert`/bottom sheet) com copy clara: funcionalidade em desenvolvimento, nenhum dado é sincronizado hoje.
- [ ] Garantir que nenhuma chamada de rede é feita por este módulo (é puramente um stub de UI/mensagem).

## 7. Documentação de pendência (regra 2/6 da constituição)
- [ ] Atualizar `specs/design/GAP_ANALYSIS.md` (Bloco 2, linha "2c Agenda — calendário/lista do dia") registrando explicitamente a pendência de sincronização com Google Agenda como funcionalidade não implementada, isolada atrás de stub nomeado, não fake.
  - Nota: esta edição está **fora do diretório** `specs/02-perfil-home-agenda/agenda/` — não faz parte da entrega de código deste EPIC, mas é rastreada aqui como task de acompanhamento para quem for implementar.

## 8. Testes/verificação manual
- [ ] Selecionar um dos 7 dias sem compromisso → confirma estado vazio com CTA "Agendar consulta" navegando para `/add-appointment`.
- [ ] Selecionar um dia com 2+ compromissos de tipos diferentes → confirma barra/badge com as cores corretas por tipo e sem duplicar data no horário do card.
- [ ] Tocar "Sincronizar com Google Agenda" → confirma que abre o estado "Em breve" (não navega, não finge sucesso, não é `onPress` vazio).
- [ ] Forçar erro de rede (ex. desconectar) → confirma callout de erro + "Tentar novamente" continuam funcionando.
- [ ] Recarregar a tela → confirma skeleton de loading continua funcionando.
- [ ] FAB e card de compromisso continuam navegando corretamente para `/add-appointment` e `/edit-appointment?id=` respectivamente (regressão).

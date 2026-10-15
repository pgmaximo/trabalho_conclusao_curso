# TASKS: Perfil, Home e Agenda — Novo agendamento

## Decisão de schema — confirmada pelo usuário
- [x] Confirmado explicitamente pelo usuário (2026-08-21): tornar `professionalName`/`address` opcionais no schema, conforme recomendação deste `plan.md`.

## Schema / backend
- [x] `amplify/data/schemas/appointments.ts`: `.required()` removido de `professionalName` e `address` (mantidos `a.string()` opcional). `appointmentName`/`scheduledAt` seguem `.required()`.
- [ ] Rodar `nvm use 20.20.1` e `ampx sandbox` (ou deploy equivalente) para sincronizar o schema no ambiente — não executado nesta sessão (sem acesso a rodar o sandbox neste passe); mudança é aditiva/compatível (campo obrigatório → opcional não quebra registros existentes).
- [x] `src/services/appointmentService.ts` (`createAppointment`): `professionalName`/`address` agora normalizados via `?.trim() || null` antes do `client.models.Appointment.create(...)`, mesmo padrão de `observations`. Tipos `CreateAppointmentInput`/`AppointmentRecord` atualizados para `professionalName?`/`address?`.

## Componente `Button` (verificado antes de decidir)
- [x] `Button.tsx` já suporta `disabled` + `disabledReason` (mostra texto abaixo do botão) — reaproveitado como está, nenhuma mudança no componente compartilhado.

## `AddAppointmentScreen.tsx` — reescrita completa
- [x] Tela reescrita do zero no padrão de design system atual (useThemeColors + StyleSheet, `FormField`/`DateInput`/`InlineError`/`Button` reaproveitados), substituindo a versão legada pré-SDD (`COLORS`/`FONTS` estáticos, `alert()` bloqueante).
- [x] Subtítulo "Cadastre um compromisso para sua agenda." removido.
- [x] Rótulo "Tipo" (era "Tipo de agendamento").
- [x] Placeholders alinhados ao Canvas: "Ex.: Consulta cardiologista", "Ex.: Dr. Ricardo Alves", "DD/MM/AAAA", "hh:mm", "Ex.: Av. Paulista, 1000 - São Paulo/SP", "Ex.: levar exames anteriores"; rótulo "Observações (opcional)".

## Chips de tipo (Consulta/Exame/Cirurgia)
- [x] `flex: 1` sem wrap, 3 colunas fixas, altura 64px, radius 14px, `gap: 8`.
- [x] Cores dos tokens de `DESIGN_TOKENS.md`: selecionado = borda `colors.primary`/bg `colors.primarySoft`/ícone+texto `colors.primaryDark`; não selecionado = borda `colors.border`/bg `colors.surface`/texto `colors.textSecondary` (batem com os hex do Canvas via tema).
- [x] **Decisão registrada**: emojis substituídos por ícones vetoriais Ionicons (`medical-outline`/`flask-outline`/`cut-outline`), consistente com o resto do app (nenhuma outra tela usa emoji como ícone de UI).
- [x] Pré-seleção removida — `appointmentType: AppointmentType | null`, inicia `null` (ambiguidade do `spec.md` §8 resolvida como "nenhum tipo pré-selecionado").
- [x] Fallback de envio: `appointmentType ?? 'CONSULTA'` só no payload, nunca refletido como "selecionado" na UI antes do toque.

## Layout Data + Hora
- [x] "Data" (`DateInput`) e "Hora" (`FormField`) lado a lado em `View` `flexDirection: row, gap: 12`, cada um `flex: 1`.
- [x] Confirmado: `DateInput` funciona normalmente dentro de um container `flex: 1` (seu próprio estilo interno não assume largura fixa).
- [x] Default `'14:00'` removido — `scheduledTime` inicia `''`.

## Validação inline (sem alert)
- [x] `isFormInvalid = !appointmentName.trim() || !scheduledDate.trim() || !scheduledTime.trim()`.
- [x] `alert()` de validação removido.
- [x] `Button` recebe `disabled={isFormInvalid}` + `disabledReason` (renderizado pelo próprio componente `Button`, que já implementa o texto de apoio abaixo do botão quando desabilitado — não foi necessário um `Text` condicional separado).
- [x] Profissional/Endereço/Observações vazios não bloqueiam o botão.

## Tratamento de erro de rede/backend
- [x] `alert(message)` do `catch` substituído por `submitError` + `<InlineError message={submitError} />` (mesmo padrão já usado em `AddExamScreen.tsx`/3b), campos preenchidos preservados.
- [x] `isSubmitting`/`finally` preservados (`Button loading={isSubmitting}`).

## Navegação
- [x] Botão de voltar (`chevron-back`, 48×48) chama `router.back()`.
- [x] `createAppointment()` bem-sucedido chama `router.back()`; `invalidateAppointmentsCache()` já ocorre dentro do próprio `appointmentService.ts`.

## Dark mode
- [x] Toda a tela usa `useThemeColors()` (reativo), não hex hardcoded — cores corretas em light/dark por construção.

## Achados além do escopo original do `plan.md`
- [x] **Correção necessária em `EditAppointmentScreen.tsx` (2e, fora desta EPIC)**: a mudança de `professionalName`/`address` para opcionais quebrava a tipagem de `EditAppointmentScreen.tsx` (`setProfessionalName(data.professionalName)`/`setAddress(data.address)` esperavam `string`, agora `string | null | undefined`). Corrigido com fallback `?? ''` nos 2 pontos, sem tocar no restante da tela (2e é EPIC própria, ainda não reescrita nesta sessão).
- [x] `AppointmentEntry.location` (`useAppointmentsData.ts`) também recebeu fallback `?? ''` pela mesma razão (endereço agora pode ser `null`).

## Verificação final
- [x] Typecheck (`tsc --noEmit`) e lint limpos em todos os arquivos tocados.
- [ ] Comparação visual (light/dark) contra o Canvas 2d em dispositivo/simulador — não executada nesta sessão.
- [ ] Cenários Given/When/Then de `spec.md` §2 executados manualmente contra o Amplify sandbox — não executados nesta sessão (schema ainda não sincronizado, ver item acima).

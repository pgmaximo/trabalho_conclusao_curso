# Tasks: Editar agendamento — com exclusão confirmada (2e)

## Deep link / carregamento
- [x] `src/app/edit-appointment.tsx`: `if (!id) return null;` substituído por `router.replace('/appointments')` dentro de um `useEffect`.
- [x] `EditAppointmentScreen.tsx`: `getAppointmentById(id)` envolvido em `try/catch`; estado explícito `'loading' | 'ready' | 'notFound' | 'error'` (`LoadStatus`) substitui a checagem implícita `appointment !== null`.
- [x] Estados "não encontrado"/"erro de rede" renderizados via `EmptyState tone="error"` com botão "Voltar para a Agenda" (`router.replace('/appointments')`).

## Confirmação de exclusão inline (substituiu `confirm()`/`alert()`)
- [x] Estado local `isConfirmingDelete: boolean` adicionado.
- [x] `confirm(...)` removido — "Excluir agendamento" apenas abre o painel (`setIsConfirmingDelete(true)`).
- [x] Painel renderizado via `DeleteConfirmPanel` (componente compartilhado já existente, criado na EPIC 3c) em vez de JSX duplicado — reaproveitamento direto, nenhum componente novo necessário.
- [x] "Cancelar" apenas fecha o painel, sem chamada de rede.
- [x] "Excluir" chama `deleteAppointment`; sucesso navega (`router.back()`); erro fecha o painel e mostra `InlineError`, sem navegar.
- [x] Confirmado: `DeleteConfirmPanel` (`src/components/DeleteConfirmPanel.tsx`) já existia desde 3c — reaproveitado sem duplicar estilo/JSX.

## Feedback de sucesso/erro (substituiu `alert()`)
- [x] `alert()` de sucesso/erro removidos de `handleSave`/exclusão; `submitError`/`deleteError` exibidos via `InlineError`.
- [x] **Decisão registrada (consistente com o precedente de 3c, pendência #32 do GAP_ANALYSIS)**: sucesso ao salvar/excluir navega imediatamente (`router.back()`) sem `SuccessSnackbar` — a própria navegação de volta para a Agenda já serve como feedback, evitando um snackbar que apareceria e desapareceria no meio da transição de tela.
- [x] Em erro, os campos preenchidos permanecem intactos (nenhum reset de estado no `catch`).

## Dark mode
- [x] Tela reescrita do zero usando `useThemeColors()` (era `COLORS`/`FONTS`/`SIZES` estáticos, sempre modo claro).
- [x] Chips de Tipo, inputs (`FormField`/`DateInput`), botões (`Button`) e painel (`DeleteConfirmPanel`) já são reativos a dark mode por construção (todos consomem tokens `app-*`/`app-dark-*` ou `useThemeColors()`).

## Estrutura visual (paridade com Canvas 2e)
- [x] Chips de Tipo com ícones vetoriais Ionicons (`medical-outline`/`flask-outline`/`cut-outline`, mesma decisão da EPIC 2d — reaproveitados os mesmos 3 ícones para consistência entre "Novo" e "Editar" agendamento).
- [x] "Data"/"Hora" lado a lado (`flex:1`, `gap:12`).
- [x] Header sem botão extra à direita — apenas voltar + título "Editar agendamento".
- [x] "Salvar alterações" (sólido, 56px via `Button`) + "Excluir agendamento" (`Button variant="destructive"`, outline vermelho, `margin-top:10px`).

## Achados além do escopo original do `plan.md`
- [x] **Tela reescrita por completo** (não só os pontos listados no `tasks.md` original) — a versão legada usava `COLORS`/`FONTS` estáticos, `TextInput` cru sem `FormField`, e state derivado de `useState<AppointmentType>('CONSULTA')` sem tratamento de erro de carregamento; reescrever do zero no mesmo padrão de 2d (`FormField`/`DateInput`/`Button`/`InlineError`) foi mais direto do que remendar a estrutura antiga, e mantém as duas telas (2d/2e) visualmente e estruturalmente consistentes entre si.

## Verificação final
- [x] Typecheck (`tsc --noEmit`) e lint limpos.
- [ ] Cenários do `spec.md` executados manualmente contra o Amplify sandbox — não executados nesta sessão (mesma pendência de `ampx sandbox` registrada em 2d).
- [x] Confirmado: `invalidateAppointmentsCache()` não duplicado na tela — já ocorre dentro de `updateAppointment`/`deleteAppointment`.

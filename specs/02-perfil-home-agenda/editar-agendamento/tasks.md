# Tasks: Editar agendamento — com exclusão confirmada (2e)

## Deep link / carregamento
- [ ] `src/app/edit-appointment.tsx`: trocar `if (!id) return null;` por redirecionamento para `/appointments` (ex.: `router.replace('/appointments')` dentro de um `useEffect`, ou componente de fallback com mensagem + botão de volta).
- [ ] `EditAppointmentScreen.tsx`: envolver `getAppointmentById(id)` em `try/catch`; introduzir estado explícito (`'loading' | 'ready' | 'notFound' | 'error'`) em vez de depender apenas de `appointment !== null`.
- [ ] Renderizar estado "não encontrado"/"erro de rede" com mensagem clara ("Agendamento não encontrado" ou mensagem de erro) + botão "Voltar para a Agenda" (navega para `/appointments`).

## Confirmação de exclusão inline (substituir `confirm()`/`alert()`)
- [ ] Adicionar estado local `isConfirmingDelete: boolean` (equivalente a `efNotConfirming`/`efConfirmDelete` do Canvas).
- [ ] Remover `confirm('Tem certeza que deseja deletar este agendamento?')` de `handleDelete`; o toque em "Excluir agendamento" apenas seta `isConfirmingDelete = true` (equivalente a `askDelete`).
- [ ] Renderizar o painel de confirmação inline quando `isConfirmingDelete` é `true`: fundo `#FDECEA`/dark equivalente, borda `#F3C9C5`, ícone "!" circular 26px fundo `#B3261E`, texto "Tem certeza? Essa ação não pode ser desfeita.", botões "Cancelar" (outline, 52px, radius 12px) e "Excluir" (sólido `#B3261E`, 52px, radius 12px) lado a lado.
- [ ] Botão "Cancelar" do painel apenas seta `isConfirmingDelete = false` (equivalente a `cancelDelete`), sem chamada de rede.
- [ ] Botão "Excluir" do painel chama `deleteAppointment(appointment.id)`; em sucesso, navega para `/appointments`; em erro, fecha o painel (`isConfirmingDelete = false`) e exibe mensagem de erro sem navegar.
- [ ] Verificar se `detalhe-documento` (3c) já criou um componente compartilhado de "delete confirmation panel"; se sim, reaproveitar em vez de duplicar JSX/estilos.

## Feedback de sucesso/erro (substituir `alert()`)
- [ ] `handleSave`: remover `alert('Agendamento atualizado com sucesso!')` e `alert(message)`; adicionar estado de erro inline (mensagem visível no formulário) e navegação após sucesso, com feedback visual (snackbar/mensagem) conforme padrão de 4 estados do design system.
- [ ] Ao ocorrer erro em `handleSave`, manter os campos preenchidos (não resetar) e permanecer na tela.

## Dark mode
- [ ] Migrar `EditAppointmentScreen.tsx` de `import { COLORS, FONTS, SIZES } from '@/constants/theme'` para `useThemeColors()` (hook já usado em outras telas atualizadas), removendo dependência de cores estáticas light-only.
- [ ] Conferir que chips de Tipo, inputs, botões e painel de confirmação usam os tokens dark equivalentes (`DESIGN_TOKENS.md` §1) quando o tema é escuro.

## Estrutura visual (paridade com Canvas 2e)
- [ ] Conferir chips de Tipo (Consulta/Exame/Cirurgia) com ícones equivalentes aos do Canvas (círculo, retângulo, cruz), estado selecionado com borda `#10794E`/bg `#E8F5EE`/texto `#0C6341`.
- [ ] Conferir layout de "Data" e "Hora" lado a lado (`flex:1` cada, `gap:12px`), como no Canvas.
- [ ] Conferir header sem botão extra à direita (diferente de 3c) — apenas voltar "‹" + título "Editar agendamento".
- [ ] Conferir botão "Salvar alterações" (sólido verde, 56px) e "Excluir agendamento" (outline vermelho, 56px, `margin-top:10px`) como par padrão do rodapé.

## Verificação final
- [ ] Rodar os cenários do `spec.md` (editar+salvar sucesso, tentar excluir, cancelar exclusão, confirmar exclusão sucesso/erro, erro de rede ao carregar, deep link sem `id`) manualmente ou via QA.
- [ ] Confirmar que `invalidateAppointmentsCache()` continua sendo chamado (já ocorre dentro de `updateAppointment`/`deleteAppointment` — não duplicar a chamada na tela).
- [ ] Confirmar critérios de aceite da seção 7 de `spec.md` um a um.

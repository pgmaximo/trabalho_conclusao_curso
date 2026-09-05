# Plano técnico: Editar agendamento — com exclusão confirmada (2e)

## 1. Diagnóstico do código atual vs. Canvas 2e

Arquivos envolvidos: `src/app/edit-appointment.tsx`, `src/screens/EditAppointmentScreen.tsx`, `src/services/appointmentService.ts`, `src/hooks/appointmentsCache.ts`.

### 1.1 Confirmação de exclusão — divergência confirmada (não suposição)
O Canvas 2e define dois estados mutuamente exclusivos no rodapé via `sc-if efNotConfirming` / `sc-if efConfirmDelete`: um painel de confirmação **inline** vermelho (`#FDECEA`/`#F3C9C5`) com ícone "!" e botões Cancelar/Excluir, idêntico ao padrão reutilizado em 3c e 3g (`DESIGN_TOKENS.md` §4 "Confirmation/delete dialogs").

O código atual (`EditAppointmentScreen.tsx`, `handleDelete`, linhas 68-80) usa:
```ts
const confirmed = confirm('Tem certeza que deseja deletar este agendamento?');
if (!confirmed) return;
...
alert('Agendamento deletado.');
```
`confirm()`/`alert()` são APIs de browser (só funcionam no build web do Expo; não existem em iOS/Android nativos — em React Native isso quebraria silenciosamente ou exigiria polyfill). Isso confirma a mesma divergência já identificada em login/cadastro/confirmação e em `detalhe-documento` (3c): **o app usa diálogos nativos/globais em vez do padrão de painel inline do design system.** Mesma correção estrutural necessária aqui.

`handleSave` também usa `alert()` para sucesso/erro — deve ser substituído por feedback inline (mensagem de erro no formulário) e, quando aplicável, snackbar de sucesso conforme padrão de 4 estados (`DESIGN_TOKENS.md` §4 "Standard 4-state pattern").

### 1.2 Invalidação de cache — já correta, ao contrário do padrão de exames
Diferente do fluxo de documentos (onde `invalidateExamsCache()` precisa ser chamado explicitamente pela tela após update/delete), aqui a invalidação já está **encapsulada dentro do próprio service**:
- `updateAppointment()` chama `invalidateAppointmentsCache()` internamente (linha 116 de `appointmentService.ts`).
- `deleteAppointment()` chama `invalidateAppointmentsCache()` internamente (linha 137).

Não há gap de cache a corrigir — apenas preservar o comportamento existente ao refatorar a tela.

### 1.3 Estrutura de campos — já alinhada ao Canvas
O formulário atual (chips de Tipo, Nome do agendamento, Profissional, Data, Hora, Endereço, Observações) já reflete a estrutura de 2e/2d campo a campo. O gap não é de dados/campos, é de **UI de confirmação, feedback e estados de erro/carregamento**.

### 1.4 Deep-link / carregamento — gaps adicionais encontrados
- `src/app/edit-appointment.tsx`: `if (!id) return null;` — mesma classe de gap de tela em branco já documentada em `detalhe-documento/spec.md` para `document-detail`. Deve redirecionar para `/appointments` (2c) em vez de retornar `null`.
- `EditAppointmentScreen.tsx`: quando `getAppointmentById(id)` não encontra o registro (`data` é `null`), o `load()` simplesmente faz `return` sem setar nenhum estado de erro — a tela fica presa no "Carregando..." (linha 87) indefinidamente. Não há tratamento de erro de rede no `load()` (nenhum `try/catch`). Precisa de um estado terminal de erro com caminho de volta.
- `getAppointmentById` (em `appointmentService.ts`) busca via `listAppointmentsForUser().find(...)` — carrega a lista inteira e filtra em memória, em vez de um `get` direto por id. Funcionalmente correto (sem mock, dado real do DynamoDB), mas ineficiente; registrar como observação de performance não bloqueante, não é escopo deste EPIC corrigir.

### 1.5 Dark mode — gap confirmado
`EditAppointmentScreen.tsx` importa `COLORS`/`FONTS`/`SIZES` estáticos de `@/constants/theme` (linha 10), que resolvem sempre para `LIGHT_THEME` (`export const COLORS = LIGHT_THEME.colors;` em `theme.ts` linha 257). A tela não usa o hook `useThemeColors()` (que existe e é o padrão correto, usado em outras telas já migradas) — portanto não reage ao tema escuro. Precisa migrar para `useThemeColors()`.

## 2. Decisões de design/implementação

- **Painel de confirmação inline**: implementar como estado local (`isConfirmingDelete: boolean`) que alterna a renderização entre o par de botões "Salvar alterações"/"Excluir agendamento" e o painel vermelho de confirmação — replicando `efNotConfirming`/`efConfirmDelete`. Reaproveitar o mesmo padrão visual (cores, radius, ícone "!") já especificado para 3c/3g em `DESIGN_TOKENS.md` §4, para manter um único componente/estilo de "delete confirmation panel" se um componente compartilhado já existir ou for criado por outra tela irmã (verificar se `detalhe-documento` já criou um componente reutilizável antes de duplicar o JSX).
- **Feedback de sucesso/erro**: substituir `alert()`/`confirm()` por mensagem de erro inline no formulário (mesmo padrão de erro de campo/callout do design system) e, para sucesso, um snackbar verde-escuro (`#0C6341`) ou, na ausência de um componente de snackbar já existente no código, uma mensagem de sucesso simples antes de navegar — documentar a escolha final no código, mas não bloquear o EPIC por falta de um componente de toast genérico (mesma decisão pragmática usada em `detalhe-documento`).
- **Deep-link/loading/erro**: `edit-appointment.tsx` passa a redirecionar para `/appointments` via `router.replace('/appointments')` quando `id` está ausente, em vez de `return null`. `EditAppointmentScreen` ganha um terceiro estado de UI (`notFound`/`loadError`) distinto de "carregando", com mensagem e botão "Voltar para a Agenda".
- **Dark mode**: migrar `EditAppointmentScreen.tsx` de `COLORS`/`FONTS` estáticos para `useThemeColors()`, seguindo o padrão já usado nas telas atualizadas do Bloco 3.
- **Reuso de stack existente**: nenhuma biblioteca nova é necessária — tudo pode ser feito com estado local do React e os componentes `Button`/`Card`/`DateInput` já existentes (regra 3 da constituição).

## 3. Escopo explicitamente fora deste EPIC
- Otimizar `getAppointmentById` para um `get` direto por id (não é regressão, é oportunidade futura).
- Criar um componente de snackbar/toast genérico reutilizável em todo o app — se não existir, uma solução local mínima é aceitável aqui, desde que substitua `alert()`.
- Alterar o schema do model `Appointment` no Amplify (regra 5 da constituição — nada de schema como efeito colateral).

## 4. Riscos e observações
- `confirm()`/`alert()` no código atual são incompatíveis com runtime nativo puro (iOS/Android) fora do Expo Web — a correção deste EPIC (painel inline) também resolve um risco funcional real, não apenas estético.
- `router.back()` é usado hoje para retornar após salvar/excluir; ao trocar por navegação explícita para `/appointments` (para cobrir o caso de deep link direto sem histórico de navegação), verificar que o comportamento de "voltar" a partir de 2c continua natural (não duplicar a tela na pilha).

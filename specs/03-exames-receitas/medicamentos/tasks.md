# TASKS: Medicamentos — Doses e Estoque (Bloco 3)

## Schema (base para esta EPIC e para 3f/3g — fazer primeiro)

- [x] Criar `amplify/data/schemas/medicines.ts` com o model `Medicine` conforme `plan.md` §2–§3: `name`, `dosage`, `form` (enum), `times` (array de string), `frequencyType` (enum), `weekDays` (array opcional), `intervalHours` (opcional), `startDate`, `endDate` (opcional), `currentStock`, `initialStock`, `unit` (enum), `lowStockThreshold` (opcional), `notes` (opcional), `active` (boolean, default `true`), `takenToday` (string JSON opcional), `.authorization((allow) => [allow.owner()])`.
- [x] Registrar `medicinesSchema` em `amplify/data/resource.ts` (`import` + spread em `a.schema({...})`), sem alterar `userSchema`/`medicalDocumentsSchema`/`appointmentsSchema` existentes.
- [x] Rodar `ampx sandbox` (Node 20 — ver memória do usuário: `nvm use 20.20.1` antes) para validar que o schema compila e a tabela `Medicine` é provisionada sem erros. (`ampx sandbox --once` — deploy concluído em 121s, tabela `Medicine` criada, `amplify_outputs.json` atualizado.)
- [x] Confirmar que nenhuma tabela/model existente foi afetada (`git diff amplify/data/resource.ts` deve mostrar só adição).

## Tipos e mapeamento de dados

- [x] `src/types/models.ts`: revisar `MedicineDose`, `MedicineInventoryItem`, `ReminderInfo`, `MedicinesSnapshot` — decidir se viram tipos de apresentação derivados do `Medicine` real (recomendado) ou são substituídos diretamente pelo tipo gerado do Amplify (`Schema['Medicine']['type']`). (Optou-se por tipos de apresentação derivados — `id`/`medicineId` agora `string`; `ReminderInfo`/`MedicinesSnapshot` ficaram sem uso e não foram removidos do arquivo por estarem fora do escopo desta EPIC.)
- [x] Implementar função(ões) de derivação: `Medicine[]` → doses de hoje (`MedicineDose[]`), considerando `frequencyType`/`weekDays`/`intervalHours`/`startDate`/`endDate`/`active` para decidir quais horários de hoje devem aparecer. (`deriveDosesForToday` em `useMedicinesData.ts`; `EVERY_X_HOURS` não gera horários derivados adicionais — usa os `times` cadastrados, mesma limitação documentada em `spec.md`.)
- [x] Implementar cálculo de `percentage` e `status: 'low' | 'ok'` para "Estoques" a partir de `currentStock`/`initialStock`/`lowStockThreshold` (sem `lowStockThreshold` definido ⇒ nunca `'low'`).
- [x] Implementar leitura/escrita de `takenToday` (parse do JSON, comparação de `date` com hoje, fallback para "nada tomado" se a data não bater).

## `src/hooks/useMedicinesData.ts`

- [x] Substituir `getMedicinesSnapshot()` (mock) por `listMedicinesForUser()` real (owner-scoped automaticamente pelo `allow.owner()`), com cache-first via `medicinesCache.ts` (mesmo padrão de `useAppointmentsData.ts`).
- [x] Implementar `onToggleMedicineStatus` escrevendo em `updateMedicine(id, { takenToday })` (persistência real via `client.models.Medicine.update`, não mais só estado local em memória).
- [x] Calcular a contagem "N lembretes ativos para hoje" (para o novo banner) a partir dos dados reais, não de texto fixo.
- [x] Remover import/uso de `src/mocks/api/medicinesApi.ts`.
- [x] Manter o contrato de `status`/`errorMessage`/`retry`/`isLoading` (via `useAsyncResource`), para não quebrar consumidores.

## Descontinuar mocks

- [x] Remover `src/mocks/api/medicinesApi.ts` e `src/mocks/medicines.ts` (grep confirmou nenhum outro consumidor além do barrel `src/mocks/api/index.ts`, também atualizado).
- [x] Grep por `medicinesApi`/`MEDICINES_SNAPSHOT` no repo para garantir que nenhum outro arquivo depende deles antes de remover.

## `src/screens/MedicinesScreen.tsx`

- [x] Adicionar o banner informativo "Você tem {N} lembretes ativos para hoje." no topo (fundo/borda info tokens, radius `rounded-app`, ícone de sino em tile), logo abaixo do título, antes de "Próximas doses" — igual ao Canvas 3d.
- [x] Remover a seção "Lembretes ativados" do rodapé (`ReminderBanner` com copy fixa) — substituída pelo banner do topo com dado real.
- [x] Ajustar `ScreenHeader`: remover subtítulo extra e badge de contagem que não existem no Canvas; manter só título "Medicamentos" + botão "+". (Tela reescrita sem `ScreenHeader` — cabeçalho próprio inline, mesmo efeito.)
- [x] Corrigir o botão "+" para 48×48 (hoje 40×40) e navegar de fato para a rota de criação (3f) — `router.push('/add-medicine')`.
- [x] Implementar o estado vazio de página inteira ("Você ainda não tem medicamentos cadastrados...") quando a lista real de `Medicine` é zero, distinto do estado "há medicamentos mas nada pendente hoje" (mantém seção "Estoques" populada com `EmptyState` só na seção "Próximas doses").
- [x] Cards de dose e de estoque navegam para a rota de edição (3g) ao serem tocados (fora do badge de toggle) — `router.push('/edit-medicine?id=...')`.

## `src/components/MedicineCard.tsx` / `src/components/MedicineStock.tsx`

- [x] Confirmar/ajustar cores do badge "Tomado"/"Pendente" (pill 999px, ícone-círculo + texto) para bater com os tokens semânticos de `DESIGN_TOKENS.md` §1 (via `Badge` com variantes `success`/`neutral`/`danger`).
- [x] Confirmar/ajustar `MedicineStock`: borda condicional âmbar quando `status === 'low'`, texto de quantidade em âmbar quando baixo, barra de progresso âmbar quando baixo, linha extra de alerta "Estoque baixo — hora de comprar mais" com ícone "!" — via tokens `colors.warning`/`colors.warningBadgeBorder` (reativos a dark mode, não hex fixo do Canvas claro).

## Validação final

- [ ] Comparar visualmente a tela renderizada contra o Canvas 3d: cabeçalho, banner de lembretes com contagem real, "Próximas doses" com badges clicáveis, "Estoques" com barra e alerta condicional. (Não executado nesta EPIC — requer simulador/dispositivo; verificação visual manual fica para QA humano.)
- [ ] Testar os 5 cenários do `spec.md`: vazio (nenhum medicamento), carregamento, erro, dose marcada como tomada (e que persiste ao recarregar a tela), estoque baixo destacado. (Não executado em runtime nesta EPIC — apenas `npm run typecheck`/`npm run lint`.)
- [x] Confirmar que nenhum dado exibido nesta tela vem mais de `src/mocks/api/medicinesApi.ts`/`src/mocks/medicines.ts` (grep final, arquivos removidos).
- [x] Confirmar que `amplify/data/resource.ts` só teve adição (nenhum model existente alterado/quebrado) — `git diff` mostra só o import/spread de `medicinesSchema`.
- [x] Atualizar `CODE_INVENTORY.md` (linha do `medicinesApi.ts`) e `GAP_ANALYSIS.md` (pendência técnica #1) para refletir que o schema de medicamentos foi criado e a tela migrada para dado real, incluindo a limitação documentada de `takenToday` (sem histórico multi-dia) como possível follow-up futuro.

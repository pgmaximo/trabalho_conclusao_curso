# TASKS: Medicamentos — Doses e Estoque (Bloco 3)

## Schema (base para esta EPIC e para 3f/3g — fazer primeiro)

- [ ] Criar `amplify/data/schemas/medicines.ts` com o model `Medicine` conforme `plan.md` §2–§3: `name`, `dosage`, `form` (enum), `times` (array de string), `frequencyType` (enum), `weekDays` (array opcional), `intervalHours` (opcional), `startDate`, `endDate` (opcional), `currentStock`, `initialStock`, `unit` (enum), `lowStockThreshold` (opcional), `notes` (opcional), `active` (boolean, default `true`), `takenToday` (string JSON opcional), `.authorization((allow) => [allow.owner()])`.
- [ ] Registrar `medicinesSchema` em `amplify/data/resource.ts` (`import` + spread em `a.schema({...})`), sem alterar `userSchema`/`medicalDocumentsSchema`/`appointmentsSchema` existentes.
- [ ] Rodar `ampx sandbox` (Node 20 — ver memória do usuário: `nvm use 20.20.1` antes) para validar que o schema compila e a tabela `Medicine` é provisionada sem erros.
- [ ] Confirmar que nenhuma tabela/model existente foi afetada (`git diff amplify/data/resource.ts` deve mostrar só adição).

## Tipos e mapeamento de dados

- [ ] `src/types/models.ts`: revisar `MedicineDose`, `MedicineInventoryItem`, `ReminderInfo`, `MedicinesSnapshot` — decidir se viram tipos de apresentação derivados do `Medicine` real (recomendado) ou são substituídos diretamente pelo tipo gerado do Amplify (`Schema['Medicine']['type']`).
- [ ] Implementar função(ões) de derivação: `Medicine[]` → doses de hoje (`MedicineDose[]`), considerando `frequencyType`/`weekDays`/`intervalHours`/`startDate`/`endDate`/`active` para decidir quais horários de hoje devem aparecer.
- [ ] Implementar cálculo de `percentage` e `status: 'low' | 'ok'` para "Estoques" a partir de `currentStock`/`initialStock`/`lowStockThreshold` (sem `lowStockThreshold` definido ⇒ nunca `'low'`).
- [ ] Implementar leitura/escrita de `takenToday` (parse do JSON, comparação de `date` com hoje, fallback para "nada tomado" se a data não bater).

## `src/hooks/useMedicinesData.ts`

- [ ] Substituir `getMedicinesSnapshot()` (mock) por `client.models.Medicine.list()` real (owner-scoped automaticamente pelo `allow.owner()`).
- [ ] Implementar `onToggleMedicineStatus` escrevendo em `client.models.Medicine.update({ id, takenToday: ... })` (persistência real, não mais só estado local em memória).
- [ ] Calcular a contagem "N lembretes ativos para hoje" (para o novo banner) a partir dos dados reais, não de texto fixo.
- [ ] Remover import/uso de `src/mocks/api/medicinesApi.ts`.
- [ ] Manter o contrato de `status`/`errorMessage`/`retry`/`isLoading` (via `useAsyncResource` ou padrão equivalente já usado em `useExamsData.ts`), para não quebrar consumidores.

## Descontinuar mocks

- [ ] Remover `src/mocks/api/medicinesApi.ts` e `src/mocks/medicines.ts` (ou marcá-los claramente como código morto, se algum outro lugar ainda os referenciar — grep antes de apagar).
- [ ] Grep por `medicinesApi`/`MEDICINES_SNAPSHOT` no repo para garantir que nenhum outro arquivo depende deles antes de remover.

## `src/screens/MedicinesScreen.tsx`

- [ ] Adicionar o banner informativo "Você tem {N} lembretes ativos para hoje." no topo (fundo `#E9F1FD`, borda `#CBDFFA`, radius 16px, ícone de sino em tile `#1B63C4`), logo abaixo do título, antes de "Próximas doses" — igual ao Canvas 3d.
- [ ] Remover a seção "Lembretes ativados" do rodapé (`ReminderBanner` com copy fixa) — substituída pelo banner do topo com dado real.
- [ ] Ajustar `ScreenHeader`: remover subtítulo extra e badge de contagem que não existem no Canvas; manter só título "Medicamentos" + botão "+".
- [ ] Corrigir o botão "+" para 48×48 (hoje 40×40) e navegar de fato para a rota de criação (3f) — mesmo que como rota placeholder documentada se 3f ainda não estiver implementada (nunca `onPress={() => {}}` silencioso).
- [ ] Implementar o estado vazio de página inteira ("Você ainda não tem medicamentos cadastrados...") quando a lista real de `Medicine` é zero, distinto do estado "há medicamentos mas nada pendente hoje" (mantém seção "Estoques" populada com `EmptyState` só na seção "Próximas doses").
- [ ] Cards de dose e de estoque navegam para a rota de edição (3g) ao serem tocados (fora do badge de toggle) — mesma ressalva de rota placeholder se 3g ainda não existir.

## `src/components/MedicineCard.tsx` / `src/components/MedicineStock.tsx`

- [ ] Confirmar/ajustar cores do badge "Tomado"/"Pendente" (pill 999px, ícone-círculo + texto) para bater com os tokens semânticos de `DESIGN_TOKENS.md` §1.
- [ ] Confirmar/ajustar `MedicineStock`: borda condicional `#F0D6A4` quando `status === 'low'` (padrão `#EFF1F0`), texto de quantidade `600 16px #8A5300` quando baixo, barra de progresso âmbar (`#8A5300`) quando baixo, linha extra de alerta "Estoque baixo — hora de comprar mais" com ícone "!" — replicar exatamente o card "Metformina 850mg" do Canvas (linhas 395–399).

## Validação final

- [ ] Comparar visualmente a tela renderizada contra o Canvas 3d: cabeçalho, banner de lembretes com contagem real, "Próximas doses" com badges clicáveis, "Estoques" com barra e alerta condicional.
- [ ] Testar os 5 cenários do `spec.md`: vazio (nenhum medicamento), carregamento, erro, dose marcada como tomada (e que persiste ao recarregar a tela), estoque baixo destacado.
- [ ] Confirmar que nenhum dado exibido nesta tela vem mais de `src/mocks/api/medicinesApi.ts`/`src/mocks/medicines.ts` (grep final, arquivo removido ou confirmado sem uso).
- [ ] Confirmar que `amplify/data/resource.ts` só teve adição (nenhum model existente alterado/quebrado) — `git diff` antes de commit.
- [ ] Atualizar `CODE_INVENTORY.md` (linha do `medicinesApi.ts`) e `GAP_ANALYSIS.md` (pendência técnica #1) para refletir que o schema de medicamentos foi criado e a tela migrada para dado real, incluindo a limitação documentada de `takenToday` (sem histórico multi-dia) como possível follow-up futuro.

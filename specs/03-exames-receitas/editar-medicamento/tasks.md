# TASKS: Editar medicamento — com exclusão confirmada

Referência: `spec.md` (critérios de aceite, seção 7) e `plan.md` (schema/serviço/decisões). Marcar cada item ao concluir; nenhum item deve ser marcado sem verificação manual/teste correspondente.

## 0. Pré-requisito — checar estado das EPICs irmãs antes de começar
- [ ] Reler `specs/03-exames-receitas/medicamentos/plan.md` e `specs/03-exames-receitas/novo-lembrete-medicamento/plan.md` — se já existirem/tiverem sido escritas depois desta spec, usar o schema `Medicine`/nomes de campo que elas definirem em vez dos propostos em `plan.md` §1-§3 desta EPIC, e ajustar as tarefas abaixo de acordo.
- [ ] Confirmar se `amplify/data/schemas/medicines.ts` já existe (criado por 3d/3f) antes de criar um novo — nunca duplicar o model `Medicine`.
- [ ] Confirmar se `src/services/medicineService.ts` e `src/hooks/medicinesCache.ts` já existem antes de criá-los.

## 1. Schema Amplify `Medicine` (se ainda não existir)
- [ ] Criar `amplify/data/schemas/medicines.ts` com o model `Medicine` proposto em `plan.md` §1 (`name`, `dosage`, `form`, `times`, `frequency`, `startDate`, `endDate`, `stockQuantity`, `stockUnit`, `remindersActive`), `authorization: allow.owner()`.
- [ ] Registrar `medicinesSchema` em `amplify/data/resource.ts` junto aos schemas existentes (`medical-documents.ts`, `appointments.ts`, `user.ts`).
- [ ] Rodar `ampx sandbox`/deploy local (Node 20 — ver memória do projeto) e confirmar que o model `Medicine` aparece no client gerado (`Schema`).

## 2. `medicineService.ts` (se ainda não existir)
- [ ] Criar `src/services/medicineService.ts` espelhando `src/services/appointmentService.ts`: `listMedicinesForUser`, `getMedicineById`, `createMedicine`, `updateMedicine`, `deleteMedicine`.
- [ ] `getMedicineById`/`updateMedicine`/`deleteMedicine` chamam `invalidateMedicinesCache()` no final das operações de escrita, mesmo padrão de `appointmentService.ts`.
- [ ] `deleteMedicine` não deve tentar nenhuma operação de S3 — é só `client.models.Medicine.delete({ id })` (diferente de `deleteExamDocument`).

## 3. Cache `medicinesCache.ts` (se ainda não existir)
- [ ] Criar `src/hooks/medicinesCache.ts` espelhando `src/hooks/appointmentsCache.ts`: `registerMedicinesRefetchCallback`, `invalidateMedicinesCache`, `loadCachedMedicines`, `saveMedicinesCache`, chave `@SuaSaude:medicinesCache`.

## 4. Rota `edit-medicine.tsx`
- [ ] Criar `src/app/edit-medicine.tsx` (top-level, fora de `(app)`), lendo `id` via `useLocalSearchParams<{ id?: string }>()`.
- [ ] **Não** repetir o `if (!id) return null;` de `edit-appointment.tsx` — usar `Redirect` para `/medicines` quando `id` estiver ausente, ou delegar essa decisão para dentro de `EditMedicineScreen` com um estado de erro explícito (escolher uma abordagem e documentar no código).

## 5. `EditMedicineScreen.tsx`
- [ ] Criar `src/screens/EditMedicineScreen.tsx` recebendo `id: string` como prop.
- [ ] Estado de carregamento inicial: buscar medicamento via `getMedicineById(id)` (reaproveitando cache/lista de `useMedicinesData` quando disponível, para evitar chamada de rede duplicada — ver `plan.md` §2).
- [ ] Estado "Carregando" (skeleton/spinner, padrão de `DESIGN_TOKENS.md` §4) enquanto busca.
- [ ] Estado "Medicamento não encontrado" (id inválido/não pertence ao usuário) com botão de volta a `/medicines` — nunca `return null`.
- [ ] Cabeçalho: botão voltar "‹" (48×48) + título fixo "Editar medicamento" (sem botão de ação adicional no header).
- [ ] Formulário pré-preenchido: Nome, Dosagem, Forma (chips Comprimido/Gotas/Injeção), Horário(s) da dose (lista dinâmica + adicionar/remover), Frequência (chip único, tratado como valor fixo — ver ambiguidade em `plan.md` §7), Data de início, Data de término (opcional, "Sem data" quando ausente), Estoque atual + unidade, Lembretes ativos (chips Ativos/Inativos).
- [ ] Validação local antes de salvar: Nome, Dosagem, ≥1 horário preenchido, Data de início — obrigatórios; destacar campo inválido (borda 2px `#B3261E`) sem chamar `updateMedicine`.
- [ ] Botão "Salvar alterações": chama `updateMedicine(id, input)`; sucesso → invalida cache, feedback de sucesso, navega para `/medicines`; erro → mensagem exibida, campos preservados, permanece na tela.
- [ ] Adicionar/remover horário de dose: `+ Adicionar horário` insere linha vazia; "×" remove a linha correspondente da lista em estado local.

## 6. Painel de confirmação de exclusão — construir correto desde o início (sem Alert/confirm nativo em nenhum momento)
- [ ] Verificar se já existe um componente `DeleteConfirmPanel` (ou equivalente) em `src/components/`, criado por 3c/2e — se existir, reaproveitar; se não, criar aqui e deixá-lo reaproveitável.
- [ ] Implementar estado `isConfirmingDelete: boolean` em `EditMedicineScreen.tsx` desde a primeira versão do componente.
- [ ] Botão "Excluir medicamento" (estado padrão do rodapé) chama **apenas** `setIsConfirmingDelete(true)` — nunca `Alert.alert`, `window.confirm` ou `confirm()`.
- [ ] Renderizar o painel vermelho inline (`#FDECEA`/`#F3C9C5`, ícone "!" 26px `#B3261E`, texto "Tem certeza? Essa ação não pode ser desfeita.", botões Cancelar 52px outline / Excluir 52px sólido vermelho) quando `isConfirmingDelete === true`.
- [ ] "Cancelar" do painel: `setIsConfirmingDelete(false)`, sem chamada de rede, sem descartar edições não salvas do formulário.
- [ ] "Excluir" do painel: chama `deleteMedicine(id)` de verdade, com estado de loading (`isDeleting`); sucesso → invalida cache, feedback, navega para `/medicines`; erro → mensagem exibida, painel fecha, permanece na tela.
- [ ] Verificação objetiva final: `grep -rn "Alert.alert\|window.confirm\|[^.]confirm(" src/screens/EditMedicineScreen.tsx src/app/edit-medicine.tsx` retorna vazio.

## 7. Dark mode e acessibilidade
- [ ] Aplicar `useThemeColors()` a todos os elementos (inputs, chips, painel de confirmação, botões), sem hex fixos hardcoded do Canvas claro.
- [ ] Confirmar toque mínimo ≥48dp em todos os botões (principais 56px, painel de confirmação 52px, remover horário 48×48).

## 8. Verificação de integração com 3d (mock ou real, conforme estado da EPIC 3d no momento da implementação)
- [ ] Confirmar que, após editar um medicamento, `/medicines` (3d) reflete os novos valores sem refresh manual (cache invalidado e refeito corretamente).
- [ ] Confirmar que, após excluir, o medicamento não aparece mais em `/medicines` na próxima visita.
- [ ] Se a EPIC 3d ainda estiver em mock no momento desta implementação, documentar explicitamente no PR/commit que a integração real de leitura (`useMedicinesData` real) é bloqueada por 3d, sem tentar reescrever `MedicinesScreen` como parte desta EPIC.

## 9. Revisão final contra critérios de aceite
- [ ] Repassar cada item da seção 7 de `spec.md` manualmente contra a implementação final antes de considerar o EPIC concluído.

# TASKS: Editar medicamento — com exclusão confirmada

Referência: `spec.md` (critérios de aceite, seção 7) e `plan.md` (schema/serviço/decisões). Marcar cada item ao concluir; nenhum item deve ser marcado sem verificação manual/teste correspondente.

## 0. Pré-requisito — checar estado das EPICs irmãs antes de começar
- [x] Reler `specs/03-exames-receitas/medicamentos/plan.md` e `specs/03-exames-receitas/novo-lembrete-medicamento/plan.md` — usado o schema `Medicine`/nomes de campo canônicos de `medicamentos/plan.md` (pendência #21 do `GAP_ANALYSIS.md`), não os propostos em `plan.md` §1-§3 desta EPIC (`stockQuantity`/`stockUnit`/`frequency` → substituídos por `currentStock`/`initialStock`/`unit`/`frequencyType`).
- [x] Confirmar se `amplify/data/schemas/medicines.ts` já existe (criado por 3d/3f) antes de criar um novo — nunca duplicar o model `Medicine`. (Criado uma única vez, na implementação conjunta de 3d/3f/3g.)
- [x] Confirmar se `src/services/medicineService.ts` e `src/hooks/medicinesCache.ts` já existem antes de criá-los. (Criados uma única vez, compartilhados pelas três telas.)

## 1. Schema Amplify `Medicine` (se ainda não existir)
- [x] Criar `amplify/data/schemas/medicines.ts` com o model `Medicine` — campos do schema canônico (3d), não os desta EPIC, `authorization: allow.owner()`.
- [x] Registrar `medicinesSchema` em `amplify/data/resource.ts` junto aos schemas existentes (`medical-documents.ts`, `appointments.ts`, `user.ts`, `vaccination.ts`).
- [x] Rodar `ampx sandbox`/deploy local (Node 20) e confirmar que o model `Medicine` aparece no client gerado (`Schema`). (`ampx sandbox --once`, deploy concluído.)

## 2. `medicineService.ts` (se ainda não existir)
- [x] Criar `src/services/medicineService.ts` espelhando `src/services/appointmentService.ts`: `listMedicinesForUser`, `getMedicineById`, `createMedicine`, `updateMedicine`, `deleteMedicine`.
- [x] `updateMedicine`/`deleteMedicine`/`createMedicine` chamam `invalidateMedicinesCache()` no final das operações de escrita, mesmo padrão de `appointmentService.ts`. (`getMedicineById` é leitura — não invalida.)
- [x] `deleteMedicine` não deve tentar nenhuma operação de S3 — é só `client.models.Medicine.delete({ id })` (diferente de `deleteExamDocument`).

## 3. Cache `medicinesCache.ts` (se ainda não existir)
- [x] Criar `src/hooks/medicinesCache.ts` espelhando `src/hooks/appointmentsCache.ts`: `registerMedicinesRefetchCallback`, `invalidateMedicinesCache`, `loadCachedMedicines`, `saveMedicinesCache`, chave `@SuaSaude:medicinesCache`.

## 4. Rota `edit-medicine.tsx`
- [x] Criar `src/app/edit-medicine.tsx` (top-level, fora de `(app)`), lendo `id` via `useLocalSearchParams<{ id?: string }>()`.
- [x] **Não** repetir o `if (!id) return null;` de `edit-appointment.tsx` — usa `Redirect` para `/medicines` quando `id` está ausente (mesmo padrão de fallback já usado em `document-detail.tsx`, GAP_ANALYSIS.md item 20).

## 5. `EditMedicineScreen.tsx`
- [x] Criar `src/screens/EditMedicineScreen.tsx` recebendo `id: string` como prop.
- [x] Estado de carregamento inicial: buscar medicamento via `getMedicineById(id)`. (Busca direta, sem reaproveitar cache de `useMedicinesData` — simplificação aceita; `getMedicineById` já lê a lista completa internamente, uma única chamada de rede.)
- [x] Estado "Carregando" (`ScreenSkeleton`, padrão de `DESIGN_TOKENS.md` §4) enquanto busca.
- [x] Estado "Medicamento não encontrado" (id inválido/não pertence ao usuário) com botão de volta a `/medicines` — nunca `return null`.
- [x] Cabeçalho: botão voltar "‹" (48×48) + título fixo "Editar medicamento" (sem botão de ação adicional no header).
- [x] Formulário pré-preenchido: Nome, Dosagem, Forma (chips), Horário(s) da dose (lista dinâmica + adicionar/remover), Frequência (3 chips + sub-blocos condicionais), Data de início, Data de término (opcional, "Sem data" quando ausente), Estoque atual + unidade, Lembretes ativos (chips Ativos/Inativos). (Via `MedicineFormFields`, compartilhado com 3f.)
- [x] Validação local antes de salvar: Nome, Dosagem, ≥1 horário preenchido, Data de início — obrigatórios; botão "Salvar alterações" desabilitado com `disabledReason` até a validação passar (equivalente ao destaque de campo inválido do Canvas — segue o padrão `disabled`/`disabledReason` já usado em `AddExamScreen.tsx`/`Button.tsx`, não o de borda vermelha por campo).
- [x] Botão "Salvar alterações": chama `updateMedicine(id, input)`; sucesso → invalida cache (interno ao service), navega para `/medicines`; erro → mensagem exibida (`InlineError`), campos preservados, permanece na tela.
- [x] Adicionar/remover horário de dose: `+ Adicionar horário` insere linha vazia; botão "×" remove a linha correspondente da lista em estado local (via `DoseTimeRow`).

## 6. Painel de confirmação de exclusão — construir correto desde o início (sem Alert/confirm nativo em nenhum momento)
- [x] Verificar se já existe um componente `DeleteConfirmPanel` (ou equivalente) em `src/components/`, criado por 3c/2e — reaproveitado diretamente, nenhum componente novo criado.
- [x] Implementar estado `isConfirmingDelete: boolean` em `EditMedicineScreen.tsx` desde a primeira versão do componente.
- [x] Botão "Excluir medicamento" (estado padrão do rodapé) chama **apenas** `setIsConfirmingDelete(true)` — nunca `Alert.alert`, `window.confirm` ou `confirm()`.
- [x] Renderizar o painel vermelho inline (via `DeleteConfirmPanel`) quando `isConfirmingDelete === true`.
- [x] "Cancelar" do painel: `setIsConfirmingDelete(false)`, sem chamada de rede, sem descartar edições não salvas do formulário.
- [x] "Excluir" do painel: chama `deleteMedicine(id)` de verdade, com estado de loading (`isDeleting`); sucesso → invalida cache (interno ao service), navega para `/medicines`; erro → mensagem exibida, painel fecha, permanece na tela.
- [x] Verificação objetiva final: `grep -rn "Alert.alert\|window.confirm\|[^.]confirm(" src/screens/EditMedicineScreen.tsx src/app/edit-medicine.tsx` retorna vazio. (Confirmado.)

## 7. Dark mode e acessibilidade
- [x] Aplicar `useThemeColors()`/tokens NativeWind `dark:` a todos os elementos (inputs, chips, painel de confirmação, botões), sem hex fixos hardcoded do Canvas claro.
- [x] Confirmar toque mínimo ≥48dp em todos os botões (principais 56px `h-14`, painel de confirmação 52px, remover horário 48×48 `size-12`).

## 8. Verificação de integração com 3d
- [ ] Confirmar que, após editar um medicamento, `/medicines` (3d) reflete os novos valores sem refresh manual (cache invalidado e refeito corretamente). (Não executado em runtime nesta EPIC — 3d já foi implementada com dado real na mesma passada, mecanismo de cache é o mesmo de `appointments`/`exams`, já validado nesses fluxos, mas não re-testado aqui manualmente.)
- [ ] Confirmar que, após excluir, o medicamento não aparece mais em `/medicines` na próxima visita. (Idem — não testado em runtime.)
- [x] EPIC 3d já implementada com dado real na mesma passada (não mais mock) — item de bloqueio original não se aplica.

## 9. Revisão final contra critérios de aceite
- [ ] Repassar cada item da seção 7 de `spec.md` manualmente contra a implementação final antes de considerar o EPIC concluído. (Não executado em runtime — requer simulador/dispositivo; QA humano.)

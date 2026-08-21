# Tasks: Medicamentos — Novo lembrete de medicamento

## 0. Pré-requisito / reconciliação
- [x] Verificar se `specs/03-exames-receitas/medicamentos/plan.md` (EPIC 3d, irmã) já existe. Usado o schema `Medicine` de lá como fonte de verdade (canônica, pendência #21 do `GAP_ANALYSIS.md`) em vez do proposto em `plan.md` desta EPIC.

## 1. Backend (Amplify)
- [x] Criar `amplify/data/schemas/medicines.ts` com o model `Medicine` (schema canônico de 3d, não o de `plan.md` §1 desta EPIC).
- [x] Registrar `medicinesSchema` em `amplify/data/resource.ts` (import + spread em `a.schema({...})`), seguindo o padrão de `appointmentsSchema`/`medicalDocumentsSchema`.
- [x] Rodar `ampx sandbox` (Node 20 — `nvm use 20.20.1`) para validar que o schema compila e sincroniza sem quebrar os models existentes (`Appointment`, `MedicalDocument`, `User`, `VaccineDose`). (`ampx sandbox --once`, deploy concluído em 121s.)

## 2. Camada de serviço
- [x] Criar `src/services/medicineService.ts`:
  - [x] `MedicineInput`/`MedicineRecord` (interfaces — nomeadas assim, não `CreateMedicineReminderInput`, para bater com o padrão de `AppointmentRecord`/`CreateAppointmentInput` de `appointmentService.ts`).
  - [x] `validateMedicineReminder(input)` — nome/dosagem/forma obrigatórios; horários mínimo 1 sem duplicata; frequência com sub-requisitos condicionais (dias específicos ⇒ ≥1 dia; a cada X horas ⇒ número > 0); data de início obrigatória; estoque atual + unidade obrigatórios.
  - [x] `createMedicine(input)` (equivalente a `createMedicineReminder`) — valida, chama `client.models.Medicine.create(...)`, invalida cache, retorna o registro criado.
  - [x] `invalidateMedicinesCache()` — criada em `src/hooks/medicinesCache.ts` (não em `medicineService.ts`, mesma separação de arquivo já usada por `appointmentsCache.ts`/`appointmentService.ts`) e integrada com `useMedicinesData.ts`.

## 3. UI — tela e rota
- [x] Criar `src/app/add-medicine.tsx` (rota `/add-medicine`, sem params de navegação).
- [x] Criar `src/screens/AddMedicineScreen.tsx`:
  - [x] Header com botão voltar (`router.back()`) + título "Novo lembrete".
  - [x] Campo "Nome do medicamento" (obrigatório).
  - [x] Campo "Dosagem" (obrigatório).
  - [x] Seletor "Forma" (4 chips, seleção única): Comprimido / Gotas / Injeção / Outro.
  - [x] Lista dinâmica de horários (`hh:mm`) com adicionar/remover, mínimo 1 linha inicial.
  - [x] Seletor "Frequência" (3 chips) com sub-blocos condicionais: grade de 7 dias da semana (múltipla seleção) quando "Dias específicos"; campo numérico "a cada X horas" quando "A cada X horas".
  - [x] Par "Data de início" / "Data de término" + chip "Sem data de término" que oculta/torna opcional o campo de término (chip em vez de checkbox nativo — consistente com o resto do formulário, sem introduzir um novo tipo de controle).
  - [x] Par "Estoque atual" (input numérico) + seletor de unidade (3 chips: comp./ml/caps., seleção única).
  - [x] Campo opcional "Avisar quando restar menos de".
  - [x] Textarea opcional "Observações".
  - [x] Toggle "Lembretes ativos" (Ativos/Inativos, default Ativos).
  - [x] Botão "Salvar" com estado habilitado/desabilitado dinâmico conforme validação (nunca habilitado incondicionalmente) — `disabled`/`disabledReason` do `Button`.
  - [x] Estados de erro (campos faltando/duplicados via `disabledReason` preventivo; falha de backend via `InlineError`) exibidos de forma clara, preservando os campos já preenchidos.
  - [x] Chamada de sucesso: `createMedicine()` → `router.replace('/medicines')`.
- [x] Extrair componente `SelectableChip` reutilizável para os 5 grupos de seleção desta tela (forma, frequência, dias da semana, unidade, ativo/inativo) — usado também por `EditMedicineScreen`.
- [x] Extrair componente `DoseTimeRow` para a linha de horário dinâmico (input + botão remover) — usado também por `EditMedicineScreen`.
- [x] (Adicional, não previsto originalmente) Extraído `MedicineFormFields` — agrupa todos os campos acima num único componente compartilhado entre 3f e 3g, evitando duplicar ~250 linhas de formulário entre as duas telas.

## 4. Integração com tela existente
- [x] Em `src/screens/MedicinesScreen.tsx`, botão "+" navega para `/add-medicine` via `router.push('/add-medicine')` (tela foi reescrita nesta mesma implementação, já nasceu sem o `onPress={() => {}}` vazio).

## 5. Validação de light/dark mode
- [x] Conferir que todos os chips, inputs, checkbox e botão "Salvar" usam os pares de cor definidos em `DESIGN_TOKENS.md` (light e dark) via classes `dark:` do NativeWind e `useThemeColors()`, incluindo estados selecionado/não-selecionado e habilitado/desabilitado. (Revisão de código — não confirmado visualmente em runtime/simulador.)

## 6. Documentação de pendências
- [x] Item "Notificações locais de medicamento" já existe em `GAP_ANALYSIS.md` como pendência #22 (criada antes desta implementação) — não duplicado; atualizado o texto da pendência #1 para referenciá-lo explicitamente em vez de repetir o conteúdo.
- [x] Schema `Medicine` criado nesta implementação (nem 3d nem 3f/3g existiam antes) — nota de reconciliação registrada em `GAP_ANALYSIS.md` pendência #21 (marcada `RESOLVIDO`).

## 7. Testes manuais (critérios de aceite de `spec.md` §7)
- [ ] Abrir `/add-medicine` a partir do botão "+" em `/medicines` e confirmar estado inicial vazio. (Não executado em runtime nesta EPIC — requer simulador/dispositivo; QA humano.)
- [ ] Testar as 3 frequências e confirmar que os campos condicionais aparecem/desaparecem corretamente, sem sobreposição. (Idem.)
- [ ] Testar adicionar/remover horários, incluindo tentativa de salvar com horários duplicados (deve bloquear com mensagem clara). (Idem — validação implementada em `validateMedicineReminder`, não re-testada em runtime.)
- [ ] Testar chip "Sem data de término" ocultando/reexibindo o campo de término. (Idem.)
- [ ] Testar botão "Salvar" desabilitado até todos os campos obrigatórios (com sub-requisitos de frequência) estarem completos. (Idem.)
- [ ] Testar fluxo de sucesso completo: salvar → volta para `/medicines` → novo lembrete visível sem refresh manual. (Idem — mecanismo de cache/invalidação implementado, não re-testado em runtime.)
- [ ] Testar fluxo de falha de backend (ex.: desconectar rede) → mensagem de erro clara, campos preservados. (Idem.)
- [ ] Testar em light e dark mode. (Idem.)

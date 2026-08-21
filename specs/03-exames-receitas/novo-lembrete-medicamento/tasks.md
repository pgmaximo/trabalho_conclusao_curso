# Tasks: Medicamentos — Novo lembrete de medicamento

## 0. Pré-requisito / reconciliação
- [ ] Verificar se `specs/03-exames-receitas/medicamentos/plan.md` (EPIC 3d, irmã) já existe. Se existir, reler o schema `Medicine` proposto lá e usá-lo como fonte de verdade em vez do schema proposto em `plan.md` desta EPIC (3f), ajustando apenas o necessário.

## 1. Backend (Amplify)
- [ ] Criar `amplify/data/schemas/medicines.ts` com o model `Medicine` (ver `plan.md` §1), reconciliado com a EPIC 3d se aplicável.
- [ ] Registrar `medicinesSchema` em `amplify/data/resource.ts` (import + spread em `a.schema({...})`), seguindo o padrão de `appointmentsSchema`/`medicalDocumentsSchema`.
- [ ] Rodar `ampx sandbox` (Node 20 — `nvm use 20.20.1`) para validar que o schema compila e sincroniza sem quebrar os models existentes (`Appointment`, `MedicalDocument`, `User`).

## 2. Camada de serviço
- [ ] Criar `src/services/medicineService.ts`:
  - [ ] `CreateMedicineReminderInput` (interface).
  - [ ] `validateMedicineReminder(input)` — nome/dosagem/forma obrigatórios; horários mínimo 1 sem duplicata; frequência com sub-requisitos condicionais (dias específicos ⇒ ≥1 dia; a cada X horas ⇒ número > 0); data de início obrigatória; estoque atual + unidade obrigatórios.
  - [ ] `createMedicineReminder(input)` — valida, chama `client.models.Medicine.create(...)`, invalida cache, retorna o registro criado.
  - [ ] `invalidateMedicinesCache()` (ou equivalente) — nova função a integrar com `useMedicinesData.ts`, espelhando `invalidateExamsCache()`.

## 3. UI — tela e rota
- [ ] Criar `src/app/add-medicine.tsx` (rota `/add-medicine`, sem params de navegação).
- [ ] Criar `src/screens/AddMedicineScreen.tsx`:
  - [ ] Header com botão voltar (`router.back()`) + título "Novo lembrete".
  - [ ] Campo "Nome do medicamento" (obrigatório).
  - [ ] Campo "Dosagem" (obrigatório).
  - [ ] Seletor "Forma" (4 chips, seleção única): Comprimido / Gotas / Injeção / Outro.
  - [ ] Lista dinâmica de horários (`hh:mm`) com adicionar/remover, mínimo 1 linha inicial.
  - [ ] Seletor "Frequência" (3 chips) com sub-blocos condicionais: grade de 7 dias da semana (múltipla seleção) quando "Dias específicos"; campo numérico "a cada X horas" quando "A cada X horas".
  - [ ] Par "Data de início" / "Data de término" + checkbox "Sem data de término" que desabilita/torna opcional o campo de término.
  - [ ] Par "Estoque atual" (input numérico) + seletor de unidade (3 chips: comp./ml/caps., seleção única).
  - [ ] Campo opcional "Avisar quando restar menos de".
  - [ ] Textarea opcional "Observações".
  - [ ] Toggle "Lembretes ativos" (Ativos/Inativos, default Ativos — ver spec.md §8).
  - [ ] Botão "Salvar" com estado habilitado/desabilitado dinâmico conforme validação (nunca habilitado incondicionalmente).
  - [ ] Estados de erro (mensagem de horário duplicado, campos faltando, falha de backend) exibidos de forma clara, preservando os campos já preenchidos.
  - [ ] Chamada de sucesso: `createMedicineReminder()` → volta para `/medicines` (`router.back()` ou `router.replace('/medicines')`).
- [ ] (Opcional/recomendado) Extrair componente `SelectableChip`/`Chip` reutilizável para os 5 grupos de seleção desta tela (forma, frequência, dias da semana, unidade, ativo/inativo), evitando duplicação de estilo inline.
- [ ] (Opcional/recomendado) Extrair componente `DoseTimeRow` para a linha de horário dinâmico (input + botão remover).

## 4. Integração com tela existente
- [ ] Em `src/screens/MedicinesScreen.tsx`, substituir `onPress={() => {}}` do botão "+" do header por navegação para `/add-medicine` (`router.push('/add-medicine')`), garantindo que o componente tenha acesso a `useRouter()`.

## 5. Validação de light/dark mode
- [ ] Conferir que todos os chips, inputs, checkbox e botão "Salvar" usam os pares de cor definidos em `DESIGN_TOKENS.md` (light e dark), incluindo estados selecionado/não-selecionado e habilitado/desabilitado.

## 6. Documentação de pendências
- [ ] Adicionar em `GAP_ANALYSIS.md` (seção de pendências técnicas) um novo item explícito: "Notificações locais de medicamento — requer `expo-notifications` (não instalado hoje); 3f/3g apenas persistem a configuração de horários/frequência, sem disparo real de lembrete no dispositivo."
- [ ] Se o schema `Medicine` foi criado nesta implementação (por 3d ainda não existir), deixar um comentário/nota rastreável (ex.: no próprio `amplify/data/schemas/medicines.ts` ou em `GAP_ANALYSIS.md`) indicando que a EPIC 3d deve reconciliar/reaproveitar esse schema em vez de criar um novo.

## 7. Testes manuais (critérios de aceite de `spec.md` §7)
- [ ] Abrir `/add-medicine` a partir do botão "+" em `/medicines` e confirmar estado inicial vazio.
- [ ] Testar as 3 frequências e confirmar que os campos condicionais aparecem/desaparecem corretamente, sem sobreposição.
- [ ] Testar adicionar/remover horários, incluindo tentativa de salvar com horários duplicados (deve bloquear com mensagem clara).
- [ ] Testar checkbox "Sem data de término" habilitando/desabilitando o campo de término.
- [ ] Testar botão "Salvar" desabilitado até todos os campos obrigatórios (com sub-requisitos de frequência) estarem completos.
- [ ] Testar fluxo de sucesso completo: salvar → volta para `/medicines` → novo lembrete visível sem refresh manual.
- [ ] Testar fluxo de falha de backend (ex.: desconectar rede) → mensagem de erro clara, campos preservados.
- [ ] Testar em light e dark mode.

# Plano técnico: Medicamentos — Novo lembrete de medicamento

## 1. Dependência crítica: schema Amplify `Medicine`

Este EPIC (3f) e o EPIC irmão `specs/03-exames-receitas/medicamentos/` (tela 3d, "Medicamentos — doses e estoque") compartilham a mesma necessidade: hoje **não existe nenhum model Amplify/DynamoDB para medicamentos** (`GAP_ANALYSIS.md` linha 71, `CODE_INVENTORY.md` linha 113 — `medicinesApi.ts` é 100% mock, consumido por `useMedicinesData.ts`/`MedicinesScreen.tsx`).

Na data desta spec, `specs/03-exames-receitas/medicamentos/plan.md` **não existe** (confirmado via `Glob specs/03-exames-receitas/medicamentos/*` → nenhum arquivo encontrado). Portanto, este plano **propõe** o schema abaixo, e sinaliza explicitamente: **este schema deve ser reconciliado com a EPIC irmã (3d) quando ela for escrita** — se os campos divergirem, a EPIC de 3d é a autoridade para o modelo de leitura/listagem (doses do dia, estoque agregado), e esta EPIC (3f) é a autoridade para o modelo de escrita/criação (todos os campos de configuração do lembrete). Idealmente ambas convergem para o mesmo model único `Medicine`.

### Schema proposto (`amplify/data/schemas/medicines.ts`)

Seguindo o padrão já estabelecido em `amplify/data/schemas/appointments.ts` (model plano, tipos primitivos, sem relations complexas, `allow.owner()`):

```ts
import { a } from '@aws-amplify/backend';

export const medicinesSchema = {
  Medicine: a
    .model({
      name: a.string().required(),
      dosage: a.string().required(),
      form: a.enum(['COMPRIMIDO', 'GOTAS', 'INJECAO', 'OUTRO']),
      doseTimes: a.string().required().array().required(), // ["08:00", "20:00"]
      frequencyType: a.enum(['DAILY', 'SPECIFIC_DAYS', 'EVERY_X_HOURS']),
      frequencyDays: a.string().array(), // ["MON","WED","FRI"] — só quando SPECIFIC_DAYS
      frequencyEveryHours: a.integer(), // só quando EVERY_X_HOURS
      startDate: a.date().required(),
      endDate: a.date(),
      hasNoEndDate: a.boolean().default(false),
      currentStock: a.integer().required(),
      stockUnit: a.enum(['COMPRIMIDO', 'ML', 'CAPSULA']),
      lowStockThreshold: a.integer(),
      notes: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner()]),
};
```

Registrar em `amplify/data/resource.ts` seguindo o padrão existente (`...medicinesSchema` no spread do `a.schema({...})`, import `medicinesSchema` de `./schemas/medicines.js`).

**Decisão de nomenclatura**: `form` e `stockUnit` reusam nomes de enum já em maiúsculas/inglês-curto, espelhando `AppointmentType` (`CONSULTA`/`EXAME`/`CIRURGIA`) — mantém consistência com o padrão de enum já usado no schema de `Appointment`, mesmo que os labels de UI (`Comprimido`, `Gotas`...) permaneçam em português.

**Pendência explícita de reconciliação**: se a EPIC 3d (`medicamentos/plan.md`) já tiver sido escrita quando esta EPIC for implementada, a implementação deve reler aquele `plan.md` e usar o schema lá definido em vez deste, ajustando apenas nomenclatura se necessário — não deve haver dois schemas `Medicine` divergentes no mesmo Amplify backend.

## 2. Camada de serviço proposta: `src/services/medicineService.ts`

Seguindo o padrão exato de `src/services/examService.ts` (validação pura + funções de acesso a dados separadas + tratamento de erro consistente):

- `export interface CreateMedicineReminderInput { name, dosage, form, doseTimes: string[], frequencyType, frequencyDays？, frequencyEveryHours?, startDate, endDate?, hasNoEndDate, currentStock, stockUnit, lowStockThreshold?, notes?, isActive }`
- `export function validateMedicineReminder(input): MedicineValidationError[]` — replica o padrão de `validateExamDocument()`:
  - `name`/`dosage`/`form` obrigatórios.
  - `doseTimes.length >= 1`; nenhum valor duplicado (`new Set(doseTimes).size !== doseTimes.length` → erro "Horários de dose duplicados").
  - `frequencyType` obrigatório; se `SPECIFIC_DAYS`, `frequencyDays.length >= 1`; se `EVERY_X_HOURS`, `frequencyEveryHours` é inteiro > 0.
  - `startDate` obrigatório; `endDate` obrigatório apenas se `!hasNoEndDate` (decisão a confirmar com o time de produto/TCC — spec.md §8 documenta a ambiguidade e por ora adota opcional mesmo assim).
  - `currentStock` obrigatório, número ≥ 0; `stockUnit` obrigatório.
- `export async function createMedicineReminder(input): Promise<Medicine>` — chama `validateMedicineReminder`, depois `client.models.Medicine.create(...)`, depois invalida cache (`invalidateMedicinesCache()`, nova função espelhando `invalidateExamsCache()` em `useMedicinesData.ts`).
- Não há upload de arquivo/S3 nesta tela — service mais simples que `examService.ts`, sem `uploadFileToS3`.

## 3. Tela: `src/screens/AddMedicineScreen.tsx` + rota `src/app/add-medicine.tsx`

- Rota `src/app/add-medicine.tsx`: componente fino, sem params de navegação recebidos (diferente de `add-exam.tsx`, que recebe `fileName`/`filePath`/`fileSize` do document picker) — esta tela é criação pura, todos os campos começam vazios.
- `AddMedicineScreen.tsx`: usa `react-hook-form` + `zod` (já usados no projeto — `EditProfileScreen`/`OnboardingScreen`, `src/validation/forms_profile_setup`) para validação de formulário reativa, em vez de reimplementar validação manual de estado — reduz risco de bug de sincronização entre estado dos chips e habilitação do botão "Salvar". Justificativa de reuso: regra 3 da constituição ("Stack existente é respeitada antes de expandida") — `react-hook-form`/`zod` já são dependências do projeto.
- Estado local para: `doseTimes: string[]` (array dinâmico, add/remove), `frequencyType`, `frequencyDays: string[]` (seleção múltipla), `hasNoEndDate: boolean`, `form`, `stockUnit`, `isActive` — todos como chips controlados manualmente (fora do `react-hook-form`, ou via `Controller` do RHF, decisão de implementação).
- Componentização proposta (reuso do padrão de `DESIGN_TOKENS.md`/componentes existentes):
  - Reaproveitar padrão de chip já usado em algum lugar do app se existir (verificar `src/components/` na implementação); senão, criar um componente `Chip`/`SelectableChip` reutilizável — evita duplicar estilo inline em 4+ lugares desta tela (forma, frequência, dias da semana, unidade, ativo/inativo).
  - Componente de linha de horário dinâmico (`DoseTimeRow`) encapsulando input + botão remover.

## 4. NON-GOAL explícito: notificações/lembretes reais

**Confirmado**: `expo-notifications` **não está instalado** no projeto — busca em `package.json` e em todo `src/` não encontrou nenhuma referência a `expo-notifications` ou API de notificação local/push equivalente.

Isso significa que, mesmo após este EPIC salvar corretamente `doseTimes`/`frequencyType`/`frequencyDays`/`frequencyEveryHours` no backend, **nenhum lembrete/notificação real é disparado no dispositivo** — os dados ficam armazenados e disponíveis para a tela `/medicines` exibir (ex.: "próxima dose às 08:00"), mas não há push/local notification agendada.

**Isto é uma pendência técnica separada, fora do escopo deste EPIC**, que deve ser registrada como um novo item em `GAP_ANALYSIS.md` (seção de pendências técnicas) na implementação: "Notificações locais de medicamento — requer integração `expo-notifications` (permissões, agendamento recorrente baseado em `doseTimes`/`frequencyType`, cancelamento ao editar/excluir/inativar lembrete) — não coberto por 3f/3g, tela apenas persiste a configuração." Não simular silenciosamente que o lembrete "notifica" o usuário — copy da UI (ex.: em toasts de sucesso) deve dizer apenas "Lembrete salvo", nunca prometer "Você será notificado às 08:00" enquanto essa integração não existir.

## 5. Integração com `MedicinesScreen.tsx`

- `src/screens/MedicinesScreen.tsx` linha ~69: botão "+" do `ScreenHeader action` tem `onPress={() => {}}` vazio — implementação deve trocar para navegação (`router.push('/add-medicine')`), exigindo que `MedicinesScreen` (ou o componente de rota que a envolve) tenha acesso a `useRouter()` do `expo-router`.
- `useMedicinesData.ts`/`medicinesApi.ts` permanecem mock até a EPIC 3d migrar a leitura para o model Amplify real — este EPIC (3f) não altera a tela de listagem além do botão "+", apenas adiciona o novo fluxo de criação. Se o schema `Medicine` for criado nesta implementação (por não existir ainda a EPIC 3d), fica registrado como pendência que `medicinesApi.ts`/`useMedicinesData.ts` continuam mockados até 3d ser implementada — a criação (3f) pode escrever no DynamoDB real antes mesmo da leitura (3d) ser migrada, o que é aceitável mas deve ser documentado como estado transitório.

## 6. Riscos e decisões em aberto
- **Risco de schema divergente** com a EPIC irmã 3d — mitigado por releitura obrigatória de `medicamentos/plan.md` antes de codar, se existir.
- **Enum `form`/`stockUnit` em inglês/maiúsculas vs. labels em português na UI** — decisão consistente com `AppointmentType`, mas deve ser confirmada no `plan.md` de 3d também.
- **`react-hook-form` para uma tela com múltiplos arrays dinâmicos (horários) e chips condicionais (frequência)** é mais complexo que o padrão simples usado em `AddExamScreen.tsx` (que usa `useState` puro) — decisão de implementação pode optar por `useState` puro em vez de RHF se a integração com arrays dinâmicos se mostrar custosa; ambas as abordagens são aceitáveis dentro da regra 3 da constituição, a decisão final fica com quem implementar.

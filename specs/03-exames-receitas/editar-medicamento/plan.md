# PLAN: Editar medicamento — com exclusão confirmada

## 0. Estado das EPICs irmãs (bloqueio de leitura, não de escrita desta spec)
No momento em que este `plan.md` foi escrito, nenhum dos dois arquivos abaixo existia:
- `specs/03-exames-receitas/medicamentos/plan.md` (EPIC 3d — tela de lista/estoque `MedicinesScreen`)
- `specs/03-exames-receitas/novo-lembrete-medicamento/plan.md` (EPIC 3f — formulário de criação, rota proposta `src/app/add-medicine.tsx`)

Isso significa que **não existe hoje** um model Amplify `Medicine`, nem um `medicineService.ts`, nem uma tela de criação real — `MedicinesScreen`/`useMedicinesData` continuam 100% mock (`src/mocks/medicines.ts`, `src/mocks/api/medicinesApi.ts`), confirmado por leitura direta do código. Este plano portanto **propõe** o schema, os serviços e os nomes de campo do zero, com base (a) no markup do Canvas 3f/3g (que compartilham os mesmos campos, conforme o próprio prompt de design confirma) e (b) no padrão já implementado e testado para `Appointment`/`appointmentService.ts`/`appointmentsCache.ts` (tela 2e, análoga em forma: editar + excluir com confirmação). Se `medicamentos`/`novo-lembrete-medicamento` forem escritas depois com decisões diferentes de schema, este `plan.md` deve ser revisado e reconciliado nesse momento — é uma dívida explícita, não um bloqueio para esta EPIC prosseguir.

## 1. Schema Amplify proposto — `Medicine`
Novo arquivo `amplify/data/schemas/medicines.ts`, registrado em `amplify/data/resource.ts` junto aos schemas existentes (`medical-documents.ts`, `appointments.ts`, `user.ts`), seguindo exatamente o mesmo padrão de `appointmentsSchema`:

```ts
import { a } from '@aws-amplify/backend';

export const medicinesSchema = {
  Medicine: a
    .model({
      name: a.string().required(),
      dosage: a.string().required(),
      form: a.enum(['COMPRIMIDO', 'GOTAS', 'INJECAO']),
      times: a.string().array().required(),      // ["08:00", "20:00"], hh:mm
      frequency: a.string(),                       // valor fixo hoje: "Todos os dias" — ver ambiguidade na spec.md §3
      startDate: a.string().required(),
      endDate: a.string(),                          // opcional — "Sem data" no Canvas quando ausente
      stockQuantity: a.integer().required(),
      stockUnit: a.string(),                        // ex.: "comprimidos", "ml", "doses"
      remindersActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner()]),
};
```

Justificativa por campo, ligada diretamente ao markup de 3g (linhas 556-598 do `.dc.html`): `emName`→`name`, `emDose`→`dosage`, chips Comprimido/Gotas/Injeção→`form` (enum, mesmo padrão de `Appointment.appointmentType`), `emTimesList`→`times` (array, pois o Canvas usa `sc-for` com `onRemove` por item — precisa de lista, não string única), chip "Todos os dias"→`frequency` (string livre por ora, não enum, dado que o Canvas não revela outras opções — ver decisão na seção 3), `emStartDate`/"Data de término" desabilitada→`startDate` obrigatório/`endDate` opcional, "Estoque atual" + tag de unidade→`stockQuantity`/`stockUnit`, chips "Ativos"/"Inativos"→`remindersActive` boolean.

Este é o mesmo formato de dados que a EPIC 3f (`novo-lembrete-medicamento`) precisará para o `create`, dado que 3f e 3g compartilham exatamente o mesmo conjunto de campos — a criação deste schema aqui **pode e deve ser reaproveitada** por 3f quando ela for implementada, evitando duas propostas de schema divergentes para o mesmo model. Se a EPIC 3f já estiver implementada quando esta EPIC for construída, usar o schema que ela já tiver criado em vez deste, e ajustar `medicineService.ts`/os nomes de campo abaixo para bater com o que já existir (regra 3 da constituição: reaproveitar o que já está instalado).

## 2. `medicineService.ts` — funções propostas
Novo arquivo `src/services/medicineService.ts`, espelhando ponto a ponto `src/services/appointmentService.ts` (que já resolve o mesmo problema de forma para `Appointment`):

```ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { invalidateMedicinesCache } from '@/hooks/medicinesCache';

const client = generateClient<Schema>();

export type MedicineForm = 'COMPRIMIDO' | 'GOTAS' | 'INJECAO';

export interface MedicineInput {
  name: string;
  dosage: string;
  form?: MedicineForm;
  times: string[];
  frequency?: string;
  startDate: string;
  endDate?: string | null;
  stockQuantity: number;
  stockUnit?: string;
  remindersActive?: boolean;
}

export interface MedicineRecord extends MedicineInput {
  id: string;
  createdAt?: string;
}

export async function listMedicinesForUser(): Promise<MedicineRecord[]> { /* client.models.Medicine.list(), mesmo padrão de listAppointmentsForUser */ }
export async function getMedicineById(id: string): Promise<MedicineRecord | null> { /* filtra o resultado de listMedicinesForUser, mesmo padrão de getAppointmentById — evita 2ª chamada de rede quando a lista já está em memória/cache */ }
export async function createMedicine(input: MedicineInput): Promise<MedicineRecord> { /* client.models.Medicine.create + invalidateMedicinesCache(); usado por 3f, não por esta EPIC — incluído aqui só porque o schema/serviço nasce nesta EPIC */ }
export async function updateMedicine(id: string, input: Partial<MedicineInput>): Promise<MedicineRecord> { /* client.models.Medicine.update({ id, ...campos presentes }) + invalidateMedicinesCache(), mesmo padrão de updateAppointment */ }
export async function deleteMedicine(id: string): Promise<void> { /* client.models.Medicine.delete({ id }) + invalidateMedicinesCache(), mesmo padrão de deleteAppointment — sem S3 envolvido, diferente de deleteExamDocument */ }
```

`getMedicineById`/`updateMedicine`/`deleteMedicine` são o que **esta EPIC (3g) efetivamente consome**. `createMedicine`/`listMedicinesForUser` são incluídas no mesmo arquivo porque o serviço precisa nascer completo para ser reaproveitável por 3f e 3d — mas sua UI de consumo (formulário de criação, lista) é responsabilidade das EPICs 3f/3d, não desta.

## 3. Cache — `medicinesCache.ts` (mirror de `appointmentsCache.ts`)
Novo arquivo `src/hooks/medicinesCache.ts`, cópia estrutural exata de `src/hooks/appointmentsCache.ts`, trocando a chave e os nomes:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDICINES_CACHE_KEY = '@SuaSaude:medicinesCache';

let refetchCallbacks: Array<() => void> = [];

export function registerMedicinesRefetchCallback(callback: () => void) { /* idêntico a registerAppointmentsRefetchCallback */ }
export async function invalidateMedicinesCache(): Promise<void> { /* AsyncStorage.removeItem + notifica callbacks, idêntico a invalidateAppointmentsCache */ }
export async function loadCachedMedicines<T>(): Promise<T | null> { /* idêntico a loadCachedAppointments */ }
export async function saveMedicinesCache<T>(value: T): Promise<void> { /* idêntico a saveAppointmentsCache */ }
```

Padrão de invalidação: `updateMedicine`/`deleteMedicine`/`createMedicine` chamam `invalidateMedicinesCache()` internamente ao final (mesma posição que `appointmentService.ts` usa), que por sua vez dispara os `refetchCallbacks` registrados por quem consome os dados — o hook real de leitura (`useMedicinesData`, hoje mock) precisa ser reescrito pela EPIC 3d para: (a) tentar `loadCachedMedicines` primeiro, (b) buscar via `listMedicinesForUser()` quando o cache está vazio/inválido, (c) chamar `saveMedicinesCache` após buscar, (d) registrar-se via `registerMedicinesRefetchCallback` para refazer a leitura quando 3g/3f invalidam o cache. Essa reescrita de `useMedicinesData` é escopo da EPIC 3d, não desta — aqui só se documenta o contrato que 3g precisa que exista do outro lado.

## 4. Rota e tela — `edit-medicine.tsx` / `EditMedicineScreen.tsx`
Espelha exatamente `src/app/edit-appointment.tsx`/`EditAppointmentScreen`:

```tsx
// src/app/edit-medicine.tsx
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { EditMedicineScreen } from '@/screens/EditMedicineScreen';

export default function EditMedicineRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id) return null; // ver nota abaixo — cobrir com estado de erro/redirect real, não deixar como está em edit-appointment.tsx
  return <EditMedicineScreen id={id} />;
}
```

Nota de qualidade (não bloqueante, mas registrada): o `edit-appointment.tsx` existente usa `if (!id) return null;` — a mesma tela-em-branco que já foi identificada como gap em `document-detail.tsx`/3c. Como esta EPIC exige explicitamente "nunca tela em branco" (critério de aceite, seção 7 da spec), `edit-medicine.tsx`/`EditMedicineScreen.tsx` **não deve repetir esse padrão**: cobrir `id` ausente com um `Redirect` para `/medicines` (equivalente à Opção A documentada em `detalhe-documento/plan.md`) dentro do próprio componente de rota ou logo no mount de `EditMedicineScreen`, e cobrir `id` presente-mas-não-encontrado com o estado "Erro" padrão dentro da tela (não um `return null` silencioso).

`EditMedicineScreen.tsx` (novo, `src/screens/`) segue a mesma estrutura de estados que `DocumentDetailScreen`/`EditAppointmentScreen` já usam: `isLoading` (busca inicial por id), `errorMessage`/estado "não encontrado", estado de formulário controlado (um `useState` por campo ou um objeto único), `isSaving`, `isConfirmingDelete` (boolean — controla qual bloco do rodapé renderiza, nunca `Alert`/`confirm`), `isDeleting`.

## 5. Componente de confirmação de exclusão — construir correto desde já
Ponto central pedido pelo prompt deste EPIC: por esta ser uma tela **inteiramente nova**, não existe nenhum código legado com `Alert.alert`/`window.confirm` para "corrigir" aqui — diferente de login, cadastro, confirmação, 3c e 2e, onde múltiplas EPICs já documentaram (e precisaram corrigir) o hábito do código-base de implementar primeiro com o diálogo nativo do SO/navegador e só depois migrar para o painel inline do Canvas. Esta EPIC deve **evitar esse retrabalho por completo**:
- Implementar `isConfirmingDelete: boolean` desde a primeira versão do componente.
- O botão "Excluir medicamento" só chama `setIsConfirmingDelete(true)` — nunca `Alert.alert(...)`, nunca `window.confirm(...)`, nunca `confirm(...)` em nenhum commit intermediário.
- Renderizar o painel vermelho inline (`#FDECEA`/`#F3C9C5`, ícone "!" 26px, texto fixo, botões Cancelar/Excluir 52px) quando `isConfirmingDelete === true`, seguindo `DESIGN_TOKENS.md` §4 ao pé da letra.
- Se um componente compartilhado `DeleteConfirmPanel` já existir em `src/components/` no momento da implementação (por ter sido criado por 3c ou 2e, que documentam essa possibilidade em seus próprios `plan.md`), **reaproveitar** esse componente aqui em vez de duplicar o markup — checar `src/components/` antes de escrever o painel do zero (regra 3 da constituição). Se nenhum existir ainda, esta EPIC pode ser a que o cria, deixando-o pronto para 3c/2e reaproveitarem depois.
- Critério de verificação objetiva: `grep -rn "Alert.alert\|window.confirm\|[^.]confirm(" src/screens/EditMedicineScreen.tsx src/app/edit-medicine.tsx` deve retornar vazio antes de considerar a EPIC concluída.

## 6. Reaproveitamento de componentes existentes
- `FormField`/inputs de texto, `DateInput` (já usado em 3b/3c) para "Data de início"/"Data de término".
- Padrão de chip selecionado/não-selecionado (Forma, Frequência, Lembretes ativos) — verificar se já existe um componente `ChipSelector`/`SegmentedControl` genérico em `src/components/`; se não existir, é aceitável introduzi-lo aqui já que o mesmo padrão será reaproveitado por 3f (mesmos campos) — justificar em `tasks.md` como decisão de reuso (regra 3 da constituição), não duplicar estilo inline em múltiplos arquivos.
- `useThemeColors()` para dark mode, como já usado em `DocumentDetailScreen`/`EditAppointmentScreen`.
- `ScreenHeader`/botão de voltar padrão já usados nas outras telas do app.

## 7. Riscos e decisões
- **Risco de reconciliação de schema**: se `medicamentos`/`novo-lembrete-medicamento` definirem um schema `Medicine` diferente do proposto aqui (nomes de campo, enum de `form`, tipo de `frequency`), este `plan.md` e `medicineService.ts` precisam ser ajustados antes da implementação real desta EPIC — registrado como dívida explícita na seção 0, não bloqueante para aprovar esta spec.
- **Ambiguidade de "Frequência"**: o Canvas 3g mostra um único chip fixo pré-selecionado ("Todos os dias"), sem outras opções visíveis. Decisão (regra 8 da constituição): tratar `frequency` como `string` livre (não `enum` fechado) nesta primeira versão, exibindo o chip como somente-informativo/único, para não travar a implementação numa lista de opções que o Canvas não revela — se 3f revelar mais opções de frequência no seu próprio markup, esta decisão deve ser revista.
- **Sem operação de S3**: diferente de `MedicalDocument` (3c), `Medicine` não tem arquivo anexado — `deleteMedicine` é uma exclusão de registro único, não precisa do padrão de "dois lados" (regra 5 da constituição) que `deleteExamDocument` implementa.
- **Escopo explicitamente fora deste EPIC**: reescrever `useMedicinesData`/`MedicinesScreen` para consumir dados reais (escopo de 3d); construir o formulário de criação `add-medicine.tsx`/`AddMedicineScreen` (escopo de 3f) — esta EPIC só consome o schema/serviço que ambas vão precisar, não implementa as telas delas.

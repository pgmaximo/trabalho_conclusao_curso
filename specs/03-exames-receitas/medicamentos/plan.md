# PLAN: Medicamentos — Doses e Estoque (Bloco 3)

## 1. Diagnóstico — estado atual vs. design

Leitura de `src/screens/MedicinesScreen.tsx` (renderizado por `src/app/(app)/medicines.tsx`, dados de `src/hooks/useMedicinesData.ts`, mock em `src/mocks/api/medicinesApi.ts` + `src/mocks/medicines.ts`) comparado ao markup da tela 3d.

| Elemento do design | Existe hoje? | Detalhe do gap |
|---|---|---|
| Título "Medicamentos" + botão "+" | Parcial | `ScreenHeader` hoje renderiza título com **subtítulo extra** ("Controle de doses, estoque e lembretes...") e um **badge de contagem de pendentes** (`badgeLabel`) que não existem no Canvas 3d (Canvas só tem título 600 26px + botão "+"). O botão "+" existe mas é `onPress={() => {}}` — **não navega para lugar nenhum** (gap funcional). Botão também é 40×40 no código vs. 48×48 no Canvas. |
| Banner "Você tem N lembretes ativos para hoje" | **Não existe** | A tela atual não tem esse banner; em vez disso tem uma seção "Lembretes ativados" no rodapé (`ReminderBanner`, título/descrição genéricos vindos do mock: "Lembrete ativado" / "Notificações 15 min antes de cada dose") — estrutura e posição completamente diferentes do Canvas (que coloca um banner azul de contagem **logo abaixo do título**, antes de "Próximas doses"). **Gap estrutural a corrigir**: mover para o topo, trocar copy fixa por contagem real derivada dos dados. |
| Seção "Próximas doses" | Sim, estruturalmente | `MedicineCard` já existe e é usada; precisa confirmar que as cores/tamanhos do badge batem com o Canvas (pill com ícone-círculo `mark`/texto `label` dinâmicos) — a decidir na implementação, não um gap central desta EPIC (é ajuste visual, não funcional). |
| Toggle "Tomado"/"Pendente" | Sim, mas efêmero | `onToggleMedicineStatus` já alterna o status localmente (`toggleMedicineStatus` no mock), mas **não persiste em lugar nenhum real** — ao recarregar a tela, o estado volta ao mock estático. **Gap funcional central**, resolvido apenas depois que o schema existir (ver §3 abaixo). |
| Seção "Estoques" | Sim, estruturalmente | `MedicineStock` já existe com `percentage`/`status` (`'low' | 'ok'`), aparentemente já modelando a lógica de alerta. Precisa confirmar que o card renderiza a borda âmbar + linha de alerta exatamente como o Canvas quando `status === 'low'` — ajuste visual a validar na implementação. |
| Fonte de dados | **100% mock — maior gap** | `useMedicinesData` chama `getMedicinesSnapshot()` de `src/mocks/api/medicinesApi.ts`, que lê `MEDICINES_SNAPSHOT` estático de `src/mocks/medicines.ts`. **Não existe nenhum model Amplify para medicamentos** (`CODE_INVENTORY.md` linha 113, `GAP_ANALYSIS.md` pendência #1). Este é o gap que esta EPIC resolve como decisão de schema — ver §2. |
| Navegação para criar/editar (3f/3g) | **Não existe** | Nem o botão "+" nem os cards de dose/estoque navegam para lugar nenhum hoje. As telas 3f/3g em si têm suas próprias EPICs (fora de escopo de implementação aqui), mas os pontos de entrada em 3d devem existir e apontar para rotas reais assim que 3f/3g forem implementadas. |
| Bottom nav "Remédios" ativo | Sim, já implementado globalmente | `BottomTabBar`/`AppShell` cuidam disso; fora do escopo desta EPIC (item de Fundação). |

## 2. Decisão de schema — model `Medicine` (constituição, regra 5)

**Contexto:** não existe hoje nenhuma tabela DynamoDB para medicamentos. As três telas do fluxo de medicamentos (3d "lista de doses/estoque", 3f "novo lembrete", 3g "editar/excluir") todas dependem do mesmo dado subjacente — a prescrição/lembrete de um medicamento com seus horários, frequência, período de validade e estoque. Criar o schema aqui, na EPIC de 3d, evita que 3f e 3g cada uma proponha um schema incompatível de forma independente.

**Decisão:** criar `amplify/data/schemas/medicines.ts`, seguindo exatamente o estilo de `medical-documents.ts` e `appointments.ts` (model simples com `a.model()`, tipos primitivos/enum, `allow.owner()`):

```typescript
import { a } from '@aws-amplify/backend';

export const medicinesSchema = {
  Medicine: a
    .model({
      name: a.string().required(),
      dosage: a.string().required(),
      form: a.enum(['PILL', 'DROPS', 'INJECTION', 'OTHER']),
      times: a.string().required().array(), // lista de "hh:mm"
      frequencyType: a.enum(['DAILY', 'SPECIFIC_DAYS', 'EVERY_X_HOURS']),
      weekDays: a.string().array(), // ex.: ['MON','WED','FRI'] — só quando frequencyType = SPECIFIC_DAYS
      intervalHours: a.integer(), // só quando frequencyType = EVERY_X_HOURS
      startDate: a.date().required(),
      endDate: a.date(), // nulo = "sem data de término"
      currentStock: a.integer().required(),
      initialStock: a.integer().required(), // denominador do percentual da barra (ver spec.md §5, ambiguidade documentada)
      unit: a.enum(['COMP', 'ML', 'CAPS']),
      lowStockThreshold: a.integer(), // opcional — ausente = nunca alerta
      notes: a.string(),
      active: a.boolean().required().default(true),
    })
    .authorization((allow) => [allow.owner()]),
};
```

Registro em `amplify/data/resource.ts` (aditivo, mesmo padrão dos models existentes):

```typescript
import { medicinesSchema } from './schemas/medicines.js';
// ...
const schema = a.schema({
  ...userSchema,
  ...medicalDocumentsSchema,
  ...appointmentsSchema,
  ...medicinesSchema,
});
```

**Justificativa dos tipos primitivos escolhidos (regra 3 — reaproveitar a stack existente, nada de biblioteca nova):**
- `form`, `frequencyType`, `unit` como `a.enum()` seguem o mesmo padrão já usado em `appointmentsSchema.appointmentType` — nada novo introduzido.
- `times`/`weekDays` como `a.string().array()` (Amplify Gen 2 suporta listas de escalares nativamente) evita modelar uma tabela relacional separada só para horários — decisão de simplicidade, compatível com a regra 3 (não expandir a stack sem necessidade real).
- `initialStock` (campo novo, sem equivalente direto no Canvas) é necessário para calcular o percentual da barra de progresso de forma estável entre reposições — sem ele, teríamos que assumir um "cheio" arbitrário. Documentado como decisão explícita (regra 8), não uma pendência aberta.

## 3. Decisão de modelagem — dose diária ("Tomado"/"Pendente")

**O problema:** `Medicine` descreve a prescrição recorrente (ex.: "Losartana 50mg, todos os dias às 08h00"). O Canvas 3d, porém, mostra um estado por **instância diária** da dose ("tomei a das 08h00 de hoje"), que muda todo dia e não pode ser um campo fixo do `Medicine` (senão "tomado" de ontem persistiria incorretamente para hoje).

**Duas opções avaliadas:**
1. **Model separado `MedicineDoseLog`** (ex.: `medicineId`, `scheduledDate`, `scheduledTime`, `takenAt` nullable) — modelagem "correta" por normalização, mas adiciona uma segunda tabela e lógica de geração de doses esperadas por dia (cron-like), escopo maior que o necessário para esta EPIC.
2. **Campo leve no próprio `Medicine`: `lastTakenLog` (string JSON ou mapa `{date: string, times: string[]}` serializado)** — armazena apenas quais horários de **hoje** já foram marcados como tomados, resetado/reinterpretado a cada novo dia no client (se `lastTakenLog.date !== hoje`, trata como "nada tomado ainda hoje"). Mais simples, sem tabela nova, mas menos correto para histórico/relatórios futuros (não guarda o histórico de dias anteriores).

**Decisão para este EPIC:** adotar a **Opção 2** nesta primeira versão — adicionar um campo opcional `takenToday` (string, serializado como `{"date":"YYYY-MM-DD","times":["08:00"]}`) ao model `Medicine` proposto no §2. Justificativa: 3d não exibe nenhum histórico de doses passadas (só "hoje"), então a Opção 1 resolveria um problema que a tela não tem ainda; se uma EPIC futura precisar de histórico/adesão ao tratamento, a Opção 1 (`MedicineDoseLog`) deve ser proposta como uma nova decisão de schema explícita naquele momento (regra 5), não implementada preventivamente aqui. Esta decisão e sua limitação (sem histórico) ficam documentadas em `spec.md` §5 e devem ser citadas em `GAP_ANALYSIS.md` se o time avaliar registrar como pendência de melhoria futura.

Campo adicional a incluir no schema do §2:
```typescript
takenToday: a.string(), // JSON: {"date":"YYYY-MM-DD","times":["08:00"]}
```

## 4. Escopo da mudança

**Dentro de escopo:**
- `amplify/data/schemas/medicines.ts` — **criar** (novo arquivo), conforme §2 e §3.
- `amplify/data/resource.ts` — registrar `medicinesSchema` no `a.schema({...})`, aditivo.
- `src/types/models.ts` — substituir/estender `MedicineDose`, `MedicineInventoryItem`, `ReminderInfo`, `MedicinesSnapshot` por tipos alinhados ao model real `Medicine` (ou mantê-los como tipos de apresentação derivados, com uma função de mapeamento `Medicine` → `MedicineDose[]`/`MedicineInventoryItem[]` no hook).
- `src/hooks/useMedicinesData.ts` — migrar de `getMedicinesSnapshot()` (mock) para `client.models.Medicine.list()` real; implementar a derivação de "doses de hoje" a partir de `times`/`frequencyType`/`weekDays`/`startDate`/`endDate`/`active`; implementar toggle de dose escrevendo em `takenToday` via `client.models.Medicine.update()`; calcular `percentage` a partir de `currentStock`/`initialStock`; calcular `status: 'low' | 'ok'` a partir de `currentStock <= lowStockThreshold`.
- `src/screens/MedicinesScreen.tsx` — adicionar o banner de lembretes ativos no topo (contagem real), remover/realinhar o `ScreenHeader` para bater com o Canvas (sem subtítulo/badge extra, botão "+" 48×48 navegando), distinguir o estado vazio de página inteira do estado vazio por seção (ver `spec.md` §2), remover a seção "Lembretes ativados" do rodapé (substituída pelo banner do topo).
- `src/components/MedicineCard.tsx` / `src/components/MedicineStock.tsx` — ajustar estilos para bater exatamente com os tokens do Canvas 3d (cores de badge, borda âmbar condicional, linha de alerta de estoque baixo) — ajuste visual, não estrutural.

**Fora de escopo desta EPIC (ficam para as EPICs próprias de 3f/3g):**
- Formulário completo de criação (3f) e edição/exclusão (3g) — esta EPIC só garante que o botão "+" e os cards de 3d têm um destino de navegação definido (rota placeholder aceitável até 3f/3g existirem, documentado explicitamente, nunca silencioso).
- Geração de notificações push reais para os lembretes (mencionado no banner "N lembretes ativos") — a contagem exibida é real (derivada dos dados), mas o disparo de notificação em si é a pendência #14 já registrada em `GAP_ANALYSIS.md` ("Sistema de notificações inexistente"), não resolvida aqui.
- `MedicineDoseLog`/histórico de adesão (Opção 1 do §3) — não implementado nesta EPIC, ver justificativa acima.

## 5. Riscos / decisões a documentar
- **`initialStock` é um campo novo sem equivalente direto no Canvas** — decisão documentada no §2, necessária para o cálculo do percentual da barra ser estável; deve ficar claro que é uma extensão de modelagem, não um campo "descoberto" no design.
- **`takenToday` como string JSON serializada em vez de um sub-tipo estruturado** — trade-off de simplicidade (evita `a.customType()`/tabela nova) por correção de histórico; aceitável para o escopo atual (regra 8, ambiguidade documentada), mas é uma limitação conhecida a citar se o TCC discutir extensibilidade do schema.
- **Rotas de destino de 3f/3g ainda não existem** — os pontos de navegação em 3d (`+`, cards) precisam de um destino; se as EPICs de 3f/3g não estiverem implementadas no momento de implementar esta, usar uma rota placeholder claramente sinalizada (ex.: tela "Em breve" ou `Alert`) em vez de `onPress={() => {}}` silencioso como está hoje — não é aceitável deixar o botão sem nenhum feedback ao usuário.
- **Migração do hook de mock para real é uma mudança relativamente grande** (`useMedicinesData.ts` praticamente reescrito) — risco de regressão na tela; mitigar testando os 5 cenários do `spec.md` (vazio/carregando/erro/dose tomada/estoque baixo) manualmente antes de considerar concluído.
- **Enums em maiúsculas (`PILL`, `DAILY`, etc.)** seguem a convenção observada em `appointmentsSchema.appointmentType` (`'CONSULTA' | 'EXAME' | 'CIRURGIA'`) para manter consistência de estilo entre schemas do projeto — decisão de convenção, documentada aqui para não divergir em 3f/3g.

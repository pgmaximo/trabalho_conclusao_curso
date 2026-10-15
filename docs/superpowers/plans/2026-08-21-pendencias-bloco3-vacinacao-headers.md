# Pendências Bloco 3 (headers/lembretes), Prevenção (banner) e correção do GAP_ANALYSIS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar 3 pendências técnicas reais do `GAP_ANALYSIS.md` (cabeçalhos inconsistentes 3a-3c, lembretes locais de medicamento não disparam, banner de campanha de vacinação ausente em Prevenção) e corrigir 2 entradas do próprio `GAP_ANALYSIS.md`/`RELATORIO_SDD_SUASAUDE.md` que estão desatualizadas em relação ao código real (badge "Normal/Alterado" já resolvido; padrão de confirmação de exclusão via `Alert` nativo não existe mais em nenhuma tela de Autenticação porque nenhuma delas tem ação de exclusão).

**Architecture:** Três mudanças de código isoladas e independentes entre si (podem ser feitas em qualquer ordem, sem dependência de schema/backend):
1. Extrai um componente `DetailHeader` (padrão "voltar + título + ação opcional" já usado identicamente em `DocumentDetailScreen`/`EditMedicineScreen`/`EditAppointmentScreen`) e aplica em `AddExamScreen`/`DocumentDetailScreen` (3b/3c), que hoje divergem.
2. Cria `src/services/medicineReminderService.ts`, seguindo o mesmo padrão de `src/services/reminderService.ts` (`expo-notifications` + `AsyncStorage`, permissão explícita, nunca simula sucesso), mas com lógica de trigger própria (DAILY/WEEKLY/TIME_INTERVAL por horário real da dose, não um intervalo de dias). Conecta em `AddMedicineScreen`/`EditMedicineScreen` (3f/3g).
3. Expõe `getActiveVaccinationCampaign()` (já existe, reaproveitado de `src/config/vaccinationCampaigns.ts`, mesma fonte que 4e) em `usePreventionData`/`PreventionScreen`, replicando o banner que já existe em `VaccinationScreen.tsx`.

Depois, corrige os dois documentos de spec (`GAP_ANALYSIS.md` e `RELATORIO_SDD_SUASAUDE.md`) para refletir o estado real pós-mudança, incluindo a correção das duas entradas já desatualizadas antes desta sessão.

**Tech Stack:** React Native (Expo Router) + NativeWind, `expo-notifications`/`expo-device` (já instalados), Jest para lógica pura, AWS Amplify Data (sem mudança de schema nesta sessão).

**Spec:** `specs/design/GAP_ANALYSIS.md` itens #17, #18, #22, #2/#3.b, #34; `specs/RELATORIO_SDD_SUASAUDE.md` §4.

## Global Constraints

- Nunca simular sucesso de agendamento de notificação: se a permissão for negada, o medicamento salva normalmente e nenhum lembrete é criado — sem erro bloqueante, sem fingir que funcionou (regra 2 da constituição).
- Nenhuma mudança de schema Amplify nesta sessão — os 3 workstreams operam inteiramente sobre dado/campo já existente.
- Reaproveitar padrão existente em vez de duplicar: `ensureNotificationPermission` vem de `src/services/reminderService.ts` (import, não cópia); `getActiveVaccinationCampaign` vem de `src/config/vaccinationCampaigns.ts` (já compartilhado com 4e); o header novo (`DetailHeader`) segue exatamente o markup NativeWind já usado em `DocumentDetailScreen.tsx`/`EditMedicineScreen.tsx`/`EditAppointmentScreen.tsx` (`size-12 rounded-field border-[1.5px] border-app-border`, ícone `chevron-back`, título `text-[20px] font-semibold`).
- Dark mode: todo texto/borda novo usa os tokens `app-*`/`app-dark-*` via className, nunca cor hex fixa (mesma convenção já usada em todo o Bloco 2/3).

---

### Task 1: Extrair `DetailHeader` e padronizar 3b/3c

**Files:**
- Create: `src/components/DetailHeader.tsx`
- Modify: `src/screens/AddExamScreen.tsx` (header inline nas linhas 95-102 e estilos `header`/`backButton`/`titleContainer`/`title` em `createStyles`, linhas ~253-275)
- Modify: `src/screens/DocumentDetailScreen.tsx` (header inline nas linhas 161-189)

**Interfaces:**
- Produces: `DetailHeader({ title: string, onBack: () => void, action?: ReactNode })` — componente exportado nomeado.

- [ ] **Step 1: Criar `DetailHeader.tsx`**

```tsx
// =============================================================================
// Arquivo: DetailHeader.tsx
// Descrição: Cabeçalho "voltar + título + ação opcional" reutilizável para telas
// de detalhe/edição empilhadas (stack push, não abas). Extraído do padrão inline
// idêntico já usado em DocumentDetailScreen.tsx (3c), EditMedicineScreen.tsx (3g)
// e EditAppointmentScreen.tsx (2e) — ver specs/design/GAP_ANALYSIS.md item 34.
// Não confundir com BackHeader.tsx (fluxo de Autenticação, sem slot de ação) nem
// com ScreenHeader.tsx (raiz de aba, sem botão "voltar").
// =============================================================================

import React, { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

type DetailHeaderProps = {
  title: string;
  onBack: () => void;
  action?: ReactNode;
};

export function DetailHeader({ title, onBack, action }: DetailHeaderProps) {
  const colors = useThemeColors();

  return (
    <View className="mb-6 flex-row items-center gap-3">
      <Pressable
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-border dark:border-app-dark-border"
      >
        <Ionicons color={colors.text} name="chevron-back" size={22} />
      </Pressable>

      <Text className="flex-1 text-[20px] font-semibold text-app-text dark:text-app-dark-text">
        {title}
      </Text>

      {action}
    </View>
  );
}
```

- [ ] **Step 2: Aplicar em `DocumentDetailScreen.tsx` (3c)**

Substituir o bloco (linhas 160-189, comentário + `View` inteiro do cabeçalho) por:

```tsx
          <DetailHeader
            title={isEditMode ? 'Editar documento' : 'Detalhes do documento'}
            onBack={() => router.back()}
            action={
              !isEditMode ? (
                <Pressable
                  accessibilityLabel="Editar documento"
                  accessibilityRole="button"
                  onPress={() => setIsEditMode(true)}
                  style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                  className="h-12 items-center justify-center rounded-field border-[1.5px] border-app-border px-4 dark:border-app-dark-border"
                >
                  <Text className="text-[15px] font-semibold text-app-secondary dark:text-app-dark-secondary">
                    Editar
                  </Text>
                </Pressable>
              ) : undefined
            }
          />
```

Adicionar o import:

```tsx
import { DetailHeader } from '@/components/DetailHeader';
```

- [ ] **Step 3: Aplicar em `AddExamScreen.tsx` (3b)**

Substituir o bloco (linhas 95-102):

```tsx
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Adicionar documento</Text>
            </View>
          </View>
```

por:

```tsx
          <DetailHeader title="Adicionar documento" onBack={() => router.back()} />
```

Adicionar o import:

```tsx
import { DetailHeader } from '@/components/DetailHeader';
```

Remover de `createStyles` (em `AddExamScreen.tsx`) as chaves `header`, `backButton`, `titleContainer` e `title` — nenhuma delas é usada em mais nenhum lugar do arquivo (confirmado: `styles.title` só aparece na linha 100 removida; `Ionicons`/`Pressable` continuam sendo usados em outros pontos do arquivo, não remover os imports desses dois).

- [ ] **Step 4: Verificar tipos e lint**

Run: `npm run typecheck`
Expected: sem erros novos em `AddExamScreen.tsx`/`DocumentDetailScreen.tsx`/`DetailHeader.tsx`.

Run: `npm run lint`
Expected: sem erros novos (aceitável haver warnings pré-existentes não relacionados).

- [ ] **Step 5: QA manual (app não tem cobertura de componente/snapshot para telas — mesma convenção do restante do projeto)**

Abrir `/exams` → tocar no FAB → "Enviar PDF ou imagem" → confirmar que o cabeçalho de "Adicionar documento" (3b) tem o mesmo estilo visual (botão circular com borda, ícone `chevron-back`, título 20px semibold) que o cabeçalho de "Detalhes do documento" (3c, acessível tocando em qualquer documento existente). Confirmar em claro e escuro.

- [ ] **Step 6: Commit**

```bash
git add src/components/DetailHeader.tsx src/screens/AddExamScreen.tsx src/screens/DocumentDetailScreen.tsx
git commit -m "refactor(exames): extrai DetailHeader e padroniza cabecalho de 3b/3c"
```

---

### Task 2: `medicineReminderService.ts` — lógica de agendamento (testável, sem tocar telas ainda)

**Files:**
- Create: `src/services/medicineReminderService.ts`
- Test: `__tests__/medicine-reminder-service.test.ts`

**Interfaces:**
- Consumes: `ensureNotificationPermission` de `@/services/reminderService` (assinatura existente: `() => Promise<boolean>`); `MedicineRecord` de `@/services/medicineService` (campos usados: `id`, `name`, `dosage`, `times: string[]`, `frequencyType?: 'DAILY' | 'SPECIFIC_DAYS' | 'EVERY_X_HOURS'`, `weekDays: string[]`, `intervalHours?: number`, `active?: boolean`).
- Produces (usados na Task 3): `syncMedicineReminders(medicine: MedicineRecord): Promise<void>`, `removeMedicineReminders(medicineId: string): Promise<void>`.

- [ ] **Step 1: Escrever o teste da lógica pura de agendamento (falha primeiro)**

```typescript
// __tests__/medicine-reminder-service.test.ts
import {
  buildMedicineReminderPlans,
  parseTimeToHourMinute,
} from '@/services/medicineReminderService';

describe('parseTimeToHourMinute', () => {
  it('parses a valid HH:MM string', () => {
    expect(parseTimeToHourMinute('08:30')).toEqual({ hour: 8, minute: 30 });
  });

  it('rejects a string with an invalid hour', () => {
    expect(parseTimeToHourMinute('25:00')).toBeNull();
  });

  it('rejects a string that is not HH:MM', () => {
    expect(parseTimeToHourMinute('8:3')).toBeNull();
    expect(parseTimeToHourMinute('')).toBeNull();
  });
});

describe('buildMedicineReminderPlans', () => {
  it('builds one daily plan per valid dose time when frequencyType is DAILY', () => {
    const plans = buildMedicineReminderPlans({
      times: ['08:00', '20:00'],
      frequencyType: 'DAILY',
      weekDays: [],
      intervalHours: undefined,
    });

    expect(plans).toEqual([
      { type: 'daily', hour: 8, minute: 0 },
      { type: 'daily', hour: 20, minute: 0 },
    ]);
  });

  it('drops unparseable times instead of throwing', () => {
    const plans = buildMedicineReminderPlans({
      times: ['08:00', 'bad-time'],
      frequencyType: 'DAILY',
      weekDays: [],
      intervalHours: undefined,
    });

    expect(plans).toEqual([{ type: 'daily', hour: 8, minute: 0 }]);
  });

  it('builds one weekly plan per (weekday x time) combination when SPECIFIC_DAYS', () => {
    const plans = buildMedicineReminderPlans({
      times: ['09:00'],
      frequencyType: 'SPECIFIC_DAYS',
      weekDays: ['MON', 'WED'],
      intervalHours: undefined,
    });

    expect(plans).toEqual([
      { type: 'weekly', hour: 9, minute: 0, weekday: 2 },
      { type: 'weekly', hour: 9, minute: 0, weekday: 4 },
    ]);
  });

  it('builds a single repeating interval plan when EVERY_X_HOURS', () => {
    const plans = buildMedicineReminderPlans({
      times: ['08:00'],
      frequencyType: 'EVERY_X_HOURS',
      weekDays: [],
      intervalHours: 8,
    });

    expect(plans).toEqual([{ type: 'interval', seconds: 8 * 60 * 60 }]);
  });

  it('returns no plans for EVERY_X_HOURS without a positive intervalHours', () => {
    expect(
      buildMedicineReminderPlans({
        times: ['08:00'],
        frequencyType: 'EVERY_X_HOURS',
        weekDays: [],
        intervalHours: 0,
      }),
    ).toEqual([]);
  });

  it('returns no plans when frequencyType is missing', () => {
    expect(
      buildMedicineReminderPlans({
        times: ['08:00'],
        frequencyType: undefined,
        weekDays: [],
        intervalHours: undefined,
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha (módulo não existe)**

Run: `npx jest __tests__/medicine-reminder-service.test.ts`
Expected: FAIL — `Cannot find module '@/services/medicineReminderService'`.

- [ ] **Step 3: Implementar `medicineReminderService.ts`**

```typescript
/**
 * Resumo do arquivo:
 * Gerencia lembretes locais reais (expo-notifications) para as doses de
 * medicamento cadastradas em Medicamentos (3d/3f/3g). Segue o mesmo padrão já
 * usado por src/services/reminderService.ts (Prevenção, 3e) — reaproveita
 * ensureNotificationPermission de lá em vez de duplicar — mas com trigger
 * próprio: aqui o horário real de cada dose importa (DAILY/WEEKLY calendar
 * trigger), não um intervalo de dias fixo. Nunca simula sucesso: se a
 * permissão for negada, o medicamento continua salvo, só o lembrete não é
 * criado. Ver specs/design/GAP_ANALYSIS.md item 22.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { ensureNotificationPermission } from '@/services/reminderService';
import type { MedicineRecord } from '@/services/medicineService';

const MEDICINE_REMINDER_MAP_KEY = '@SuaSaude:medicineReminders';

// Weekday do expo-notifications: 1 = domingo ... 7 = sabado (mesma convencao de
// Date.getDay(), documentada em WeeklyTriggerInput).
const WEEKDAY_TO_EXPO_WEEKDAY: Record<string, number> = {
  SUN: 1,
  MON: 2,
  TUE: 3,
  WED: 4,
  THU: 5,
  FRI: 6,
  SAT: 7,
};

export type MedicineReminderMap = Record<string, string[]>;

export type MedicineNotificationPlan =
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; hour: number; minute: number; weekday: number }
  | { type: 'interval'; seconds: number };

type MedicineScheduleInput = {
  times: string[];
  frequencyType?: MedicineRecord['frequencyType'];
  weekDays: string[];
  intervalHours?: number;
};

export function parseTimeToHourMinute(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

/**
 * Traduz o formulario de Medicamentos (horarios + frequencia) em uma lista de
 * planos de notificacao. Funcao pura — nao chama expo-notifications — para
 * ser testavel sem mockar o modulo nativo.
 */
export function buildMedicineReminderPlans(
  medicine: MedicineScheduleInput,
): MedicineNotificationPlan[] {
  const validTimes = medicine.times
    .map(parseTimeToHourMinute)
    .filter((t): t is { hour: number; minute: number } => t !== null);

  if (medicine.frequencyType === 'EVERY_X_HOURS') {
    if (!medicine.intervalHours || medicine.intervalHours <= 0) {
      return [];
    }
    return [{ type: 'interval', seconds: medicine.intervalHours * 60 * 60 }];
  }

  if (medicine.frequencyType === 'SPECIFIC_DAYS') {
    const weekdays = (medicine.weekDays ?? [])
      .map((day) => WEEKDAY_TO_EXPO_WEEKDAY[day])
      .filter((weekday): weekday is number => weekday !== undefined);

    const plans: MedicineNotificationPlan[] = [];
    for (const weekday of weekdays) {
      for (const t of validTimes) {
        plans.push({ type: 'weekly', hour: t.hour, minute: t.minute, weekday });
      }
    }
    return plans;
  }

  if (medicine.frequencyType === 'DAILY') {
    return validTimes.map((t) => ({ type: 'daily', hour: t.hour, minute: t.minute }));
  }

  return [];
}

function toExpoTrigger(plan: MedicineNotificationPlan): Notifications.NotificationTriggerInput {
  if (plan.type === 'daily') {
    return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: plan.hour, minute: plan.minute };
  }
  if (plan.type === 'weekly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: plan.weekday,
      hour: plan.hour,
      minute: plan.minute,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: plan.seconds,
    repeats: true,
  };
}

async function scheduleMedicineReminders(medicine: MedicineRecord): Promise<string[]> {
  const plans = buildMedicineReminderPlans(medicine);
  const ids: string[] = [];

  for (const plan of plans) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora do medicamento',
        body: `${medicine.name} · ${medicine.dosage}`,
        data: { medicineId: medicine.id },
      },
      trigger: toExpoTrigger(plan),
    });
    ids.push(id);
  }

  return ids;
}

async function cancelMedicineReminders(notificationIds: string[]): Promise<void> {
  await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function loadMedicineReminderMap(): Promise<MedicineReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(MEDICINE_REMINDER_MAP_KEY);
    return raw ? (JSON.parse(raw) as MedicineReminderMap) : {};
  } catch (error) {
    console.error('Erro ao carregar lembretes de medicamento:', error);
    return {};
  }
}

export async function saveMedicineReminderMap(map: MedicineReminderMap): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDICINE_REMINDER_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Erro ao salvar lembretes de medicamento:', error);
  }
}

/**
 * Cancela os lembretes agendados anteriormente para este medicamento (se
 * houver) e reagenda a partir do estado atual — chamar depois de criar ou
 * atualizar um medicamento. Se `active` for false, ou a permissao for
 * negada, nenhum lembrete novo e criado (nunca falha a operacao de
 * salvar o medicamento por causa disso — quem chama decide se propaga erro).
 */
export async function syncMedicineReminders(medicine: MedicineRecord): Promise<void> {
  const map = await loadMedicineReminderMap();
  const existingIds = map[medicine.id] ?? [];

  if (existingIds.length > 0) {
    await cancelMedicineReminders(existingIds);
    delete map[medicine.id];
  }

  if (medicine.active !== false) {
    const granted = await ensureNotificationPermission();
    if (granted) {
      const newIds = await scheduleMedicineReminders(medicine);
      if (newIds.length > 0) {
        map[medicine.id] = newIds;
      }
    }
  }

  await saveMedicineReminderMap(map);
}

/** Cancela e remove os lembretes de um medicamento excluido. */
export async function removeMedicineReminders(medicineId: string): Promise<void> {
  const map = await loadMedicineReminderMap();
  const existingIds = map[medicineId] ?? [];

  if (existingIds.length > 0) {
    await cancelMedicineReminders(existingIds);
  }

  delete map[medicineId];
  await saveMedicineReminderMap(map);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx jest __tests__/medicine-reminder-service.test.ts`
Expected: PASS (todos os 9 casos).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add src/services/medicineReminderService.ts __tests__/medicine-reminder-service.test.ts
git commit -m "feat(medicamentos): adiciona medicineReminderService com agendamento local real"
```

---

### Task 3: Conectar `medicineReminderService` em 3f/3g (criar/editar/excluir medicamento)

**Files:**
- Modify: `src/screens/AddMedicineScreen.tsx` (`handleSubmit`, por volta da linha 42-58)
- Modify: `src/screens/EditMedicineScreen.tsx` (`handleSave` linhas 101-120, `handleConfirmDelete` linhas 122-138)

**Interfaces:**
- Consumes: `syncMedicineReminders(medicine: MedicineRecord): Promise<void>` e `removeMedicineReminders(medicineId: string): Promise<void>` da Task 2.

- [ ] **Step 1: `AddMedicineScreen.tsx` — agendar após criar**

Adicionar o import:

```tsx
import { syncMedicineReminders } from '@/services/medicineReminderService';
```

Substituir dentro de `handleSubmit`:

```tsx
      const currentStock = form.currentStock ? Number(form.currentStock) : 0;
      await createMedicine(toMedicineInput(form, currentStock));
      router.replace('/medicines');
```

por:

```tsx
      const currentStock = form.currentStock ? Number(form.currentStock) : 0;
      const record = await createMedicine(toMedicineInput(form, currentStock));

      try {
        await syncMedicineReminders(record);
      } catch (reminderError) {
        console.error('Erro ao agendar lembretes do medicamento:', reminderError);
      }

      router.replace('/medicines');
```

- [ ] **Step 2: `EditMedicineScreen.tsx` — reagendar após salvar**

Adicionar o import:

```tsx
import { removeMedicineReminders, syncMedicineReminders } from '@/services/medicineReminderService';
```

Substituir dentro de `handleSave`:

```tsx
      const nextStock = form.currentStock ? Number(form.currentStock) : 0;
      // Reposição: se o novo estoque atual superar o inicial registrado, o inicial sobe
      // junto (mantém o percentual da barra coerente) — nunca diminui silenciosamente.
      const nextInitialStock = Math.max(medicine.initialStock, nextStock);
      await updateMedicine(medicine.id, toMedicineInput(form, nextInitialStock));
      router.replace('/medicines');
```

por:

```tsx
      const nextStock = form.currentStock ? Number(form.currentStock) : 0;
      // Reposição: se o novo estoque atual superar o inicial registrado, o inicial sobe
      // junto (mantém o percentual da barra coerente) — nunca diminui silenciosamente.
      const nextInitialStock = Math.max(medicine.initialStock, nextStock);
      const updated = await updateMedicine(medicine.id, toMedicineInput(form, nextInitialStock));

      try {
        await syncMedicineReminders(updated);
      } catch (reminderError) {
        console.error('Erro ao agendar lembretes do medicamento:', reminderError);
      }

      router.replace('/medicines');
```

- [ ] **Step 3: `EditMedicineScreen.tsx` — cancelar lembretes ao excluir**

Substituir dentro de `handleConfirmDelete`:

```tsx
    try {
      await deleteMedicine(medicine.id);
      router.replace('/medicines');
    } catch (error) {
```

por:

```tsx
    try {
      await deleteMedicine(medicine.id);

      try {
        await removeMedicineReminders(medicine.id);
      } catch (reminderError) {
        console.error('Erro ao cancelar lembretes do medicamento:', reminderError);
      }

      router.replace('/medicines');
    } catch (error) {
```

- [ ] **Step 4: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos.

- [ ] **Step 5: QA manual**

Em um device/simulador físico (`Device.isDevice` é `false` em simulador iOS puro — `ensureNotificationPermission` retorna `false` silenciosamente nesse caso, o que é o comportamento correto, não um bug): cadastrar um medicamento com frequência "Todos os dias" e um horário próximo (poucos minutos à frente), conceder a permissão de notificação quando solicitada, e confirmar que a notificação chega no horário. Editar o mesmo medicamento trocando o horário e confirmar que a notificação antiga não dispara mais (só a nova). Excluir o medicamento e confirmar que nenhuma notificação chega depois.

- [ ] **Step 6: Commit**

```bash
git add src/screens/AddMedicineScreen.tsx src/screens/EditMedicineScreen.tsx
git commit -m "feat(medicamentos): conecta 3f/3g ao agendamento real de lembretes"
```

---

### Task 4: Banner de campanha de vacinação em Prevenção (3e)

**Files:**
- Modify: `src/hooks/usePreventionData.ts`
- Modify: `src/screens/PreventionScreen.tsx`
- Modify: `src/app/(app)/prevention.tsx`

**Interfaces:**
- Consumes: `getActiveVaccinationCampaign(): VaccinationCampaign | null` de `@/config/vaccinationCampaigns` (já existe, já usado por `useVaccinationData.ts`).
- Produces: `usePreventionData()` passa a retornar também `activeCampaignMessage: string | null`.

- [ ] **Step 1: `usePreventionData.ts` — expor a campanha ativa**

Adicionar o import:

```typescript
import { getActiveVaccinationCampaign } from '@/config/vaccinationCampaigns';
```

No `return` do hook (final do arquivo), adicionar o campo:

```typescript
  return {
    recommendations,
    lastUpdated: data?.lastUpdated ?? '',
    profileComplete: data?.profileComplete ?? false,
    isLoading: status === 'loading',
    errorMessage,
    retry,
    onToggleReminder,
    onEnableRemindersForIds,
    pendingReminderIds,
    activeCampaignMessage: getActiveVaccinationCampaign()?.message ?? null,
  };
```

- [ ] **Step 2: `PreventionScreen.tsx` — renderizar o banner**

Adicionar `activeCampaignMessage: string | null;` a `PreventionScreenProps` e ao destructuring dos props do componente.

Inserir o banner logo após o `ScreenHeader` (antes do `Card` de texto oficial USPSTF), reproduzindo exatamente o padrão já usado em `VaccinationScreen.tsx` linhas 105-114:

```tsx
              <ScreenHeader
                title="Prevenção & Alertas"
                badgeLabel={`${recommendations.length} recomendaç${recommendations.length === 1 ? 'ão' : 'ões'}`}
                badgeVariant={recommendations.length > 0 ? 'primary' : 'neutral'}
              />

              {activeCampaignMessage ? (
                <View className="mb-6 flex-row items-start gap-3 rounded-app border border-app-successBadgeBorder bg-app-successSoft px-4 py-3 dark:border-app-dark-successBadgeBorder dark:bg-app-dark-successSoft">
                  <View className="size-6 items-center justify-center rounded-full bg-app-successIconBg dark:bg-app-dark-successIconBg">
                    <Ionicons color="#FFFFFF" name="medical" size={14} />
                  </View>
                  <Text className="flex-1 text-[15px] leading-[20px] text-app-primaryDark dark:text-app-dark-primaryDark">
                    {activeCampaignMessage}
                  </Text>
                </View>
              ) : null}
```

(`Ionicons`, `View` e `Text` já são importados em `PreventionScreen.tsx` — nenhum import novo necessário.)

- [ ] **Step 3: `prevention.tsx` — repassar o campo**

```tsx
  const {
    recommendations,
    lastUpdated,
    profileComplete,
    isLoading,
    errorMessage,
    retry,
    onToggleReminder,
    onEnableRemindersForIds,
    pendingReminderIds,
    activeCampaignMessage,
  } = usePreventionData();

  return (
    <PreventionScreen
      recommendations={recommendations}
      lastUpdated={lastUpdated}
      profileComplete={profileComplete}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRetry={retry}
      onToggleReminder={onToggleReminder}
      onEnableRemindersForIds={onEnableRemindersForIds}
      onCompleteProfile={() => router.push('/edit-profile')}
      pendingReminderIds={pendingReminderIds}
      activeCampaignMessage={activeCampaignMessage}
    />
  );
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 5: QA manual**

Abrir `/prevention` com o perfil completo e confirmar que o banner "Campanha de vacinação contra a gripe até 30/09..." aparece logo abaixo do cabeçalho, com o mesmo estilo visual do banner já existente em `/vaccination`, em claro e escuro. Confirmar que o banner some quando a campanha estiver fora da janela `activeFrom`/`activeUntil` (pode simular temporariamente editando `VACCINATION_CAMPAIGNS` em `src/config/vaccinationCampaigns.ts` para uma data já passada, testar, e reverter).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePreventionData.ts src/screens/PreventionScreen.tsx "src/app/(app)/prevention.tsx"
git commit -m "feat(prevencao): exibe banner de campanha de vacinacao (fonte compartilhada com 4e)"
```

---

### Task 5: Corrigir entradas desatualizadas em `GAP_ANALYSIS.md` e no `RELATORIO_SDD_SUASAUDE.md`

**Files:**
- Modify: `specs/design/GAP_ANALYSIS.md`
- Modify: `specs/RELATORIO_SDD_SUASAUDE.md`

**Interfaces:** nenhuma (mudança de documentação apenas).

Contexto de por que estas duas correções são necessárias (achado desta sessão, não desta implementação): o item #17 já estava resolvido no código antes desta sessão (`ExamItem.tsx` já omite o badge para exames e `ExamsScreen.tsx` já desabilita o filtro "Alterados"), mas seguia listado como pendência. O item #18 descreve "confirmação de exclusão via `Alert` nativo" em login/cadastro/confirmação — mas nenhuma dessas três telas tem qualquer ação de exclusão; os `Alert.alert` que existem lá são mensagens de validação/erro/sucesso genéricas (`Alert.alert('Atenção', ...)`, `Alert.alert('Erro', ...)`), um padrão diferente e legítimo, não uma confirmação de exclusão. `LoginScreen.tsx` não tem nenhum `Alert.alert`. A pendência real de #18 era só 3c (já resolvida antes desta sessão) e 2e (resolvida na EPIC do Bloco 2) — ambas já usam `DeleteConfirmPanel`.

- [ ] **Step 1: `GAP_ANALYSIS.md` — corrigir item #17 (badge já resolvido)**

Old:
```
17. **Badge de status "Normal/Alterado" em exames (3a) sem dado real**: o schema `MedicalDocument` não tem campo de resultado clínico. "Válida/Vencida" de receitas é derivável de `expirationDate`, mas "Normal/Alterado" de exames não tem fonte — proposta: omitir o badge para exames e desabilitar o filtro "Alterados" com rótulo "Em breve" até existir um campo real.
```

New:
```
17. **`RESOLVIDO`** — Badge de status "Normal/Alterado" em exames (3a): já implementado conforme a proposta original — `ExamItem.tsx` só renderiza o badge de validade quando `validityStatus` existe (receitas, via `expirationDate`); exames nunca recebem esse dado e o badge é omitido. `ExamsScreen.tsx` desabilita o filtro "Alterados" (`DISABLED_FILTERS`) via `FilterChips`. Sem campo real de resultado clínico no schema `MedicalDocument`, esta continua sendo a solução correta (regra 2 da constituição).
```

- [ ] **Step 2: `GAP_ANALYSIS.md` — corrigir item #18 (não existe delete em Bloco 1)**

Old:
```
18. **Padrão recorrente de confirmação de exclusão via `Alert`/`confirm()` nativo** em vez do painel inline vermelho documentado em `DESIGN_TOKENS.md` §4 — encontrado em login, cadastro, confirmação, detalhe-documento (3c) e editar-agendamento (2e). Tratar como um padrão único a corrigir em todas as telas, não caso a caso.
```

New:
```
18. **`RESOLVIDO` (correção de escopo)** — Confirmação de exclusão via `Alert`/`confirm()` nativo: verificado nesta sessão que login, cadastro e confirmação (Bloco 1) não têm nenhuma ação de exclusão — os `Alert.alert` presentes nessas três telas são mensagens de validação/erro/sucesso genéricas (`Alert.alert('Atenção', ...)`/`Alert.alert('Erro', ...)`), um padrão diferente e não coberto por esta pendência; `LoginScreen.tsx` não tem nenhum `Alert.alert`. As únicas duas telas com ação de exclusão real fora do padrão documentado eram detalhe-documento (3c) e editar-agendamento (2e), ambas já reescritas com `DeleteConfirmPanel` (ver §2/§3 acima). Nenhum trabalho remanescente.
```

- [ ] **Step 3: `GAP_ANALYSIS.md` — marcar item #22 como resolvido**

Old (primeira frase do item 22):
```
22. **Lembretes de medicamento não disparam de verdade**: a tela 3f só persiste horário/frequência, nenhum lembrete push/local real é agendado. `expo-notifications`/`expo-device` **foram instalados** como parte do port da EPIC de Prevenção (3e — ver pendência #2), que já usa esse pacote para lembretes locais de recomendações preventivas (`src/services/reminderService.ts`). A dependência não é mais um bloqueio técnico; falta apenas conectar 3d/3f/3g ao mesmo padrão (`expo-notifications` + `AsyncStorage`), fora do escopo da EPIC de Prevenção. Afeta também potencialmente 2d/2c para lembretes de consulta.
```

New:
```
22. **`RESOLVIDO`** — Lembretes de medicamento: `src/services/medicineReminderService.ts` agenda notificações locais reais (`expo-notifications`, trigger DAILY/WEEKLY/TIME_INTERVAL conforme a frequência do medicamento), reaproveitando `ensureNotificationPermission` de `reminderService.ts` (3e). Conectado em 3f (`AddMedicineScreen`, agenda ao criar) e 3g (`EditMedicineScreen`, reagenda ao salvar e cancela ao excluir). Lembretes de consulta (2d/2c) continuam fora de escopo — pendência distinta, sem dono de Bloco definido.
```

- [ ] **Step 4: `GAP_ANALYSIS.md` — marcar pendência de banner de vacinação como resolvida (itens #2 e 3.b)**

No item 2, substituir a última frase:

Old:
```
Pendência remanescente: banner de campanha de vacinação de 3e (ver `specs/03-exames-receitas/prevencao/tasks.md` Fase 5.1) segue não implementado por decisão explícita, mesmo já desbloqueado tecnicamente pela EPIC 4e.
```

New:
```
Banner de campanha de vacinação de 3e: `RESOLVIDO` — `PreventionScreen.tsx` agora consulta `getActiveVaccinationCampaign()` (`src/config/vaccinationCampaigns.ts`), a mesma fonte já usada por `VaccinationScreen.tsx` (4e), reproduzindo o mesmo componente visual de banner.
```

No item 3, sub-item 3.b, substituir:

Old:
```
   - **3.b Follow-up cross-EPIC (Prevenção, 3e):** `PreventionScreen.tsx` ainda não consulta `VaccineDose`/`vaccinationCampaigns.ts` para reexibir seu próprio banner de vacinação (hoje oculto, conforme `specs/03-exames-receitas/prevencao/plan.md` §2.5) — schema já existe e desbloqueia essa tarefa, mas a integração em si não foi feita nesta EPIC (fora de escopo, não tocar em `PreventionScreen.tsx`). Ver task registrada em `specs/03-exames-receitas/prevencao/tasks.md`.
```

New:
```
   - **3.b `RESOLVIDO`** — `PreventionScreen.tsx` agora consulta `vaccinationCampaigns.ts` (mesma fonte de 4e) e exibe o banner de campanha ativa.
```

- [ ] **Step 5: `GAP_ANALYSIS.md` — marcar item #34 como resolvido**

Old:
```
34. **Três cabeçalhos diferentes entre 3a/3b/3c**: nenhuma das três telas reaproveita `BackHeader.tsx` (já usado em Register/Confirm/ForgotPassword) — cada uma monta seu próprio cabeçalho inline. Padronizar numa EPIC de consistência futura, fora do escopo desta revisão.
```

New:
```
34. **`RESOLVIDO`** — Cabeçalho de 3b (`AddExamScreen.tsx`) e 3c (`DocumentDetailScreen.tsx`) padronizado via novo componente `DetailHeader.tsx` (voltar + título + ação opcional), extraído do padrão que já era usado de forma idêntica e duplicada em `DocumentDetailScreen`/`EditMedicineScreen`/`EditAppointmentScreen`. 3a (`ExamsScreen.tsx`) continua usando `ScreenHeader` — correto, é raiz de aba, não tem botão "voltar" — não é o mesmo padrão de 3b/3c e não fazia parte da inconsistência real.
```

- [ ] **Step 6: `GAP_ANALYSIS.md` — atualizar "Resumo de contagem"**

Old:
```
- **ATUALIZAR** (spec escrita, implementação pendente ou parcial): 9 telas — 1b–1f (Bloco 1, todas implementadas mas fidelidade não auditada tela-a-tela), 3a–3c (Bloco 3, núcleo do MVP, implementadas mas com gaps de fidelidade documentados), 4a (Bloco 4, fidelidade de UI concluída, integração de IA real e persistência de histórico em aberto).
```

New:
```
- **ATUALIZAR** (spec escrita, implementação pendente ou parcial): 9 telas — 1b–1f (Bloco 1, todas implementadas mas fidelidade não auditada tela-a-tela), 3a–3c (Bloco 3, núcleo do MVP; cabeçalhos de 3b/3c e badge de status já corrigidos, gap remanescente é só validação de MIME por conteúdo real — item #29, aceito por ora), 4a (Bloco 4, fidelidade de UI concluída, integração de IA real e persistência de histórico em aberto).
```

- [ ] **Step 7: `RELATORIO_SDD_SUASAUDE.md` — registrar as 3 mudanças desta sessão**

Adicionar ao final da seção "4. Pendências técnicas conhecidas", no bloco "Prontas para implementar, sem decisão pendente" — remover as três linhas que descreviam medicamentos/vacinação/headers como pendentes (se ainda lá) e, no bloco "Cosmético / limpeza, baixa prioridade", remover a menção a cabeçalhos, já que passam a estar concluídos. Adicionar uma nova entrada ao final da seção "5. Próximo passo recomendado" indicando que os itens #17/#18/#22/#2/#3.b/#34 do `GAP_ANALYSIS.md` foram fechados nesta sessão (referenciar esta plan file: `docs/superpowers/plans/2026-08-21-pendencias-bloco3-vacinacao-headers.md`).

(Esta etapa é edição de prosa livre — ler o estado atual do arquivo antes de editar, já que ele pode ter mudado desde a leitura no início desta sessão, e ajustar a redação em vez de copiar um texto fixo aqui.)

- [ ] **Step 8: Commit**

```bash
git add specs/design/GAP_ANALYSIS.md specs/RELATORIO_SDD_SUASAUDE.md
git commit -m "docs(specs): fecha pendencias 17/18/22/2/3.b/34 e corrige entradas desatualizadas"
```

---

## Self-Review Notes

- **Cobertura da spec:** Task 1 cobre #34; Task 2+3 cobrem #22; Task 4 cobre #2/#3.b; Task 5 corrige a documentação (#17, #18 já resolvidos antes desta sessão, mas nunca marcados). Nenhum item do escopo pedido (3, 4, 5, 6 da conversa) ficou sem task.
- **Item 6 (padrão de exclusão) não gerou task de código**: verificado que não há trabalho de código real a fazer — é puramente uma correção de documentação, coberta na Task 5 Step 2.
- **Item 3 (badge "Normal/Alterado" e validação de MIME)**: badge já resolvido (Task 5 Step 1, doc apenas); MIME por conteúdo real (#29) permanece deliberadamente fora de escopo — o próprio `GAP_ANALYSIS.md` já registra isso como "limitação conhecida, aceita por ora", não uma pendência a fechar.
- **Consistência de tipos:** `syncMedicineReminders`/`removeMedicineReminders` (Task 2) usados com a mesma assinatura exata nas Tasks 3; `activeCampaignMessage: string | null` usado com o mesmo nome e tipo em `usePreventionData`, `PreventionScreenProps` e `prevention.tsx` (Task 4).

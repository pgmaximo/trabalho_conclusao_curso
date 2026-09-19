# Home — Compromissos coerentes e clicáveis: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a tela inicial mostrar corretamente os próximos compromissos — hoje ela esconde tudo o que acontece nas próximas três horas — e levar ao compromisso que o usuário tocar.

**Architecture:** A Home tem hoje três leitores de data próprios, e o do meio compara texto com texto entre fusos diferentes. Este plano apaga os três e liga o que sobra a `agendaDateRange.ts`, o módulo puro que a EPIC da Agenda já entregou. A lógica de seleção sai do arquivo de rota para um módulo puro próprio, com o instante de referência injetado, para poder ser testada sem relógio falso e sem renderizar tela.

**Tech Stack:** React Native + Expo (Expo Router), TypeScript, NativeWind v4, Jest (`jest-expo`) + `@testing-library/react-native`. Nenhuma dependência nova.

**Spec:** `specs/02-perfil-home-agenda/home-compromissos/` (`spec.md` = requisitos e critérios de aceite; `plan.md` = decisões técnicas; `tasks.md` = checklist). Leia `spec.md` §2.1 antes da Task 1 — são os seis defeitos, cada um com sua linha.

## Global Constraints

- **Idioma:** strings de interface e comentários em **pt-BR**.
- **Imports:** alias `@/` para `src/`.
- **Zero dependência nova.** `package.json` e `package-lock.json` fora do commit — o lockfile fica sujo pelo `npm install` do ambiente.
- **Contrato de data:** `scheduledAt` é `"AAAA-MM-DDTHH:mm"`, hora **local ingênua, sem offset**. Nenhum código da Home pode chamar `new Date(scheduledAt)` nem comparar `scheduledAt` com `new Date().toISOString()`. Todo acesso passa por `parseScheduledAt` de `@/services/agendaDateRange`.
- **Comparar instantes, não strings.** O filtro de próximos compara `Date` contra `Date`, via `isPast`.
- **`isPast` devolve `boolean | null`.** Na Home o filtro é `=== false`, nunca `!isPast(...)` — `!null` é `true` e deixaria entrar registro com data corrompida. É o oposto do `!== false` que a Agenda usa no Histórico, e os dois estão certos: a Home é vitrine, o Histórico é a ferramenta de recuperação.
- **Não editar:** `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `src/services/agendaDateRange.ts`, `src/screens/AgendaScreen.tsx`, `amplify/**`.
- **Não alterar** `__tests__/agendaCompromissoForaDaJanela.test.tsx` — é o critério de aceite da EPIC anterior e tem de continuar verde.
- **Nenhuma mudança estrutural na tela 2b** e nenhuma cor literal: só tokens via `useThemeColors()` ou classes `app-*`/`app-dark-*`.
- **Gotcha do NativeWind:** um `Pressable` com `style={({ pressed }) => ...}` e **sem** `className` tem o resultado da função descartado. Documentado em `src/components/BackHeader.tsx` e no `SectionLink` de `src/screens/HomeScreen.tsx`.
- **Commits:** o `AGENTS.md` proíbe commitar sem autorização. Cada task termina num checkpoint que roda a verificação, mostra o `git diff --stat` e **para**, com a mensagem de commit pronta para quando a autorização vier. Em worktree isolada, commitar é autorizado.
- **Node 20** (`nvm use 20.20.1`) para qualquer comando Amplify.

## Decisão que diverge do `plan.md` da spec

O `plan.md` da spec afirma "nenhum arquivo novo em `src/`". Este plano **cria um**: `src/services/homeAppointments.ts`.

Motivo: o mesmo `plan.md`, §6, exige que as funções de seleção recebam `now: Date` explicitamente, para os cenários de fuso serem testáveis sem relógio falso. Deixá-las exportadas do arquivo de rota faria todo teste arrastar `expo-router`, `HomeScreen` e quatro hooks para dentro da suíte. O módulo novo tem ~50 linhas e **remove ~40 do arquivo de rota** — o saldo em linhas é quase neutro, e a rota volta a ser o invólucro fino que o resto do projeto usa.

`specs/02-perfil-home-agenda/home-compromissos/plan.md` foi corrigido na origem para refletir isso. A spec (autoridade vinculante) nunca proibiu o arquivo — §5.1 lista contratos que mudam e não menciona restrição de arquivos.

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `__tests__/homeCompromissos.test.ts` | **Criar.** Testes puros de seleção e resumo (D1, D2, D5) | 1, 2 |
| `__tests__/homeCompromissosTela.test.tsx` | **Criar.** Teste de navegação e rótulo na tela (D3, D4) | 1, 4 |
| `src/services/homeAppointments.ts` | **Criar.** Módulo puro: seleção de próximos, de hoje, e composição do resumo | 2 |
| `src/app/(app)/dashboard.tsx` | **Modificar.** Passa a consumir o módulo puro; perde os dois helpers próprios; liga o callback de detalhe | 3 |
| `src/screens/HomeScreen.tsx` | **Modificar.** Prop nova de navegação; `formatAppointmentWhen` pelo parser único | 4 |
| `src/hooks/appointmentsCache.ts` | **Modificar (opcional).** Chave por usuário e TTL | 5 |
| `specs/design/GAP_ANALYSIS.md` | **Modificar.** Registro dos defeitos corrigidos | 6 |

**Não são tocados:** `src/hooks/useAppointmentsData.ts`, `src/services/agendaDateRange.ts`, `src/screens/AgendaScreen.tsx`, `src/services/appointmentService.ts`, `amplify/**`, `package.json`. Se alguma task precisar editar um destes, o desenho está errado — pare e reavalie.

---

### Task 1: Testes de regressão (vermelhos propositais)

Os dois arquivos ficam vermelhos até as Tasks 2–4. Não os conserte antes da hora, não use `.skip`.

**Files:**
- Create: `__tests__/homeCompromissos.test.ts`
- Create: `__tests__/homeCompromissosTela.test.tsx`

**Interfaces:**
- Consumes: nada ainda — os testes são escritos contra a API final, definida nas Tasks 2 e 4.
- Produces: os critérios de aceite executáveis do `spec.md` §7.

- [ ] **Step 1: Escrever o teste puro**

Crie `__tests__/homeCompromissos.test.ts`:

```ts
import {
  buildDashboardTodaySummary,
  buildTodaySummaryText,
  isSameCalendarDay,
  selectUpcomingAppointments,
} from '@/services/homeAppointments';

// Constrói "AAAA-MM-DDTHH:mm" a partir de componentes LOCAIS, no mesmo dia de
// `referencia`. Nunca escrever a string à mão: uma string fixa amarraria a
// suíte a UTC-3 e passaria a falhar em qualquer outra máquina.
function noMesmoDia(referencia: Date, hora: number, minuto = 0): string {
  const d = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), hora, minuto);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hh}:${mm}`;
}

function emDias(referencia: Date, offset: number, hora: number): string {
  const d = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() + offset);
  return noMesmoDia(d, hora);
}

const AGORA = new Date(2026, 8, 18, 14, 0); // 18/09/2026, 14:00 LOCAL

function compromisso(scheduledAt: string, time: string) {
  return { scheduledAt, time };
}

describe('selectUpcomingAppointments', () => {
  it('inclui um compromisso de hoje daqui a duas horas — o defeito relatado', () => {
    // Com a comparação antiga (scheduledAt >= new Date().toISOString()), em UTC-3
    // "2026-09-18T16:00" perde para "2026-09-18T17:00:00.000Z" e este compromisso
    // sumia da Home faltando duas horas para ele.
    const lista = [compromisso(noMesmoDia(AGORA, 16), '16:00')];

    const resultado = selectUpcomingAppointments(lista, AGORA, 2);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].time).toBe('16:00');
  });

  it('exclui um compromisso de hoje que ja passou', () => {
    const lista = [compromisso(noMesmoDia(AGORA, 9), '09:00')];

    expect(selectUpcomingAppointments(lista, AGORA, 2)).toHaveLength(0);
  });

  it('ordena do mais proximo ao mais distante e respeita o limite', () => {
    const lista = [
      compromisso(emDias(AGORA, 5, 8), '08:00'),
      compromisso(noMesmoDia(AGORA, 16), '16:00'),
      compromisso(emDias(AGORA, 1, 10), '10:00'),
    ];

    const resultado = selectUpcomingAppointments(lista, AGORA, 2);

    expect(resultado.map((item) => item.time)).toEqual(['16:00', '10:00']);
  });

  it('omite registro com data corrompida em vez de deixa-lo entrar', () => {
    // `!isPast(...)` deixaria este passar, porque !null é true.
    const lista = [compromisso('lixo', '??:??'), compromisso(noMesmoDia(AGORA, 16), '16:00')];

    const resultado = selectUpcomingAppointments(lista, AGORA, 2);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].time).toBe('16:00');
  });
});

describe('isSameCalendarDay', () => {
  it('reconhece o mesmo dia local', () => {
    expect(isSameCalendarDay(noMesmoDia(AGORA, 9), AGORA)).toBe(true);
  });

  it('nao confunde o dia seguinte', () => {
    expect(isSameCalendarDay(emDias(AGORA, 1, 9), AGORA)).toBe(false);
  });

  it('devolve false para data invalida', () => {
    expect(isSameCalendarDay('lixo', AGORA)).toBe(false);
  });
});

describe('buildTodaySummaryText', () => {
  it('nao cita um compromisso de hoje que ja passou', () => {
    const noite = new Date(2026, 8, 18, 20, 0);
    const lista = [compromisso(noMesmoDia(noite, 15), '15:00')];

    expect(buildTodaySummaryText(lista, noite)).toBe('Nenhum compromisso ou pendência para hoje.');
  });

  it('conta so o que falta e cita o proximo horario', () => {
    const manha = new Date(2026, 8, 18, 10, 0);
    const lista = [
      compromisso(noMesmoDia(manha, 9), '09:00'),
      compromisso(noMesmoDia(manha, 15), '15:00'),
    ];

    expect(buildTodaySummaryText(lista, manha)).toBe('1 consulta às 15:00');
  });

  it('pluraliza quando ha mais de um por vir', () => {
    const manha = new Date(2026, 8, 18, 10, 0);
    const lista = [
      compromisso(noMesmoDia(manha, 15), '15:00'),
      compromisso(noMesmoDia(manha, 18), '18:00'),
    ];

    expect(buildTodaySummaryText(lista, manha)).toBe('2 consultas às 15:00');
  });

  it('ignora compromissos de outros dias', () => {
    const lista = [compromisso(emDias(AGORA, 1, 10), '10:00')];

    expect(buildTodaySummaryText(lista, AGORA)).toBe('Nenhum compromisso ou pendência para hoje.');
  });
});

describe('buildDashboardTodaySummary', () => {
  it('compoe as duas clausulas quando ha compromisso por vir e remedio pendente', () => {
    const lista = [compromisso(noMesmoDia(AGORA, 16), '16:00')];

    expect(buildDashboardTodaySummary(lista, 2, AGORA)).toBe('1 consulta às 16:00 · 2 medicamentos pendentes');
  });

  it('mostra so os medicamentos quando todos os compromissos de hoje ja passaram', () => {
    const noite = new Date(2026, 8, 18, 20, 0);
    const lista = [compromisso(noMesmoDia(noite, 15), '15:00')];

    expect(buildDashboardTodaySummary(lista, 1, noite)).toBe('1 medicamento pendente');
  });

  it('cai no texto de dia vazio quando nao ha nem compromisso por vir nem remedio', () => {
    const noite = new Date(2026, 8, 18, 20, 0);
    const lista = [compromisso(noMesmoDia(noite, 15), '15:00')];

    expect(buildDashboardTodaySummary(lista, 0, noite)).toBe('Nenhum compromisso ou pendência para hoje.');
  });
});
```

- [ ] **Step 2: Escrever o teste de tela**

Crie `__tests__/homeCompromissosTela.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/HomeScreen';
import type { AppointmentEntry } from '@/types/models';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 24, left: 0, right: 0, top: 44 },
};

function isoEmDias(offset: number, hora: string): string {
  const hoje = new Date();
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + offset);
  const ano = alvo.getFullYear();
  const mes = String(alvo.getMonth() + 1).padStart(2, '0');
  const dia = String(alvo.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}`;
}

const AMANHA: AppointmentEntry = {
  id: 'apt-1',
  time: '08:00',
  title: 'Cardiologista',
  location: 'Clinica Central',
  type: 'consulta',
  scheduledAt: isoEmDias(1, '08:00'),
};

function renderHome(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  const base = {
    greeting: 'Bom dia, Pedro',
    todayLabel: 'sexta-feira, 18 de setembro de 2026',
    todaySummaryText: 'Nenhum compromisso ou pendência para hoje.',
    recentExams: [],
    examsLoading: false,
    examsError: null,
    onRetryExams: jest.fn(),
    upcomingAppointments: [AMANHA],
    appointmentsLoading: false,
    appointmentsError: null,
    onRetryAppointments: jest.fn(),
    onNavigateToExamDetail: jest.fn(),
    onNavigateToExams: jest.fn(),
  };

  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <HomeScreen {...base} {...props} />
    </SafeAreaProvider>,
  );
}

describe('Home — navegacao dos compromissos', () => {
  it('tocar o card abre AQUELE compromisso, nao a agenda generica', () => {
    const onNavigateToAppointmentDetail = jest.fn();
    const onNavigateToAppointments = jest.fn();

    renderHome({ onNavigateToAppointmentDetail, onNavigateToAppointments });

    fireEvent.press(screen.getByText(/Cardiologista/));

    expect(onNavigateToAppointmentDetail).toHaveBeenCalledWith('apt-1');
    expect(onNavigateToAppointments).not.toHaveBeenCalled();
  });

  it('"Ver agenda" continua indo para a agenda', () => {
    const onNavigateToAppointmentDetail = jest.fn();
    const onNavigateToAppointments = jest.fn();

    renderHome({ onNavigateToAppointmentDetail, onNavigateToAppointments });

    fireEvent.press(screen.getByText('Ver agenda'));

    expect(onNavigateToAppointments).toHaveBeenCalled();
    expect(onNavigateToAppointmentDetail).not.toHaveBeenCalled();
  });

  it('rotula um compromisso de amanha como "Amanhã"', () => {
    renderHome({ onNavigateToAppointmentDetail: jest.fn() });

    expect(screen.getByText(/Amanhã/)).toBeTruthy();
  });

  it('rotula um compromisso com data corrompida como "Data inválida"', () => {
    const corrompido: AppointmentEntry = { ...AMANHA, id: 'apt-2', scheduledAt: 'lixo' };

    renderHome({ upcomingAppointments: [corrompido], onNavigateToAppointmentDetail: jest.fn() });

    expect(screen.getByText(/Data inválida/)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Rodar os dois e confirmar as falhas**

Run: `npx jest homeCompromissos`
Expected: **FAIL** nos dois arquivos — o puro por `Cannot find module '@/services/homeAppointments'`, o de tela por `onNavigateToAppointmentDetail` não existir nas props de `HomeScreen`.

Cole as duas saídas no relatório. Essa é a prova de que os defeitos existem e de que os testes os detectam.

- [ ] **Step 4: Checkpoint**

Run: `git status --short`
Espera-se exatamente dois arquivos novos. Mensagem sugerida:

```
test(home): testes de regressao dos compromissos da tela inicial
```

---

### Task 2: `src/services/homeAppointments.ts` — módulo puro

**Files:**
- Create: `src/services/homeAppointments.ts`
- Test: `__tests__/homeCompromissos.test.ts` (já criado na Task 1; só rodar)

**Interfaces:**
- Consumes: de `@/services/agendaDateRange` (entregue pela EPIC da Agenda, 38 testes verdes) — `parseScheduledAt(value: string | null | undefined): Date | null`, `isPast(scheduledAt: string, now: Date): boolean | null`, `compareScheduled(a: string, b: string): number`.
- Produces:
  - `type HomeAppointment = { scheduledAt: string; time: string }`
  - `isSameCalendarDay(scheduledAt: string, reference: Date): boolean`
  - `selectUpcomingAppointments<T extends HomeAppointment>(appointments: T[], now: Date, limit: number): T[]`
  - `selectTodayUpcoming<T extends HomeAppointment>(appointments: T[], now: Date): T[]`
  - `buildTodaySummaryText(appointments: HomeAppointment[], now: Date): string`
  - `buildDashboardTodaySummary(appointments: HomeAppointment[], pendingMedicines: number, now: Date): string`

- [ ] **Step 1: Confirmar que o teste da Task 1 falha por ausência do módulo**

Run: `npx jest homeCompromissos.test.ts`
Expected: **FAIL** com `Cannot find module '@/services/homeAppointments'`.

- [ ] **Step 2: Implementar**

Crie `src/services/homeAppointments.ts`:

```ts
// =============================================================================
// Arquivo: homeAppointments.ts
// Descricao: Selecao e resumo de compromissos da Home — modulo PURO
// =============================================================================
//
// Sem React, sem Amplify. O instante de referencia (`now`) e sempre injetado,
// nunca lido do relogio aqui dentro: e o que permite testar os cenarios de fuso
// sem relogio falso e sem renderizar tela.
//
// Toda leitura de `scheduledAt` passa por `parseScheduledAt`. O motivo esta
// documentado em agendaDateRange.ts: a string e local ingenua, sem offset, e
// compara-la com `new Date().toISOString()` escondia da Home todo compromisso
// das proximas tres horas (spec.md §2.1, D1).
//
// =============================================================================

import { compareScheduled, isPast, parseScheduledAt } from '@/services/agendaDateRange';

export type HomeAppointment = {
  scheduledAt: string;
  time: string;
};

export function isSameCalendarDay(scheduledAt: string, reference: Date): boolean {
  const date = parseScheduledAt(scheduledAt);
  if (!date) {
    // Uma data ilegivel nao e "o mesmo dia" que coisa nenhuma.
    return false;
  }

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

// `=== false` e nao `!isPast(...)`: `isPast` devolve `boolean | null`, e `!null`
// e `true`, o que deixaria um registro com data corrompida entrar na Home com
// data ilegivel. E o oposto do `!== false` que a Agenda usa no modo "Historico",
// e os dois estao certos — a Home e vitrine, o Historico e a ferramenta de
// recuperacao (ver AgendaScreen.tsx).
function ehFuturo(appointment: HomeAppointment, now: Date): boolean {
  return isPast(appointment.scheduledAt, now) === false;
}

export function selectUpcomingAppointments<T extends HomeAppointment>(
  appointments: T[],
  now: Date,
  limit: number,
): T[] {
  return appointments
    .filter((appointment) => ehFuturo(appointment, now))
    .sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt))
    .slice(0, limit);
}

export function selectTodayUpcoming<T extends HomeAppointment>(appointments: T[], now: Date): T[] {
  return appointments
    .filter((appointment) => isSameCalendarDay(appointment.scheduledAt, now) && ehFuturo(appointment, now))
    .sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt));
}

function resumoDoQueFalta(todayUpcoming: HomeAppointment[]): string {
  if (todayUpcoming.length === 0) {
    // DECISION (spec plan.md §4): quando havia compromissos hoje mas todos ja
    // passaram, reaproveitamos este mesmo texto. Distinguir "nao havia nada" de
    // "ja passou tudo" exigiria uma terceira frase fora do Canvas, e o card se
    // chama "Resumo de hoje" — ele responde ao que ainda esta pela frente.
    return 'Nenhum compromisso ou pendência para hoje.';
  }

  const [next] = todayUpcoming;
  const label = todayUpcoming.length === 1 ? 'consulta' : 'consultas';

  return `${todayUpcoming.length} ${label} às ${next.time}`;
}

export function buildTodaySummaryText(appointments: HomeAppointment[], now: Date): string {
  return resumoDoQueFalta(selectTodayUpcoming(appointments, now));
}

export function buildDashboardTodaySummary(
  appointments: HomeAppointment[],
  pendingMedicines: number,
  now: Date,
): string {
  // Filtra UMA vez e reaproveita: a versao anterior refazia o filtro para saber
  // se havia compromissos, e as duas contas podiam discordar.
  const todayUpcoming = selectTodayUpcoming(appointments, now);
  const appointmentText = resumoDoQueFalta(todayUpcoming);

  const medicineText =
    pendingMedicines > 0
      ? `${pendingMedicines} medicamento${pendingMedicines === 1 ? '' : 's'} pendente${pendingMedicines === 1 ? '' : 's'}`
      : '';

  if (todayUpcoming.length === 0) {
    return medicineText || appointmentText;
  }

  return medicineText ? `${appointmentText} · ${medicineText}` : appointmentText;
}
```

- [ ] **Step 3: Rodar e confirmar o verde**

Run: `npx jest homeCompromissos.test.ts`
Expected: **PASS**, todos os `describe`. O teste de tela continua vermelho — é a Task 4.

- [ ] **Step 4: Confirmar a pureza**

Run: `grep -nE "react|expo|amplify|async-storage" src/services/homeAppointments.ts`
Expected: **nenhuma saída**.

- [ ] **Step 5: Checkpoint**

Mensagem sugerida:

```
feat(home): modulo puro de selecao e resumo de compromissos
```

---

### Task 3: `src/app/(app)/dashboard.tsx` — D1, D2, D5 e a ponta de D3

**Files:**
- Modify: `src/app/(app)/dashboard.tsx`

**Interfaces:**
- Consumes: da Task 2 — `selectUpcomingAppointments`, `buildDashboardTodaySummary`.
- Produces: a rota passa `onNavigateToAppointmentDetail={(id: string) => void}` para `HomeScreen` (a prop é declarada na Task 4; até lá o typecheck acusa, e isso é esperado).

- [ ] **Step 1: Apagar os helpers próprios**

Em `src/app/(app)/dashboard.tsx`, apague por inteiro: `isSameCalendarDay` (linhas 26–32), `buildTodaySummaryText` (linhas 40–54, com o comentário `DECISION` acima dela, que migrou para o módulo puro) e `buildDashboardTodaySummary` (linhas 56–64).

Mantenha `getDashboardTodayLabel` e `getGreeting` — não têm nada a ver com `scheduledAt`.

- [ ] **Step 2: Importar o módulo puro**

Acrescente ao bloco de imports:

```ts
import { buildDashboardTodaySummary, selectUpcomingAppointments } from '@/services/homeAppointments';
```

- [ ] **Step 3: Trocar o filtro e o resumo**

Substitua o bloco

```ts
  const now = new Date().toISOString();
  const upcomingAppointments = [...appointments]
    .filter((appointment) => appointment.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 2);

  const todaySummaryText = buildDashboardTodaySummary(appointments, pendingMedicines);
```

por

```ts
  // Um Date, nao uma string ISO: comparar "AAAA-MM-DDTHH:mm" (local ingenuo) com
  // `toISOString()` (UTC) escondia da Home todo compromisso das proximas tres
  // horas em UTC-3 (spec.md §2.1, D1).
  const now = new Date();
  const upcomingAppointments = selectUpcomingAppointments(appointments, now, 2);
  const todaySummaryText = buildDashboardTodaySummary(appointments, pendingMedicines, now);
```

- [ ] **Step 4: Ligar a navegação para o detalhe**

No JSX de `<HomeScreen ... />`, acrescente a prop, mantendo `onNavigateToAppointments` como está:

```tsx
      onNavigateToAppointmentDetail={(id) => router.push(`/edit-appointment?id=${encodeURIComponent(id)}`)}
```

A rota recebe o `id` já como string — a conversão de `string | number` acontece no ponto de chamada, dentro de `HomeScreen` (Task 4).

- [ ] **Step 5: Verificar o estado intermediário**

Run: `npm run typecheck`
Expected: erro **apenas** em `src/app/(app)/dashboard.tsx`, sobre `onNavigateToAppointmentDetail` não existir em `HomeScreenProps` — a prop é declarada na Task 4. Erro em qualquer outro arquivo é problema seu.

Run: `grep -nE "new Date\([a-zA-Z.]*scheduledAt|scheduledAt.*toISOString|toISOString.*scheduledAt" "src/app/(app)/dashboard.tsx"`
Expected: **nenhuma saída**.

- [ ] **Step 6: Checkpoint**

Mensagem sugerida:

```
fix(home): compromissos das proximas horas voltam a aparecer na tela inicial
```

---

### Task 4: `src/screens/HomeScreen.tsx` — D3 e D4

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Test: `__tests__/homeCompromissosTela.test.tsx` (já criado na Task 1; só rodar)

**Interfaces:**
- Consumes: de `@/services/agendaDateRange` — `parseScheduledAt`.
- Produces: `HomeScreenProps` ganha `onNavigateToAppointmentDetail?: (id: string) => void`.

- [ ] **Step 1: Declarar a prop nova**

Em `HomeScreenProps`, logo abaixo de `onNavigateToExamDetail`, acrescente:

```ts
  /** Abre o compromisso tocado (`/edit-appointment?id=`). Distinto de
   *  `onNavigateToAppointments`, que continua levando a Agenda a partir de
   *  "Ver agenda", do botao do Resumo, do estado vazio e do Acesso rapido. */
  onNavigateToAppointmentDetail?: (id: string) => void;
```

E acrescente `onNavigateToAppointmentDetail,` à desestruturação de props do componente, junto de `onNavigateToExamDetail`.

- [ ] **Step 2: Trocar o destino do toque no card**

Substitua

```tsx
              <UpcomingAppointmentCard
                appointment={appointment}
                key={appointment.id}
                onPress={onNavigateToAppointments}
              />
```

por

```tsx
              <UpcomingAppointmentCard
                appointment={appointment}
                key={appointment.id}
                onPress={onNavigateToAppointmentDetail}
              />
```

Os outros quatro usos de `onNavigateToAppointments` nesta tela — o `SectionLink` "Ver agenda", o `TodaySummaryCard`, o `EmptyState` e o `QuickAccessButton` — **não mudam**.

- [ ] **Step 3: Fazer o card chamar o callback com o id**

Substitua a assinatura e o `Pressable` de `UpcomingAppointmentCard`:

```tsx
function UpcomingAppointmentCard({
  appointment,
  onPress,
}: {
  appointment: AppointmentEntry;
  onPress?: (id: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="mb-3 min-h-[48px] flex-row overflow-hidden rounded-card border border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface"
      // `AppointmentEntry.id` e `string | number`; a conversao acontece aqui, no
      // ponto de chamada, para a rota receber sempre uma string.
      onPress={() => onPress?.(String(appointment.id))}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
```

O resto do corpo do componente fica igual. O `className` já existia e continua presente — é ele que faz o `style` função sobreviver ao NativeWind.

- [ ] **Step 4: Corrigir `formatAppointmentWhen`**

Substitua a primeira linha do corpo da função e acrescente o ramo de data inválida:

```tsx
function formatAppointmentWhen(scheduledAt: string): string {
  const date = parseScheduledAt(scheduledAt);
  if (!date) {
    // Mesmo rotulo que a Agenda usa no modo "Historico", para a mesma condicao
    // ter o mesmo nome nas duas telas.
    return 'Data inválida';
  }

  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
```

O resto da função (as comparações `isSameDay` e o `toLocaleDateString` final) fica igual.

Acrescente ao bloco de imports do arquivo:

```ts
import { parseScheduledAt } from '@/services/agendaDateRange';
```

- [ ] **Step 5: Rodar os testes de tela**

Run: `npx jest homeCompromissosTela`
Expected: **PASS**, os quatro casos.

- [ ] **Step 6: Rodar a suíte inteira**

Run: `npx jest`
Expected: **PASS** em tudo, incluindo `agendaCompromissoForaDaJanela` (a EPIC da Agenda não pode ter regredido).

Run: `npm run typecheck`
Expected: **sem erros** — o erro intermediário da Task 3 fecha aqui.

Run: `grep -nE "new Date\([a-zA-Z.]*scheduledAt|scheduledAt.*toISOString|toISOString.*scheduledAt" src/screens/HomeScreen.tsx`
Expected: **nenhuma saída**.

- [ ] **Step 7: Checkpoint**

Mensagem sugerida:

```
fix(home): tocar um compromisso abre aquele compromisso, e o rotulo usa o parser unico
```

---

### Task 5: `src/hooks/appointmentsCache.ts` — D6 (opcional)

> **Esta task é explicitamente opcional** (`spec.md` §7). Se for adiada, o Step 5 da Task 6 registra a pendência em `GAP_ANALYSIS.md` — um item opcional que some do registro não foi adiado, foi esquecido.

**Files:**
- Modify: `src/hooks/appointmentsCache.ts`
- Test: `__tests__/appointmentsCacheEscopo.test.ts`

**Interfaces:**
- Consumes: `getUserId()` de `@/services/auth/userSessionService` (já usado por `appointmentService.ts`).
- Produces: as mesmas três funções exportadas hoje — `invalidateAppointmentsCache`, `loadCachedAppointments`, `saveAppointmentsCache` — com as assinaturas inalteradas. A mudança é interna.

**Contexto que dimensiona esta task.** Durante a EPIC da Agenda eu registrei este cache como vazamento entre contas. **Estava errado:** `src/services/auth/session.ts:27` já chama `invalidateAppointmentsCache()` no logout. O que resta é defesa contra um logout que falhe no meio, e dados velhos quando o mesmo usuário altera a agenda em outro dispositivo. Por isso é a última task e é opcional.

- [ ] **Step 1: Escrever o teste falhando**

Crie `__tests__/appointmentsCacheEscopo.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadCachedAppointments, saveAppointmentsCache } from '@/hooks/appointmentsCache';
import { getUserId } from '@/services/auth/userSessionService';

jest.mock('@/services/auth/userSessionService', () => ({
  getUserId: jest.fn(),
}));

const getUserIdMock = getUserId as jest.MockedFunction<typeof getUserId>;

describe('appointmentsCache — escopo por usuario e TTL', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useRealTimers();
  });

  it('nao devolve o cache gravado por outro usuario', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    await saveAppointmentsCache([{ id: 'apt-a' }]);

    getUserIdMock.mockResolvedValue('usuario-b');

    expect(await loadCachedAppointments()).toBeNull();
  });

  it('devolve o cache do proprio usuario dentro do TTL', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    await saveAppointmentsCache([{ id: 'apt-a' }]);

    expect(await loadCachedAppointments()).toEqual([{ id: 'apt-a' }]);
  });

  it('descarta o cache expirado', async () => {
    getUserIdMock.mockResolvedValue('usuario-a');
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 18, 10, 0));
    await saveAppointmentsCache([{ id: 'apt-a' }]);

    jest.setSystemTime(new Date(2026, 8, 18, 10, 6)); // 6 minutos depois, TTL e 5

    expect(await loadCachedAppointments()).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest appointmentsCacheEscopo`
Expected: **FAIL** — o primeiro caso devolve os dados do outro usuário, o terceiro devolve dados expirados.

- [ ] **Step 3: Implementar**

Substitua o corpo de `src/hooks/appointmentsCache.ts` (as três funções exportadas mantêm nome e assinatura):

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getUserId } from '@/services/auth/userSessionService';

const APPOINTMENTS_CACHE_PREFIX = '@SuaSaude:appointmentsCache';
// 5 minutos: curto o bastante para uma alteracao feita em outro dispositivo
// aparecer antes de o usuario notar, longo o bastante para navegar entre telas
// sem refazer a consulta.
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEnvelope<T> = { savedAt: number; value: T };

let refetchCallbacks: Array<() => void> = [];

async function cacheKey(): Promise<string> {
  const userId = await getUserId();
  return `${APPOINTMENTS_CACHE_PREFIX}:${userId ?? 'anonimo'}`;
}

export function registerAppointmentsRefetchCallback(callback: () => void) {
  refetchCallbacks.push(callback);
  return () => {
    refetchCallbacks = refetchCallbacks.filter((cb) => cb !== callback);
  };
}

export async function invalidateAppointmentsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(await cacheKey());
    refetchCallbacks.forEach((callback) => callback());
  } catch (error) {
    console.error('Error invalidating appointments cache:', error);
  }
}

export async function loadCachedAppointments<T>(): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(await cacheKey());
    if (!raw) {
      return null;
    }

    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - envelope.savedAt > CACHE_TTL_MS) {
      return null;
    }

    return envelope.value;
  } catch (error) {
    console.warn('Failed to load cached appointments:', error);
    return null;
  }
}

export async function saveAppointmentsCache<T>(value: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), value };
    await AsyncStorage.setItem(await cacheKey(), JSON.stringify(envelope));
  } catch (error) {
    console.warn('Failed to save appointments cache:', error);
  }
}
```

- [ ] **Step 4: Rodar e confirmar o verde**

Run: `npx jest appointmentsCacheEscopo`
Expected: **PASS**.

Run: `npx jest appointments`
Expected: **PASS** — nenhum consumidor do cache quebrou (as assinaturas não mudaram).

- [ ] **Step 5: Checkpoint**

Mensagem sugerida:

```
fix(home): cache de agenda escopado por usuario e com TTL de 5 minutos
```

---

### Task 6: Validação final e documentação

**Files:**
- Modify: `specs/design/GAP_ANALYSIS.md`
- Modify: `specs/02-perfil-home-agenda/home-compromissos/tasks.md`

- [ ] **Step 1: Validação completa**

Run: `npm run validate`
Expected: **PASS** nos quatro estágios. Cole a saída no relatório — nenhum item do `tasks.md` da spec é marcado por leitura de código.

Nota: há warnings de lint pré-existentes em arquivos fora deste trabalho. Eles são esperados; erros não.

- [ ] **Step 2: Verificar o contrato de data por `grep`**

Run: `grep -rnE "new Date\([a-zA-Z.]*scheduledAt|scheduledAt.*toISOString|toISOString.*scheduledAt" "src/app/(app)/dashboard.tsx" src/screens/HomeScreen.tsx src/services/homeAppointments.ts`
Expected: **nenhuma saída**. Este é o critério de aceite de D2 e D4.

- [ ] **Step 3: Verificar o escopo do diff**

Run: `git diff --stat`
Expected: **nenhuma** aparição de `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `src/services/agendaDateRange.ts`, `src/screens/AgendaScreen.tsx`, `amplify/`, `package.json`, `package-lock.json`.

- [ ] **Step 4: Teste manual — o cenário que os testes não alcançam**

Com Node 20 (`nvm use 20.20.1`) e o sandbox Amplify, em `npx expo start`:

1. Criar um compromisso para **daqui a duas horas**.
2. Abrir a tela inicial e confirmar que ele aparece em "Próximos compromissos" — é o defeito D1, que hoje o esconde.
3. Tocá-lo e confirmar que abre **aquele** compromisso, não a Agenda.
4. Criar um compromisso para hoje num horário **já passado** e confirmar que o "Resumo de hoje" não o cita.

Sem este passo a EPIC não está entregue: os testes cobrem a lógica, não o caminho real até o DynamoDB.

- [ ] **Step 5: Registrar em `GAP_ANALYSIS.md`**

Na linha do Bloco 2 / 2b, registre os defeitos corrigidos:

```
2b Home — DEFEITOS CORRIGIDOS (spec: specs/02-perfil-home-agenda/home-compromissos/):
o filtro de "Proximos compromissos" comparava hora local ingenua com UTC e
escondia todo compromisso das proximas 3 horas; o card levava a Agenda generica
em vez do compromisso tocado; o "Resumo de hoje" citava horarios ja vencidos; e
tres leitores de data proprios foram substituidos por parseScheduledAt.
```

Se a Task 5 tiver sido adiada, acrescente na mesma linha:

```
PENDENTE: cache de agenda sem escopo de usuario nem TTL (D6) — risco baixo, o
logout ja invalida o cache (src/services/auth/session.ts:27); resta defesa contra
logout interrompido e dados velhos entre dispositivos.
```

- [ ] **Step 6: Marcar o `tasks.md` da spec**

Marque em `specs/02-perfil-home-agenda/home-compromissos/tasks.md` apenas os itens cujo comando foi efetivamente executado, com a evidência. O item de teste manual só é marcado depois que o usuário o rodar.

- [ ] **Step 7: Checkpoint final**

Mensagem sugerida:

```
docs(home): registra os defeitos corrigidos da tela inicial
```

---

## Notas de execução

**Ordem obrigatória.** Tasks 2 → 3 → 4 formam uma cadeia: a Task 3 deixa o typecheck vermelho de propósito (a prop que ela usa só é declarada na Task 4), e a Task 4 o fecha. Executá-las fora de ordem produz erros que parecem defeitos e não são.

**A Task 5 é opcional e independente.** Pode ser feita, adiada ou descartada sem afetar as demais — mas, se for adiada, o Step 5 da Task 6 é obrigatório.

**Dois testes ficam vermelhos por tasks seguidas**, de propósito: o puro até a Task 2, o de tela até a Task 4. Estão documentados aqui para ninguém os "consertar" com um `skip`.

**Se alguma task exigir editar `useAppointmentsData.ts`,** pare. A EPIC da Agenda deixou esse hook com quatro campos e esta EPIC consome exatamente esses quatro. Precisar de um quinto significa que o desenho está errado, não que o hook está incompleto.

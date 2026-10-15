# Agenda — Lista contínua no tempo: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a navegação por escopos da Agenda por uma lista contínua no tempo, ancorada em hoje, que responde "tenho algo marcado?" sem nenhuma interação.

**Architecture:** As seções por dia são achatadas numa lista única de linhas tipadas, produzida por um módulo puro com `now` injetado. Isso transforma a ancoragem da rolagem — normalmente um acidente de renderização — em aritmética testável: a posição de hoje e as alturas acumuladas saem de funções puras, e a tela só as consome. O calendário do mês vira uma camada autossuficiente.

**Tech Stack:** React Native + Expo (Expo Router), TypeScript, NativeWind v4, Jest (`jest-expo`) + `@testing-library/react-native`. Nenhuma dependência nova.

**Spec:** `specs/02-perfil-home-agenda/agenda-lista-continua/` (`spec.md` = requisitos e critérios de aceite; `plan.md` = decisões técnicas; `tasks.md` = checklist). Leia `spec.md` §2.1 antes da Task 1 — é a razão de redesenhar uma tela que funciona.

## Global Constraints

- **Idioma:** strings de interface e comentários em **pt-BR**.
- **Imports:** alias `@/` para `src/`.
- **Zero dependência nova.** `package.json` e `package-lock.json` fora do commit — o lockfile fica sujo pelo `npm install` do ambiente.
- **Contrato de data (herdado, inalterado):** `scheduledAt` é `"AAAA-MM-DDTHH:mm"`, hora **local ingênua, sem offset**. Nada constrói `Date` a partir dele fora de `parseScheduledAt`, e nada o compara com `toISOString()`.
- **`now: Date` sempre injetado** nos módulos puros, nunca lido do relógio lá dentro.
- **Não editar:** `src/services/homeAppointments.ts`, `src/app/(app)/dashboard.tsx`, `src/screens/HomeScreen.tsx`, `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `amplify/**`.
- **Nenhuma cor nova** (regra 7). Itens passados são atenuados por opacidade e peso, nunca por cor nova.
- **Nenhuma biblioteca de lista ou calendário.** A `FlatList` do React Native basta.
- **Gotcha do NativeWind:** um `Pressable` com `style={({ pressed }) => ...}` e **sem** `className` tem o resultado da função descartado. Documentado em `src/components/BackHeader.tsx` e no `SectionLink` de `src/screens/HomeScreen.tsx`.
- **A suíte roda com `TZ` fixo** em `America/Sao_Paulo`, definido em `jest.config.js`. Não altere isso.
- **Commits:** em worktree isolada, commitar é autorizado. Fora dela, o `AGENTS.md` exige autorização.

## Decisão de arquitetura: `FlatList` achatada, não `SectionList`

A `spec.md` pede a lista aberta com hoje no topo, o que exige `initialScrollIndex`, que exige `getItemLayout`. Em `SectionList`, escrever `getItemLayout` à mão é notoriamente frágil: o índice recebido intercala cabeçalhos de seção, rodapés e separadores, e a biblioteca que resolve isso (`react-native-section-list-get-item-layout`) está fora de cogitação pela regra 3.

Então as seções são **achatadas numa lista única de linhas tipadas** — cabeçalho de dia, card, e as duas linhas de estado vazio — e renderizadas por `FlatList`. Ganhos:

- `getItemLayout` vira soma de prefixos sobre alturas conhecidas por tipo de linha.
- **A ancoragem em hoje vira lógica pura e testável.** `findTodayRowIndex` e `buildRowOffsets` são funções que um teste verifica sem renderizar nada — em vez de "abriu no lugar certo?" ser algo que só se descobre olhando o aparelho.
- Os estados vazios entram como linhas da própria lista, em vez de ramos condicionais espalhados pelo JSX.

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `__tests__/agendaCompromissoForaDaJanela.test.tsx` | **Reescrever.** Teste herdado, portão da entrega | 1, 3 |
| `__tests__/agendaTimeline.test.ts` | **Criar.** Testes puros de linhas, rótulos, índice e offsets | 2 |
| `src/services/agendaTimeline.ts` | **Criar.** Módulo puro: achatamento, rótulos, ancoragem, alturas | 2 |
| `src/screens/AgendaScreen.tsx` | **Reescrever.** `FlatList` + estados vazios + pílula "Hoje" + camada | 3, 4 |
| `src/app/(app)/appointments.tsx` | **Modificar.** Perde `useAgendaNavigation` | 3 |
| `src/components/AgendaMonthLayer.tsx` | **Criar.** A camada de mês, autossuficiente | 4 |
| `src/components/AgendaScopeSelector.tsx` | **Apagar** | 5 |
| `src/components/AgendaPeriodHeader.tsx` | **Apagar** | 5 |
| `src/components/YearMonthsGrid.tsx` | **Apagar** | 5 |
| `src/components/CalendarPicker.tsx` | **Apagar** | 5 |
| `src/hooks/useAgendaNavigation.ts` | **Apagar** (e seu teste) | 5 |
| `src/services/agendaDateRange.ts` | **Modificar.** Perde 7 exports | 5 |
| `__tests__/agendaDateRange.test.ts` | **Modificar.** Perde os testes dos exports removidos | 5 |
| `specs/design/GAP_ANALYSIS.md` | **Modificar.** Registro da divergência da regra 1 | 6 |

**Não são tocados:** `src/services/homeAppointments.ts`, `src/app/(app)/dashboard.tsx`, `src/screens/HomeScreen.tsx`, `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `src/components/MonthCalendarGrid.tsx`, `src/components/AppointmentCard.tsx`, `amplify/**`, `package.json`.

---

### Task 1: Reescrever o teste de regressão herdado (vermelho proposital)

O teste atual assere tocando nos chips "Próximos" e "Histórico". Eles deixam de existir. Ele é **reescrito, não apagado**: a garantia que protege — todo `Appointment` é alcançável e excluível — foi a razão de uma EPIC inteira e não pode se dissolver numa reforma visual. Mantenha o nome do arquivo, para o histórico do git ligar a reescrita ao original.

**Files:**
- Modify: `__tests__/agendaCompromissoForaDaJanela.test.tsx` (substituição integral do conteúdo)

**Interfaces:**
- Consumes: a API final de `AgendaScreen`, produzida pela Task 3 — `{ appointments, isLoading, errorMessage, onRetry }`. **A prop `navigation` deixa de existir.**
- Produces: o critério de aceite executável da `spec.md` §7, item 1.

- [ ] **Step 1: Substituir o conteúdo do arquivo**

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AgendaScreen } from '@/screens/AgendaScreen';
import type { AppointmentEntry } from '@/types/models';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

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

// Datas relativas a hoje: o teste nao pode depender do dia em que roda.
function isoEmDias(offsetDias: number, hora = '09:00'): string {
  const hoje = new Date();
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + offsetDias);
  const ano = alvo.getFullYear();
  const mes = String(alvo.getMonth() + 1).padStart(2, '0');
  const dia = String(alvo.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}`;
}

const FUTURO_DISTANTE: AppointmentEntry = {
  id: 'apt-futuro',
  time: '09:00',
  title: 'Cardiologista',
  location: 'Clinica Central',
  type: 'consulta',
  scheduledAt: isoEmDias(13),
};

const PASSADO: AppointmentEntry = {
  id: 'apt-passado',
  time: '14:00',
  title: 'Medico de cabeca',
  location: 'Hospital Sao Lucas',
  type: 'consulta',
  scheduledAt: isoEmDias(-20, '14:00'),
};

const CORROMPIDO: AppointmentEntry = {
  id: 'apt-corrompido',
  time: '--:--',
  title: 'Consulta sem data',
  location: 'Local desconhecido',
  type: 'consulta',
  scheduledAt: 'lixo',
};

function renderAgenda(appointments: AppointmentEntry[]) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AgendaScreen
        appointments={appointments}
        errorMessage={null}
        isLoading={false}
        onRetry={jest.fn()}
      />
    </SafeAreaProvider>,
  );
}

describe('Agenda — todo compromisso e alcancavel na lista continua', () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
  });

  it('mostra um compromisso a 13 dias SEM nenhuma interacao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    // A garantia e mais forte que na versao anterior deste teste: antes era
    // preciso tocar um chip para alcancar o compromisso. Agora ele esta la.
    expect(screen.getByText('Cardiologista')).toBeTruthy();
  });

  it('mostra um compromisso de 20 dias atras SEM nenhuma interacao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    expect(screen.getByText('Medico de cabeca')).toBeTruthy();
  });

  it('abre a tela de edicao do compromisso futuro tocado', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Cardiologista'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-futuro');
  });

  it('abre a tela de edicao do compromisso passado tocado', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Medico de cabeca'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-passado');
  });

  it('mostra e permite abrir um compromisso com data corrompida', () => {
    renderAgenda([FUTURO_DISTANTE, CORROMPIDO]);

    expect(screen.getByText('Data inválida')).toBeTruthy();

    fireEvent.press(screen.getByText('Consulta sem data'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-corrompido');
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest agendaCompromissoForaDaJanela`
Expected: **FAIL** — `AgendaScreen` ainda exige a prop `navigation`, e os textos não são encontrados porque a tela ainda recorta por escopo.

Cole a saída no relatório: é a prova de que o teste detecta a ausência do comportamento novo.

- [ ] **Step 3: Confirmar que nada mais regrediu**

Run: `npx jest homeCompromissos`
Expected: **PASS**, 18/18 — a Home não é afetada por esta EPIC.

- [ ] **Step 4: Checkpoint**

Run: `git diff --stat`
Espera-se um arquivo. Mensagem sugerida:

```
test(agenda): reescreve o teste de regressao para a lista continua
```

---

### Task 2: `src/services/agendaTimeline.ts` — módulo puro

**Files:**
- Create: `src/services/agendaTimeline.ts`
- Test: `__tests__/agendaTimeline.test.ts`

**Interfaces:**
- Consumes: de `@/services/agendaDateRange` — `parseScheduledAt(value: string | null | undefined): Date | null`, `compareScheduled(a: string, b: string): number`, `toIsoDate(date: Date): string`.
- Produces:
  - `type TimelineAppointment = { scheduledAt: string }`
  - `type TimelineRow<T>` — união de quatro variantes: `{ kind: 'header'; key; label; isToday; isPast }`, `{ kind: 'card'; key; appointment: T; isPast }`, `{ kind: 'todayEmpty'; key }`, `{ kind: 'futureEmpty'; key }`
  - `ROW_HEIGHT: Record<TimelineRow<unknown>['kind'], number>`
  - `buildTimelineRows<T extends TimelineAppointment>(appointments: T[], now: Date): TimelineRow<T>[]`
  - `findTodayRowIndex(rows: TimelineRow<unknown>[]): number`
  - `buildRowOffsets(rows: TimelineRow<unknown>[]): number[]`

- [ ] **Step 1: Escrever os testes falhando**

Crie `__tests__/agendaTimeline.test.ts`:

```ts
import {
  ROW_HEIGHT,
  buildRowOffsets,
  buildTimelineRows,
  findTodayRowIndex,
} from '@/services/agendaTimeline';

const AGORA = new Date(2026, 8, 18, 14, 0); // sexta, 18/09/2026, 14:00 local

function emDias(offset: number, hora = 9): { scheduledAt: string } {
  const d = new Date(AGORA.getFullYear(), AGORA.getMonth(), AGORA.getDate() + offset, hora, 0);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  return { scheduledAt: `${ano}-${mes}-${dia}T${hh}:00` };
}

function rotulos(rows: ReturnType<typeof buildTimelineRows>): string[] {
  return rows.filter((row) => row.kind === 'header').map((row) => (row as { label: string }).label);
}

describe('buildTimelineRows', () => {
  it('devolve lista vazia quando nao ha nenhum compromisso', () => {
    expect(buildTimelineRows([], AGORA)).toEqual([]);
  });

  it('ordena cronologicamente e agrupa por dia', () => {
    const rows = buildTimelineRows([emDias(2), emDias(-3), emDias(2, 15)], AGORA);
    const cards = rows.filter((row) => row.kind === 'card');

    expect(cards).toHaveLength(3);
    expect(rotulos(rows)[0]).toContain('15 de setembro');
  });

  it('rotula hoje e amanha por nome', () => {
    const rows = buildTimelineRows([emDias(0), emDias(1)], AGORA);

    expect(rotulos(rows)).toContain('Hoje');
    expect(rotulos(rows)).toContain('Amanhã');
  });

  it('inclui o ano no rotulo quando o compromisso e de outro ano', () => {
    const rows = buildTimelineRows([{ scheduledAt: '2027-03-10T09:00' }], AGORA);

    expect(rotulos(rows).some((label) => label.includes('2027'))).toBe(true);
  });

  it('insere a secao de hoje mesmo vazia, com a linha de dia sem compromisso', () => {
    const rows = buildTimelineRows([emDias(1)], AGORA);

    expect(rotulos(rows)).toContain('Hoje');
    expect(rows.some((row) => row.kind === 'todayEmpty')).toBe(true);
  });

  it('nao duplica a secao de hoje quando ja existe compromisso hoje', () => {
    const rows = buildTimelineRows([emDias(0)], AGORA);

    expect(rotulos(rows).filter((label) => label === 'Hoje')).toHaveLength(1);
    expect(rows.some((row) => row.kind === 'todayEmpty')).toBe(false);
  });

  it('acrescenta a linha de futuro vazio quando so ha passado', () => {
    const rows = buildTimelineRows([emDias(-5)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(true);
  });

  it('nao acrescenta a linha de futuro vazio quando ha futuro', () => {
    const rows = buildTimelineRows([emDias(-5), emDias(5)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(false);
  });

  it('acrescenta a linha de futuro vazio quando o unico compromisso de hoje ja passou', () => {
    // AGORA e 14:00; o compromisso foi as 09:00. Em granularidade de dia ele nao
    // e "passado", mas em hora ele e — e a pergunta que futureEmpty responde e
    // de hora.
    const rows = buildTimelineRows([emDias(0, 9)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(true);
  });

  it('nao acrescenta a linha de futuro vazio quando ainda ha compromisso hoje mais tarde', () => {
    const rows = buildTimelineRows([emDias(0, 20)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(false);
  });

  it('marca isPast nos cabecalhos e cards anteriores a hoje', () => {
    const rows = buildTimelineRows([emDias(-3), emDias(3)], AGORA);
    const cabecalhos = rows.filter((row) => row.kind === 'header') as { isPast: boolean }[];

    expect(cabecalhos[0].isPast).toBe(true);
    expect(cabecalhos[cabecalhos.length - 1].isPast).toBe(false);
  });

  it('joga registros com data invalida para o fim, sob o rotulo "Data inválida"', () => {
    const rows = buildTimelineRows([{ scheduledAt: 'lixo' }, emDias(1)], AGORA);
    const labels = rotulos(rows);

    expect(labels[labels.length - 1]).toBe('Data inválida');
  });

  it('gera chaves unicas para todas as linhas', () => {
    const rows = buildTimelineRows([emDias(-2), emDias(0), emDias(2), { scheduledAt: 'lixo' }], AGORA);
    const chaves = rows.map((row) => row.key);

    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe('findTodayRowIndex', () => {
  it('devolve o indice do cabecalho de hoje', () => {
    const rows = buildTimelineRows([emDias(-2), emDias(1)], AGORA);
    const indice = findTodayRowIndex(rows);

    expect(indice).toBeGreaterThanOrEqual(0);
    expect(rows[indice].kind).toBe('header');
    expect((rows[indice] as { isToday: boolean }).isToday).toBe(true);
  });

  it('devolve -1 quando nao ha linhas', () => {
    expect(findTodayRowIndex([])).toBe(-1);
  });
});

describe('buildRowOffsets', () => {
  it('acumula as alturas por tipo de linha', () => {
    const rows = buildTimelineRows([emDias(1)], AGORA);
    const offsets = buildRowOffsets(rows);

    expect(offsets).toHaveLength(rows.length);
    expect(offsets[0]).toBe(0);

    for (let i = 1; i < rows.length; i += 1) {
      expect(offsets[i]).toBe(offsets[i - 1] + ROW_HEIGHT[rows[i - 1].kind]);
    }
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest agendaTimeline`
Expected: **FAIL** com `Cannot find module '@/services/agendaTimeline'`.

- [ ] **Step 3: Implementar**

Crie `src/services/agendaTimeline.ts`:

```ts
// =============================================================================
// Arquivo: agendaTimeline.ts
// Descricao: Achatamento da agenda numa lista de linhas tipadas — modulo PURO
// =============================================================================
//
// Por que linhas achatadas e nao secoes: a tela abre ancorada em hoje, o que
// exige `initialScrollIndex`, que exige `getItemLayout`. Escrever `getItemLayout`
// a mao para `SectionList` e fragil (o indice intercala cabecalhos, rodapes e
// separadores), e a biblioteca que resolve isso esta fora de cogitacao pela
// regra 3 da constituicao. Achatando, `getItemLayout` vira soma de prefixos — e,
// mais importante, a ancoragem vira logica pura que um teste verifica sem
// renderizar nada.
//
// `now` e sempre injetado: e o que torna os cenarios de virada de dia testaveis
// sem relogio falso.
//
// =============================================================================

import { compareScheduled, isPast, parseScheduledAt, toIsoDate } from '@/services/agendaDateRange';

export type TimelineAppointment = { scheduledAt: string };

export type TimelineRow<T> =
  | { kind: 'header'; key: string; label: string; isToday: boolean; isPast: boolean }
  | { kind: 'card'; key: string; appointment: T; isPast: boolean }
  | { kind: 'todayEmpty'; key: string }
  | { kind: 'futureEmpty'; key: string };

// Alturas fixas por tipo de linha. Sao o que permite `getItemLayout` exato e,
// por consequencia, a lista abrir em hoje sem piscar. O card depende de o
// endereco ser truncado em uma linha (ver AgendaScreen).
export const ROW_HEIGHT: Record<TimelineRow<unknown>['kind'], number> = {
  header: 36,
  card: 88,
  todayEmpty: 44,
  futureEmpty: 128,
};

const WEEKDAY_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const MONTH_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

const ROTULO_DATA_INVALIDA = 'Data inválida';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayLabel(date: Date, now: Date): string {
  const hojeIso = toIsoDate(now);
  const amanha = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const iso = toIsoDate(date);

  if (iso === hojeIso) return 'Hoje';
  if (iso === toIsoDate(amanha)) return 'Amanhã';

  const diaMes = `${date.getDate()} de ${MONTH_LONG_FORMATTER.format(date)}`;
  const base = capitalize(`${WEEKDAY_LONG_FORMATTER.format(date)}, ${diaMes}`);

  return date.getFullYear() === now.getFullYear() ? base : `${base} de ${date.getFullYear()}`;
}

export function buildTimelineRows<T extends TimelineAppointment>(
  appointments: T[],
  now: Date,
): TimelineRow<T>[] {
  if (appointments.length === 0) {
    // Sem nenhum compromisso a tela mostra o estado de primeira vez, que nao e
    // uma lista — por isso nem a secao de hoje entra aqui.
    return [];
  }

  const validos: T[] = [];
  const invalidos: T[] = [];

  for (const appointment of appointments) {
    if (parseScheduledAt(appointment.scheduledAt)) {
      validos.push(appointment);
    } else {
      invalidos.push(appointment);
    }
  }

  validos.sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt));

  const hojeIso = toIsoDate(now);
  const rows: TimelineRow<T>[] = [];
  let hojeInserido = false;
  let temFuturo = false;
  let isoAtual: string | null = null;

  function inserirCabecalhoDeHoje() {
    rows.push({ kind: 'header', key: `header-${hojeIso}`, label: 'Hoje', isToday: true, isPast: false });
    rows.push({ kind: 'todayEmpty', key: 'todayEmpty' });
    hojeInserido = true;
  }

  for (const appointment of validos) {
    const date = parseScheduledAt(appointment.scheduledAt) as Date;
    const iso = toIsoDate(date);
    const passado = iso < hojeIso;

    // `temFuturo` responde "ainda ha algo pela frente?", que e pergunta de HORA,
    // nao de dia: um compromisso hoje as 09:00 ja passou quando sao 14:00.
    // `passado` acima fica em granularidade de dia de proposito — ele governa a
    // atenuacao visual da secao inteira, e atenuar por hora faria um compromisso
    // da manha escurecer enquanto o resto da secao de hoje segue normal.
    // `=== false` e nao `!isPast(...)`: `isPast` devolve `boolean | null`, e
    // `null` (data corrompida) nao e futuro.
    if (isPast(appointment.scheduledAt, now) === false) {
      temFuturo = true;
    }

    // A secao de hoje entra antes do primeiro compromisso futuro, quando hoje
    // nao tem nenhum: e ela que ancora a rolagem e comunica "nada hoje".
    if (!hojeInserido && iso > hojeIso) {
      inserirCabecalhoDeHoje();
    }

    if (iso !== isoAtual) {
      isoAtual = iso;
      const isToday = iso === hojeIso;
      if (isToday) {
        hojeInserido = true;
      }
      rows.push({
        kind: 'header',
        key: `header-${iso}`,
        label: formatDayLabel(date, now),
        isToday,
        isPast: passado,
      });
    }

    rows.push({ kind: 'card', key: `card-${iso}-${rows.length}`, appointment, isPast: passado });
  }

  if (!hojeInserido) {
    inserirCabecalhoDeHoje();
  }

  if (!temFuturo) {
    rows.push({ kind: 'futureEmpty', key: 'futureEmpty' });
  }

  if (invalidos.length > 0) {
    rows.push({
      kind: 'header',
      key: 'header-invalido',
      label: ROTULO_DATA_INVALIDA,
      isToday: false,
      isPast: false,
    });

    invalidos.forEach((appointment, index) => {
      rows.push({ kind: 'card', key: `card-invalido-${index}`, appointment, isPast: false });
    });
  }

  return rows;
}

export function findTodayRowIndex(rows: TimelineRow<unknown>[]): number {
  return rows.findIndex((row) => row.kind === 'header' && row.isToday);
}

export function buildRowOffsets(rows: TimelineRow<unknown>[]): number[] {
  const offsets: number[] = [];
  let acumulado = 0;

  for (const row of rows) {
    offsets.push(acumulado);
    acumulado += ROW_HEIGHT[row.kind];
  }

  return offsets;
}
```

- [ ] **Step 4: Rodar e confirmar o verde**

Run: `npx jest agendaTimeline`
Expected: **PASS**, todos os `describe`.

- [ ] **Step 5: Confirmar a pureza**

Run: `grep -nE "^import .*(react|expo|amplify|async-storage)" src/services/agendaTimeline.ts`
Expected: **nenhuma saída**. O padrão é ancorado em `^import` de propósito — a versão solta casaria a palavra `export`, porque `expo` é substring dela.

- [ ] **Step 6: Checkpoint**

Mensagem sugerida:

```
feat(agenda): modulo puro que achata a agenda em linhas ancoradas em hoje
```

---

### Task 3: `AgendaScreen` como lista contínua — fecha o teste da Task 1

**Files:**
- Modify: `src/screens/AgendaScreen.tsx` (reescrita do corpo)
- Modify: `src/app/(app)/appointments.tsx`
- Test: `__tests__/agendaCompromissoForaDaJanela.test.tsx` (só rodar)

**Interfaces:**
- Consumes: da Task 2 — `buildTimelineRows`, `findTodayRowIndex`, `buildRowOffsets`, `ROW_HEIGHT`, `TimelineRow`. De `@/services/agendaDateRange` — `parseScheduledAt`.
- Produces: `AgendaScreen` com as props `{ appointments: AppointmentEntry[]; isLoading: boolean; errorMessage: string | null; onRetry: () => void }`. **A prop `navigation` deixa de existir.**

- [ ] **Step 1: Reescrever o topo do arquivo**

Substitua o bloco de imports e as helpers de topo de `src/screens/AgendaScreen.tsx` por:

```tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';

import { AppointmentCard } from '@/components/AppointmentCard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useThemeColors } from '@/constants/theme';
import { parseScheduledAt } from '@/services/agendaDateRange';
import {
  ROW_HEIGHT,
  buildRowOffsets,
  buildTimelineRows,
  findTodayRowIndex,
  type TimelineRow,
} from '@/services/agendaTimeline';
import type { AppointmentEntry } from '@/types/models';
import { buildGoogleCalendarUrl } from '@/utils/googleCalendar';

type AgendaScreenProps = {
  appointments: AppointmentEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

type Row = TimelineRow<AppointmentEntry>;

// Referencia estavel: a FlatList reclama em tempo de execucao se a config de
// viewability muda entre renders.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

function formatCardTime(scheduledAt: string): string {
  const date = parseScheduledAt(scheduledAt);
  if (!date) return '--:--';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
```

Apague as helpers `sortEntries`, `formatDateLabel` e a constante `EMPTY_TITLE_BY_SCOPE` — as três pertenciam ao recorte por escopo.

- [ ] **Step 2: Reescrever o corpo do componente**

```tsx
export function AgendaScreen({ appointments, isLoading, errorMessage, onRetry }: AgendaScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const listRef = useRef<FlatList<Row>>(null);
  const [todayVisible, setTodayVisible] = useState(true);
  const [monthLayerOpen, setMonthLayerOpen] = useState(false);

  const handleGoogleCalendarSync = async (appointment: AppointmentEntry) => {
    try {
      await Linking.openURL(buildGoogleCalendarUrl(appointment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o Google Calendar.';
      alert(message);
    }
  };

  // `new Date()` no corpo do memo, e nao em dependencia: a lista e reconstruida
  // quando os compromissos mudam, nao a cada tique do relogio.
  const rows = useMemo(() => buildTimelineRows(appointments, new Date()), [appointments]);
  const offsets = useMemo(() => buildRowOffsets(rows), [rows]);
  const todayIndex = useMemo(() => findTodayRowIndex(rows), [rows]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_HEIGHT[rows[index]?.kind ?? 'card'],
      offset: offsets[index] ?? 0,
      index,
    }),
    [rows, offsets],
  );

  // `todayIndexRef` e declarado ANTES do callback que o le: a FlatList exige que
  // `onViewableItemsChanged` seja uma referencia estavel, entao ele nao pode
  // depender de `todayIndex` por closure — leria um valor congelado na primeira
  // renderizacao. O ref e a ponte entre os dois.
  const todayIndexRef = useRef(todayIndex);
  todayIndexRef.current = todayIndex;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    setTodayVisible(viewableItems.some((item) => item.index === todayIndexRef.current));
  }).current;

  const scrollToToday = useCallback(() => {
    if (todayIndex >= 0) {
      listRef.current?.scrollToIndex({ index: todayIndex, animated: true });
    }
  }, [todayIndex]);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'header') {
        return (
          <View accessibilityRole="header" style={{ height: ROW_HEIGHT.header, justifyContent: 'flex-end' }}>
            <Text
              className={`text-[15px] font-semibold ${
                item.isToday
                  ? 'text-app-primaryDark dark:text-app-dark-primaryDark'
                  : 'text-app-textSecondary dark:text-app-dark-textSecondary'
              }`}
            >
              {item.label}
            </Text>
          </View>
        );
      }

      if (item.kind === 'todayEmpty') {
        return (
          <View style={{ height: ROW_HEIGHT.todayEmpty, justifyContent: 'center' }}>
            <Text className="text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Nada marcado para hoje.
            </Text>
          </View>
        );
      }

      if (item.kind === 'futureEmpty') {
        return (
          <View style={{ height: ROW_HEIGHT.futureEmpty, justifyContent: 'center' }}>
            <Text className="mb-3 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Nada marcado daqui para frente.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-app bg-app-primary dark:bg-app-dark-primary"
              onPress={() => router.push('/add-appointment')}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <Text className="text-[15px] font-semibold text-white">Agendar consulta</Text>
            </Pressable>
          </View>
        );
      }

      return (
        <View style={{ height: ROW_HEIGHT.card, opacity: item.isPast ? 0.6 : 1 }}>
          <AppointmentCard
            location={item.appointment.location}
            onPress={() =>
              router.push(`/edit-appointment?id=${encodeURIComponent(String(item.appointment.id))}`)
            }
            onSyncPress={() => handleGoogleCalendarSync(item.appointment)}
            time={formatCardTime(item.appointment.scheduledAt)}
            title={item.appointment.title}
            type={item.appointment.type}
          />
        </View>
      );
    },
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1 px-6 pt-6">
        <ScreenHeader
          title="Agenda"
          subtitle="Seus compromissos de saúde"
          action={
            <View className="flex-row gap-2">
              <Pressable
                accessibilityLabel="Ver o mês"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-app border border-app-border dark:border-app-dark-border"
                onPress={() => setMonthLayerOpen(true)}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Ionicons color={colors.text} name="calendar-outline" size={20} />
              </Pressable>
              <Pressable
                accessibilityLabel="Agendar consulta"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-full bg-app-primary dark:bg-app-dark-primary"
                onPress={() => router.push('/add-appointment')}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <Ionicons color={colors.onPrimary} name="add" size={24} />
              </Pressable>
            </View>
          }
        />

        {isLoading ? (
          <ScreenSkeleton blocks={3} />
        ) : errorMessage ? (
          <EmptyState
            actionLabel="Tentar novamente"
            description={errorMessage}
            icon="alert-circle-outline"
            onActionPress={onRetry}
            title="Não foi possível carregar a agenda"
            tone="error"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            actionLabel="Agendar consulta"
            description="Quando você agendar uma consulta ou exame, ela aparecerá aqui."
            icon="calendar-outline"
            onActionPress={() => router.push('/add-appointment')}
            title="Você ainda não tem compromissos"
          />
        ) : (
          <>
            <FlatList
              contentContainerStyle={{ paddingBottom: 48 }}
              data={rows}
              getItemLayout={getItemLayout}
              initialScrollIndex={todayIndex >= 0 ? todayIndex : 0}
              keyExtractor={(item) => item.key}
              onViewableItemsChanged={onViewableItemsChanged}
              ref={listRef}
              renderItem={renderRow}
              showsVerticalScrollIndicator={false}
              viewabilityConfig={VIEWABILITY_CONFIG}
            />

            {!todayVisible ? (
              <Pressable
                accessibilityLabel="Voltar para hoje"
                accessibilityRole="button"
                className="absolute bottom-6 self-center h-11 items-center justify-center rounded-full bg-app-primary px-5 dark:bg-app-dark-primary"
                onPress={scrollToToday}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <Text className="text-[15px] font-semibold text-white">Hoje</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
```

Sobre o Google Agenda: **não existe mais linha "Sincronizar com Google Agenda" nesta tela**, e não é para recriá-la. O stub "Em breve" foi substituído pelo Brunno no commit `41b233b` por exportação real **por compromisso**. O que se preserva é o `handleGoogleCalendarSync` (já no código acima) e o `onSyncPress` que cada card recebe — ambos estão no `renderRow` desta task.

- [ ] **Step 3: Simplificar a rota**

Em `src/app/(app)/appointments.tsx`, remova o import e o uso de `useAgendaNavigation` e a prop `navigation`:

```tsx
export default function AppointmentsRoute() {
  const { appointments, isLoading, errorMessage, retry } = useAppointmentsData();

  useEffect(() => {
    void (async () => {
      const records = await listAppointmentsForUser();
      await restoreAppointmentReminders(records);
    })();
  }, []);

  return (
    <AgendaScreen
      appointments={appointments}
      errorMessage={errorMessage}
      isLoading={isLoading}
      onRetry={retry}
    />
  );
}
```

- [ ] **Step 4: Truncar o endereço no card**

Em `src/components/AppointmentCard.tsx`, acrescente `numberOfLines={1}` ao `Text` do local. A altura fixa de `ROW_HEIGHT.card` depende disso: um endereço que quebra em duas linhas desalinha `getItemLayout` e faz a lista abrir no lugar errado.

- [ ] **Step 5: Rodar o portão**

Run: `npx jest agendaCompromissoForaDaJanela`
Expected: **PASS**, os cinco casos. Cole a saída lado a lado com a falha registrada na Task 1.

- [ ] **Step 6: Rodar a suíte**

Run: `npx jest`
Expected: verde, exceto os testes dos componentes que ainda serão apagados na Task 5 (se algum deles referenciar a tela). Registre no relatório qualquer suíte vermelha e o motivo.

Run: `npm run typecheck`
Expected: pode acusar `useAgendaNavigation` sem consumidor — é dívida que a Task 5 resolve. Erro em outro arquivo é problema seu.

- [ ] **Step 7: Checkpoint**

Mensagem sugerida:

```
feat(agenda): lista continua ancorada em hoje substitui a navegacao por escopos
```

---

### Task 4: A camada de mês

**Files:**
- Create: `src/components/AgendaMonthLayer.tsx`
- Modify: `src/screens/AgendaScreen.tsx` (renderizar a camada)

**Interfaces:**
- Consumes: de `@/services/agendaDateRange` — `buildMonthCells`, `buildRange`, `isWithinRange`, `shiftAnchor`, `formatPeriodLabel`. De `@/components/MonthCalendarGrid` — o componente, sem alteração.
- Produces: `<AgendaMonthLayer visible={boolean} appointments={AppointmentEntry[]} onClose={() => void} onSelectAppointment={(id: string) => void} />`

> **Nota de ordem:** esta task usa `shiftAnchor` e `formatPeriodLabel`, que a Task 5 apaga. Isso é deliberado — a camada precisa de navegação de mês, então os dois **sobrevivem**. A Task 5 apaga apenas o que ficar sem consumidor; ver a lista exata lá.

- [ ] **Step 1: Criar o componente**

```tsx
// =============================================================================
// Arquivo: AgendaMonthLayer.tsx
// Descricao: Camada de mes da Agenda — autossuficiente
// =============================================================================
//
// Autossuficiente de proposito: grade do mes MAIS os compromissos daquele mes,
// dentro da propria camada. Uma versao anterior do desenho fazia o toque num dia
// rolar a lista principal; foi descartada porque exige coordenar a posicao de
// rolagem de uma lista com uma camada sobreposta, e nao tem resposta boa quando
// o dia tocado esta vazio.
//
// =============================================================================

import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppointmentCard } from '@/components/AppointmentCard';
import { MonthCalendarGrid } from '@/components/MonthCalendarGrid';
import { useThemeColors } from '@/constants/theme';
import {
  buildMonthCells,
  buildRange,
  compareScheduled,
  formatPeriodLabel,
  isWithinRange,
  parseScheduledAt,
  shiftAnchor,
  toIsoDate,
} from '@/services/agendaDateRange';
import type { AppointmentEntry } from '@/types/models';

type AgendaMonthLayerProps = {
  visible: boolean;
  appointments: AppointmentEntry[];
  onClose: () => void;
  onSelectAppointment: (id: string) => void;
};

function formatCardTime(scheduledAt: string): string {
  const date = parseScheduledAt(scheduledAt);
  if (!date) return '--:--';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function AgendaMonthLayer({
  visible,
  appointments,
  onClose,
  onSelectAppointment,
}: AgendaMonthLayerProps) {
  const colors = useThemeColors();
  const [today] = useState(() => new Date());
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedIsoDate, setSelectedIsoDate] = useState(() => toIsoDate(new Date()));

  const scheduledAtList = useMemo(
    () => appointments.map((appointment) => appointment.scheduledAt),
    [appointments],
  );

  const weeks = useMemo(
    () => buildMonthCells(anchor, scheduledAtList, today),
    [anchor, scheduledAtList, today],
  );

  const doMes = useMemo(() => {
    const range = buildRange('mes', anchor);
    return appointments
      .filter((appointment) => isWithinRange(appointment.scheduledAt, range))
      .sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt));
  }, [appointments, anchor]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent={false} visible={visible}>
      <View className="flex-1 bg-app-background px-6 pt-12 dark:bg-app-dark-background">
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Mês anterior"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center"
            onPress={() => setAnchor((current) => shiftAnchor('mes', current, -1))}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons color={colors.text} name="chevron-back" size={24} />
          </Pressable>

          <Text className="text-[18px] font-semibold text-app-text dark:text-app-dark-text">
            {formatPeriodLabel('mes', anchor, today)}
          </Text>

          <Pressable
            accessibilityLabel="Próximo mês"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center"
            onPress={() => setAnchor((current) => shiftAnchor('mes', current, 1))}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons color={colors.text} name="chevron-forward" size={24} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <MonthCalendarGrid
            onSelectDate={setSelectedIsoDate}
            selectedIsoDate={selectedIsoDate}
            weeks={weeks}
          />

          {doMes.length > 0 ? (
            doMes.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                location={appointment.location}
                onPress={() => onSelectAppointment(String(appointment.id))}
                time={formatCardTime(appointment.scheduledAt)}
                title={appointment.title}
                type={appointment.type}
              />
            ))
          ) : (
            <Text className="py-6 text-center text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Nenhum compromisso neste mês.
            </Text>
          )}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          className="my-4 h-12 items-center justify-center rounded-app border border-app-border dark:border-app-dark-border"
          onPress={onClose}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">Fechar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Renderizar a camada na tela**

Em `src/screens/AgendaScreen.tsx`, acrescente o import e renderize a camada logo antes do fechamento do `SafeAreaView`:

```tsx
import { AgendaMonthLayer } from '@/components/AgendaMonthLayer';
```

```tsx
        <AgendaMonthLayer
          appointments={appointments}
          onClose={() => setMonthLayerOpen(false)}
          onSelectAppointment={(id) => {
            setMonthLayerOpen(false);
            router.push(`/edit-appointment?id=${encodeURIComponent(id)}`);
          }}
          visible={monthLayerOpen}
        />
```

- [ ] **Step 3: Verificar**

Run: `npx jest agendaCompromissoForaDaJanela`
Expected: **PASS**, os cinco casos continuam verdes — a camada está fechada por padrão e não interfere.

Run: `npm run typecheck`
Expected: só a dívida de `useAgendaNavigation`, que a Task 5 resolve.

Run: `grep -nE "#[0-9a-fA-F]{6}" src/components/AgendaMonthLayer.tsx`
Expected: **nenhuma saída**.

- [ ] **Step 4: Checkpoint**

Mensagem sugerida:

```
feat(agenda): camada de mes autossuficiente aberta pelo cabecalho
```

---

### Task 5: A subtração

Só agora. Apagar antes deixaria as Tasks 2–4 acontecendo numa tela quebrada, sem suíte verde para dizer se algo regrediu.

**Files:**
- Delete: `src/components/AgendaScopeSelector.tsx`, `src/components/AgendaPeriodHeader.tsx`, `src/components/YearMonthsGrid.tsx`, `src/components/CalendarPicker.tsx`, `src/hooks/useAgendaNavigation.ts`, `__tests__/useAgendaNavigation.test.ts`
- Modify: `src/services/agendaDateRange.ts`, `__tests__/agendaDateRange.test.ts`, `src/types/models.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: `agendaDateRange.ts` sem `buildDayCells`, `buildWeekCells`, `buildYearCells` e o tipo `AgendaMonthCell`.

> **O que NÃO é apagado:** `shiftAnchor`, `formatPeriodLabel` e o tipo `AgendaScope` **sobrevivem**, porque a camada de mês da Task 4 os consome — ela navega entre meses e rotula o mês visível. A `spec.md` §5.1 foi corrigida para dizer isso; se você estiver lendo uma versão que os lista como apagados, ela está desatualizada. `AgendaListOverride` é apagado — esse de fato ficou sem consumidor.

- [ ] **Step 1: Apagar os componentes e o hook**

```bash
git rm src/components/AgendaScopeSelector.tsx src/components/AgendaPeriodHeader.tsx src/components/YearMonthsGrid.tsx src/components/CalendarPicker.tsx src/hooks/useAgendaNavigation.ts __tests__/useAgendaNavigation.test.ts
```

- [ ] **Step 2: Apagar os exports sem consumidor de `agendaDateRange.ts`**

Remova de `src/services/agendaDateRange.ts`: `buildDayCells`, `buildWeekCells`, `buildYearCells`, o tipo `AgendaMonthCell`, o tipo `AgendaListOverride`, e as helpers privadas que só eles usavam (`dayIndex`, `formatMonthAbbrev`, e `toCell`/`toIsoDateSet` **se** `buildMonthCells` não as usar — confira antes de remover cada uma).

Mantenha: `parseScheduledAt`, `toIsoDate`, `startOfDay`, `buildRange`, `shiftAnchor`, `isDateWithinRange`, `isWithinRange`, `isPast`, `compareScheduled`, `formatPeriodLabel`, `buildMonthCells`, e o tipo `AgendaScope`.

- [ ] **Step 3: Apagar os testes correspondentes**

Em `__tests__/agendaDateRange.test.ts`, remova os blocos `describe` de `buildDayCells`, `buildWeekCells` e `buildYearCells`, e o import desses nomes. **Preserve todos os demais** — são o contrato de data, o ativo mais valioso das EPICs anteriores.

- [ ] **Step 4: Conferir `CalendarDateItem`**

`MonthCalendarGrid` ainda consome `CalendarDateItem` de `src/types/models.ts`. **Não remova campos dele sem conferir** que `MonthCalendarGrid` não os usa. Se todos os campos seguem em uso, não mexa no tipo.

- [ ] **Step 5: Verificar que nada ficou órfão**

Run: `grep -rn "AgendaScopeSelector\|AgendaPeriodHeader\|YearMonthsGrid\|CalendarPicker\|useAgendaNavigation\|buildDayCells\|buildWeekCells\|buildYearCells\|AgendaListOverride" src __tests__`
Expected: **nenhuma saída**.

Run: `npm run typecheck`
Expected: **sem erros**.

Run: `npx jest`
Expected: **PASS** em tudo.

- [ ] **Step 6: Checkpoint**

Mensagem sugerida:

```
refactor(agenda): remove a navegacao por escopos, substituida pela lista continua
```

---

### Task 6: Validação final e documentação

**Files:**
- Modify: `specs/design/GAP_ANALYSIS.md`
- Modify: `specs/02-perfil-home-agenda/agenda-lista-continua/tasks.md`

- [ ] **Step 1: Validação completa**

Run: `npm run validate`
Expected: **PASS** nos quatro estágios. Cole a saída no relatório. Há warnings de lint pré-existentes fora deste trabalho; são esperados, erros não.

- [ ] **Step 2: Contrato de data**

Run: `grep -rnE "new Date\([a-zA-Z.]*scheduledAt|scheduledAt.*toISOString|toISOString.*scheduledAt" src/screens/AgendaScreen.tsx src/services/agendaTimeline.ts src/components/AgendaMonthLayer.tsx`
Expected: **nenhuma saída**.

- [ ] **Step 3: Escopo do diff**

Run: `git diff --stat`
Expected: **nenhuma** aparição de `src/services/homeAppointments.ts`, `src/app/(app)/dashboard.tsx`, `src/screens/HomeScreen.tsx`, `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `amplify/`, `package.json`, `package-lock.json`.

- [ ] **Step 4: Teste manual — o que os testes não alcançam**

Com Node 20 (`nvm use 20.20.1`) e o sandbox Amplify, em `npx expo start`:

1. Abrir a aba Consultas e confirmar que a resposta a "tenho algo marcado?" está visível **sem tocar em nada**.
2. Confirmar que a lista **abre com hoje no topo**, sem piscar nem saltar.
3. Rolar para cima e alcançar um compromisso passado; conferir que ele está atenuado mas **legível**.
4. Rolar até hoje sair da tela e confirmar que a pílula "Hoje" aparece e funciona.
5. Abrir a camada de mês, navegar um mês, tocar um card, e confirmar que volta à lista na posição em que estava.

Sem este passo a EPIC não está entregue: os testes cobrem a lógica de ancoragem, não o comportamento real da `FlatList` no aparelho.

- [ ] **Step 5: Registrar a divergência em `GAP_ANALYSIS.md`**

Leia o arquivo e siga a convenção que encontrar. O conteúdo a registrar:

```
2c Agenda — CANVAS SUPERADO NESTA TELA (decisao de produto informada por uso,
2026-09-19; spec: specs/02-perfil-home-agenda/agenda-lista-continua/). O Canvas
desenhou navegacao por calendario; os dois usos declarados pelo usuario apos
usar o app em dispositivo sao "ver o que vem a seguir" (dominante) e "planejar o
mes" (ocasional). A tela passou a ser uma lista continua ancorada em hoje, com o
mes como camada. Nao e regra 1 descumprida por descuido: e divergencia
deliberada e autorizada, registrada aqui para rastreabilidade. A EPIC
agenda-navegacao-temporal foi substituida por esta.
```

- [ ] **Step 6: Marcar o `tasks.md` da spec**

Marque apenas os itens cujo comando rodou, com a evidência. O item de teste manual fica **desmarcado** até o usuário rodá-lo.

- [ ] **Step 7: Checkpoint final**

Mensagem sugerida:

```
docs(agenda): registra o Canvas 2c como superado nesta tela
```

---

## Notas de execução

**A ordem não é negociável.** Tasks 1 → 2 → 3 fecham o portão; a Task 4 acrescenta; a Task 5 remove. Apagar antes da Task 3 deixa as tasks intermediárias sem suíte verde de referência.

**O teste da Task 1 fica vermelho por duas tasks**, de propósito. Ele muda de sintoma uma vez (prop `navigation` obrigatória → texto não encontrado → verde) e essa mudança é o termômetro.

**Se `initialScrollIndex` não ancorar corretamente no aparelho,** a causa provável é altura de linha divergente de `ROW_HEIGHT`. A saída é ajustar a constante ou truncar mais conteúdo — **nunca** abandonar `getItemLayout`, porque sem ele a lista renderiza no topo e salta, e esse salto é exatamente o que faz uma tela parecer mal feita.

**Se alguma task exigir editar a Home,** pare. Esta EPIC não toca nela em nenhum ponto.

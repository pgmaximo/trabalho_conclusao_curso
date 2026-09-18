# Agenda — Navegação temporal e Histórico: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar todo `Appointment` do usuário alcançável, editável e excluível pela Agenda — hoje só os dos próximos 7 dias são — adicionando navegação por Dia/Semana/Mês/Ano e um modo Histórico.

**Architecture:** Separar busca de navegação. Toda a aritmética de data sai dos hooks e vai para um módulo puro (`agendaDateRange.ts`), sem React e sem Amplify, testável isoladamente. Um hook novo (`useAgendaNavigation`) guarda apenas `scope` + `anchorDate` + `listOverride` e deriva o período; `useAppointmentsData` volta a ser só busca/cache/mapeamento. Os componentes de visualização são puros: recebem células já calculadas e emitem callbacks.

**Tech Stack:** React Native + Expo (Expo Router), TypeScript, NativeWind v4, Jest (`jest-expo`) + `@testing-library/react-native`, AWS Amplify Gen 2 (DynamoDB — **não é tocado por este plano**).

**Spec:** `specs/02-perfil-home-agenda/agenda-navegacao-temporal/` (`spec.md` = requisitos e critérios de aceite; `plan.md` = decisões técnicas e justificativas; `tasks.md` = checklist de entrega). Leia `spec.md` §2.1 antes da Task 1 — é a descrição do defeito que este plano existe para corrigir.

## Global Constraints

- **Idioma:** strings de interface e comentários em **pt-BR**, para casar com o resto do código.
- **Imports:** sempre pelo alias `@/` para `src/` (ex.: `import { AppointmentCard } from '@/components/AppointmentCard'`).
- **Zero dependência nova.** Nada de `date-fns`, `dayjs`, `react-native-calendars`. `package.json` não pode ser modificado (regra 3 da constituição).
- **Zero mudança de backend.** `amplify/data/schemas/appointments.ts` e `src/services/appointmentService.ts` não são editados (regra 5).
- **Zero cor nova.** Só tokens já existentes via `useThemeColors()` (regra 7). Marcador de estado nunca é cor sozinha — sempre cor **mais** forma ou peso de texto.
- **Contrato de data:** `scheduledAt` é `"AAAA-MM-DDTHH:mm"`, hora **local ingênua, sem offset**. Nenhum arquivo de agenda pode chamar `new Date(scheduledAt)` nem comparar `scheduledAt` com `new Date().toISOString()`. Todo acesso passa por `parseScheduledAt`.
- **Semana começa no domingo** (`getDay() === 0`), como já faz `src/components/DateInput.tsx`.
- **Aritmética de data:** sempre pelo construtor `new Date(y, m, d)` com valores fora de faixa, que normaliza sozinho. **Nunca** somar milissegundos (`+ 7 * 86400000`) a um `Date`.
- **Commits:** o `AGENTS.md` deste projeto proíbe commitar ou dar push sem autorização explícita. Cada task termina num **checkpoint**: rode a verificação, mostre `git diff --stat`, e **pare para pedir autorização**. A mensagem de commit sugerida vem pronta em cada checkpoint, para ser usada quando a autorização vier.
- **Comando de teste único:** `npx jest <substring do arquivo>`. Validação completa: `npm run validate`.
- **Node 20** (`nvm use 20.20.1`) para qualquer comando Amplify — o `ampx` quebra no Node 22/24.

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `__tests__/agendaCompromissoForaDaJanela.test.tsx` | **Criar.** Teste de regressão do defeito reportado. Vermelho da Task 1 até a Task 8 | 1, 8 |
| `__tests__/agendaDateRange.test.ts` | **Criar.** Testes puros da aritmética de data | 2, 3 |
| `src/services/agendaDateRange.ts` | **Criar.** Módulo puro: parse, períodos, classificação, rótulos, células | 2, 3 |
| `__tests__/useAgendaNavigation.test.ts` | **Criar.** Testes do estado de navegação | 4 |
| `src/hooks/useAgendaNavigation.ts` | **Criar.** `scope` + `anchorDate` + `listOverride` e ações | 4 |
| `src/types/models.ts` | **Modificar.** `CalendarDateItem` ganha `isoDate` e `isToday` | 3 |
| `src/hooks/useAppointmentsData.ts` | **Modificar.** Remover todo o recorte temporal; sobra busca/cache/mapeamento | 5 |
| `src/components/CalendarPicker.tsx` | **Modificar.** Seleção por `isoDate` (string) em vez de dia do mês (number) | 5 |
| `src/components/AgendaScopeSelector.tsx` | **Criar.** Segmented control de 4 posições | 6 |
| `src/components/AgendaPeriodHeader.tsx` | **Criar.** `‹` rótulo `›` + botão "Hoje" | 6 |
| `src/components/MonthCalendarGrid.tsx` | **Criar.** Grade mensal | 7 |
| `src/components/YearMonthsGrid.tsx` | **Criar.** 12 blocos de mês com contagem | 7 |
| `src/components/AppointmentCard.tsx` | **Modificar.** Prop nova opcional `dateLabel` | 8 |
| `src/screens/AgendaScreen.tsx` | **Modificar.** Compõe tudo; regra de lista de três ramos | 8 |
| `src/app/(app)/appointments.tsx` | **Modificar.** Une os dois hooks e repassa para a tela | 8 |
| `specs/design/GAP_ANALYSIS.md` | **Modificar.** Registrar a extensão do Canvas 2c | 9 |

**Não são tocados:** `src/app/(app)/dashboard.tsx`, `src/screens/HomeScreen.tsx`, `src/services/appointmentService.ts`, `src/hooks/appointmentsCache.ts`, `amplify/**`, `package.json`. Se alguma task precisar editar um destes, o contrato foi violado — pare e reavalie.

---

### Task 1: Teste de regressão do defeito (vermelho proposital)

Este teste prova o bug de forma executável e permanece **vermelho até a Task 8**. Isso é intencional: é o portão da entrega. Não tente fazê-lo passar antes da hora, e não o marque como `skip`.

**Files:**
- Create: `__tests__/agendaCompromissoForaDaJanela.test.tsx`

**Interfaces:**
- Consumes: `AgendaScreen` (props atuais, que mudam na Task 8) — por isso o teste é escrito já contra a **API final**, definida aqui.
- Produces: nada. É o critério de aceite executável do `spec.md` §7, itens 1 e 2.

- [ ] **Step 1: Escrever o teste falhando**

Crie `__tests__/agendaCompromissoForaDaJanela.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AgendaScreen } from '@/screens/AgendaScreen';
import { useAgendaNavigation } from '@/hooks/useAgendaNavigation';
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

// Wrapper: a tela e de apresentacao pura, entao o hook de navegacao vive aqui,
// exatamente como a rota real fara na Task 8.
function Harness({ appointments }: { appointments: AppointmentEntry[] }) {
  const navigation = useAgendaNavigation();
  return (
    <AgendaScreen
      appointments={appointments}
      errorMessage={null}
      isLoading={false}
      navigation={navigation}
      onRetry={jest.fn()}
    />
  );
}

function renderAgenda(appointments: AppointmentEntry[]) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Harness appointments={appointments} />
    </SafeAreaProvider>,
  );
}

describe('Agenda — compromissos fora da janela de 7 dias', () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
  });

  it('alcanca um compromisso a 13 dias pelo modo "Proximos" e abre a tela de edicao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Próximos'));

    expect(screen.getByText('Cardiologista')).toBeTruthy();

    fireEvent.press(screen.getByText('Cardiologista'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-futuro');
  });

  it('alcanca um compromisso passado pelo modo "Historico" e abre a tela de edicao', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    fireEvent.press(screen.getByText('Histórico'));

    expect(screen.getByText('Medico de cabeca')).toBeTruthy();

    fireEvent.press(screen.getByText('Medico de cabeca'));

    expect(router.push).toHaveBeenCalledWith('/edit-appointment?id=apt-passado');
  });

  it('nao mostra o compromisso a 13 dias no escopo Dia ancorado em hoje', () => {
    renderAgenda([FUTURO_DISTANTE, PASSADO]);

    // Comportamento correto e desejado: o escopo Dia recorta so o dia atual.
    // O defeito nunca foi este recorte — foi nao existir nenhum outro caminho.
    expect(screen.queryByText('Cardiologista')).toBeNull();
    expect(screen.queryByText('Medico de cabeca')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest agendaCompromissoForaDaJanela`

Expected: **FAIL** com `Cannot find module '@/hooks/useAgendaNavigation'`.

Esta é a única task deste plano em que a falha por módulo inexistente é a falha esperada — o teste é escrito contra a API que as Tasks 2–8 vão construir. Depois da Task 4 ele passa a falhar por elemento não encontrado, e depois da Task 8 fica verde.

- [ ] **Step 3: Registrar a falha**

Cole a saída do Jest no relatório de bloco. Não prossiga sem ela: é a evidência de que o bug existe e de que o teste o detecta.

- [ ] **Step 4: Checkpoint**

Run: `git status --short`
Espera-se exatamente um arquivo novo. Mensagem sugerida para quando houver autorização:

```
test(agenda): teste de regressao — compromisso fora da janela de 7 dias e inalcancavel
```

---

### Task 2: `agendaDateRange.ts` — parse, períodos e classificação

**Files:**
- Create: `src/services/agendaDateRange.ts`
- Test: `__tests__/agendaDateRange.test.ts`

**Interfaces:**
- Consumes: nada. Módulo puro, sem React, sem Amplify, sem AsyncStorage.
- Produces:
  - `type AgendaScope = 'dia' | 'semana' | 'mes' | 'ano'`
  - `type AgendaListOverride = 'proximos' | 'historico'`
  - `type DateRange = { start: Date; end: Date }`
  - `parseScheduledAt(value: string | null | undefined): Date | null`
  - `toIsoDate(date: Date): string`
  - `startOfDay(date: Date): Date`
  - `buildRange(scope: AgendaScope, anchor: Date): DateRange`
  - `shiftAnchor(scope: AgendaScope, anchor: Date, direction: -1 | 1): Date`
  - `isDateWithinRange(date: Date, range: DateRange): boolean`
  - `isWithinRange(scheduledAt: string, range: DateRange): boolean`
  - `isPast(scheduledAt: string, now: Date): boolean | null`
  - `compareScheduled(a: string, b: string): number`
  - `formatPeriodLabel(scope: AgendaScope, anchor: Date, today: Date): string`

- [ ] **Step 1: Escrever os testes falhando**

Crie `__tests__/agendaDateRange.test.ts`:

```ts
import {
  buildRange,
  compareScheduled,
  formatPeriodLabel,
  isPast,
  isWithinRange,
  parseScheduledAt,
  shiftAnchor,
  toIsoDate,
} from '@/services/agendaDateRange';

describe('parseScheduledAt', () => {
  it('interpreta a string sem offset como horario LOCAL', () => {
    const date = parseScheduledAt('2026-10-01T09:00');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(9); // outubro
    expect(date!.getDate()).toBe(1);
    expect(date!.getHours()).toBe(9);
    expect(date!.getMinutes()).toBe(0);
  });

  it('aceita string apenas de data, assumindo meia-noite local', () => {
    const date = parseScheduledAt('2026-10-01');
    expect(date!.getDate()).toBe(1);
    expect(date!.getHours()).toBe(0);
  });

  it('tolera segundos no fim da string (registros legados)', () => {
    const date = parseScheduledAt('2026-09-02T15:00:00');
    expect(date!.getHours()).toBe(15);
  });

  it('devolve null para entrada vazia, malformada ou data inexistente', () => {
    expect(parseScheduledAt('')).toBeNull();
    expect(parseScheduledAt(null)).toBeNull();
    expect(parseScheduledAt('lixo')).toBeNull();
    expect(parseScheduledAt('2026-02-31T10:00')).toBeNull();
    expect(parseScheduledAt('2026-13-01T10:00')).toBeNull();
  });
});

describe('buildRange', () => {
  it('dia: cobre de 00:00:00.000 a 23:59:59.999', () => {
    const range = buildRange('dia', new Date(2026, 8, 18, 15, 30));
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMilliseconds()).toBe(999);
    expect(range.start.getDate()).toBe(18);
    expect(range.end.getDate()).toBe(18);
  });

  it('semana: de domingo a sabado', () => {
    // 18/09/2026 e uma sexta-feira.
    const range = buildRange('semana', new Date(2026, 8, 18));
    expect(range.start.getDay()).toBe(0);
    expect(range.start.getDate()).toBe(13);
    expect(range.end.getDay()).toBe(6);
    expect(range.end.getDate()).toBe(19);
  });

  it('semana: quando a ancora ja e domingo, a semana comeca nela mesma', () => {
    const range = buildRange('semana', new Date(2026, 8, 13));
    expect(range.start.getDate()).toBe(13);
    expect(range.end.getDate()).toBe(19);
  });

  it('mes: do dia 1 ao ultimo dia', () => {
    const range = buildRange('mes', new Date(2026, 8, 18));
    expect(range.start.getDate()).toBe(1);
    expect(range.end.getDate()).toBe(30);
  });

  it('mes: fevereiro de ano bissexto termina em 29', () => {
    const range = buildRange('mes', new Date(2028, 1, 15));
    expect(range.end.getDate()).toBe(29);
  });

  it('ano: de 1 de janeiro a 31 de dezembro', () => {
    const range = buildRange('ano', new Date(2026, 5, 10));
    expect(range.start.getMonth()).toBe(0);
    expect(range.start.getDate()).toBe(1);
    expect(range.end.getMonth()).toBe(11);
    expect(range.end.getDate()).toBe(31);
  });
});

describe('shiftAnchor', () => {
  it('dia: 31/12 + 1 vira 01/01 do ano seguinte', () => {
    const next = shiftAnchor('dia', new Date(2026, 11, 31), 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(1);
  });

  it('semana: desloca exatamente 7 dias', () => {
    const next = shiftAnchor('semana', new Date(2026, 8, 18), 1);
    expect(next.getDate()).toBe(25);
  });

  it('mes: 31/01 + 1 mes vira fevereiro, nunca marco', () => {
    const next = shiftAnchor('mes', new Date(2026, 0, 31), 1);
    expect(next.getMonth()).toBe(1);
  });

  it('ano: desloca o ano preservando o mes', () => {
    const next = shiftAnchor('ano', new Date(2026, 5, 10), -1);
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(5);
  });
});

describe('isPast — o bug de fuso horario', () => {
  it('compromisso de hoje as 15:00, avaliado as 14:00, NAO e passado', () => {
    const now = new Date(2026, 8, 18, 14, 0);
    expect(isPast('2026-09-18T15:00', now)).toBe(false);
  });

  it('compromisso de hoje as 09:00, avaliado as 14:00, e passado', () => {
    const now = new Date(2026, 8, 18, 14, 0);
    expect(isPast('2026-09-18T09:00', now)).toBe(true);
  });

  it('devolve null para data invalida, para o chamador decidir', () => {
    expect(isPast('lixo', new Date())).toBeNull();
  });
});

describe('isWithinRange', () => {
  it('inclui os dois extremos do periodo', () => {
    const range = buildRange('mes', new Date(2026, 9, 15));
    expect(isWithinRange('2026-10-01T00:00', range)).toBe(true);
    expect(isWithinRange('2026-10-31T23:59', range)).toBe(true);
    expect(isWithinRange('2026-11-01T00:00', range)).toBe(false);
  });

  it('data invalida nunca cai em periodo nenhum', () => {
    expect(isWithinRange('lixo', buildRange('ano', new Date(2026, 0, 1)))).toBe(false);
  });
});

describe('compareScheduled', () => {
  it('ordena cronologicamente e joga datas invalidas para o fim', () => {
    const ordenado = ['2026-10-05T10:00', 'lixo', '2026-10-01T08:00'].sort(compareScheduled);
    expect(ordenado).toEqual(['2026-10-01T08:00', '2026-10-05T10:00', 'lixo']);
  });
});

describe('toIsoDate', () => {
  it('formata com zero a esquerda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatPeriodLabel', () => {
  const hoje = new Date(2026, 8, 18);

  it('dia: usa "Hoje" quando a ancora e a data atual', () => {
    expect(formatPeriodLabel('dia', hoje, hoje)).toBe('Hoje, 18 de setembro');
  });

  it('dia: usa o dia da semana quando nao e hoje', () => {
    expect(formatPeriodLabel('dia', new Date(2026, 8, 25), hoje)).toContain('25 de setembro');
  });

  it('semana: mostra o intervalo', () => {
    expect(formatPeriodLabel('semana', hoje, hoje)).toBe('13 a 19 de setembro');
  });

  it('semana: nomeia os dois meses quando o intervalo os atravessa', () => {
    expect(formatPeriodLabel('semana', new Date(2026, 8, 30), hoje))
      .toBe('27 de setembro a 3 de outubro');
  });

  it('mes: nome do mes capitalizado mais o ano', () => {
    expect(formatPeriodLabel('mes', hoje, hoje)).toBe('Setembro de 2026');
  });

  it('ano: so o ano', () => {
    expect(formatPeriodLabel('ano', hoje, hoje)).toBe('2026');
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest agendaDateRange`
Expected: **FAIL** com `Cannot find module '@/services/agendaDateRange'`.

- [ ] **Step 3: Implementar**

Crie `src/services/agendaDateRange.ts`:

```ts
// =============================================================================
// Arquivo: agendaDateRange.ts
// Descricao: Aritmetica de data da Agenda — modulo PURO (sem React, sem Amplify)
// =============================================================================
//
// CONTRATO DE DATA (specs/02-perfil-home-agenda/agenda-navegacao-temporal/spec.md §6):
// `Appointment.scheduledAt` e gravado como "AAAA-MM-DDTHH:mm" — hora LOCAL
// ingenua, sem offset. Pela especificacao do ECMAScript, `new Date()` interpreta
// uma string data-e-hora sem offset como LOCAL, mas uma string so de data como
// UTC. Depender dessa distincao ja produziu um defeito real (o filtro da Home
// escondia compromissos de hoje ainda por vir, em UTC-3). Por isso NENHUM codigo
// de agenda constroi Date a partir de scheduledAt fora de `parseScheduledAt`.
//
// =============================================================================

export type AgendaScope = 'dia' | 'semana' | 'mes' | 'ano';
export type AgendaListOverride = 'proximos' | 'historico';
export type DateRange = { start: Date; end: Date };

const WEEKDAY_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const MONTH_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

// Grupos: 1=ano 2=mes 3=dia 4=hora 5=minuto. Hora e minuto sao opcionais (string
// so de data) e segundos, quando presentes, sao ignorados (registros legados).
const SCHEDULED_AT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

export function parseScheduledAt(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const match = SCHEDULED_AT_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;

  if (hour > 23 || minute > 59) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  // O construtor normaliza valores fora de faixa em silencio: 2026-02-31 viraria
  // 03/03. Aqui isso e um dado corrompido, nao uma data — rejeitamos.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function buildRange(scope: AgendaScope, anchor: Date): DateRange {
  switch (scope) {
    case 'dia':
      return { start: startOfDay(anchor), end: endOfDay(anchor) };

    case 'semana': {
      // getDay(): 0 = domingo. A semana comeca no domingo (ver Global Constraints).
      const sunday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
      const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6);
      return { start: startOfDay(sunday), end: endOfDay(saturday) };
    }

    case 'mes': {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      // Dia 0 do mes seguinte = ultimo dia deste mes. Resolve 28/29/30/31 sozinho.
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: startOfDay(first), end: endOfDay(last) };
    }

    case 'ano':
      return {
        start: startOfDay(new Date(anchor.getFullYear(), 0, 1)),
        end: endOfDay(new Date(anchor.getFullYear(), 11, 31)),
      };
  }
}

export function shiftAnchor(scope: AgendaScope, anchor: Date, direction: -1 | 1): Date {
  switch (scope) {
    case 'dia':
      return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction);

    case 'semana':
      return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * direction);

    case 'mes':
      // Ancorar no dia 1 e deliberado: 31/01 + 1 mes com o dia preservado viraria
      // 03/03. Como o periodo cobre o mes inteiro, o dia da ancora e irrelevante.
      return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);

    case 'ano':
      return new Date(anchor.getFullYear() + direction, anchor.getMonth(), 1);
  }
}

export function isDateWithinRange(date: Date, range: DateRange): boolean {
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function isWithinRange(scheduledAt: string, range: DateRange): boolean {
  const date = parseScheduledAt(scheduledAt);
  return date ? isDateWithinRange(date, range) : false;
}

// Devolve null para data invalida: quem chama decide o que fazer com o registro
// corrompido. A Agenda o joga no fim do "Historico", para poder ser excluido —
// um registro que a interface nao alcanca e exatamente o defeito que esta EPIC
// existe para eliminar.
export function isPast(scheduledAt: string, now: Date): boolean | null {
  const date = parseScheduledAt(scheduledAt);
  if (!date) {
    return null;
  }
  return date.getTime() < now.getTime();
}

export function compareScheduled(a: string, b: string): number {
  const dateA = parseScheduledAt(a);
  const dateB = parseScheduledAt(b);

  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  return dateA.getTime() - dateB.getTime();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatPeriodLabel(scope: AgendaScope, anchor: Date, today: Date): string {
  switch (scope) {
    case 'dia': {
      const dayMonth = `${anchor.getDate()} de ${MONTH_LONG_FORMATTER.format(anchor)}`;
      if (isSameDay(anchor, today)) {
        return `Hoje, ${dayMonth}`;
      }
      return capitalize(`${WEEKDAY_LONG_FORMATTER.format(anchor)}, ${dayMonth}`);
    }

    case 'semana': {
      const { start, end } = buildRange('semana', anchor);
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} a ${end.getDate()} de ${MONTH_LONG_FORMATTER.format(end)}`;
      }
      return (
        `${start.getDate()} de ${MONTH_LONG_FORMATTER.format(start)} a ` +
        `${end.getDate()} de ${MONTH_LONG_FORMATTER.format(end)}`
      );
    }

    case 'mes':
      return `${capitalize(MONTH_LONG_FORMATTER.format(anchor))} de ${anchor.getFullYear()}`;

    case 'ano':
      return String(anchor.getFullYear());
  }
}
```

- [ ] **Step 4: Rodar e confirmar o verde**

Run: `npx jest agendaDateRange`
Expected: **PASS**, todos os `describe` verdes.

- [ ] **Step 5: Confirmar a pureza do módulo**

Run: `grep -nE "react|amplify|async-storage" src/services/agendaDateRange.ts`
Expected: **nenhuma saída**. Se houver, um import indevido entrou.

- [ ] **Step 6: Checkpoint**

Run: `git diff --stat`
Mensagem sugerida:

```
feat(agenda): modulo puro de aritmetica de data com contrato de hora local
```

---

### Task 3: Construtores de células e tipo `CalendarDateItem`

**Files:**
- Modify: `src/services/agendaDateRange.ts` (acrescentar ao fim)
- Modify: `src/types/models.ts:204-208`
- Test: `__tests__/agendaDateRange.test.ts` (acrescentar ao fim)

**Interfaces:**
- Consumes: da Task 2 — `parseScheduledAt`, `toIsoDate`, `startOfDay`, `buildRange`.
- Produces:
  - `CalendarDateItem` (em `@/types/models`) = `{ isoDate: string; day: number; month: string; hasAppointments?: boolean; isToday?: boolean }`
  - `type AgendaMonthCell = { month: number; label: string; count: number; isoDate: string }`
  - `buildDayCells(anchor: Date, scheduledAtList: string[], today: Date): CalendarDateItem[]`
  - `buildWeekCells(anchor: Date, scheduledAtList: string[], today: Date): CalendarDateItem[]`
  - `buildMonthCells(anchor: Date, scheduledAtList: string[], today: Date): (CalendarDateItem | null)[][]`
  - `buildYearCells(anchor: Date, scheduledAtList: string[]): AgendaMonthCell[]`

**Por que `buildWeekCells` existe e não é `buildDayCells` reaproveitado.** No escopo Semana o período é **domingo–sábado da âncora** (`buildRange('semana')`), enquanto a faixa de `buildDayCells` é um bloco alinhado a hoje. Reaproveitar a segunda faria a faixa mostrar sete dias diferentes dos sete que a lista abaixo está recortando — um descompasso silencioso entre o que o usuário vê marcado e o que ele vê listado. Duas funções, cada uma coerente com o seu período.

**Divergência consciente do `spec.md` §3, item 5.** A spec descreve o escopo Semana como "7 linhas de dia com contagem". Aqui ele é renderizado com o `CalendarPicker` já existente, alimentado por `buildWeekCells`: mesmas sete unidades, mesma informação de "tem compromisso", zero componente novo, e a lista completa da semana logo abaixo. A informação de contagem exata por dia é perdida em favor do marcador binário. Se essa contagem for exigida, ela vira um componente `WeekDayRows` próprio — não está neste plano.

**Decisão registrada — como a faixa de 7 dias se ancora.** A faixa não é `anchor..anchor+6` (selecionar um dia faria a faixa deslizar debaixo do dedo) nem a semana da âncora (mudaria a tela padrão do Canvas 2c). É um **bloco de 7 dias alinhado a hoje**: quando a âncora está em `hoje..hoje+6`, a faixa é exatamente `hoje..hoje+6`, idêntica à entrega da EPIC `agenda/`; blocos anteriores e posteriores são múltiplos de 7 a partir daí. Selecionar qualquer dia do bloco visível nunca move a faixa.

- [ ] **Step 1: Escrever os testes falhando**

Acrescente ao fim de `__tests__/agendaDateRange.test.ts`:

```ts
import {
  buildDayCells,
  buildMonthCells,
  buildWeekCells,
  buildYearCells,
} from '@/services/agendaDateRange';

describe('buildDayCells', () => {
  const hoje = new Date(2026, 8, 18);

  it('com a ancora em hoje, a faixa comeca em hoje (fidelidade ao Canvas 2c)', () => {
    const cells = buildDayCells(hoje, [], hoje);
    expect(cells).toHaveLength(7);
    expect(cells[0].isoDate).toBe('2026-09-18');
    expect(cells[6].isoDate).toBe('2026-09-24');
    expect(cells[0].isToday).toBe(true);
  });

  it('selecionar um dia dentro do bloco NAO desloca a faixa', () => {
    const cells = buildDayCells(new Date(2026, 8, 21), [], hoje);
    expect(cells[0].isoDate).toBe('2026-09-18');
  });

  it('ancora no passado cai no bloco anterior, alinhado a hoje', () => {
    const cells = buildDayCells(new Date(2026, 8, 15), [], hoje);
    expect(cells[0].isoDate).toBe('2026-09-11');
    expect(cells[6].isoDate).toBe('2026-09-17');
  });

  it('marca hasAppointments apenas nos dias que realmente tem compromisso', () => {
    const cells = buildDayCells(hoje, ['2026-09-20T10:00', 'lixo'], hoje);
    expect(cells.find((c) => c.isoDate === '2026-09-20')!.hasAppointments).toBe(true);
    expect(cells.find((c) => c.isoDate === '2026-09-19')!.hasAppointments).toBe(false);
  });
});

describe('buildWeekCells', () => {
  const hoje = new Date(2026, 8, 18);

  it('devolve a semana domingo-sabado da ancora, coerente com buildRange', () => {
    const cells = buildWeekCells(new Date(2026, 8, 18), [], hoje);
    expect(cells).toHaveLength(7);
    expect(cells[0].isoDate).toBe('2026-09-13');
    expect(cells[6].isoDate).toBe('2026-09-19');
  });

  it('marca isToday na celula correta mesmo em outra semana', () => {
    const cells = buildWeekCells(new Date(2026, 8, 30), [], hoje);
    expect(cells.every((cell) => cell.isToday === false)).toBe(true);
  });

  it('marca hasAppointments pelos dias reais da semana', () => {
    const cells = buildWeekCells(hoje, ['2026-09-15T08:00'], hoje);
    expect(cells.find((c) => c.isoDate === '2026-09-15')!.hasAppointments).toBe(true);
    expect(cells.find((c) => c.isoDate === '2026-09-16')!.hasAppointments).toBe(false);
  });
});

describe('buildMonthCells', () => {
  const hoje = new Date(2026, 8, 18);

  it('preenche com null antes do dia 1 e depois do ultimo dia', () => {
    const weeks = buildMonthCells(new Date(2026, 8, 1), [], hoje);
    // 01/09/2026 e uma terca-feira: duas posicoes vazias antes dela.
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBeNull();
    expect(weeks[0][2]!.isoDate).toBe('2026-09-01');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('cobre todos os dias do mes exatamente uma vez', () => {
    const dias = buildMonthCells(new Date(2026, 8, 1), [], hoje)
      .flat()
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    expect(dias).toHaveLength(30);
  });

  it('fevereiro bissexto tem 29 celulas preenchidas', () => {
    const dias = buildMonthCells(new Date(2028, 1, 1), [], hoje)
      .flat()
      .filter((cell) => cell !== null);
    expect(dias).toHaveLength(29);
  });
});

describe('buildYearCells', () => {
  it('devolve 12 meses com a contagem real de cada um', () => {
    const cells = buildYearCells(new Date(2026, 0, 1), [
      '2026-03-10T09:00',
      '2026-03-22T14:00',
      '2025-03-01T09:00', // outro ano: nao conta
      'lixo',
    ]);
    expect(cells).toHaveLength(12);
    expect(cells[2].count).toBe(2);
    expect(cells[2].label).toBe('Março');
    expect(cells[2].isoDate).toBe('2026-03-01');
    expect(cells[0].count).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest agendaDateRange`
Expected: **FAIL** — `buildDayCells is not a function` (e as demais). Os testes da Task 2 continuam verdes.

- [ ] **Step 3: Atualizar o tipo `CalendarDateItem`**

Em `src/types/models.ts`, substitua o bloco das linhas 204–208 por:

```ts
export interface CalendarDateItem {
  isoDate: string;                // Identidade da celula (AAAA-MM-DD). Dia-do-mes
                                  // sozinho e ambiguo quando a navegacao atravessa meses.
  day: number;                    // Dia do mês
  month: string;                  // Mês (abreviado)
  hasAppointments?: boolean;      // Se há compromissos no dia
  isToday?: boolean;              // Destaque de "hoje" quando a ancora esta em outro periodo
}
```

- [ ] **Step 4: Implementar os construtores**

Primeiro, acrescente esta linha **no topo** do arquivo, junto dos demais imports (é `import type`, então não cria dependência em tempo de execução e o módulo continua puro):

```ts
import type { CalendarDateItem } from '@/types/models';
```

Depois acrescente o restante **ao fim** de `src/services/agendaDateRange.ts`:

```ts
export type AgendaMonthCell = {
  month: number;   // 0-11
  label: string;   // "Março"
  count: number;
  isoDate: string; // primeiro dia do mes, para o drill-down
};

const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function formatMonthAbbrev(date: Date): string {
  return MONTH_SHORT_FORMATTER.format(date).replace('.', '').toLowerCase();
}

// Indice absoluto do dia, via Date.UTC — exato e imune a horario de verao, ao
// contrario de dividir a diferenca de milissegundos entre dois Date locais.
function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function toIsoDateSet(scheduledAtList: string[]): Set<string> {
  const set = new Set<string>();
  for (const value of scheduledAtList) {
    const date = parseScheduledAt(value);
    if (date) {
      set.add(toIsoDate(date));
    }
  }
  return set;
}

function toCell(date: Date, occupied: Set<string>, today: Date): CalendarDateItem {
  const isoDate = toIsoDate(date);
  return {
    isoDate,
    day: date.getDate(),
    month: formatMonthAbbrev(date),
    hasAppointments: occupied.has(isoDate),
    isToday: isoDate === toIsoDate(today),
  };
}

// Blocos de 7 dias ALINHADOS A HOJE: com a ancora em hoje..hoje+6 a faixa e
// exatamente hoje..hoje+6 (identica ao Canvas 2c), e selecionar um dia dentro do
// bloco visivel nunca desloca a faixa debaixo do dedo do usuario.
export function buildDayCells(anchor: Date, scheduledAtList: string[], today: Date): CalendarDateItem[] {
  const occupied = toIsoDateSet(scheduledAtList);
  const offset = dayIndex(anchor) - dayIndex(today);
  const blockStart = Math.floor(offset / 7) * 7;

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + blockStart + index);
    return toCell(date, occupied, today);
  });
}

// A semana do escopo Semana e domingo-sabado da ancora, exatamente o periodo de
// buildRange('semana', anchor) — as celulas marcadas e a lista abaixo delas tem
// de recortar os mesmos sete dias.
export function buildWeekCells(anchor: Date, scheduledAtList: string[], today: Date): CalendarDateItem[] {
  const occupied = toIsoDateSet(scheduledAtList);
  const { start } = buildRange('semana', anchor);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return toCell(date, occupied, today);
  });
}

export function buildMonthCells(
  anchor: Date,
  scheduledAtList: string[],
  today: Date,
): (CalendarDateItem | null)[][] {
  const occupied = toIsoDateSet(scheduledAtList);
  const { start, end } = buildRange('mes', anchor);

  const cells: (CalendarDateItem | null)[] = Array(start.getDay()).fill(null);

  for (let day = 1; day <= end.getDate(); day += 1) {
    cells.push(toCell(new Date(anchor.getFullYear(), anchor.getMonth(), day), occupied, today));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (CalendarDateItem | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

export function buildYearCells(anchor: Date, scheduledAtList: string[]): AgendaMonthCell[] {
  const year = anchor.getFullYear();
  const counts = Array<number>(12).fill(0);

  for (const value of scheduledAtList) {
    const date = parseScheduledAt(value);
    if (date && date.getFullYear() === year) {
      counts[date.getMonth()] += 1;
    }
  }

  return counts.map((count, month) => {
    const first = new Date(year, month, 1);
    return {
      month,
      label: capitalize(MONTH_LONG_FORMATTER.format(first)),
      count,
      isoDate: toIsoDate(first),
    };
  });
}
```

- [ ] **Step 5: Rodar e confirmar o verde**

Run: `npx jest agendaDateRange`
Expected: **PASS** em todos os blocos, incluindo os da Task 2.

- [ ] **Step 6: Verificar que nada mais quebrou com a mudança de tipo**

Run: `npm run typecheck`
Expected: erros **apenas** em `src/hooks/useAppointmentsData.ts` e `src/components/CalendarPicker.tsx` — são exatamente os arquivos da Task 5. Erro em qualquer outro arquivo significa um consumidor de `CalendarDateItem` que o levantamento não previu: pare e reavalie.

- [ ] **Step 7: Checkpoint**

Mensagem sugerida:

```
feat(agenda): construtores de celulas de dia, mes e ano; CalendarDateItem ganha isoDate
```

---

### Task 4: `useAgendaNavigation`

**Files:**
- Create: `src/hooks/useAgendaNavigation.ts`
- Test: `__tests__/useAgendaNavigation.test.ts`

**Interfaces:**
- Consumes: da Task 2 — `AgendaScope`, `AgendaListOverride`, `DateRange`, `buildRange`, `shiftAnchor`, `isDateWithinRange`, `formatPeriodLabel`, `parseScheduledAt`, `startOfDay`.
- Produces: `useAgendaNavigation(): AgendaNavigation`, com

```ts
export type AgendaNavigation = {
  scope: AgendaScope;
  anchorDate: Date;
  today: Date;
  listOverride: AgendaListOverride | null;
  range: DateRange;
  periodLabel: string;
  canGoToToday: boolean;
  setScope: (scope: AgendaScope) => void;
  goPrevious: () => void;
  goNext: () => void;
  goToToday: () => void;
  selectDate: (isoDate: string) => void;
  drillDown: (isoDate: string) => void;
  setListOverride: (override: AgendaListOverride | null) => void;
};
```

- [ ] **Step 1: Escrever os testes falhando**

Crie `__tests__/useAgendaNavigation.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native';

import { useAgendaNavigation } from '@/hooks/useAgendaNavigation';
import { toIsoDate } from '@/services/agendaDateRange';

describe('useAgendaNavigation', () => {
  it('comeca no escopo Dia, ancorado em hoje, sem override', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    expect(result.current.scope).toBe('dia');
    expect(toIsoDate(result.current.anchorDate)).toBe(toIsoDate(new Date()));
    expect(result.current.listOverride).toBeNull();
    expect(result.current.canGoToToday).toBe(false);
  });

  it('trocar de escopo preserva a ancora', () => {
    const { result } = renderHook(() => useAgendaNavigation());
    const ancoraInicial = toIsoDate(result.current.anchorDate);

    act(() => result.current.setScope('mes'));

    expect(result.current.scope).toBe('mes');
    expect(toIsoDate(result.current.anchorDate)).toBe(ancoraInicial);
  });

  it('goNext desloca uma unidade do escopo corrente', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setScope('mes'));
    const mesInicial = result.current.anchorDate.getMonth();

    act(() => result.current.goNext());

    expect(result.current.anchorDate.getMonth()).toBe((mesInicial + 1) % 12);
  });

  it('canGoToToday vira true depois de sair do periodo atual, e goToToday volta', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.goNext());
    expect(result.current.canGoToToday).toBe(true);

    act(() => result.current.goToToday());
    expect(result.current.canGoToToday).toBe(false);
    expect(toIsoDate(result.current.anchorDate)).toBe(toIsoDate(new Date()));
  });

  it('drillDown desce ano -> mes -> dia, movendo a ancora', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setScope('ano'));
    act(() => result.current.drillDown('2027-03-01'));

    expect(result.current.scope).toBe('mes');
    expect(result.current.anchorDate.getMonth()).toBe(2);
    expect(result.current.anchorDate.getFullYear()).toBe(2027);

    act(() => result.current.drillDown('2027-03-15'));

    expect(result.current.scope).toBe('dia');
    expect(result.current.anchorDate.getDate()).toBe(15);
  });

  it('selectDate move a ancora sem mudar o escopo', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setScope('mes'));
    act(() => result.current.selectDate('2027-05-09'));

    expect(result.current.scope).toBe('mes');
    expect(toIsoDate(result.current.anchorDate)).toBe('2027-05-09');
  });

  it('setScope, selectDate e goToToday limpam um override ativo', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setListOverride('historico'));
    expect(result.current.listOverride).toBe('historico');
    expect(result.current.periodLabel).toBe('Histórico completo');

    act(() => result.current.setScope('semana'));
    expect(result.current.listOverride).toBeNull();
  });

  it('ignora isoDate malformado em vez de quebrar', () => {
    const { result } = renderHook(() => useAgendaNavigation());
    const antes = toIsoDate(result.current.anchorDate);

    act(() => result.current.selectDate('lixo'));

    expect(toIsoDate(result.current.anchorDate)).toBe(antes);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest useAgendaNavigation`
Expected: **FAIL** com `Cannot find module '@/hooks/useAgendaNavigation'`.

- [ ] **Step 3: Implementar**

Crie `src/hooks/useAgendaNavigation.ts`:

```ts
// =============================================================================
// Arquivo: useAgendaNavigation.ts
// Descricao: Estado de navegacao temporal da Agenda (escopo + ancora + override)
// =============================================================================
//
// Nao busca nada e nao conhece Amplify: e so navegacao. A busca vive em
// useAppointmentsData, e a aritmetica de data em services/agendaDateRange.ts.
//
// =============================================================================

import { useCallback, useMemo, useState } from 'react';

import {
  buildRange,
  formatPeriodLabel,
  isDateWithinRange,
  parseScheduledAt,
  shiftAnchor,
  startOfDay,
  type AgendaListOverride,
  type AgendaScope,
  type DateRange,
} from '@/services/agendaDateRange';

export type AgendaNavigation = {
  scope: AgendaScope;
  anchorDate: Date;
  today: Date;
  listOverride: AgendaListOverride | null;
  range: DateRange;
  periodLabel: string;
  canGoToToday: boolean;
  setScope: (scope: AgendaScope) => void;
  goPrevious: () => void;
  goNext: () => void;
  goToToday: () => void;
  selectDate: (isoDate: string) => void;
  drillDown: (isoDate: string) => void;
  setListOverride: (override: AgendaListOverride | null) => void;
};

const CHILD_SCOPE: Record<AgendaScope, AgendaScope> = {
  ano: 'mes',
  mes: 'dia',
  semana: 'dia',
  dia: 'dia',
};

export function useAgendaNavigation(): AgendaNavigation {
  // Capturado UMA vez na montagem, pelo mesmo motivo ja documentado na versao
  // anterior de useAppointmentsData: evita a tela "escorregar" perto da meia-noite
  // enquanto esta aberta.
  const [today] = useState(() => startOfDay(new Date()));
  const [scope, setScopeState] = useState<AgendaScope>('dia');
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfDay(new Date()));
  const [listOverride, setListOverrideState] = useState<AgendaListOverride | null>(null);

  const range = useMemo(() => buildRange(scope, anchorDate), [scope, anchorDate]);

  const periodLabel = useMemo(() => {
    if (listOverride === 'proximos') return 'Todos os compromissos futuros';
    if (listOverride === 'historico') return 'Histórico completo';
    return formatPeriodLabel(scope, anchorDate, today);
  }, [scope, anchorDate, today, listOverride]);

  const canGoToToday = useMemo(() => !isDateWithinRange(today, range), [today, range]);

  const setScope = useCallback((next: AgendaScope) => {
    setScopeState(next);
    setListOverrideState(null);
  }, []);

  const goPrevious = useCallback(() => {
    setAnchorDate((current) => shiftAnchor(scope, current, -1));
  }, [scope]);

  const goNext = useCallback(() => {
    setAnchorDate((current) => shiftAnchor(scope, current, 1));
  }, [scope]);

  const goToToday = useCallback(() => {
    setAnchorDate(today);
    setListOverrideState(null);
  }, [today]);

  const selectDate = useCallback((isoDate: string) => {
    const date = parseScheduledAt(isoDate);
    if (!date) return;
    setAnchorDate(startOfDay(date));
    setListOverrideState(null);
  }, []);

  const drillDown = useCallback((isoDate: string) => {
    const date = parseScheduledAt(isoDate);
    if (!date) return;
    setAnchorDate(startOfDay(date));
    setScopeState((current) => CHILD_SCOPE[current]);
    setListOverrideState(null);
  }, []);

  const setListOverride = useCallback((override: AgendaListOverride | null) => {
    setListOverrideState(override);
  }, []);

  return {
    scope,
    anchorDate,
    today,
    listOverride,
    range,
    periodLabel,
    canGoToToday,
    setScope,
    goPrevious,
    goNext,
    goToToday,
    selectDate,
    drillDown,
    setListOverride,
  };
}
```

- [ ] **Step 4: Rodar e confirmar o verde**

Run: `npx jest useAgendaNavigation`
Expected: **PASS**.

- [ ] **Step 5: Conferir a mudança de sintoma do teste da Task 1**

Run: `npx jest agendaCompromissoForaDaJanela`
Expected: ainda **FAIL**, mas agora por prop desconhecida em `AgendaScreen` / texto "Próximos" não encontrado — não mais por módulo inexistente. Essa mudança de sintoma é o sinal de que a Task 4 entregou o que devia.

- [ ] **Step 6: Checkpoint**

Mensagem sugerida:

```
feat(agenda): hook de navegacao temporal com escopo, ancora e override de lista
```

---

### Task 5: Enxugar `useAppointmentsData` e migrar `CalendarPicker`

Esta é a task de maior risco de regressão: o hook é compartilhado com a Home. O critério é duro — **`src/app/(app)/dashboard.tsx` não pode ser editado.**

**Files:**
- Modify: `src/hooks/useAppointmentsData.ts`
- Modify: `src/components/CalendarPicker.tsx`

**Interfaces:**
- Consumes: da Task 2 — `parseScheduledAt`. Da Task 3 — `CalendarDateItem` com `isoDate`.
- Produces:
  - `useAppointmentsData(): { appointments: AppointmentEntry[]; isLoading: boolean; errorMessage: string | null; retry: () => void }`
  - `CalendarPicker` com `{ selectedDate: string; onDateSelect: (isoDate: string) => void; dates: CalendarDateItem[] }`

- [ ] **Step 1: Verificar o contrato que a Home consome**

Run: `grep -n "useAppointmentsData" -A 8 "src/app/(app)/dashboard.tsx"`
Expected: a desestruturação usa apenas `appointments`, `isLoading`, `errorMessage`, `retry`. Se aparecer qualquer outro campo, **pare** — o plano precisa ser revisto antes de remover algo.

- [ ] **Step 2: Enxugar o hook**

Em `src/hooks/useAppointmentsData.ts`:

1. Apague as funções `isSameDate`, `isSameCalendarDay`, `buildDateWindow`, `formatMonthAbbrev`, `buildCalendarDates`, `capitalize`, `formatSelectedDayLabel` e os formatadores `WEEKDAY_LONG_FORMATTER`, `MONTH_LONG_FORMATTER`, `MONTH_SHORT_FORMATTER` (todos migraram para `agendaDateRange.ts`).
2. Apague o `useState` de `selectedDate` e todos os `useMemo` de `dateWindow`, `dates`, `selectedWindowDate`, `appointmentsForSelectedDate` e `selectedDayLabel`.
3. Troque `mapAppointmentToEntry` por:

```ts
function mapAppointmentToEntry(appointment: AppointmentRecord): AppointmentEntry {
  const scheduled = parseScheduledAt(appointment.scheduledAt);
  const displayTime = scheduled
    ? `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`
    : '--:--';

  return {
    id: appointment.id,
    time: displayTime,
    title: appointment.appointmentName,
    location: appointment.address ?? '',
    type: appointment.appointmentType.toLowerCase() as AppointmentEntry['type'],
    scheduledAt: appointment.scheduledAt,
    observations: appointment.observations ?? undefined,
  };
}
```

4. O `return` do hook passa a ser exatamente:

```ts
  return {
    appointments,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
```

5. Substitua o cabeçalho de documentação do arquivo (que descreve a janela de 7 dias, agora inexistente) por:

```ts
// =============================================================================
// Arquivo: useAppointmentsData.ts
// Descrição: Hook de BUSCA de compromissos — sem recorte temporal
// Hook: useAppointmentsData
// =============================================================================
//
// Responsabilidade unica: buscar os Appointment do usuario (cache AsyncStorage
// primeiro, DynamoDB depois), mapear para AppointmentEntry e expor loading/erro/retry.
//
// O recorte temporal (dia/semana/mes/ano, historico) NAO vive aqui — vive em
// useAgendaNavigation + services/agendaDateRange.ts. Essa separacao e o conserto
// do defeito em que compromissos fora de hoje..hoje+6 ficavam inalcancaveis
// (specs/02-perfil-home-agenda/agenda-navegacao-temporal/spec.md §2.1).
//
// Consumidores: src/app/(app)/appointments.tsx (Agenda) e
// src/app/(app)/dashboard.tsx (Home) — ambos usam so appointments/isLoading/
// errorMessage/retry.
//
// =============================================================================
```

6. Acrescente o import: `import { parseScheduledAt } from '@/services/agendaDateRange';`

- [ ] **Step 3: Migrar o `CalendarPicker` para seleção por `isoDate`**

Em `src/components/CalendarPicker.tsx`, troque a interface e o corpo do `map`:

```tsx
import type { CalendarDateItem } from '@/types/models';

interface CalendarPickerProps {
  selectedDate: string; // AAAA-MM-DD
  onDateSelect: (isoDate: string) => void;
  dates: CalendarDateItem[];
}
```

```tsx
      {dates.map((date) => {
        const isSelected = selectedDate === date.isoDate;
        return (
          <Pressable
            key={date.isoDate}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.dateButton,
              {
                borderColor: isSelected ? colors.primary : date.isToday ? colors.secondary : colors.border,
                backgroundColor: isSelected ? colors.primary : colors.surface,
              },
            ]}
            onPress={() => onDateSelect(date.isoDate)}
          >
```

O resto do componente (textos, ponto de `hasAppointments`, estilos) fica como está. O `isToday` entra como **borda** secundária, não como preenchimento: hoje precisa ser reconhecível quando a âncora está em outro período, sem competir com o estado "selecionado".

- [ ] **Step 4: Verificar que a Home não quebrou**

Run: `npm run typecheck`
Expected: erros **apenas** em `src/screens/AgendaScreen.tsx` e `src/app/(app)/appointments.tsx` (Task 8). Zero erro em `dashboard.tsx` ou `HomeScreen.tsx`.

Run: `git diff --name-only`
Expected: `dashboard.tsx` **não** aparece na lista. Se aparecer, reverta a edição — o contrato foi violado.

- [ ] **Step 5: Rodar a suíte inteira para pegar regressões**

Run: `npx jest`
Expected: as suítes existentes passam; só `agendaCompromissoForaDaJanela` está vermelha (e a Task 8 a fecha).

- [ ] **Step 6: Checkpoint**

Mensagem sugerida:

```
refactor(agenda): useAppointmentsData volta a ser so busca; CalendarPicker seleciona por isoDate
```

---

### Task 6: `AgendaScopeSelector` e `AgendaPeriodHeader`

Componentes de apresentação pura: recebem valores prontos, emitem callbacks, **não importam `agendaDateRange`** e não calculam data.

**Files:**
- Create: `src/components/AgendaScopeSelector.tsx`
- Create: `src/components/AgendaPeriodHeader.tsx`

**Interfaces:**
- Consumes: da Task 2 — o tipo `AgendaScope` (só o tipo).
- Produces:
  - `<AgendaScopeSelector value={scope} onChange={(scope: AgendaScope) => void} />`
  - `<AgendaPeriodHeader label={string} canGoToToday={boolean} navigationDisabled={boolean} onPrevious={() => void} onNext={() => void} onToday={() => void} />`

- [ ] **Step 1: Criar o `AgendaScopeSelector`**

```tsx
// =============================================================================
// Arquivo: AgendaScopeSelector.tsx
// Descricao: Seletor de granularidade da Agenda (Dia/Semana/Mes/Ano)
// =============================================================================
//
// Padrao visual: chips selecionado/nao-selecionado de DESIGN_TOKENS.md §4 —
// nenhuma cor nova (regra 7 da constituicao).
//
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AgendaScope } from '@/services/agendaDateRange';

type AgendaScopeSelectorProps = {
  value: AgendaScope;
  onChange: (scope: AgendaScope) => void;
};

const OPTIONS: { value: AgendaScope; label: string }[] = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
];

export function AgendaScopeSelector({ value, onChange }: AgendaScopeSelectorProps) {
  return (
    <View className="mb-3 flex-row gap-2">
      {OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className={`h-11 flex-1 items-center justify-center rounded-app border ${
              isSelected
                ? 'border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft'
                : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface'
            }`}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text
              className={`text-[14px] font-semibold ${
                isSelected
                  ? 'text-app-primaryDark dark:text-app-dark-primaryDark'
                  : 'text-app-textSecondary dark:text-app-dark-textSecondary'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Criar o `AgendaPeriodHeader`**

```tsx
// =============================================================================
// Arquivo: AgendaPeriodHeader.tsx
// Descricao: Navegacao de periodo da Agenda — setas, rotulo e atalho "Hoje"
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

type AgendaPeriodHeaderProps = {
  label: string;
  canGoToToday: boolean;
  /** true quando um override de lista (Proximos/Historico) esta ativo: o periodo
   *  deixa de recortar a lista, entao navegar por ele enganaria o usuario. */
  navigationDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function AgendaPeriodHeader({
  label,
  canGoToToday,
  navigationDisabled,
  onPrevious,
  onNext,
  onToday,
}: AgendaPeriodHeaderProps) {
  const colors = useThemeColors();
  const arrowColor = navigationDisabled ? colors.iconMuted : colors.text;

  return (
    <View className="mb-3 flex-row items-center justify-between gap-2">
      <Pressable
        accessibilityLabel="Período anterior"
        accessibilityRole="button"
        accessibilityState={{ disabled: navigationDisabled }}
        disabled={navigationDisabled}
        hitSlop={12}
        onPress={onPrevious}
        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
      >
        <Ionicons color={arrowColor} name="chevron-back" size={24} />
      </Pressable>

      <View className="flex-1 items-center">
        <Text
          className="text-[18px] font-semibold text-app-text dark:text-app-dark-text"
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {canGoToToday && !navigationDisabled ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onToday}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text className="text-[15px] font-semibold text-app-secondary dark:text-app-dark-secondary">
            Hoje
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Próximo período"
        accessibilityRole="button"
        accessibilityState={{ disabled: navigationDisabled }}
        disabled={navigationDisabled}
        hitSlop={12}
        onPress={onNext}
        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
      >
        <Ionicons color={arrowColor} name="chevron-forward" size={24} />
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: Verificar tipagem**

Run: `npm run typecheck`
Expected: os mesmos erros pendentes da Task 8 (`AgendaScreen.tsx`, `appointments.tsx`), nenhum novo nestes dois arquivos.

- [ ] **Step 4: Verificar que nenhuma cor literal entrou**

Run: `grep -nE "#[0-9a-fA-F]{6}" src/components/AgendaScopeSelector.tsx src/components/AgendaPeriodHeader.tsx`
Expected: **nenhuma saída** (regra 7).

- [ ] **Step 5: Checkpoint**

Mensagem sugerida:

```
feat(agenda): seletor de escopo e cabecalho de periodo
```

---

### Task 7: `MonthCalendarGrid` e `YearMonthsGrid`

**Files:**
- Create: `src/components/MonthCalendarGrid.tsx`
- Create: `src/components/YearMonthsGrid.tsx`

**Interfaces:**
- Consumes: da Task 3 — os tipos `CalendarDateItem` (de `@/types/models`) e `AgendaMonthCell` (de `@/services/agendaDateRange`). Só os tipos: nenhum cálculo de data aqui.
- Produces:
  - `<MonthCalendarGrid weeks={(CalendarDateItem | null)[][]} selectedIsoDate={string} onSelectDate={(isoDate: string) => void} />`
  - `<YearMonthsGrid cells={AgendaMonthCell[]} onSelectMonth={(isoDate: string) => void} />`

- [ ] **Step 1: Criar o `MonthCalendarGrid`**

```tsx
// =============================================================================
// Arquivo: MonthCalendarGrid.tsx
// Descricao: Grade mensal da Agenda — apresentacao pura
// =============================================================================
//
// Recebe as semanas ja montadas por buildMonthCells(). Nao calcula data.
// Marcador de compromisso e ponto MAIS peso de fonte — nunca cor sozinha
// (regra do design system, DESIGN_TOKENS.md §4).
//
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import type { CalendarDateItem } from '@/types/models';

type MonthCalendarGridProps = {
  weeks: (CalendarDateItem | null)[][];
  selectedIsoDate: string;
  onSelectDate: (isoDate: string) => void;
};

const WEEKDAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Rotulo por extenso para leitor de tela: "15" sozinho nao diz nada.
const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function accessibilityLabelFor(cell: CalendarDateItem): string {
  const [year, month, day] = cell.isoDate.split('-').map(Number);
  const label = DATE_LABEL_FORMATTER.format(new Date(year, month - 1, day));
  return cell.hasAppointments ? `${label}, com compromissos` : label;
}

export function MonthCalendarGrid({ weeks, selectedIsoDate, onSelectDate }: MonthCalendarGridProps) {
  const colors = useThemeColors();

  return (
    <View className="mb-4">
      <View className="flex-row">
        {WEEKDAY_HEADERS.map((header, index) => (
          <View className="flex-1 items-center py-1" key={`header-${index}`}>
            <Text className="text-[12px] font-semibold text-app-textSecondary dark:text-app-dark-textSecondary">
              {header}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View className="flex-row" key={`week-${weekIndex}`}>
          {week.map((cell, dayIndex) => {
            if (!cell) {
              return <View className="flex-1" key={`empty-${weekIndex}-${dayIndex}`} style={{ height: 44 }} />;
            }

            const isSelected = cell.isoDate === selectedIsoDate;

            return (
              <Pressable
                accessibilityLabel={accessibilityLabelFor(cell)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className="flex-1 items-center justify-center"
                hitSlop={2}
                key={cell.isoDate}
                onPress={() => onSelectDate(cell.isoDate)}
                style={({ pressed }) => [{ height: 44 }, pressed && { opacity: 0.6 }]}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: cell.isToday && !isSelected ? 1 : 0,
                    borderColor: colors.secondary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      // Peso acompanha o ponto: o marcador nunca e so cor.
                      fontWeight: cell.hasAppointments ? '700' : '400',
                      color: isSelected ? colors.onPrimary : colors.text,
                    }}
                  >
                    {cell.day}
                  </Text>
                </View>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    marginTop: 1,
                    borderRadius: 2,
                    backgroundColor: cell.hasAppointments && !isSelected ? colors.primary : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Criar o `YearMonthsGrid`**

```tsx
// =============================================================================
// Arquivo: YearMonthsGrid.tsx
// Descricao: Visao anual da Agenda — 12 meses com contagem, apresentacao pura
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AgendaMonthCell } from '@/services/agendaDateRange';

type YearMonthsGridProps = {
  cells: AgendaMonthCell[];
  onSelectMonth: (isoDate: string) => void;
};

// Contagem como TEXTO, nao numero solto: leitor de tela precisa da unidade.
function countLabel(count: number): string {
  if (count === 0) return 'Sem compromissos';
  return count === 1 ? '1 compromisso' : `${count} compromissos`;
}

export function YearMonthsGrid({ cells, onSelectMonth }: YearMonthsGridProps) {
  return (
    <View className="mb-4 flex-row flex-wrap">
      {cells.map((cell) => (
        <View className="w-1/3 p-1" key={cell.isoDate}>
          <Pressable
            accessibilityLabel={`${cell.label}, ${countLabel(cell.count)}`}
            accessibilityRole="button"
            className="min-h-[64px] items-center justify-center rounded-app border border-app-border bg-app-surface p-2 dark:border-app-dark-border dark:bg-app-dark-surface"
            onPress={() => onSelectMonth(cell.isoDate)}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text
              className={`text-[15px] ${
                cell.count > 0 ? 'font-bold' : 'font-normal'
              } text-app-text dark:text-app-dark-text`}
            >
              {cell.label}
            </Text>
            <Text className="mt-1 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {countLabel(cell.count)}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 3: Verificar tipagem e ausência de cor literal**

Run: `npm run typecheck`
Expected: só os erros pendentes da Task 8.

Run: `grep -nE "#[0-9a-fA-F]{6}" src/components/MonthCalendarGrid.tsx src/components/YearMonthsGrid.tsx`
Expected: **nenhuma saída**.

- [ ] **Step 4: Checkpoint**

Mensagem sugerida:

```
feat(agenda): grade mensal e visao anual
```

---

### Task 8: `AgendaScreen` + rota — fecha o teste da Task 1

**Files:**
- Modify: `src/components/AppointmentCard.tsx`
- Modify: `src/screens/AgendaScreen.tsx`
- Modify: `src/app/(app)/appointments.tsx`
- Test: `__tests__/agendaCompromissoForaDaJanela.test.tsx` (só rodar; não editar)

**Interfaces:**
- Consumes: Task 2 (`isPast`, `isWithinRange`, `compareScheduled`, `parseScheduledAt`, `toIsoDate`), Task 3 (`buildDayCells`, `buildMonthCells`, `buildYearCells`), Task 4 (`useAgendaNavigation`, `AgendaNavigation`), Tasks 6–7 (os quatro componentes).
- Produces: `AgendaScreen` com as props

```ts
type AgendaScreenProps = {
  appointments: AppointmentEntry[];
  navigation: AgendaNavigation;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};
```

- [ ] **Step 1: Acrescentar `dateLabel` ao `AppointmentCard`**

Em `src/components/AppointmentCard.tsx`, adicione a prop à interface e ao destructuring:

```tsx
interface AppointmentCardProps {
  time: string;                           // Horário da consulta
  /** Data do compromisso ("01/10"). Ausente no escopo Dia, onde a data ja esta no
   *  rotulo do periodo (Canvas 2c). Presente quando a lista mistura dias. */
  dateLabel?: string;
  title: string;
  location: string;
  type: AppointmentType;
  onPress?: () => void;
  onSyncPress?: () => void;
}
```

E renderize `dateLabel` logo acima de `time`, na mesma coluna de horário:

```tsx
        {dateLabel ? (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>
            {dateLabel}
          </Text>
        ) : null}
```

- [ ] **Step 2: Reescrever a `AgendaScreen`**

Substitua o bloco de props e o corpo de `src/screens/AgendaScreen.tsx`. O handler `handleGoogleCalendarSync` e o modal "Em breve" já existentes ficam como estão — só a parte de recorte e renderização de período muda.

```tsx
type AgendaScreenProps = {
  appointments: AppointmentEntry[];
  navigation: AgendaNavigation;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

const EMPTY_TITLE_BY_SCOPE: Record<AgendaScope, string> = {
  dia: 'Nenhum compromisso neste dia',
  semana: 'Nenhum compromisso nesta semana',
  mes: 'Nenhum compromisso neste mês',
  ano: 'Nenhum compromisso neste ano',
};

// Datas invalidas vao SEMPRE para o fim, em qualquer direcao — sao registros
// corrompidos que precisam ser alcancaveis para poderem ser excluidos.
function sortEntries(entries: AppointmentEntry[], direction: 'asc' | 'desc'): AppointmentEntry[] {
  const valid = entries.filter((entry) => parseScheduledAt(entry.scheduledAt) !== null);
  const invalid = entries.filter((entry) => parseScheduledAt(entry.scheduledAt) === null);

  valid.sort((a, b) => {
    const result = compareScheduled(a.scheduledAt, b.scheduledAt);
    return direction === 'asc' ? result : -result;
  });

  return [...valid, ...invalid];
}

function formatDateLabel(scheduledAt: string): string {
  const date = parseScheduledAt(scheduledAt);
  if (!date) return 'Data inválida';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}
```

Dentro do componente, a regra de lista — os três ramos do `spec.md` §4.1, sem combinação cruzada:

```tsx
  const scheduledAtList = useMemo(
    () => appointments.map((appointment) => appointment.scheduledAt),
    [appointments],
  );

  const visibleAppointments = useMemo(() => {
    const now = new Date();

    if (navigation.listOverride === 'historico') {
      // `!== false` inclui os passados (true) E os de data invalida (null).
      return sortEntries(appointments.filter((a) => isPast(a.scheduledAt, now) !== false), 'desc');
    }

    if (navigation.listOverride === 'proximos') {
      return sortEntries(appointments.filter((a) => isPast(a.scheduledAt, now) === false), 'asc');
    }

    return sortEntries(appointments.filter((a) => isWithinRange(a.scheduledAt, navigation.range)), 'asc');
  }, [appointments, navigation.listOverride, navigation.range]);

  const selectedIsoDate = toIsoDate(navigation.anchorDate);
  const showCardDate = navigation.scope !== 'dia' || navigation.listOverride !== null;
```

E a árvore de renderização, entre o `ScreenHeader` e a lista:

```tsx
              <AgendaScopeSelector value={navigation.scope} onChange={navigation.setScope} />

              <AgendaPeriodHeader
                canGoToToday={navigation.canGoToToday}
                label={navigation.periodLabel}
                navigationDisabled={navigation.listOverride !== null}
                onNext={navigation.goNext}
                onPrevious={navigation.goPrevious}
                onToday={navigation.goToToday}
              />

              {navigation.scope === 'dia' ? (
                <CalendarPicker
                  dates={buildDayCells(navigation.anchorDate, scheduledAtList, navigation.today)}
                  onDateSelect={navigation.selectDate}
                  selectedDate={selectedIsoDate}
                />
              ) : null}

              {navigation.scope === 'semana' ? (
                <CalendarPicker
                  dates={buildWeekCells(navigation.anchorDate, scheduledAtList, navigation.today)}
                  onDateSelect={navigation.drillDown}
                  selectedDate={selectedIsoDate}
                />
              ) : null}

              {navigation.scope === 'mes' ? (
                <MonthCalendarGrid
                  onSelectDate={navigation.drillDown}
                  selectedIsoDate={selectedIsoDate}
                  weeks={buildMonthCells(navigation.anchorDate, scheduledAtList, navigation.today)}
                />
              ) : null}

              {navigation.scope === 'ano' ? (
                <YearMonthsGrid
                  cells={buildYearCells(navigation.anchorDate, scheduledAtList)}
                  onSelectMonth={navigation.drillDown}
                />
              ) : null}

              <View className="mb-3 flex-row gap-2">
                {(['proximos', 'historico'] as const).map((override) => {
                  const isActive = navigation.listOverride === override;
                  const label = override === 'proximos' ? 'Próximos' : 'Histórico';
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      className={`h-10 flex-row items-center justify-center gap-1 rounded-full border px-4 ${
                        isActive
                          ? 'border-app-secondary bg-app-secondarySoft dark:border-app-dark-secondary dark:bg-app-dark-secondarySoft'
                          : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface'
                      }`}
                      key={override}
                      onPress={() => navigation.setListOverride(isActive ? null : override)}
                      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                    >
                      <Text
                        className={`text-[14px] font-semibold ${
                          isActive
                            ? 'text-app-info dark:text-app-dark-info'
                            : 'text-app-textSecondary dark:text-app-dark-textSecondary'
                        }`}
                      >
                        {label}
                      </Text>
                      {isActive ? <Ionicons color={colors.info} name="close" size={14} /> : null}
                    </Pressable>
                  );
                })}
              </View>
```

A lista e o estado vazio:

```tsx
              {visibleAppointments.length > 0 ? (
                visibleAppointments.map((appointment) => (
                  <AppointmentCard
                    dateLabel={showCardDate ? formatDateLabel(appointment.scheduledAt) : undefined}
                    key={appointment.id}
                    location={appointment.location}
                    onPress={() =>
                      router.push(`/edit-appointment?id=${encodeURIComponent(String(appointment.id))}`)
                    }
                    onSyncPress={() => handleGoogleCalendarSync(appointment)}
                    time={appointment.time}
                    title={appointment.title}
                    type={appointment.type}
                  />
                ))
              ) : (
                <EmptyState
                  actionLabel="Agendar consulta"
                  description="Escolha outro período ou cadastre um novo atendimento."
                  icon="calendar-outline"
                  onActionPress={() => router.push('/add-appointment')}
                  title={
                    navigation.listOverride === 'historico'
                      ? 'Nenhum compromisso no histórico'
                      : navigation.listOverride === 'proximos'
                        ? 'Nenhum compromisso futuro'
                        : EMPTY_TITLE_BY_SCOPE[navigation.scope]
                  }
                />
              )}
```

Imports no topo do arquivo. A primeira linha **substitui** o `import React from 'react'` existente (não acrescente uma segunda importação de `react` — o ESLint reprova):

```tsx
import React, { useMemo } from 'react';

import { AgendaPeriodHeader } from '@/components/AgendaPeriodHeader';
import { AgendaScopeSelector } from '@/components/AgendaScopeSelector';
import { MonthCalendarGrid } from '@/components/MonthCalendarGrid';
import { YearMonthsGrid } from '@/components/YearMonthsGrid';
import type { AgendaNavigation } from '@/hooks/useAgendaNavigation';
import {
  buildDayCells,
  buildMonthCells,
  buildWeekCells,
  buildYearCells,
  compareScheduled,
  isPast,
  isWithinRange,
  parseScheduledAt,
  toIsoDate,
  type AgendaScope,
} from '@/services/agendaDateRange';
```

- [ ] **Step 3: Ligar a rota**

Em `src/app/(app)/appointments.tsx`, substitua o corpo do componente:

```tsx
export default function AppointmentsRoute() {
  const { appointments, isLoading, errorMessage, retry } = useAppointmentsData();
  const navigation = useAgendaNavigation();

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
      navigation={navigation}
      onRetry={retry}
    />
  );
}
```

Acrescente `import { useAgendaNavigation } from '@/hooks/useAgendaNavigation';`.

- [ ] **Step 4: Rodar o teste de regressão — o portão da entrega**

Run: `npx jest agendaCompromissoForaDaJanela`
Expected: **PASS**, os três casos. É o critério de aceite 1 e 2 do `spec.md` §7 saindo do vermelho.

Cole a saída no relatório de bloco, lado a lado com a falha registrada na Task 1.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx jest`
Expected: **PASS** em tudo, sem suíte pulada.

- [ ] **Step 6: Checkpoint**

Mensagem sugerida:

```
fix(agenda): compromissos fora dos proximos 7 dias voltam a ser alcancaveis e excluiveis
```

---

### Task 9: Validação final, verificação do contrato e documentação

**Files:**
- Modify: `specs/design/GAP_ANALYSIS.md`
- Modify: `specs/02-perfil-home-agenda/agenda-navegacao-temporal/tasks.md` (marcar o que foi entregue)

- [ ] **Step 1: Validação completa**

Run: `npm run validate`
Expected: **PASS** nos quatro estágios (typecheck, typecheck:backend, lint, test:ci). Cole a saída no relatório — nenhum item do `tasks.md` da spec pode ser marcado com base em leitura de código.

- [ ] **Step 2: Verificar o contrato de data por `grep`**

Run: `grep -rnE "new Date\((appointment|entry|record|item)?\.?scheduledAt|scheduledAt.*toISOString|toISOString.*scheduledAt" src/screens/AgendaScreen.tsx src/hooks/useAppointmentsData.ts src/hooks/useAgendaNavigation.ts src/components/CalendarPicker.tsx`
Expected: **nenhuma saída**. Qualquer ocorrência é uma violação do contrato de data (`spec.md` §6).

- [ ] **Step 3: Verificar o escopo do diff**

Run: `git diff --stat`
Expected: **nenhuma** aparição de `amplify/`, `package.json`, `src/app/(app)/dashboard.tsx`, `src/screens/HomeScreen.tsx`, `src/services/appointmentService.ts`.

- [ ] **Step 4: Teste manual — o cenário exato reportado**

Com Node 20 (`nvm use 20.20.1`) e o sandbox Amplify ativo, em `npx expo start`:

1. Criar um compromisso para uma data no passado.
2. Abrir a aba "Consultas" → tocar o chip **"Histórico"** → confirmar que ele aparece.
3. Tocá-lo → confirmar que abre a tela de edição.
4. **Excluí-lo** → confirmar que some da Agenda **e** da Home sem reiniciar o app.
5. Repetir com um compromisso a ~13 dias, achando-o pelo escopo **"Mês"**.

Sem este passo a EPIC não está entregue: os testes cobrem a lógica, não a integração real com o DynamoDB.

- [ ] **Step 5: Registrar a extensão do Canvas**

Em `specs/design/GAP_ANALYSIS.md`, na linha do Bloco 2 / 2c, acrescente:

```
2c Agenda — EXTENSAO DO CANVAS (regra 8 da constituicao): alem da faixa de 7 dias
desenhada no Canvas, a tela ganhou escopos Semana/Mes/Ano e os modos
Proximos/Historico. Justificativa: o recorte original de hoje..hoje+6 tornava
qualquer Appointment fora dessa janela permanentemente inalcancavel e
indeletavel pela interface (defeito reportado em 2026-09-18, com implicacao de
LGPD art. 18, VI). O escopo "Dia" e o padrao e preserva a tela do Canvas.
Spec: specs/02-perfil-home-agenda/agenda-navegacao-temporal/
```

- [ ] **Step 6: Marcar o `tasks.md` da spec**

Marque em `specs/02-perfil-home-agenda/agenda-navegacao-temporal/tasks.md` apenas os itens cujo comando foi efetivamente executado, com a evidência registrada. Itens sem comando rodado ficam desmarcados.

- [ ] **Step 7: Checkpoint final**

Mensagem sugerida:

```
docs(agenda): registra a extensao do Canvas 2c e o resultado da EPIC de navegacao temporal
```

---

## Notas de execução

**Ordem obrigatória.** As Tasks 2 → 3 → 4 → 5 formam uma cadeia de dependência de tipos; executá-las fora de ordem produz erros de compilação que parecem defeitos e não são. As Tasks 6 e 7 são independentes entre si e podem ser paralelizadas.

**O teste da Task 1 fica vermelho por sete tasks.** Isso é deliberado e está documentado aqui para que ninguém o "conserte" no meio do caminho com um `skip` ou uma asserção enfraquecida. Ele muda de sintoma duas vezes (módulo inexistente → elemento não encontrado → verde), e essas mudanças são o termômetro do progresso.

**Se alguma task exigir editar `dashboard.tsx` ou `HomeScreen.tsx`,** pare. O plano inteiro se apoia na premissa de que a Home consome apenas `appointments`/`isLoading`/`errorMessage`/`retry`. Se isso for falso, a Task 5 precisa ser replanejada antes de qualquer remoção — e os defeitos da própria Home pertencem à EPIC irmã `specs/02-perfil-home-agenda/home-compromissos/`, ainda não escrita.

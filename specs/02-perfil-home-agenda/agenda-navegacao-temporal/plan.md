# Plano técnico: Agenda — Navegação temporal e Histórico

## Diagnóstico — o que existe hoje vs. o que o defeito exige

A EPIC `agenda/` deixou a tela correta em relação ao Canvas 2c, mas manteve a premissa que causa o defeito: **o recorte temporal vive dentro do hook de dados e é sempre `hoje..hoje+6`**. `useAppointmentsData.ts` acumula hoje duas responsabilidades distintas — buscar/cachear/mapear `Appointment`, e decidir qual fatia do tempo a tela mostra. A segunda responsabilidade é a que está errada, e é a única que precisa ser reescrita.

Isso orienta todo o plano: **separar busca de navegação**, extrair a aritmética de data para um módulo puro, e só então construir as visualizações novas em cima dele.

## 1. `src/services/agendaDateRange.ts` — módulo puro (fundação)

Sem React, sem Amplify, sem `Intl` em posição que dificulte teste. É a fundação de tudo o mais e o primeiro arquivo a existir.

```ts
export type AgendaScope = 'dia' | 'semana' | 'mes' | 'ano';
export type DateRange = { start: Date; end: Date };   // [start, end], ambos inclusivos

export function parseScheduledAt(value: string): Date | null;
export function buildRange(scope: AgendaScope, anchor: Date): DateRange;
export function isWithinRange(scheduledAt: string, range: DateRange): boolean;
export function isPast(scheduledAt: string, now: Date): boolean;
export function compareScheduled(a: string, b: string): number;
export function shiftAnchor(scope: AgendaScope, anchor: Date, direction: -1 | 1): Date;
export function formatPeriodLabel(scope: AgendaScope, anchor: Date, today: Date): string;
export function toIsoDate(date: Date): string;         // AAAA-MM-DD
```

### 1.1 `parseScheduledAt` — a decisão central

`scheduledAt` é gravado como `"AAAA-MM-DDTHH:mm"` (hora local, sem offset, sem segundos). Pela especificação do ECMAScript, `Date` interpreta uma string **data-e-hora** sem offset como local, mas uma string **só de data** como UTC. Como o app tem hoje código que faz as duas coisas (e `EditAppointmentScreen` pode gravar `scheduledDate` sem hora se o formulário mudar), depender dessa distinção é frágil — ainda mais em Hermes, onde já houve divergências históricas de parsing.

**Decisão:** parse explícito por regex dos componentes, construindo `new Date(ano, mes-1, dia, hora, minuto)`. Sempre local, sempre igual em qualquer engine, sempre testável. Retorna `null` para entrada malformada (registro legado corrompido não derruba a tela — cai no estado vazio do período).

### 1.2 Limites de período

| Escopo | `start` | `end` |
|---|---|---|
| `dia` | âncora 00:00:00.000 | âncora 23:59:59.999 |
| `semana` | domingo da semana da âncora, 00:00 | sábado, 23:59:59.999 |
| `mes` | dia 1 do mês, 00:00 | último dia do mês, 23:59:59.999 |
| `ano` | 1º de janeiro, 00:00 | 31 de dezembro, 23:59:59.999 |

**Decisão — semana começa no domingo.** O `DateInput.tsx` já monta sua grade mensal com `getDay()` cru (0 = domingo) na primeira coluna. Manter domingo evita duas convenções de semana convivendo no mesmo app. Registrado aqui porque é uma escolha arbitrária que alguém vai questionar depois.

**Aritmética de virada.** Usar sempre o construtor `new Date(y, m, d)` com valores fora de faixa (ex.: `new Date(2026, 11, 32)`), que normaliza sozinho para 01/01/2027. Nunca somar milissegundos: `+ 7 * 86400000` quebra nas transições de horário de verão. O Brasil não tem horário de verão hoje, mas o app não deve depender disso.

### 1.3 `isPast`

`isPast(scheduledAt, now)` compara `parseScheduledAt(scheduledAt)` (local) com `now` (local). Nunca `toISOString()`. Este é o conserto do defeito de fuso descrito no `spec.md` §2.2, e o módulo que a EPIC `home-compromissos/` vai reutilizar em vez de reescrever a comparação uma terceira vez.

### 1.4 Construtores de células

`buildDayCells(anchor, appointments, today)` → 7 `CalendarDateItem` (faixa do escopo Dia, ancorada, não mais fixa em hoje).
`buildMonthCells(anchor, appointments, today)` → semanas de 7 posições, com `null` nos preenchimentos antes do dia 1 e depois do último dia.
`buildYearCells(anchor, appointments)` → 12 entradas `{ month, label, count }`.

Todos recebem a lista de compromissos e devolvem estrutura pronta — a tela não faz aritmética de data em lugar nenhum.

## 2. `src/hooks/useAgendaNavigation.ts` — estado de navegação

```ts
const { scope, anchorDate, listOverride, range, periodLabel, canGoToToday,
        setScope, goPrevious, goNext, goToToday, selectDate, drillDown,
        setListOverride } = useAgendaNavigation();
```

- `anchorDate` inicializa com a data atual, capturada **uma vez** na montagem (`useState(() => new Date())`), pelo mesmo motivo já documentado em `useAppointmentsData` hoje: evitar que a tela "escorregue" perto da meia-noite enquanto está aberta.
- `setScope` preserva a âncora e limpa `listOverride`. Trocar de Mês para Dia mantém você no período que estava olhando — não teleporta para hoje.
- `drillDown(date)` define `anchorDate = date` e desce um nível (`ano → mes`, `mes → dia`, `semana → dia`). Em `dia` é equivalente a `selectDate`.
- `selectDate(isoDate)` no escopo Dia move a âncora dentro da faixa, sem mudar de escopo.
- `canGoToToday` é `false` quando `isWithinRange(hoje, range)` — governa a visibilidade do botão "Hoje".

O hook não conhece Amplify, não busca nada, e é testável com `renderHook` sem mock de rede.

## 3. `src/hooks/useAppointmentsData.ts` — enxugar

Remover `dates`, `selectedDate`, `setSelectedDate`, `selectedDayLabel`, `appointmentsForSelectedDate`, `buildDateWindow`, `buildCalendarDates`, `formatSelectedDayLabel`, `isSameCalendarDay`. O que sobra: `appointments`, `isLoading`, `errorMessage`, `retry` — exatamente o que `dashboard.tsx` já consome, então a Home **não muda nesta EPIC**.

`mapAppointmentToEntry` fica, mas passa a derivar `time` via `parseScheduledAt` em vez de `split('T')`, para haver um único caminho de leitura de `scheduledAt` no app.

## 4. Composição na tela

`AgendaScreen` passa a receber os dois hooks pela rota (`appointments.tsx`), mantendo a tela como componente de apresentação — padrão já estabelecido no projeto.

A lista exibida é derivada em um `useMemo` com uma regra única:

```
listOverride === 'historico' → todos com isPast === true,  ordem decrescente
listOverride === 'proximos'  → todos com isPast === false, ordem crescente
listOverride === null        → isWithinRange(scheduledAt, range), ordem crescente
```

Uma única expressão, três ramos, sem combinação cruzada — é o que a regra §4.1 do `spec.md` compra em simplicidade.

**Exibição da data no card.** No escopo Dia sem override, o card mantém só `HH:mm` (fidelidade ao Canvas 2c, que põe a data no rótulo do período). Nos demais casos a lista mistura dias, então o card precisa da data. **Decisão:** não alterar `AppointmentEntry.time` (contrato compartilhado com a Home); passar uma prop nova e opcional `dateLabel?: string` ao `AppointmentCard`, derivada na tela. Assim o Canvas 2c continua literalmente satisfeito no caminho padrão e nada na Home é afetado.

## 5. Componentes novos — o que não fazer

Os quatro componentes novos são de apresentação pura: recebem dados já derivados e emitem callbacks. Nenhum deles importa `agendaDateRange` nem calcula data.

- `AgendaScopeSelector` — reaproveita o padrão de chips de `DESIGN_TOKENS.md` §4 (selecionado: fundo `primarySoft`, borda `primary`, texto `primaryDark`). Quatro posições cabem em 390px de largura com rótulos curtos ("Dia", "Semana", "Mês", "Ano").
- `AgendaPeriodHeader` — setas com `hitSlop` para chegar a 48dp; estado desabilitado com opacidade e `accessibilityState={{ disabled: true }}`, não apenas visual.
- `MonthCalendarGrid` — 7 colunas; célula mínima 44×44 + `hitSlop`; marcador de compromisso é um ponto **mais** o dia em peso 600 (nunca cor sozinha — regra do design system, já reforçada na EPIC `agenda/`).
- `YearMonthsGrid` — grade 3×4; contagem como texto ("3 compromissos"), não só um número solto, para o leitor de tela.

**Nenhuma biblioteca de calendário** (regra 3 da constituição). `react-native-calendars` resolveria o item Mês, mas traz tema próprio conflitante com os tokens, peso de bundle e uma dependência a justificar no TCC — enquanto a grade mensal é ~40 linhas de aritmética que o `DateInput.tsx` já demonstra funcionar neste app.

## 6. Ordem de implementação (TDD, falha confirmada antes de cada verde)

Cada item começa por um teste que **falha por ausência da funcionalidade, não por erro de compilação ou import quebrado** — a falha é lida e confirmada antes de escrever a implementação.

1. **Teste de regressão do defeito** (`__tests__/agenda-compromisso-fora-da-janela.test.tsx`): renderiza a Agenda com um compromisso a 13 dias e um no passado; espera que ambos sejam alcançáveis e que o toque navegue para `/edit-appointment?id=`. **Falha hoje** — é a prova executável do bug reportado. Fica vermelho até o item 5.
2. `agendaDateRange.ts` — testes puros primeiro: parse, os 4 ranges, viradas de mês/ano, 29/02/2028, `isPast` em UTC−3, `shiftAnchor`.
3. `useAgendaNavigation.ts` — `renderHook`: troca de escopo preservando âncora, `goPrevious`/`goNext`, `drillDown` nos dois sentidos, `canGoToToday`, `setScope` limpando o override.
4. Enxugar `useAppointmentsData` + ajustar `appointments.tsx`. A Home deve continuar passando sem edição — se quebrar, o contrato foi violado e o passo volta atrás.
5. `AgendaScreen` + os 4 componentes novos. O teste do item 1 fecha aqui.
6. Acessibilidade e copy por escopo dos estados vazios.
7. `npm run validate`.

## 7. Riscos e como cada um é contido

| Risco | Contenção |
|---|---|
| Regressão visual do Canvas 2c | Escopo "Dia" é o padrão e preserva a faixa de 7 dias; teste assertando que a tela abre em "Dia" ancorada em hoje |
| `CalendarPicker` muda de contrato (`number` → `string`) | Consumidor único verificado por `grep`; o typecheck pega qualquer uso esquecido |
| A Home depender de algo que o enxugamento remove | `dashboard.tsx` consome apenas `appointments`/`isLoading`/`errorMessage`/`retry`, todos preservados; `npm run typecheck` é a rede |
| Escopo "Ano" pesado com muitos registros | Agregação é O(n) sobre a lista em memória, memoizada por âncora; nenhuma consulta nova ao backend |
| Registro legado com `scheduledAt` malformado | `parseScheduledAt` devolve `null`, então o item não cai em nenhum período nem é classificável por `isPast` — ficaria órfão pelo mesmo motivo que esta EPIC existe para eliminar. **Decisão:** itens com data inválida são anexados sempre ao final da lista do modo "Histórico", com o rótulo "Data inválida" e tocáveis, para poderem ser corrigidos ou excluídos |

## 8. Fora de escopo (registrado para não virar escopo por acidente)

- Todos os defeitos da Home → EPIC `specs/02-perfil-home-agenda/home-compromissos/`.
- Escopo do cache de agenda por usuário e TTL → mesma EPIC irmã (o cache é compartilhado; mexer nele aqui misturaria dois defeitos independentes na mesma entrega).
- Sincronização real com Google Agenda → pendência já registrada em `GAP_ANALYSIS.md` pela EPIC `agenda/`.
- Busca textual por nome de compromisso → não pedida; "Histórico" já resolve o caso de uso relatado.

# EPIC: Agenda — Navegação temporal (Dia/Semana/Mês/Ano) e Histórico (Bloco 2)

> **Origem:** defeito reportado em teste manual (`npx expo start`, 2026-09-18). Não é uma tela nova do Canvas — é a correção de um defeito de acessibilidade de dados reais na tela **2c**, cuja solução exige estender a navegação temporal da Agenda. Ler §2.1 (o defeito) antes de §3.

## 1. Identificação

- **Bloco/arquivo de origem no Claude Design:** tela **2c** ("Agenda — calendário, lista do dia e novo agendamento") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 796–840). Esta EPIC **estende** o Canvas 2c — ver §6, "Extensão documentada do Canvas" (regra 8 da constituição).
- **EPIC antecessora:** `specs/02-perfil-home-agenda/agenda/` (implementou o seletor de 7 dias, o rótulo do dia e a paleta por tipo). Esta EPIC não desfaz nada daquela: o escopo "Dia" preserva integralmente o resultado dela.
- **Rotas/arquivos no código (existentes):**
  - `src/app/(app)/appointments.tsx` (rota `/appointments`, aba "Consultas") → `src/screens/AgendaScreen.tsx`
  - `src/hooks/useAppointmentsData.ts` (busca + cache + recorte de 7 dias — o recorte sai daqui)
  - `src/components/CalendarPicker.tsx` (consumidor único: `AgendaScreen`)
  - `src/screens/EditAppointmentScreen.tsx` via `/edit-appointment?id=` (**único** lugar do app com exclusão de agendamento)
- **Ator:** usuário final (paciente), consultando, corrigindo e excluindo os próprios compromissos de saúde em qualquer data — passada ou futura.
- **Prioridade: P0 (defeito).** Bloqueia uma operação legítima do usuário sobre os próprios dados (excluir um agendamento), com implicação de LGPD — ver §6.

## 2. História da funcionalidade

Como usuário final, quero navegar minha agenda por ano, mês, semana e dia, e consultar o histórico do que já passou, para encontrar, corrigir e excluir **qualquer** compromisso que eu tenha criado — não apenas os dos próximos 7 dias.

### 2.1 O defeito (causa raiz confirmada no código)

`useAppointmentsData.ts` constrói uma **janela rolante fixa de 7 dias** ancorada em `new Date()`:

```ts
function buildDateWindow(now: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + index));
}
```

Dessa janela decorre toda a cadeia de acesso:

1. `dates` (as células do `CalendarPicker`) só contém esses 7 dias → **nenhuma outra data é selecionável**.
2. `appointmentsForSelectedDate` filtra por `selectedWindowDate`, que sempre cai dentro da janela → **compromissos fora dela nunca são renderizados**.
3. O card da lista é o único elemento que navega para `/edit-appointment?id=`, e `EditAppointmentScreen` é a **única** tela com botão de excluir.

**Consequência:** todo `Appointment` com `scheduledAt` anterior a hoje, ou posterior a hoje + 6 dias, existe no DynamoDB, é contabilizado pela Home, mas **não pode ser aberto, editado nem excluído por nenhum caminho da interface**. O registro fica órfão de forma permanente.

**Reprodução confirmada com o usuário (2026-09-18):** compromisso criado para **01/10 às 09:00** (13 dias à frente). Aparece em "Próximos compromissos" na Home; o toque no card leva para `/appointments`; a Agenda oferece apenas 18/09–24/09; 01/10 não existe em lugar nenhum da tela. Mesmo mecanismo, espelhado, para qualquer data passada.

**Escopo negativo (fora desta EPIC):** os defeitos da **Home** (card que navega para a Agenda genérica em vez do agendamento clicado; comparação `scheduledAt >= new Date().toISOString()` misturando hora local ingênua com UTC; "Resumo de hoje" contando horários já vencidos; cache de agenda sem escopo de usuário nem TTL) são tratados na EPIC irmã `specs/02-perfil-home-agenda/home-compromissos/`, que **depende** desta (reutiliza `agendaDateRange.ts` e o deep-link validado aqui).

### 2.2 Cenários (Given/When/Then)

- **Resgate de compromisso futuro fora da janela (o defeito):**
  Given existe um `Appointment` com `scheduledAt` 13 dias à frente de hoje
  When o usuário abre `/appointments` e navega até o mês correspondente (escopo "Mês") **ou** aciona o chip "Próximos"
  Then o compromisso é renderizado na lista, e tocá-lo navega para `/edit-appointment?id=<id>`, de onde pode ser editado ou excluído.

- **Resgate de compromisso passado (o defeito, espelhado):**
  Given existe um `Appointment` com `scheduledAt` anterior a hoje
  When o usuário aciona o chip "Histórico"
  Then todos os compromissos passados são listados do mais recente para o mais antigo, e tocar qualquer um navega para `/edit-appointment?id=<id>`.

- **Escopo Dia (comportamento preservado do Canvas 2c):**
  Given o usuário abre `/appointments` sem interagir com nada
  When a tela carrega
  Then o escopo padrão é "Dia", a faixa de 7 dias está ancorada em hoje, o dia de hoje está selecionado, e a tela é **visualmente equivalente** à entregue pela EPIC `agenda/` — nenhuma regressão de fidelidade.

- **Escopo Semana:**
  Given o usuário seleciona "Semana"
  When a tela recorta o período
  Then são listados os compromissos dos 7 dias da semana da âncora (domingo a sábado), agrupados por dia, em ordem cronológica; as setas `‹ ›` deslocam a âncora em uma semana.

- **Escopo Mês:**
  Given o usuário seleciona "Mês"
  When a tela recorta o período
  Then é exibida uma grade de calendário do mês da âncora, com marcador nos dias que têm compromisso, e a lista mostra todos os compromissos do mês; tocar um dia da grade faz *drill-down* para o escopo "Dia" naquela data.

- **Escopo Ano:**
  Given o usuário seleciona "Ano"
  When a tela recorta o período
  Then são exibidos 12 blocos de mês com a contagem de compromissos de cada um, e tocar um bloco faz *drill-down* para o escopo "Mês" naquele mês.

- **Voltar para hoje:**
  Given a âncora foi deslocada para um período que não contém a data de hoje
  When o botão "Hoje" (visível apenas nessa condição) é acionado
  Then a âncora volta para a data atual, preservando o escopo selecionado.

- **Período vazio:**
  Given o período recortado pelo escopo atual não contém nenhum `Appointment`
  When a lista é resolvida vazia
  Then é exibido o `EmptyState` do Canvas 2c (ícone-tile, mensagem, CTA "Agendar consulta" → `/add-appointment`), com a mensagem adaptada ao escopo ("Nenhum compromisso neste dia / nesta semana / neste mês / neste ano").

- **Carregando e erro (preservados):**
  Given a busca a `client.models.Appointment.list()` está em andamento ou falhou
  Then valem exatamente os estados já implementados (`ScreenSkeleton` / `EmptyState tone="error"` + "Tentar novamente"), sem alteração — `DESIGN_TOKENS.md` §4.

- **Fuso horário — compromisso de hoje ainda por vir:**
  Given o usuário está em UTC−3 (BRT), são 14:00 locais, e existe um `Appointment` para hoje às 15:00 (`scheduledAt = "AAAA-MM-DDT15:00"`, sem offset)
  When a tela classifica esse compromisso entre "Próximos" e "Histórico"
  Then ele é classificado como **próximo**, nunca como passado — a comparação é feita em horário local explícito, jamais contra `new Date().toISOString()` (UTC).

## 3. Estrutura da página

Ordem visual, de cima para baixo. Itens marcados **(novo)** são a extensão desta EPIC; os demais são preservados da EPIC `agenda/`.

1. Cabeçalho `ScreenHeader`: título "Agenda", subtítulo "Seus compromissos de saúde", ação "+" → `/add-appointment`. **Preservado.**
2. Linha "Sincronizar com Google Agenda" (estado "Em breve", `googleCalendarSync.ts`). **Preservado.**
3. **(novo)** `AgendaScopeSelector` — segmented control de 4 posições: `Dia · Semana · Mês · Ano`. Padrão: "Dia".
4. **(novo)** `AgendaPeriodHeader` — `‹` + rótulo do período + `›`, mais o botão "Hoje", visível somente quando a âncora sai do período corrente.
5. Visualização do período, conforme o escopo:
   - **Dia** — `CalendarPicker` (faixa de 7 dias), agora ancorada em `anchorDate`. **Preservado**, com contrato de seleção alterado (§5.1).
   - **Semana (novo)** — o mesmo `CalendarPicker`, alimentado com os 7 dias **domingo–sábado** da âncora (não com o bloco alinhado a hoje do escopo Dia, para que as células marcadas e a lista abaixo recortem exatamente os mesmos dias); tocar uma célula faz *drill-down* para "Dia". **Decisão:** reaproveitar o componente existente em vez de criar linhas de dia com contagem numérica — mesma informação de "tem compromisso", zero componente novo, e a lista completa da semana já aparece logo abaixo. A contagem exata por dia é perdida; se vier a ser exigida, vira um componente próprio, fora desta EPIC.
   - **Mês (novo)** — `MonthCalendarGrid`: grade de 7 colunas, marcador nos dias com compromisso, dia de hoje destacado.
   - **Ano (novo)** — `YearMonthsGrid`: 12 blocos de mês com contagem.
6. Rótulo do período selecionado (600 18px) — generalização do `agSelectedLabel` do Canvas para os 4 escopos.
7. **(novo)** Chips `Próximos | Histórico` — sobrepõem o recorte do escopo (§4.1).
8. Lista de `AppointmentCard`, cada um navegando para `/edit-appointment?id=`. **Preservado.** Nos escopos Semana/Mês/Ano e nos modos Próximos/Histórico, o card exibe também a data (não só a hora), porque a lista deixa de ser de um único dia.
9. `EmptyState` do período, com CTA "Agendar consulta". **Preservado**, com copy por escopo.
10. Bottom navigation bar. **Preservado.**

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| `AgendaScopeSelector` — Dia/Semana/Mês/Ano | Segmented control | `setScope(scope)` | Permanece na tela | Sempre visível. Trocar de escopo **preserva a âncora** e limpa `listOverride` |
| Seta `‹` / `›` | Botão | `goPrevious()` / `goNext()` — desloca a âncora em 1 unidade do escopo | Permanece na tela | Desabilitadas quando `listOverride` está ativo (§4.1) |
| Botão "Hoje" | Botão de texto | `goToToday()` | Permanece na tela | Visível apenas quando o período da âncora não contém a data atual |
| Célula de dia (escopo Dia — `CalendarPicker`) | Botão de seleção | `selectDate(isoDate)` | Permanece na tela, filtra a lista | Sempre visível, 7 células |
| Linha de dia (escopo Semana) | Item de lista | `drillDown(date)` → escopo "Dia" | Permanece na tela | Sempre visível, 7 linhas |
| Dia da grade (escopo Mês) | Célula de calendário | `drillDown(date)` → escopo "Dia" | Permanece na tela | Todos os dias do mês são tocáveis, inclusive os vazios |
| Bloco de mês (escopo Ano) | Célula | `drillDown(primeiroDiaDoMes)` → escopo "Mês" | Permanece na tela | 12 blocos, inclusive os vazios |
| Chip "Próximos" | Chip de filtro | `setListOverride('proximos')` | Permanece na tela | Sempre visível; ativo mostra "×" para limpar |
| Chip "Histórico" | Chip de filtro | `setListOverride('historico')` | Permanece na tela | Sempre visível; ativo mostra "×" para limpar |
| **Card de compromisso** | Item de lista | `router.push('/edit-appointment?id=')` | `EditAppointmentScreen` (editar **e excluir**) | **Caminho crítico desta EPIC** — deve funcionar em todos os escopos e nos dois modos de override |
| Botão "Agendar consulta" (estado vazio) | Botão primário | `router.push('/add-appointment')` | Tela 2d | Visível quando o período não tem compromissos |
| Ação "+" do cabeçalho | Botão | `router.push('/add-appointment')` | Tela 2d | Sempre visível |
| Linha "Sincronizar com Google Agenda" | Linha de ação | Modal "Em breve" | Permanece na tela | Sempre visível (pendência já documentada na EPIC `agenda/`) |

### 4.1 Regra de convivência entre escopo e Próximos/Histórico

Os chips **sobrepõem** o recorte do escopo em vez de se combinarem com ele. Combinar produziria estados sem significado ("histórico da próxima semana", sempre vazio) e multiplicaria os casos de teste sem ganho para o usuário.

Com `listOverride` ativo:

- a lista ignora `range` e passa a considerar **todos** os compromissos do usuário, filtrados por `isPast`;
- `proximos` → futuros, do mais próximo ao mais distante; `historico` → passados, do mais recente ao mais antigo;
- o rótulo do período vira "Todos os compromissos futuros" / "Histórico completo";
- as setas `‹ ›` e o botão "Hoje" ficam desabilitados;
- a visualização de período do escopo (faixa/grade) continua renderizada e continua respondendo ao toque — tocar qualquer data **limpa o override** e volta ao recorte por período.

**"Histórico" é a rede de segurança desta EPIC.** Ele resgata qualquer agendamento órfão sem exigir que o usuário lembre a data, e é o único caminho cuja correção não depende de nenhuma navegação de calendário estar certa.

## 5. Mapa de dados

Fonte real única, inalterada: tabela DynamoDB `Appointment` (`amplify/data/schemas/appointments.ts`), lida por `client.models.Appointment.list()` em `src/services/appointmentService.ts`. **Nenhuma mudança de schema** (regra 5 da constituição). Nenhum dado mockado é introduzido (regra 2).

| Campo/elemento | Origem | Fonte técnica real | Observação |
|---|---|---|---|
| Lista de compromissos (todos os escopos) | Real | `Appointment.list()` via `useAppointmentsData` | Já real hoje. Muda apenas o recorte aplicado sobre ela |
| `scheduledAt` | Real | `Appointment.scheduledAt` | **Formato confirmado: `"AAAA-MM-DDTHH:mm"` — hora local ingênua, sem offset nem segundos** (gravado por `AddAppointmentScreen`/`EditAppointmentScreen` como a concatenação de data e hora do formulário). Ver §6, "Contrato de data" |
| Marcador "tem compromisso" (faixa de 7 dias e grade do mês) | Real (derivado) | Comparação de `scheduledAt` com cada dia do período | Generalização do `hasAppointments` atual |
| Contagem por dia (Semana) e por mês (Ano) | Real (derivado) | Agregação de `scheduledAt` sobre o período | Novo; puramente derivado, sem campo novo no schema |
| Rótulo do período | Real (derivado) | `formatPeriodLabel(scope, anchorDate)` | Generaliza o `selectedDayLabel` atual |
| Classificação Próximo/Passado | Real (derivado) | `isPast(scheduledAt, now)` em horário local explícito | Novo; ver cenário de fuso em §2.2 |
| `appointmentType`, `appointmentName`, `address` | Real | Campos homônimos do model | Inalterados; paleta por tipo preservada da EPIC `agenda/` |

### 5.1 Contratos de código que mudam

| Artefato | Antes | Depois | Motivo |
|---|---|---|---|
| `CalendarPicker` — `selectedDate` / `onDateSelect` | `number` (dia do mês) | `string` (`AAAA-MM-DD`) | Dia-do-mês é ambíguo assim que a navegação atravessa meses. Consumidor único verificado: `AgendaScreen.tsx` |
| `CalendarDateItem` (`src/types/models.ts`) | `{ day, month, hasAppointments? }` | `{ isoDate, day, month, hasAppointments?, isToday? }` | `isoDate` passa a ser a identidade da célula; `isToday` permite destacar hoje quando a âncora está em outro período |
| `useAppointmentsData` | Dono do recorte (`dates`, `selectedDate`, `appointmentsForSelectedDate`, `selectedDayLabel`) | Responsável **apenas** por buscar/cachear/mapear: `appointments`, `isLoading`, `errorMessage`, `retry` | Separa busca de navegação. `dashboard.tsx` já consome apenas `appointments`, `isLoading`, `errorMessage` e `retry` — **não é afetado** |
| `AppointmentEntry.time` | `HH:mm` | `HH:mm` (inalterado) | A data, quando necessária fora do escopo Dia, é derivada de `scheduledAt` na tela — não se altera o contrato compartilhado com a Home |

### 5.2 Artefatos novos

| Arquivo | Responsabilidade | Depende de |
|---|---|---|
| `src/services/agendaDateRange.ts` | Módulo **puro**: `parseScheduledAt`, `buildRange`, `shiftAnchor`, `isWithinRange`, `isDateWithinRange`, `isPast`, `compareScheduled`, `formatPeriodLabel`, `toIsoDate`, `buildDayCells`, `buildWeekCells`, `buildMonthCells`, `buildYearCells` | Nada (sem React, sem Amplify) |
| `src/hooks/useAgendaNavigation.ts` | Estado de navegação: `scope`, `anchorDate`, `listOverride` + ações | `agendaDateRange.ts` |
| `src/components/AgendaScopeSelector.tsx` | Segmented control de 4 posições | tokens de tema |
| `src/components/AgendaPeriodHeader.tsx` | `‹` rótulo `›` + botão "Hoje" | tokens de tema |
| `src/components/MonthCalendarGrid.tsx` | Grade mensal com marcadores | tokens de tema |
| `src/components/YearMonthsGrid.tsx` | 12 blocos de mês com contagem | tokens de tema |

## 6. Requisitos não-funcionais específicos

- **Contrato de data (requisito central).** `scheduledAt` é hora local ingênua sem offset. Nenhum código de agenda pode compará-lo com `new Date().toISOString()`, nem construir `Date` a partir dele fora de `parseScheduledAt`, que lê ano/mês/dia/hora/minuto explicitamente. Motivo: pela especificação do ECMAScript, uma string de data-e-hora sem offset é interpretada como **local**, enquanto uma string apenas de data é interpretada como **UTC** — uma inconsistência sutil que já produziu o defeito de filtro da Home e que não deve sobreviver a esta EPIC em nenhum arquivo de agenda.
- **Extensão documentada do Canvas (regra 8 da constituição).** O Canvas 2c desenha apenas a faixa de 7 dias. Os escopos Semana/Mês/Ano e os chips Próximos/Histórico **não existem** no Canvas e são adicionados aqui deliberadamente, com esta justificativa registrada: o desenho original torna dados reais do usuário permanentemente inacessíveis e indeletáveis (§2.1) — isso é um defeito do recorte, não uma escolha de design a ser preservada. Mitigação de fidelidade (regra 1): o escopo **"Dia" é o padrão** e é visualmente equivalente ao Canvas 2c; um usuário que não tocar no seletor vê exatamente a tela especificada pelo design. Os componentes novos reutilizam integralmente os tokens de `DESIGN_TOKENS.md` (segmented control e chips seguem o padrão selecionado/não-selecionado já definido em §4 daquele documento) — **nenhuma cor nova** é introduzida (regra 7).
- **Nada quebra (regra 5).** Sem migração de schema, sem alteração de `appointmentService.ts`, sem alteração do contrato consumido por `dashboard.tsx`. Registros já persistidos permanecem válidos e passam a ser, enfim, alcançáveis.
- **Stack existente (regra 3).** Nenhuma biblioteca nova. Sem `date-fns`, `dayjs` ou `react-native-calendars`: as operações necessárias (início/fim de dia, semana, mês e ano; deslocamento de âncora; grade mensal) são aritmética de `Date` nativa, já praticada no repositório (`DateInput.tsx` monta uma grade mensal própria hoje), e um módulo puro pequeno é mais fácil de testar e de justificar no TCC do que uma dependência a mais.
- **Acessibilidade.** Toda célula tocável com alvo mínimo de 48dp (as células da grade mensal são o caso apertado: mínimo 44×44 com `hitSlop` complementando até 48). `accessibilityRole="button"` e `accessibilityLabel` com a data por extenso em todas as células de calendário — um número solto ("15") não é rótulo suficiente para leitor de tela. `accessibilityState={{ selected }}` no segmented control e nos chips.
- **Desempenho.** Todo o recorte é derivado com `useMemo` sobre a lista já em memória; nenhuma consulta nova ao backend é introduzida por navegação de período. O escopo "Ano" agrega, no pior caso, a lista completa do usuário, uma vez por mudança de âncora.
- **LGPD.** Esta EPIC restaura o controle do titular sobre os próprios dados sensíveis de saúde: hoje um agendamento passado não pode ser excluído por nenhum caminho da interface, o que é incompatível com o direito de eliminação (LGPD, art. 18, VI). O critério de aceite "todo `Appointment` é alcançável e excluível" é, portanto, um requisito de conformidade, não apenas de usabilidade.
- **Sem dado inventado (regra 2).** Contagens e marcadores derivam exclusivamente de registros reais. Um período sem dados mostra o estado vazio — nunca um zero-como-placeholder que sugira dado carregado.

## 7. Critérios de aceite

- [ ] Um `Appointment` com `scheduledAt` 13 dias à frente de hoje é alcançável pela Agenda e seu toque navega para `/edit-appointment?id=<id>`. *(teste de regressão do defeito reportado)*
- [ ] Um `Appointment` com `scheduledAt` no passado é alcançável pelo chip "Histórico" e pode ser excluído por `EditAppointmentScreen`.
- [ ] Após a exclusão, o registro desaparece da Agenda e da Home sem exigir reinício do app (cache invalidado pelo caminho já existente em `appointmentService.deleteAppointment`).
- [ ] Sem nenhuma interação, a tela abre no escopo "Dia", ancorada em hoje, visualmente equivalente à entrega da EPIC `agenda/` — nenhuma regressão de fidelidade ao Canvas 2c.
- [ ] Os 4 escopos recortam o período corretamente, incluindo viradas de mês, viradas de ano e fevereiro em ano bissexto.
- [ ] O *drill-down* funciona nos dois sentidos previstos: Ano → Mês e Mês/Semana → Dia.
- [ ] O botão "Hoje" aparece somente quando a âncora sai do período corrente e restaura a âncora preservando o escopo.
- [ ] Com `listOverride` ativo, as setas `‹ ›` ficam desabilitadas, o rótulo do período muda, e tocar uma data limpa o override.
- [ ] Um compromisso de hoje às 15:00, avaliado às 14:00 em UTC−3, é classificado como "próximo" — não como histórico. *(teste do contrato de data)*
- [ ] Nenhuma ocorrência de construção de `Date` a partir de `scheduledAt` fora de `parseScheduledAt`, e nenhuma comparação de `scheduledAt` com `toISOString()`, permanece nos arquivos de agenda. *(verificável por `grep`)*
- [ ] `agendaDateRange.ts` é puro e testado sem renderizar componente algum.
- [ ] Estados de carregando e erro preservados (`ScreenSkeleton`, `EmptyState tone="error"` + "Tentar novamente").
- [ ] Estado vazio com CTA "Agendar consulta" em todos os 4 escopos, com copy adaptada ao período.
- [ ] Nenhuma biblioteca nova em `package.json`; nenhuma cor fora de `DESIGN_TOKENS.md`; nenhuma alteração em `amplify/data/schemas/appointments.ts`.
- [ ] `npm run validate` passa (typecheck + typecheck:backend + lint + test:ci).

# EPIC: Home — Compromissos coerentes e clicáveis (Bloco 2)

> **Origem:** defeitos encontrados durante a investigação da EPIC `agenda-navegacao-temporal/` (2026-09-18) e registrados no §2.1 daquela spec como escopo negativo. Não é uma tela nova do Canvas — é a correção dos defeitos da tela **2b** que sobreviveram por serem, cada um, pequenos demais para virar EPIC sozinho, e grandes demais para entrar de carona na EPIC da Agenda.

## 1. Identificação

- **Bloco/arquivo de origem no Claude Design:** tela **2b** ("Home") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html`. Esta EPIC **não estende** o Canvas: tudo aqui é correção de comportamento dentro da estrutura já desenhada.
- **EPIC irmã (pré-requisito, concluída):** `specs/02-perfil-home-agenda/agenda-navegacao-temporal/`. Ela entregou `src/services/agendaDateRange.ts`, o módulo puro que esta EPIC reutiliza em vez de reescrever a leitura de data pela terceira vez.
- **Rotas/arquivos no código (existentes):**
  - `src/app/(app)/dashboard.tsx` (rota `/dashboard`) → `src/screens/HomeScreen.tsx`
  - `src/hooks/useAppointmentsData.ts` (busca, compartilhado com a Agenda — **não é alterado por esta EPIC**)
  - `src/hooks/appointmentsCache.ts` (cache AsyncStorage)
  - `src/screens/EditAppointmentScreen.tsx` via `/edit-appointment?id=` (destino da correção de navegação)
- **Ator:** usuário final (paciente), conferindo na tela inicial o que tem pela frente e tocando no que lhe interessa.
- **Prioridade: P1 (defeito).** Não bloqueia operação sobre os dados, como bloqueava a EPIC da Agenda, mas exibe informação **errada** sobre compromissos de saúde — ver §2.1, D1 e D5.

## 2. História da funcionalidade

Como usuário final, quero que a tela inicial mostre corretamente meus próximos compromissos e me leve ao compromisso que eu tocar, para confiar no que ela me diz e agir a partir dela sem ter de caçar o registro em outra tela.

### 2.1 Os defeitos (todos confirmados no código em 2026-09-19)

**D1 — Compromissos das próximas horas somem da Home. (Gravidade: alta)**

`src/app/(app)/dashboard.tsx:91-93`:

```ts
const now = new Date().toISOString();
const upcomingAppointments = [...appointments]
  .filter((appointment) => appointment.scheduledAt >= now)
```

`scheduledAt` é `"AAAA-MM-DDTHH:mm"` — hora **local ingênua, sem offset**. `new Date().toISOString()` é **UTC**. A comparação é lexicográfica entre as duas.

Em Brasília (UTC−3) o resultado é concreto e reproduzível: às 14:00 locais, `now` vale `"...T17:00:00.000Z"`. Um compromisso hoje às **16:00** produz `"...T16:00"`, que é lexicograficamente **menor** — e desaparece da Home, embora falte ainda duas horas para ele. **Todo compromisso nas próximas três horas fica invisível na tela inicial**, exatamente na janela em que ele mais importa.

O sinal se inverte em fusos a leste de Greenwich, onde compromissos já vencidos passariam a aparecer. E há um segundo erro embutido: `"...T18:00"` é prefixo de `"...T18:00:00.000Z"`, logo menor, então um compromisso no minuto corrente também some.

**D2 — `isSameCalendarDay` da Home lê `scheduledAt` fora do parser único. (Gravidade: baixa, latente)**

`src/app/(app)/dashboard.tsx:26` usa `new Date(isoDate)`. Hoje funciona, porque o ECMAScript interpreta uma string data-e-hora sem offset como local — mas é a mesma dependência sutil que produziu D1, e uma string só de data seria lida como UTC. Sobrevive um segundo leitor de data num app que agora tem um parser único.

**D3 — Tocar um compromisso na Home não abre aquele compromisso. (Gravidade: alta)**

`src/screens/HomeScreen.tsx:187`: o card de "Próximos compromissos" recebe `onPress={onNavigateToAppointments}` — o mesmo callback do link "Ver agenda". Tocar um compromisso específico leva à Agenda genérica, sem qualquer relação com o que foi tocado.

É incoerente com a própria tela: o card de exame, logo acima, usa `onNavigateToExamDetail(exam.id)` e abre o documento certo (`HomeScreen.tsx:143`). E foi esta a queixa literal do usuário — "ao clicar nelas eu não consigo acessá-las".

**D4 — `formatAppointmentWhen` lê `scheduledAt` fora do parser único. (Gravidade: baixa, latente)**

`src/screens/HomeScreen.tsx:362`: `new Date(scheduledAt)`. Mesma classe de D2. É o que decide se o card diz "Hoje", "Amanhã" ou uma data — um erro aqui rotula o compromisso com o dia errado.

**D5 — "Resumo de hoje" anuncia horários já vencidos. (Gravidade: média)**

`src/app/(app)/dashboard.tsx:40-54`: `buildTodaySummaryText` filtra por `isSameCalendarDay` com a data de hoje e cita o horário do **primeiro** compromisso do dia, sem olhar as horas. Às 20h, um card chamado "Resumo de hoje" informa "1 consulta às 15h" — uma consulta que já aconteceu, apresentada como pendência.

**D6 — Cache de agenda sem escopo de usuário e sem TTL. (Gravidade: baixa)**

`src/hooks/appointmentsCache.ts:3` usa uma chave única `'@SuaSaude:appointmentsCache'`, sem componente de usuário, e `loadCachedAppointments` devolve o cache sem revalidar.

**Correção de uma afirmação feita antes de conferir:** durante a EPIC da Agenda eu registrei isso como vazamento entre contas. Não é, no caminho normal — `src/services/auth/session.ts:27` chama `invalidateAppointmentsCache()` no logout. O que resta é: defesa em profundidade contra um logout que falhe no meio, e dados velhos quando o mesmo usuário altera a agenda em outro dispositivo, já que nada revalida um cache existente. Por isso este é o item de menor prioridade da EPIC e o único marcado como opcional (§7).

### 2.2 Cenários (Given/When/Then)

- **Compromisso nas próximas horas (D1):**
  Given são 14:00 em Brasília (UTC−3) e existe um `Appointment` para hoje às 16:00
  When a Home monta "Próximos compromissos"
  Then esse compromisso **aparece** na lista, em primeiro lugar.

- **Compromisso já vencido não aparece (D1, o outro lado):**
  Given são 14:00 e existe um `Appointment` para hoje às 09:00
  When a Home monta "Próximos compromissos"
  Then esse compromisso **não** aparece.

- **Tocar um compromisso abre aquele compromisso (D3):**
  Given a Home exibe um compromisso de id `apt-1`
  When o usuário toca o card
  Then o app navega para `/edit-appointment?id=apt-1`, de onde ele pode editar ou excluir.

- **"Ver agenda" continua indo para a Agenda (D3, preservação):**
  Given a Home está carregada
  When o usuário toca o link "Ver agenda" no cabeçalho da seção, ou o botão do card "Resumo de hoje"
  Then o app navega para `/appointments`, como hoje.

- **Resumo de hoje só conta o que falta (D5):**
  Given são 20:00 e o único `Appointment` de hoje foi às 15:00
  When a Home monta o "Resumo de hoje"
  Then o card **não** cita esse compromisso, e informa que não há mais compromissos hoje.

- **Resumo de hoje com compromisso por vir (D5):**
  Given são 10:00 e existem `Appointment` hoje às 09:00 e às 15:00
  When a Home monta o "Resumo de hoje"
  Then o card conta **1** compromisso e cita **15h** — o que ainda vai acontecer.

- **Rótulo "Hoje"/"Amanhã" correto (D4):**
  Given existe um `Appointment` para amanhã às 08:00
  When o card é renderizado
  Then o "Quando" diz "Amanhã", e nunca uma data deslocada por leitura em UTC.

- **Compromisso com data corrompida (todos):**
  Given existe um `Appointment` cujo `scheduledAt` não é analisável
  When a Home monta qualquer das duas seções
  Then ele é **omitido** da Home sem quebrar a tela — e continua alcançável pelo modo "Histórico" da Agenda, que é onde ele pode ser corrigido ou excluído.

- **Estados de carregando e erro:** preservados exatamente como hoje (`ScreenSkeleton`, `EmptyState tone="error"` + "Tentar novamente"). Sem alteração.

## 3. Estrutura da página

**Nenhuma mudança estrutural.** A ordem visual da tela 2b permanece: saudação e data → "Resumo de hoje" → alertas condicionais → "Últimos exames" → "Próximos compromissos" → "Acesso rápido" → bottom nav.

O que muda é **o conteúdo** de dois elementos já existentes e **o destino** de um toque:

| Elemento | Muda o quê |
|---|---|
| Card "Resumo de hoje" | O texto passa a considerar só compromissos de hoje ainda por vir (D5) |
| Lista "Próximos compromissos" | O filtro passa a ser correto em qualquer fuso (D1); a data do card passa pelo parser único (D4) |
| Card de compromisso (item da lista) | O toque passa a abrir aquele compromisso (D3) |

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| **Card de compromisso** | Item de lista | `onNavigateToAppointmentDetail(id)` | `/edit-appointment?id=` | **Muda** (D3). Hoje vai para `/appointments` |
| Link "Ver agenda" (cabeçalho da seção) | Link de texto | `onNavigateToAppointments()` | `/appointments` | Preservado |
| Botão "Ver agenda de hoje →" (Resumo de hoje) | Botão | `onNavigateToAppointments()` | `/appointments` | Preservado |
| Botão "Agendar consulta" (estado vazio) | Botão | `onNavigateToAppointments()` | `/appointments` | Preservado |
| Card de exame | Item de lista | `onNavigateToExamDetail(id)` | `/document-detail?id=` | Preservado — é o padrão que D3 passa a seguir |
| Acesso rápido — "Agenda" | Botão | `onNavigateToAppointments()` | `/appointments` | Preservado |
| Alertas de prevenção e vacinação | Card | callbacks próprios | inalterados | Preservado |

**Decisão (D3).** O card leva ao **agendamento**, não à Agenda ancorada no dia dele. Três razões: é simétrico com o card de exame da mesma tela; leva em um toque à ação que o usuário quer (editar ou excluir); e não exige que a Agenda passe a aceitar um parâmetro de âncora, o que seria trabalho novo sobre a EPIC recém-entregue. A Agenda continua a um toque, pelo "Ver agenda".

## 5. Mapa de dados

Fonte real única, inalterada: `Appointment` no DynamoDB, via `client.models.Appointment.list()` em `src/services/appointmentService.ts`, consumido por `useAppointmentsData`. **Nenhuma mudança de schema** (regra 5). Nenhum dado mockado (regra 2).

| Campo/elemento | Origem | Fonte técnica | Observação |
|---|---|---|---|
| Lista de próximos compromissos | Real | `appointments` de `useAppointmentsData` | Já real. Muda só o filtro aplicado (D1) |
| `scheduledAt` | Real | `Appointment.scheduledAt` | `"AAAA-MM-DDTHH:mm"`, local ingênuo. Passa a ser lido **só** por `parseScheduledAt` |
| "Quando" do card ("Hoje"/"Amanhã"/`DD/MM`) | Real (derivado) | `formatAppointmentWhen` | Passa pelo parser único (D4) |
| Texto do "Resumo de hoje" | Real (derivado) | `buildDashboardTodaySummary` | Passa a filtrar por horário, não só por dia (D5) |
| Contagem de medicamentos pendentes | Real | `useMedicinesData.pendingCount` | Inalterado |
| `id` do compromisso | Real | `Appointment.id` | Passa a ser usado na navegação (D3). `AppointmentEntry.id` é `string \| number` — codificar com `encodeURIComponent(String(id))` |

### 5.1 Contratos de código que mudam

| Artefato | Antes | Depois | Motivo |
|---|---|---|---|
| `HomeScreenProps` | `onNavigateToAppointments?: () => void` cobre tudo | Ganha `onNavigateToAppointmentDetail?: (id: string) => void` | D3. Aditivo: `onNavigateToAppointments` continua existindo para os outros quatro pontos que legitimamente vão à Agenda |
| `UpcomingAppointmentCard` (local em `HomeScreen.tsx`) | `onPress?: () => void` | Recebe o compromisso e chama o callback com o `id` | D3 |
| `buildTodaySummaryText` | Filtra por dia | Filtra por dia **e** por horário ainda por vir | D5 |
| `appointmentsCache` (opcional) | Chave única, sem TTL | Chave com componente de usuário, e TTL | D6 |

### 5.2 O que esta EPIC **não** altera

`src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `src/services/agendaDateRange.ts`, `src/screens/AgendaScreen.tsx` e tudo em `amplify/`. A EPIC da Agenda deixou o hook de busca com quatro campos (`appointments`, `isLoading`, `errorMessage`, `retry`) e esta EPIC consome exatamente esses quatro. Se alguma correção exigir mexer no hook compartilhado, o desenho está errado e a task volta para reavaliação.

## 6. Requisitos não-funcionais específicos

- **Contrato de data (requisito central, herdado).** Toda leitura de `scheduledAt` na Home passa por `parseScheduledAt` de `@/services/agendaDateRange`. Nenhum `new Date(scheduledAt)`, nenhuma comparação com `toISOString()`. Este é o mesmo contrato da EPIC da Agenda, e esta EPIC o estende aos **três** sítios restantes do repositório: `dashboard.tsx:26`, `dashboard.tsx:91` e `HomeScreen.tsx:362`.
- **Comparação de instantes, não de strings.** O filtro de D1 compara `Date` contra `Date` (via `isPast` do módulo puro), nunca strings. Comparar datas como texto só funciona quando os dois lados têm o mesmo formato e o mesmo fuso — e aqui não têm.
- **Fidelidade ao Canvas (regra 1).** Nenhuma mudança estrutural na tela 2b. O texto do "Resumo de hoje" continua na frase-modelo do Canvas ("N consulta(s) às HH · M medicamentos pendentes"); muda o conjunto que alimenta a contagem, não a forma.
- **Nada quebra (regra 5).** Sem migração de schema, sem alteração do hook compartilhado, sem alteração da Agenda.
- **Stack existente (regra 3).** Nenhuma biblioteca nova. Toda a aritmética necessária já existe em `agendaDateRange.ts`.
- **Registro corrompido nunca derruba a tela.** `parseScheduledAt` devolve `null` para data inválida; a Home omite o item. A recuperação desse registro é responsabilidade do modo "Histórico" da Agenda, que já a cumpre — a Home não precisa de um segundo caminho, mas também não pode quebrar por causa dele.
- **Acessibilidade.** O card de compromisso passa a ser um destino de navegação real: alvo de toque mínimo de 48dp e `accessibilityRole="button"`, no mesmo padrão do card de exame.
- **Sem dado inventado (regra 2).** Se não há compromisso por vir hoje, o card diz isso — nunca repete o último compromisso do dia para ter o que mostrar.

## 7. Critérios de aceite

- [ ] Às 14:00 em UTC−3, um `Appointment` para hoje às 16:00 aparece em "Próximos compromissos". *(D1 — teste de regressão do defeito principal)*
- [ ] Às 14:00, um `Appointment` para hoje às 09:00 **não** aparece em "Próximos compromissos". *(D1, o outro lado)*
- [ ] O teste de D1 falha se o filtro voltar a comparar `scheduledAt` com `new Date().toISOString()`.
- [ ] Tocar um card de compromisso navega para `/edit-appointment?id=<id>` com o id daquele compromisso. *(D3)*
- [ ] "Ver agenda", "Ver agenda de hoje →", "Agendar consulta" e o Acesso rápido continuam indo para `/appointments`. *(D3, preservação)*
- [ ] Às 20:00, com o único compromisso do dia às 15:00, o "Resumo de hoje" não cita esse compromisso. *(D5)*
- [ ] Às 10:00, com compromissos às 09:00 e às 15:00, o "Resumo de hoje" conta 1 e cita 15h. *(D5)*
- [ ] Um `Appointment` para amanhã é rotulado "Amanhã" pelo card. *(D4)*
- [ ] Um `Appointment` com `scheduledAt` inválido é omitido da Home sem quebrar a renderização, e segue alcançável pelo "Histórico" da Agenda.
- [ ] `grep` não encontra nenhuma construção de `Date` a partir de `scheduledAt`, nem comparação com `toISOString()`, em `src/app/(app)/dashboard.tsx` nem em `src/screens/HomeScreen.tsx`. *(D2, D4 — verificável)*
- [ ] `src/hooks/useAppointmentsData.ts`, `src/services/appointmentService.ts`, `src/services/agendaDateRange.ts`, `src/screens/AgendaScreen.tsx` e `amplify/**` não aparecem no diff.
- [ ] Estados de carregando e erro preservados sem alteração.
- [ ] Nenhuma biblioteca nova; nenhuma cor fora de `DESIGN_TOKENS.md`; nenhuma mudança estrutural na tela 2b.
- [ ] `npm run validate` passa (typecheck + typecheck:backend + lint + test:ci).
- [ ] **(Opcional — D6)** O cache de agenda é escopado por usuário e revalidado por TTL. Este item pode ser adiado sem bloquear a EPIC; se for adiado, fica registrado em `GAP_ANALYSIS.md` como pendência nomeada em vez de desaparecer.

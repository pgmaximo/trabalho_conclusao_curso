# Plano técnico: Home — Compromissos coerentes e clicáveis

## Diagnóstico — por que estes seis defeitos sobreviveram juntos

Os seis têm a mesma origem: a Home nasceu antes de existir um lugar canônico para ler `scheduledAt`, e cada função que precisou de uma data resolveu por conta própria. São hoje **três leitores de data diferentes** (`dashboard.tsx:26`, `dashboard.tsx:91`, `HomeScreen.tsx:362`), e o do meio compara texto com texto entre fusos diferentes — que é o defeito de verdade.

A EPIC `agenda-navegacao-temporal/` já criou o lugar canônico: `src/services/agendaDateRange.ts`, puro e testado. **Esta EPIC não constrói nada novo. Ela apaga código e liga o que sobrou ao módulo que já existe.** O diff deve ser majoritariamente negativo.

Isso orienta o plano inteiro: nenhuma abstração nova, nenhuma decisão de arquitetura. Se uma task começar a desenhar algo, ela saiu do escopo.

**Uma exceção, e a razão dela.** A redação anterior desta seção dizia "nenhum arquivo novo em `src/`", e isso conflitava com o §6 logo abaixo, que exige as funções de seleção recebendo `now: Date` para os cenários de fuso serem testáveis sem relógio falso. Mantê-las no arquivo de rota faria todo teste arrastar `expo-router`, `HomeScreen` e quatro hooks para dentro da suíte. Então há **um** arquivo novo: `src/services/homeAppointments.ts`, com ~50 linhas, que **remove ~40** do arquivo de rota. O saldo em linhas é quase neutro e a rota volta a ser o invólucro fino que o resto do projeto usa. Nenhum outro arquivo novo é criado.

## 1. O conserto de D1 — o único que exige pensar

`dashboard.tsx:91-93` compara duas strings de formatos e fusos diferentes. A correção não é "arrumar o formato": é **parar de comparar strings**.

```ts
// antes
const now = new Date().toISOString();
const upcoming = [...appointments].filter((a) => a.scheduledAt >= now);

// depois
const now = new Date();
const upcoming = [...appointments].filter((a) => isPast(a.scheduledAt, now) === false);
```

Três detalhes que fazem esse `=== false` ser o que é:

- `isPast` devolve `boolean | null`. `null` significa data corrompida. `=== false` seleciona **só** os futuros e exclui os corrompidos — que é o que a Home quer: ela é uma vitrine, não a ferramenta de recuperação. Quem recupera registro corrompido é o "Histórico" da Agenda.
- Escrever `!isPast(...)` seria um defeito silencioso: `!null` é `true`, e o registro corrompido entraria na Home com data ilegível. É exatamente o oposto do `!== false` que a Agenda usa no Histórico, e os dois estão certos nos seus contextos. Vale um comentário em cada um apontando para o outro.
- A ordenação seguinte (`sort` por `localeCompare` de `scheduledAt`) também compara strings, mas aí é legítimo: os dois lados têm o mesmo formato, e `"AAAA-MM-DDTHH:mm"` ordena corretamente como texto. Ainda assim, trocar por `compareScheduled` do módulo puro deixa um só jeito de ordenar compromissos no app.

## 2. Os consertos de D2 e D4 — substituição direta

`dashboard.tsx:26` (`isSameCalendarDay`) e `HomeScreen.tsx:362` (`formatAppointmentWhen`) trocam `new Date(x)` por `parseScheduledAt(x)` e passam a tratar `null`.

`isSameCalendarDay` recebe hoje `(isoDate: string, reference: Date)`. Com `parseScheduledAt` devolvendo `null`, a função passa a devolver `false` para entrada inválida — semanticamente correto (uma data ilegível não é o mesmo dia que nada) e sem ramo novo no chamador.

`formatAppointmentWhen` devolve hoje sempre uma string. Com `null`, precisa de um retorno de reserva. **Decisão: `'Data inválida'`**, o mesmo rótulo que a Agenda usa no Histórico — o usuário vê o mesmo nome para a mesma condição nas duas telas.

## 3. O conserto de D3 — seguir o padrão que a própria tela já tem

O card de exame, dez linhas acima na mesma tela, já faz certo: `onNavigateToExamDetail(exam.id)`. A correção é espelhar isso.

- `HomeScreenProps` ganha `onNavigateToAppointmentDetail?: (id: string) => void`. **Aditivo**: `onNavigateToAppointments` continua existindo e continua sendo usado nos quatro outros pontos que legitimamente vão para a Agenda ("Ver agenda", o botão do Resumo, o estado vazio, o Acesso rápido). Trocar o significado do callback existente em vez de acrescentar um segundo seria a forma errada — quatro chamadas corretas viram incorretas de graça.
- `UpcomingAppointmentCard` passa a chamar `onPress(appointment.id)`.
- `dashboard.tsx` liga o novo callback a `router.push(\`/edit-appointment?id=${encodeURIComponent(String(appointment.id))}\`)`. O `String()` não é decorativo: `AppointmentEntry.id` é `string | number`.

## 4. O conserto de D5 — uma linha de filtro, uma decisão de copy

`buildTodaySummaryText` filtra hoje só por dia. Passa a filtrar por dia **e** por `isPast(...) === false`.

A consequência de copy precisa ser decidida aqui, não improvisada na implementação: quando havia compromissos hoje mas todos já passaram, o card não pode cair no texto de "nenhum compromisso", que sugere um dia vazio que não foi. **Decisão: usar o mesmo texto de dia sem compromissos** (`'Nenhum compromisso ou pendência para hoje.'`), porque o card se chama "Resumo de hoje" e responde à pergunta "o que ainda tenho pela frente". Distinguir "não havia nada" de "já passou tudo" exigiria uma terceira frase fora do Canvas, e o ganho não paga a divergência de design (regra 1).

`buildDashboardTodaySummary` compõe essa frase com a de medicamentos. O `hasAppointments` que ele calcula na linha 58 passa a usar o mesmo conjunto filtrado — hoje ele refaz o filtro por conta própria, e as duas contas precisam concordar.

## 5. O conserto de D6 — opcional, e o plano diz por quê

Registrei durante a EPIC da Agenda que o cache vazava entre contas. **Conferi depois e estava errado:** `src/services/auth/session.ts:27` já chama `invalidateAppointmentsCache()` no logout. Sobram dois riscos menores: um logout que falhe no meio deixa o cache do usuário anterior, e nada revalida um cache existente, então uma alteração feita em outro dispositivo não chega.

Por isso este item é **opcional** e fica por último. Se for feito: chave `@SuaSaude:appointmentsCache:<userId>` (o `userId` já está disponível via `getUserId()` de `@/services/auth/userSessionService`, que `appointmentService` já usa) e um TTL gravado junto do payload, com `loadCachedAppointments` devolvendo `null` quando expirado. **TTL de 5 minutos** — tempo suficiente para a navegação entre telas não refazer a consulta, curto o bastante para uma alteração em outro dispositivo aparecer antes de o usuário notar.

Se for adiado, tem de virar linha em `GAP_ANALYSIS.md`. Um item opcional que some do registro não era opcional, era esquecido.

## 6. Ordem de implementação (TDD, falha confirmada antes de cada verde)

O teste que prova D1 é o primeiro e o mais importante: ele precisa **falhar hoje** e continuar falhando se alguém reintroduzir a comparação de strings.

1. **Teste de regressão de D1 e D5** (`__tests__/homeCompromissos.test.tsx`): com hora fixada, assere que um compromisso daqui a duas horas aparece, que um de três horas atrás não aparece, e que o "Resumo de hoje" não cita horário vencido. **Falha hoje.**
2. **Teste de regressão de D3**: tocar o card chama `router.push('/edit-appointment?id=...')` com o id certo. **Falha hoje** (o card vai para `/appointments`).
3. `dashboard.tsx`: D1, D2, D5 — os três vivem neste arquivo.
4. `HomeScreen.tsx`: D3 e D4.
5. `appointmentsCache.ts`: D6, se for feito.
6. `npm run validate` e o `grep` do contrato de data.

**Como fixar a hora nos testes.** `buildTodaySummaryText` e o filtro recebem `now` por parâmetro ou o leem de `new Date()` no corpo. Para testar o cenário de fuso sem depender do relógio da máquina, a rota precisa aceitar o instante de referência — **decisão: extrair as duas funções puras (`buildTodaySummaryText` e o filtro de próximos) para receberem `now: Date` como parâmetro explícito**, e testá-las diretamente, em vez de usar `jest.useFakeTimers()` sobre a tela inteira. Funções puras com o tempo injetado são mais fáceis de testar e é o padrão que `agendaDateRange.ts` já estabeleceu neste app (`isPast(scheduledAt, now)`).

## 7. Riscos e como cada um é contido

| Risco | Contenção |
|---|---|
| Trocar o significado de `onNavigateToAppointments` e quebrar os outros quatro usos | O callback novo é aditivo; teste assere que "Ver agenda" continua indo para `/appointments` |
| Escrever `!isPast(...)` em vez de `=== false`, deixando entrar registro corrompido | Teste com `scheduledAt` inválido assere que ele **não** aparece na Home; comentário no código explicando o contraste com o `!== false` da Agenda |
| Mexer em `useAppointmentsData`, que é compartilhado com a Agenda | Está no escopo negativo da spec §5.2; `git diff --name-only` no fechamento confirma |
| O texto do "Resumo de hoje" divergir do Canvas | A frase-modelo não muda; muda só o conjunto que a alimenta (§4) |
| Teste de fuso que só passa em UTC−3 | O teste constrói o esperado a partir de componentes locais, como fez o teste do Google Agenda na EPIC anterior — fixa o comportamento sem amarrar a suíte a um fuso |

## 8. Fora de escopo (registrado para não virar escopo por acidente)

- Qualquer mudança na Agenda ou no módulo `agendaDateRange.ts` — estão prontos e testados.
- O alerta de prevenção (`preventionAlert`), que continua sempre `null` por falta de fonte real — pendência já registrada e de outra EPIC.
- A duplicação de `isSameCalendarDay` entre `dashboard.tsx` e o que o módulo puro oferece: **isto entra no escopo**, porque a correção de D2 naturalmente a elimina. Mas nenhuma outra deduplicação da Home entra.
- Redesenho de qualquer parte da tela 2b.

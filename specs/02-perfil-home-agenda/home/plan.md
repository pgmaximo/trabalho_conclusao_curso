# PLAN: Home — Resumo, Indicadores e Acesso Rápido (Bloco 2)

## 1. Diagnóstico — estado atual vs. design

Leitura de `src/screens/HomeScreen.tsx` (renderizado por `src/app/(app)/dashboard.tsx`, dados de `src/hooks/useDashboardData.ts` [mock] + `src/hooks/useExamsData.ts` [real] + `src/hooks/useAppointmentsData.ts` [real, não usado pela Home hoje]) comparado ao markup da tela 2b.

| Elemento do design | Existe hoje? | Detalhe do gap |
|---|---|---|
| Saudação + data | Sim, equivalente | `getGreeting(user.name)` + `todayLabel` (de `getDashboardTodayLabel()`, função pura sem mock). Já correto, manter. |
| Ícone de sino com badge | **Não existe** | `HomeScreen.tsx` não tem nenhum elemento de notificação — usa `ScreenHeader` com `badgeLabel={summary.status}` no lugar (um badge de texto ao lado do título, não um ícone de sino). Gap estrutural: falta o componente inteiro. |
| Card "Resumo de hoje" | Existe, mas com dado errado | Hoje renderizado dentro de um `Card variant="soft"` genérico (fundo claro do tema, não o verde `#0C6341` sólido do Canvas) mostrando `summary.value`/`summary.status` do mock (`"72 bpm"`/`"Normal"` — dado de frequência cardíaca, que **não faz parte do Canvas 2b** nem existe como conceito no restante do app). Divergência dupla: cor errada (`Card variant="soft"` claro em vez de fundo `#0C6341`) e conteúdo sem relação com o texto esperado (`"1 consulta às 15h · 2 medicamentos pendentes"`). **Gap a corrigir** — refeito do zero: card verde escuro com texto composto a partir de dado real de agenda + placeholder honesto para medicamentos. |
| Alerta "Prevenção em atraso" | Existe, mas 100% mock e sem condicional | `<Section title="Prevenção">` sempre renderiza um `EventCard` com `preventiveAlert` do `DASHBOARD_SNAPSHOT` mock (copy fixa "Colesterol não medido há 14 meses..."), **sempre visível independente de haver ou não uma pendência real** — nunca desaparece, nunca reflete dado do usuário. **Gap a corrigir**: remover a dependência do mock; seção só aparece quando houver dado real (hoje, nunca — ver §2 abaixo). |
| Seção "Últimos exames" | **Já real e já correta na essência** | `dashboard.tsx` já busca `documents` de `useExamsData()` e ordena/corta para os 3 mais recentes (`recentExams`), passa para `HomeScreen`. Only visual gaps: falta "laboratório" na meta (mesmo gap do EPIC 3a) e falta badge Normal/Alterado (idem). **Não é um gap desta EPIC resolver o dado do laboratório/badge — herda a decisão de 3a.** Único ajuste local: o Canvas mostra até 2 itens, hoje mostra até 3 — decisão de manter 3 é aceitável (mais útil), documentar como interpretação (regra 8). |
| Link "Ver todos" | **Não existe** | Seção "Últimos exames" não tem link de navegação para `/exams` — `plan` adiciona. |
| Seção "Próximos compromissos" | **Existe, mas 100% mockada e semanticamente errada** | Hoje é `<Section title="Próximos eventos">` renderizando `upcomingEvents` do `DASHBOARD_SNAPSHOT` mock — mistura consulta, exame pendente e medicamento em uma lista genérica de "eventos" com ícones emoji (📋/✅/💊), nada a ver com o `Appointment` real já buscável via `useAppointmentsData()`. **Maior gap de-mockável desta EPIC** — ver §2. |
| Link "Ver agenda" | **Não existe** | Idem "Ver todos" — adicionar navegação para `/appointments`. |
| Grid "Acesso rápido" | Existe, mas com 5 tiles (não 4) e 1 fora do Canvas | Hoje: `Agendas` (label errado, Canvas diz "Agenda"), `IA p/ Exames` (label errado, Canvas diz "Análise IA"), `Medicamentos` (label errado, Canvas diz "Remédios"), **`Wearable`** (tile inteiro que **não existe no Canvas 2b** — cai fora da grade 2×2, vira 5º item solto), e depois **Prevenção** em uma segunda linha isolada de 1 item. O Canvas define exatamente 4 tiles em 2×2: Agenda / Análise IA / Remédios / Prevenção. **Gap a corrigir**: remover tile "Wearable" (sem correspondência no design nem em nenhuma tela real do app — não há feature de wearable implementada em lugar nenhum), corrigir labels, reorganizar em grid 2×2 único com Prevenção como 4º tile. |
| Estados loading/erro | Existe, mas tratado como bloco único | Hoje `isLoading`/`errorMessage` vêm só de `useDashboardData()` (o hook mockado) — se o mock "falhar" (não falha nunca de verdade, é só a simulação de erro do `simulateRequest`), a tela inteira vira `EmptyState tone="error"`, escondendo inclusive os exames reais que talvez tenham carregado com sucesso. Além disso, erros de `useExamsData`/`useAppointmentsData` **não são tratados em lugar nenhum** hoje na Home (`examsLoading` é passado, mas não há `examsError`). **Gap a corrigir**: tratar loading/erro por widget. |
| Bottom nav "Início" ativo | Sim, já implementado globalmente | `BottomTabBar`/`AppShell` cuidam disso; fora do escopo desta EPIC. |

## 2. O gap central: quais widgets podem ser des-mockados agora

Esta é a decisão central desta EPIC — cada widget do dashboard mockado (`DASHBOARD_SNAPSHOT`) avaliado individualmente quanto a ter ou não fonte de dado real disponível **hoje**, sem exigir trabalho de outro Bloco.

### Podem ser des-mockados AGORA (dado real já existe no código):

1. **"Próximos compromissos" → `Appointment` real via `useAppointmentsData()`.**
   O hook já existe, já busca dados reais (`appointmentService`/Amplify, com cache), já expõe `appointments: AppointmentEntry[]` ordenável. A Home hoje simplesmente não o chama. Ação: em `dashboard.tsx`, importar `useAppointmentsData()`, filtrar para compromissos futuros (`scheduledAt >= hoje`), ordenar por proximidade, pegar os 2 primeiros, mapear para o formato de card do Canvas (título `"{Tipo} · {Nome}"`, meta `"{Quando}, {Hora} · {Local}"`, barra lateral azul para consulta / verde para exame agendado — derivar cor de `appointment.type`). Isso elimina 100% do mock `upcomingEvents`.

2. **"Resumo de hoje" — parte de consultas.**
   A frase-modelo do Canvas é `"1 consulta às 15h · 2 medicamentos pendentes"` — duas cláusulas. A cláusula de consulta é derivável de `Appointment` real: contar compromissos de hoje (`scheduledAt` com data = hoje) e citar o mais próximo (`"{N} consulta(s) às {hora}"` ou "Nenhum compromisso hoje" se vazio). **Des-mockar esta parte agora.**

3. **Links "Ver todos" (`/exams`) e "Ver agenda" (`/appointments`).**
   Navegação pura, nenhum dado envolvido — trivial, sem dependência.

4. **Grid "Acesso rápido" (correção de composição, não de dado).**
   Já é 100% real (são botões de navegação) — o gap aqui é puramente de fidelidade visual/estrutural (remover tile "Wearable", corrigir labels, montar 2×2 correto), não uma questão de mock. Fazer agora.

5. **Tratamento de erro/loading por widget.**
   Refatoração de UI usando os hooks já existentes (`useExamsData`, `useAppointmentsData` já expõem `errorMessage`/`retry`/`isLoading` cada um) — não depende de nenhum backend novo, só de a `HomeScreen` parar de depender de um `isLoading`/`errorMessage` monolítico vindo só do `useDashboardData` mock.

### Ficam BLOQUEADOS (sem fonte de dado real disponível, dependem de outro Bloco):

1. **"Resumo de hoje" — parte de medicamentos pendentes.**
   Não há model Amplify de medicamentos; `MedicinesScreen`/`useMedicinesData` são 100% mock (`medicinesApi.ts`, confirmado em `CODE_INVENTORY.md` §6). Bloqueado até a EPIC de Medicamentos (Bloco 3, ainda não escrita) entregar backend real. **Decisão para esta EPIC**: omitir a cláusula de medicamentos do texto do resumo (mostrar só a parte de consultas) em vez de inventar um número — ex. `"1 consulta às 15h"` sem a segunda cláusula quando não há dado real, em vez de `"1 consulta às 15h · 2 medicamentos pendentes"` com o "2" inventado. Alternativa mais simples e igualmente honesta: se não houver nada de real para nenhuma das duas cláusulas, mostrar copy neutra ("Nenhum compromisso ou pendência para hoje").

2. **"Prevenção em atraso".**
   Depende inteiramente da funcionalidade de Prevenção (tela 3e), que é 100% mock e sem model Amplify (`GAP_ANALYSIS.md` pendência #2). Essa é uma decisão de modelagem de dados que **pertence à EPIC de Prevenção do Bloco 3**, não a esta. **Decisão para esta EPIC**: a Home não deve renderizar o card com dado mockado enquanto essa fonte não existir — a seção fica condicional/ausente até que a EPIC de Prevenção exponha um serviço/hook real (ex. `usePreventionAlerts()` retornando o item atrasado mais urgente, se houver). Quando essa EPIC entregar isso, a Home só precisa consumi-lo — nenhuma decisão de "o que é uma prevenção atrasada" é tomada aqui.

3. **Ícone de sino / badge de não-lido.**
   Não existe nenhum sistema de notificações no código (nenhum model, serviço, tela). Não é um "widget mockado" a corrigir — é uma feature inteiramente ausente. **Decisão para esta EPIC**: implementar apenas o elemento visual estático (ícone de sino, sem badge, sem contagem, sem ação funcional além de talvez um placeholder de toque que não faz nada ainda ou navega para uma tela "em breve") e registrar a central de notificações como pendência nova em `GAP_ANALYSIS.md` — está fora do escopo de qualquer Bloco já mapeado (1–4), portanto é a primeira menção formal dessa lacuna.

## 3. Escopo da mudança

**Fora de escopo / não tocar:**
- `amplify/data/schemas/*` — nenhuma mudança de schema nesta EPIC. Nem `Appointment` nem `MedicalDocument` precisam de campo novo para o que está desbloqueado aqui.
- Modelagem de dados de Prevenção (score, checklist) — pertence à futura EPIC `specs/03-.../prevencao`. Esta EPIC só consome, quando disponível.
- Modelagem de dados de Medicamentos — pertence à futura EPIC de Medicamentos (Bloco 3). Esta EPIC só omite a cláusula até lá.
- Sistema de notificações (model, serviço, tela de central de notificações) — registrar como pendência nova, não implementar aqui além do ícone estático.
- `src/hooks/useExamsData.ts`, `src/services/appointmentService.ts` — reaproveitados como estão, nenhuma mudança de lógica de fetch.
- Badge de status Normal/Alterado e campo de laboratório em "Últimos exames" — decisão já tomada em `specs/03-exames-receitas/lista/plan.md` (Opção A: omitir badge para exames sem dado real); esta EPIC apenas herda e reaplica a mesma composição de `ExamItem`, não re-decide.

**Dentro de escopo:**
- `src/app/(app)/dashboard.tsx` — adicionar `useAppointmentsData()`; compor `todaySummaryText` a partir de compromissos de hoje; compor `upcomingAppointments` (top 2, futuros) a partir de `appointments`; remover a dependência de `useDashboardData()` para tudo exceto (temporariamente, se necessário) o texto de prevenção — decisão final abaixo é remover `useDashboardData()`/`dashboardApi.ts` inteiramente do fluxo da Home.
- `src/hooks/useDashboardData.ts` e `src/mocks/api/dashboardApi.ts`/`src/mocks/dashboard.ts` — **deixam de ser consumidos pela Home**. Não deletar o arquivo nesta EPIC (fora do escopo desta pasta tocar `src/mocks/`; a decisão de remover o arquivo morto fica para uma limpeza posterior ou para quando a última tela que o usa for migrada), mas a Home para de importar/usar.
- `src/screens/HomeScreen.tsx` — reescrita das props e da estrutura: remover `summary`/`metrics`/`upcomingEvents`/`preventiveAlert` (props vindas do mock) e `isLoading`/`errorMessage` globais; adicionar props por widget (`appointmentsToday`, `upcomingAppointments`, `appointmentsLoading`, `appointmentsError`, `onRetryAppointments`, `recentExams`, `examsLoading`, `examsError`, `onRetryExams`, `notificationHasUnread?: boolean` sempre `false`/omitido por ora); remover a seção "Indicadores principais" (métricas de frequência cardíaca/sono/passos — **não existem no Canvas 2b em nenhum lugar**, são um conceito só do mock atual, sem correspondência de design nem de dado real; remover é tanto fidelidade ao Canvas quanto eliminação de mock morto); reconstruir "Acesso rápido" como grid 2×2 fixo sem o tile "Wearable".
- `src/components/` — reaproveitar `Card`, `Section`, `EmptyState`, `ScreenSkeleton`, `QuickAccessButton`, `EventCard` (ou variante) como estão; possível pequeno componente novo `NotificationBell` (ícone + badge condicional) se não houver equivalente — avaliar reaproveitar um ícone simples inline em vez de um componente novo, dado que é só um botão com um `Ionicons`.

## 4. Componentes a reaproveitar (Fundação / já existentes)

- `Card` (`src/components/Card.tsx`) — usar variante existente ou nova prop de cor sólida para o card "Resumo de hoje" (hoje só tem `variant="soft"`, que não bate com o fundo `#0C6341` sólido do Canvas — avaliar se vale estender `Card` com uma variante `"solid"`/`tone="brand"` reaproveitável em outras telas, ou compor manualmente com `View`+classe Tailwind direta, seguindo o padrão já usado em outras telas do app).
- `EventCard` (`src/components/EventCard.tsx`) — reaproveitar para os cards de "Próximos compromissos" (barra lateral colorida) — já suporta variantes de cor via prop, checar se cobre o padrão de barra 4px lateral do Canvas ou se precisa de ajuste de estilo.
- `EmptyState` — reaproveitar para os estados vazio/erro de cada widget (exames, compromissos), como já é feito em outras telas.
- `ScreenSkeleton` — reaproveitar, mas aplicado por seção em vez de tela inteira (passar como filho de cada `Section` durante loading daquele widget específico, não mais como substituto de toda a tela).
- `QuickAccessButton` — reaproveitar como está para o grid 2×2, só ajustando a lista de itens passada (4 em vez de 5).
- `Section` — reaproveitar para os títulos de seção ("Últimos exames", "Próximos compromissos", "Acesso rápido").
- Nenhuma dependência nova de biblioteca é necessária para esta EPIC (regra 3 da constituição) — tudo usa hooks/componentes já existentes.

## 5. Riscos / decisões a documentar

- **Remover a seção "Indicadores principais" (frequência cardíaca/sono/passos/medicamentos) é uma mudança de UX perceptível** — a Home atual mostra 4 métricas que não existem no Canvas 2b e não têm fonte real (frequência cardíaca e sono, especialmente, não correspondem a nenhuma feature do app — não há integração de wearable implementada em lugar nenhum do código, apesar do tile "Wearable" solto no grid sugerir que a intenção existia). Justificativa: fidelidade ao Canvas + regra 2 (nenhum dado mockado permanece) — essas métricas não têm como ser reais sem uma feature de wearable que não está no escopo mapeado do design (`constitution.md` regra 9 confirma que não há Bloco de Wearables descoberto no Canvas atual).
- **Card "Resumo de hoje" pode ficar "mais pobre" que o Canvas quando não há consulta hoje nem dado de medicamentos** — aceitável e documentado (regra 2: honestidade sobre ausência de dado é preferível a inventar).
- **Seção "Prevenção em atraso" pode nunca aparecer nesta fase** (sempre condicional, sempre ausente até a EPIC de Prevenção existir) — isso é uma divergência visível do Canvas (que sempre mostra o card), mas é a única opção compatível com a regra 2. Documentar claramente para o revisor/orientador do TCC que essa é uma pendência cross-Bloco, não um esquecimento.
- **Ordem de dependência:** esta EPIC pode ser implementada de forma independente e antes da EPIC de Prevenção/Medicamentos — ela não bloqueia nem é bloqueada por elas, só deixa "ganchos" (condicionais) prontos para quando aquelas entregarem dado real.
- **Notificações:** decisão de implementar apenas o ícone estático (sem badge, sem central funcional) é uma redução de escopo consciente — registrar formalmente em `GAP_ANALYSIS.md` como pendência nova (não coberta pelas pendências #1–#7 já listadas lá), já que a captura de estado do dashboard/2b feita no `GAP_ANALYSIS.md` atual não menciona notificações.

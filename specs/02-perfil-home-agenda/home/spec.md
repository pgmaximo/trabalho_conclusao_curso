# EPIC: Home — Resumo, Indicadores e Acesso Rápido (Bloco 2)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **2b** ("Home — resumo, indicadores e acesso rápido") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 730–794).
- Rota/arquivo no código (existente): `src/app/(app)/dashboard.tsx` (rota `/dashboard`, aba "Início" da tab bar) → renderiza `src/screens/HomeScreen.tsx`, alimentado por `src/hooks/useDashboardData.ts` (mock) + `src/hooks/useExamsData.ts` (real) + `src/hooks/useAppointmentsData.ts` (real, ainda não consumido pela Home hoje).
- Ator(es): usuário final (paciente), ao abrir o app — tela inicial pós-login.
- **Prioridade: P1** (`GAP_ANALYSIS.md`, Bloco 2, linha 31: "2b Home — resumo/indicadores/acesso rápido ... `ATUALIZAR` (+ remover mock do resumo)"), status `ATUALIZAR`, parcialmente mockado.

## 2. História da funcionalidade
Como usuário final, quero abrir o app e ver imediatamente um resumo do meu dia (compromissos e pendências), alertas de prevenção atrasada, meus últimos exames, meus próximos compromissos e atalhos para as áreas mais usadas, para decidir rapidamente o que precisa da minha atenção sem navegar por várias telas.

### Cenários (Given/When/Then)

- **Dashboard vazio (usuário novo sem exames/consultas):**
  Given o usuário autenticado não possui nenhum `MedicalDocument` nem `Appointment` salvos (recém-cadastrado, ainda no início de uso)
  When a Home termina de carregar (`useExamsData` retorna `documents: []`, `useAppointmentsData` retorna `appointments: []`)
  Then a seção "Últimos exames" mostra o estado vazio (`EmptyState`, ícone documento, "Nenhum exame enviado. Seus exames aparecerão aqui após o upload.", já implementado) e "Próximos compromissos" mostra o estado vazio equivalente ("Nenhum compromisso agendado" + CTA "Agendar consulta" apontando para `/add-appointment` ou `/appointments`); o card verde "Resumo de hoje" e o card âmbar "Prevenção em atraso" **não devem inventar dados** — ver §5 Mapa de dados para o tratamento de cada um quando não há nada a resumir (card de resumo mostra copy neutra tipo "Nenhum compromisso ou pendência para hoje"; alerta de prevenção some inteiramente, pois depende de dado que hoje não existe de forma alguma — ver pendência de Prevenção).

- **Carregamento:**
  Given a Home é aberta (primeira montagem ou pull-to-refresh)
  When `useExamsData`/`useAppointmentsData` estão buscando dados (`status === 'loading'`)
  Then a tela mostra o padrão de skeleton (`ScreenSkeleton`, já implementado, `blocks={4}` hoje) equivalente ao "Carregando seus dados..." de `DESIGN_TOKENS.md` §4 — cada widget que depende de fonte independente (exames, compromissos) deve poder mostrar seu próprio skeleton parcial em vez de bloquear a tela inteira nesse estado (ver cenário de erro parcial abaixo, mesmo princípio aplicado ao loading).

- **Erro parcial (um widget falha mas os outros carregam):**
  Given `useExamsData` falha (erro de rede ao buscar `MedicalDocument`) mas `useAppointmentsData` resolve com sucesso (ou vice-versa)
  When a Home renderiza
  Then a tela **não** deve cair inteira em um callout de erro global (`HomeScreen.tsx` hoje faz isso: se `errorMessage` do dashboard mock existir, a tela inteira vira `EmptyState tone="error"`, escondendo tudo) — cada seção (Últimos exames / Próximos compromissos) deve exibir seu próprio estado de erro local (`EmptyState tone="error"` + `onRetry` daquele hook específico) enquanto as demais seções continuam funcionando normalmente. Este é um gap de comportamento a corrigir (ver `plan.md`), pois hoje a Home trata só o erro do dashboard mock como bloqueante e ignora erros de `useExamsData`.

- **Notificação sem itens não lidos:**
  Given o usuário toca no ícone de sino (canto superior direito, com badge vermelho de "não lido" no Canvas)
  When não há nenhuma notificação pendente/não lida
  Then o sino não deve exibir o badge vermelho (`background:#B3261E` no Canvas, `position:absolute;top:8px;right:9px`) — **hoje não existe nenhum sistema de notificações no código** (nenhum serviço, hook, model Amplify ou tela associada); este cenário só é implementável quando um sistema real de notificações existir. Até lá, a interpretação proposta (regra 8) é renderizar o ícone de sino **sem o badge** (estado "sem notificações"), nunca com o badge fixo/mockado como está implícito no Canvas — ver pendência em §5.

## 3. Estrutura da página
Ordem visual observada no markup (2b), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Cabeçalho: saudação + data (`"Boa tarde, Maria"` 600 26px `#141817` / `"Quinta-feira, 19 de agosto"` 400 16px `#55605C`) à esquerda; ícone de sino (44×44, radius 14, fundo `#fff`, borda 1.5px `#DFE3E1`, glyph sino 18×18 borda 2px `#55605C`) com badge de não-lido (8×8 círculo `#B3261E`, borda branca 1.5px) à direita.
3. Card "Resumo de hoje" (fundo `#0C6341`, radius 18, padding 18): título branco 600 18px, linha de resumo branca/`#E8F5EE` 400 16px (ex. "1 consulta às 15h · 2 medicamentos pendentes"), pill "Ver agenda de hoje →" (fundo `rgba(255,255,255,.16)`, altura 40, radius 12).
4. Card de alerta "Prevenção em atraso" (fundo `#FFF3DF`, borda 1px `#F0D6A4`, radius 16, padding 16): ícone-círculo "!" 26px `#8A5300`, título 600 17px `#141817`, texto 400 16px `#5A4200`, botão "Agendar agora" (altura 48, radius 12, fundo `#8A5300`, texto branco).
5. Seção "Últimos exames": header com título 600 20px + link "Ver todos" (600 16px `#1B63C4`); lista de até 2 cards (fundo `#fff`, borda 1px `#EFF1F0`, radius 14, padding 14): ícone retângulo 22×26 borda 2px `#55605C`, nome do exame 600 17px, linha meta `{data} · {laboratório}` 400 16px `#55605C`, badge de status à direita (pill com ícone-círculo + texto — Normal/verde ou Alterado/vermelho, mesma família de `DESIGN_TOKENS.md` §1).
6. Seção "Próximos compromissos": header com título 600 20px + link "Ver agenda" (600 16px `#1B63C4`); lista de até 2 cards (mesmo padrão de card, mas com barra lateral colorida 4px em vez de badge — azul `#1B63C4` para consulta, verde `#10794E` para exame agendado): título `{Tipo} · {Profissional/Nome}` 600 17px, linha meta `{Quando}, {Hora} · {Local}` 400 16px.
7. Seção "Acesso rápido": título 600 20px; grade 2×2 (gap 10px) de tiles (fundo `#fff`, borda 1px `#EFF1F0`, radius 14, padding 14px 6px, min-height 48): ícone-tile 40×40 (Agenda: quadrado radius 12 fundo `#E9F1FD` borda 2px `#1B63C4`; Análise IA: círculo radius 999 fundo `#E8F5EE` borda 2px `#10794E`; Remédios: quadrado radius 12 fundo `#E8F5EE` borda 2px `#10794E`; Prevenção: quadrado radius 12 fundo `#FFF3DF` borda 2px `#8A5300`) + label 600 15px centralizado.
8. Bottom navigation bar (5 abas: **Início** ativo/Consultas/Exames/Remédios/Mais).
9. Home-indicator bar decorativa.

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Ícone de sino | Botão | Abrir central de notificações | Tela/painel de notificações — **não existe hoje** (fora de escopo; ver pendência §5) | Sempre visível; badge de não-lido condicional a haver notificação real |
| Card "Resumo de hoje" / pill "Ver agenda de hoje →" | Botão/card | Navega para a agenda do dia | `/appointments` (tela 2c, Bloco 2) | Sempre visível |
| Alerta "Prevenção em atraso" / botão "Agendar agora" | Card + botão | Abre fluxo de agendamento pré-preenchido para o item preventivo atrasado | `/add-appointment` (com params do tipo de exame/consulta preventiva) | Condicional — só aparece quando existe um item preventivo atrasado real (ver pendência §5); ausente no estado vazio |
| "Ver todos" (Últimos exames) | Link | Navega para a lista completa | `/exams` (tela 3a, Bloco 3, já implementada) | Sempre visível |
| Card de exame (item da lista) | Item de lista | `setSelectedDocument(document)` + navega | `/document-detail` (tela 3c) | Visível quando há exames recentes (já implementado em `HomeScreen.tsx` via `onNavigateToExamDetail`) |
| "Ver agenda" (Próximos compromissos) | Link | Navega para a agenda completa | `/appointments` (tela 2c) | Sempre visível — **gap**: hoje não existe esse link na Home |
| Card de compromisso (item da lista) | Item de lista | Navega para o detalhe/edição do compromisso | `/edit-appointment?id=...` (já existe como rota) | Visível quando há compromissos futuros — **gap**: hoje a Home nem lista compromissos reais |
| Tile "Agenda" (Acesso rápido) | Botão | Navega | `/appointments` | Sempre visível; já implementado (rotulado "Agendas" hoje) |
| Tile "Análise IA" (Acesso rápido) | Botão | Navega | `/ai` | Sempre visível; já implementado (rotulado "IA p/ Exames" hoje) |
| Tile "Remédios" (Acesso rápido) | Botão | Navega | `/medicines` | Sempre visível; já implementado |
| Tile "Prevenção" (Acesso rápido) | Botão | Navega | `/prevention` | Sempre visível; já implementado, mas hoje ocupa uma 5ª posição isolada (grid 1×1 abaixo do 2×2) em vez de completar o grid 2×2 do Canvas — ver `plan.md` (hoje há também um tile extra "Wearable" que não existe no Canvas 2b) |
| Bottom nav — "Início" | Aba ativa | N/A (já na tela) | — | Destacada (fundo `#E8F5EE`, texto/ícone `#0C6341`) |
| Bottom nav — outras abas | Navegação | `router.replace(tab.href)` | Consultas/Exames/Remédios/Mais | Sempre visível (já implementado via `BottomTabBar`/`AppShell`) |

## 5. Mapa de dados

Fontes reais disponíveis hoje: `MedicalDocument` (DynamoDB, via `useExamsData`) e `Appointment` (DynamoDB, via `useAppointmentsData`/`appointmentService`). Fonte mock hoje: `dashboardApi.ts` → `DASHBOARD_SNAPSHOT` (`src/mocks/dashboard.ts`), consumida por `useDashboardData.ts`.

| Widget do Canvas (2b) | Estado hoje | Fonte real disponível | Classificação | Observação / pendência |
|---|---|---|---|---|
| Saudação + data | Real (parcial) | `user.name` (`UserContext`, Cognito/Amplify) + `Date` local | **Real** | Já implementado (`getGreeting`, `todayLabel` via `getDashboardTodayLabel()` — função pura, não depende do mock, pode continuar) |
| Ícone de sino + badge de não-lido | **Não implementado** | — | **Pendência técnica formal** | Não existe nenhum model Amplify, serviço ou tela de notificações no código hoje. Não é um "de-mock" (não há nem mock disso) — é funcionalidade ausente. Recomendação: implementar o ícone estático (sem badge, sem ação) nesta EPIC como elemento visual de fidelidade ao Canvas, e registrar a central de notificações como pendência nova em `GAP_ANALYSIS.md` (fora do escopo Bloco 2/3/4 mapeados até aqui) — não inventar contagem de não lidos. |
| Card "Resumo de hoje" (texto "1 consulta às 15h · 2 medicamentos pendentes") | **Mockado hoje** (`summary.value`/`summary.status` de `DASHBOARD_SNAPSHOT`, exibido de forma incorreta — hoje mostra `72 bpm`/`Normal`, nem sequer o texto do Canvas) | Compostura possível a partir de `Appointment` (próximo compromisso de hoje, via `useAppointmentsData`) — medicamentos pendentes **não têm fonte real** (`MedicinesScreen`/`useMedicinesData` também é 100% mock, ver `medicinesApi.ts`) | **Parcial: de-mock possível para a parte de consultas; bloqueado para medicamentos** | Ver `plan.md` para a composição exata. A parte "medicamentos pendentes" só pode ser des-mockada quando o Bloco 3 (Medicamentos) tiver backend real — dependência cross-Bloco, não duplicar aqui a decisão de schema de medicamentos. |
| Alerta "Prevenção em atraso" | **100% mockado** (`preventiveAlert` de `DASHBOARD_SNAPSHOT`, hoje com copy genérica "Colesterol não medido há 14 meses", nem bate com o texto do Canvas "colonoscopia atrasada há 3 meses") | Nenhuma. Depende inteiramente da funcionalidade de Prevenção (tela 3e, `PreventionScreen.tsx`), que por sua vez é **100% mock e sem model Amplify** (`GAP_ANALYSIS.md` pendência #2, linha 72: "score preventivo e checklist precisam de fonte real, provavelmente derivado de exames/vacinas/consultas já persistidos") | **Bloqueado — depende do Bloco 3 Prevenção** | Este EPIC (Home) **não** deve resolver a modelagem de dados de Prevenção — essa decisão pertence à EPIC de `specs/.../prevencao` (Bloco 3, ainda não escrita). Aqui a Home apenas consome o resultado (quando existir) via um hook/serviço a ser criado por aquela EPIC. Até lá: **remover o card mockado da Home** (não simular "Prevenção em atraso" com texto fixo) — mostrar a seção apenas quando/se houver dado real, ou omiti-la nesta fase (ver `plan.md`). |
| Seção "Últimos exames" | **Real hoje** | `MedicalDocument` via `useExamsData` (`documents`, ordenado por `documentDate` desc, top 3 em `dashboard.tsx`) | **Real** | Já correto — mas falta o campo "laboratório" na linha de meta (mesmo gap documentado em `specs/03-exames-receitas/lista/spec.md` §5: campo não existe no schema `MedicalDocument`) e falta o **badge de status Normal/Alterado** (mesmo gap central do EPIC 3a — não há campo de resultado clínico no schema). Herda a mesma pendência já registrada em 3a; não deve ser resolvida separadamente aqui. |
| Link "Ver todos" (Últimos exames) | Ausente hoje | N/A (navegação, não dado) | **Real (a implementar)** | Trivial — apenas adicionar `router.push('/exams')`. |
| Seção "Próximos compromissos" | **Não implementado hoje** — `HomeScreen.tsx` usa `upcomingEvents` do `DASHBOARD_SNAPSHOT` mock (mistura consulta/exame/medicamento em ícones emoji, sem relação com `Appointment` real) | `Appointment` via `useAppointmentsData` (`appointments`, já filtrável/ordenável por `scheduledAt`) | **De-mock possível — dado real já existe** | `useAppointmentsData` já busca dados reais (`appointmentService`/Amplify), mas a Home hoje não o consome — usa o mock `upcomingEvents` em seu lugar. Este é o de-mock mais direto desta EPIC: compor a partir de `appointments` (futuros, ordenados, top 2). |
| Grid "Acesso rápido" (4 tiles) | Real (navegação) | N/A — são atalhos de navegação, não exibem dado dinâmico | **Real** | Já implementado; ajustes são só de composição visual (grid 2×2 correto, ícones/labels batendo com o Canvas: Agenda/Análise IA/Remédios/Prevenção) — ver `plan.md` para o tile "Wearable" extra que não existe no Canvas. |

Nenhum campo mockado desta tela deve permanecer silenciosamente mockado (regra 2 da constituição): "Resumo de hoje" (parte de medicamentos) e "Prevenção em atraso" ficam formalmente registrados como pendências dependentes de outros Blocos (Medicamentos e Prevenção, respectivamente) em `GAP_ANALYSIS.md`, não implementados com dado falso nesta EPIC.

## 6. Requisitos não-funcionais específicos
- **Paleta:** card de resumo usa exatamente `#0C6341` (verde 600, não o `#10794E` primário) conforme `DESIGN_TOKENS.md` §1; alerta de prevenção usa a família âmbar (`#FFF3DF`/`#F0D6A4`/`#8A5300`); badges de exame reaproveitam os 5 tokens semânticos canônicos (nunca cor sozinha).
- **Tipografia:** título de seção 600 20px (nunca abaixo do piso de 16–17px de corpo/apoio definido em `DESIGN_TOKENS.md` §2).
- **Toques mínimos:** ícone de sino 44×44, pill "Ver agenda de hoje →" ≥40px altura, botão "Agendar agora" 48px, tiles do grid min-height 48dp — todos conforme `DESIGN_TOKENS.md` §3.
- **4 estados padrão:** aplicado **por widget**, não pela tela inteira — cada seção (exames, compromissos) deve ter seu próprio tratamento de loading/vazio/erro/sucesso independente das demais (cenário de erro parcial em §2), divergindo do comportamento atual de `HomeScreen.tsx` que trata a tela inteira como um bloco único de estado.
- **LGPD:** dados exibidos (exames, compromissos, alertas de saúde) são sensíveis — nenhuma mudança de consentimento nesta tela (já coberto no onboarding), mas nenhum dado deve ser logado em texto plano (revisar `console.log`s de debug herdados de `useExamsData.ts`/`useAppointmentsData.ts`, mesma observação já feita em `specs/03-exames-receitas/lista/spec.md` §6).
- **Nenhuma quebra de dados existentes:** qualquer composição nova (ex.: resumo derivado de `Appointment`) é read-only sobre dados já persistidos, não introduz escrita nem mudança de schema nesta EPIC.

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas 2b: saudação+data, sino, card verde "Resumo de hoje", alerta âmbar "Prevenção em atraso" (condicional), "Últimos exames" (com "Ver todos"), "Próximos compromissos" (com "Ver agenda"), grid 2×2 "Acesso rápido" (Agenda/Análise IA/Remédios/Prevenção, sem tile extra "Wearable").
- [ ] "Últimos exames" continua usando dado 100% real (`useExamsData`), preservado.
- [ ] "Próximos compromissos" passa a usar dado 100% real (`useAppointmentsData`) em vez do mock `upcomingEvents` — de-mock completo.
- [ ] "Resumo de hoje" compõe a parte de consultas a partir de `Appointment` real; a parte de medicamentos pendentes **não** é mockada — omitida ou tratada como pendência explícita até o Bloco 3 (Medicamentos) ter backend real.
- [ ] "Prevenção em atraso" **não** exibe mais texto mockado fixo — seção condicional a dado real, ausente/oculta até a EPIC de Prevenção (Bloco 3) entregar uma fonte real; dependência documentada, não duplicada aqui.
- [ ] Ícone de sino renderizado sem badge de não-lido mockado (sem contagem falsa); central de notificações registrada como pendência nova, fora de escopo desta EPIC.
- [ ] Estados de loading/erro tratados por widget (exames e compromissos independentes) — erro em um não derruba a tela inteira.
- [ ] Estado vazio de cada lista (exames, compromissos) com copy e CTA apropriados quando o usuário não tem dados ainda.
- [ ] Links "Ver todos" (exames→`/exams`) e "Ver agenda" (compromissos→`/appointments`) implementados.
- [ ] Grid "Acesso rápido" com exatamente 4 tiles (Agenda/Análise IA/Remédios/Prevenção) em 2×2, ícones/cores batendo com o Canvas.
- [ ] Nenhum dado mockado permanece silencioso: toda pendência remanescente (medicamentos, prevenção, notificações) está formalmente registrada em `GAP_ANALYSIS.md`.

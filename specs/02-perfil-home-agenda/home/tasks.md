# TASKS: Home — Resumo, Indicadores e Acesso Rápido (Bloco 2)

Referência: `spec.md` e `plan.md` nesta mesma pasta. Nenhuma tarefa aqui toca `amplify/data/schemas/*`.

## 1. Dados — de-mock de "Próximos compromissos" e "Resumo de hoje"
- [ ] Em `src/app/(app)/dashboard.tsx`, importar e usar `useAppointmentsData()` ao lado de `useExamsData()`.
- [ ] Derivar `upcomingAppointments`: filtrar `appointments` para `scheduledAt >= agora`, ordenar por proximidade, pegar os 2 primeiros; mapear para o shape de card do Canvas (título `"{Tipo} · {Nome}"`, meta `"{Quando}, {Hora} · {Local}"`, cor da barra lateral por `appointment.type`).
- [ ] Derivar `todaySummaryText`: contar compromissos com data de hoje; montar frase `"{N} consulta(s) às {hora do mais próximo}"` ou `"Nenhum compromisso hoje"` quando vazio — **sem** cláusula de medicamentos (fonte não existe, ver `plan.md` §2).
- [ ] Remover o uso de `useDashboardData()` em `dashboard.tsx` (ou reduzir ao mínimo necessário só se algo ainda depender dele — checar antes de remover o arquivo/hook por completo, que não é obrigatório nesta EPIC).
- [ ] Confirmar que `recentExams` (já existente) continua vindo 100% de `useExamsData()`, sem alteração de lógica.

## 2. `HomeScreen.tsx` — remover mock, refazer estrutura
- [ ] Remover props e renderização da seção "Indicadores principais" (`metrics`, `MetricCard` x4) — sem correspondência no Canvas 2b nem fonte real.
- [ ] Remover props `summary`/`metrics`/`upcomingEvents`/`preventiveAlert` vindas do mock; substituir por props por widget: `todaySummaryText`, `appointmentsToday`, `upcomingAppointments`, `appointmentsLoading`, `appointmentsError`, `onRetryAppointments`, `recentExams`, `examsLoading`, `examsError`, `onRetryExams`.
- [ ] Reconstruir card "Resumo de hoje" com fundo sólido `#0C6341` (avaliar estender `Card` com variante `tone="brand"`/`solid` ou compor via `View` direta), título "Resumo de hoje", `todaySummaryText`, pill "Ver agenda de hoje →" navegando para `/appointments`.
- [ ] Adicionar ícone de sino no cabeçalho (44×44, borda `#DFE3E1`, glyph `Ionicons name="notifications-outline"`), sem badge (nenhuma contagem inventada); ação de toque pode ser um no-op documentado ou navegação para uma tela "em breve" — decidir no momento da implementação, registrar a escolha em comentário no código.
- [ ] Tornar a seção "Prevenção em atraso" condicional a uma prop opcional (`preventionAlert?: {...} | null`), renderizando `null`/nada quando ausente — não usar mais o `preventiveAlert` do mock; a prop fica `undefined`/`null` até a EPIC de Prevenção existir.
- [ ] Adicionar link "Ver todos" na seção "Últimos exames" (`router.push('/exams')`).
- [ ] Substituir seção "Próximos eventos" (mock) por "Próximos compromissos" usando `upcomingAppointments`/`EventCard` (ou variante com barra lateral), com link "Ver agenda" (`router.push('/appointments')`).
- [ ] Aplicar loading (`ScreenSkeleton` por seção) e erro (`EmptyState tone="error"` + retry) independentemente para o bloco de exames e o bloco de compromissos — remover o `isLoading`/`errorMessage` global que hoje esconde a tela inteira.
- [ ] Corrigir grid "Acesso rápido": remover tile "Wearable"; corrigir labels para "Agenda"/"Análise IA"/"Remédios"/"Prevenção"; montar como grid 2×2 único (não 2×2 + linha solta).

## 3. Estados e cenários (validação manual/QA)
- [ ] Cenário dashboard vazio: usuário sem exames nem compromissos → ambas as seções mostram `EmptyState` apropriado; card de resumo mostra copy neutra; seção de prevenção ausente.
- [ ] Cenário carregamento: skeleton aparece por seção enquanto os hooks carregam.
- [ ] Cenário erro parcial: simular falha de `useExamsData` mantendo `useAppointmentsData` OK (e vice-versa) — confirmar que só a seção afetada mostra erro+retry, o resto da tela continua funcional.
- [ ] Cenário notificação sem itens não lidos: sino renderiza sem badge vermelho.

## 4. Documentação / rastreabilidade
- [ ] Adicionar/atualizar em `GAP_ANALYSIS.md` a pendência de central de notificações (nova, não coberta pelas pendências #1–#7 atuais).
- [ ] Confirmar que a pendência #5 ("Resumo do Dashboard 2b") em `GAP_ANALYSIS.md` linha 75 é atualizada/fechada parcialmente (compromissos des-mockados) e mantida aberta só para a parte de medicamentos + prevenção, referenciando este `spec.md`/`plan.md`.
- [ ] Não modificar `GAP_ANALYSIS.md` de forma que duplique ou reabra a decisão de schema de Prevenção (pendência #2) ou Medicamentos (pendência #1) — apenas referenciar a dependência.

## 5. Fora de escopo (não fazer nesta EPIC)
- [ ] Não implementar model Amplify de notificações, medicamentos ou prevenção.
- [ ] Não implementar badge de status Normal/Alterado nem campo de laboratório em "Últimos exames" (herda decisão de `specs/03-exames-receitas/lista`).
- [ ] Não deletar `src/mocks/dashboard.ts`/`src/mocks/api/dashboardApi.ts`/`src/hooks/useDashboardData.ts` (ficam órfãos por ora; limpeza de código morto é decisão separada, fora desta EPIC).

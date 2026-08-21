# Tasks — Fundação: Estrutura de Navegação (5 abas + Mais)

## Configuração de navegação
- [x] Reescrever `APP_TABS` em `src/constants/navigation.ts` para exatamente 5 entradas, na ordem do Canvas: Início (`/dashboard`), Consultas (`/appointments`, id `agenda`), Exames (`/exams`), Remédios (`/medicines`, id `medicines`), Mais (`/more`, id `more`).
- [x] Atualizar o label exibido da 2ª aba de "Agenda" para "Consultas" (fiel ao Canvas), sem alterar o id interno `agenda` nem o href `/appointments`.
- [x] Definir ícone da aba "Remédios" (sugestão: `medkit`) e da aba "Mais" (sugestão: `ellipsis-horizontal`) — marcar como pendente de confirmação visual se necessário. (implementado com os ícones sugeridos; confirmação visual em dispositivo real segue pendente — sem simulador/dispositivo disponível neste ambiente)
- [x] Adicionar `MORE_MENU_ITEMS` (novo array de configuração) com os itens do hub Mais: Prevenção (`/prevention`), Assistente de IA (`/ai`), Perfil (`/profile`) — sem o item Vacinação por enquanto (ver task de follow-up abaixo).
- [x] Extrair os prefixos de rota "atrás de Mais" para uma constante (`MORE_ROUTE_PREFIXES` ou similar: `/more`, `/ai`, `/prevention`, `/profile`) reutilizada por `getActiveTabId`.
- [x] Reescrever `getActiveTabId(pathname)` para retornar `'more'` quando o pathname bater com qualquer prefixo de `MORE_ROUTE_PREFIXES`, mantendo o comportamento atual para `/exams`, `/appointments`, `/medicines`, e fallback `'dashboard'`.
- [x] Atualizar o comentário de cabeçalho de `src/constants/navigation.ts` (linhas 16-24) para refletir a nova estrutura de 5 tabs + Mais (o comentário atual já está desatualizado em relação ao código hoje).

## Tela do hub "Mais"
- [x] Criar `src/screens/MoreScreen.tsx`: header "Mais" (sem seta de voltar, é tab de primeiro nível) + lista vertical de cards a partir de `MORE_MENU_ITEMS`, seguindo o padrão visual de list-item card (bg branco, borda `#EFF1F0`, radius 14–16px, padding 14px, ícone tile 40–48px + título + subtítulo opcional + chevron).
- [x] Cada card navega via `router.push(item.href)` ao ser tocado.
- [x] Aplicar `accessibilityRole`, `accessibilityLabel` em cada card, consistente com o padrão já usado em `BottomTabBar.tsx`.
- [x] Criar rota fina `src/app/(app)/more.tsx` que importa e renderiza `MoreScreen` (mesmo padrão das demais rotas do grupo `(app)`, ex. `ai.tsx`, `profile.tsx`).
- [x] Confirmar que a tela respeita o tema claro/escuro (classes NativeWind `dark:` equivalentes às já usadas em outras telas do grupo `(app)`). (via `useThemeColors()`/`useColorScheme()`, mesmo padrão de `PreventionScreen.tsx`)

## AppShell / BottomTabBar
- [x] Confirmar que `AppShell.tsx` funciona sem alteração de código com o novo `APP_TABS` de 5 itens (deve funcionar, pois já itera genericamente — apenas validar em execução). (confirmado por leitura de código: itera `APP_TABS.map` e usa `getActiveTabId` genericamente, nenhuma alteração necessária)
- [x] Confirmar visualmente que `BottomTabBar.tsx` renderiza bem 5 itens (espaçamento, truncamento de label) em telas estreitas — ajustar `numberOfLines`/tamanho de fonte apenas se necessário (não deve exigir mudança de código no cenário normal). (confirmado por leitura de código: layout `flex-1` por item já escala para qualquer contagem; `numberOfLines={1}` já presente; nenhuma mudança de código necessária)
- [ ] Testar manualmente: tocar em cada uma das 5 abas a partir de cada uma das outras 4, confirmando `router.replace` e destaque visual corretos. (requer simulador/dispositivo — não disponível neste ambiente)

## Migração de `medicines` para tab de primeiro nível
- [x] Confirmar que `src/app/(app)/medicines.tsx` (`MedicinesScreen`) já funciona corretamente quando alcançado pela nova aba "Remédios" (era antes só alcançável via atalho do Dashboard) — sem mudança de código esperada, apenas validação. (rota inalterada; `getActiveTabId` agora retorna `'medicines'` para `/medicines`, casando com o novo `APP_TABS`)
- [x] Revisar se algum atalho existente (ex. "Acesso rápido" do Dashboard) que aponta para `/medicines` precisa de ajuste de copy agora que também é uma tab (não deve, mas conferir). (grep confirmou `router.push('/medicines')` em `dashboard.tsx`; nenhum ajuste necessário)

## Sub-rotas movidas para trás de "Mais"
- [x] Confirmar que `src/app/(app)/ai.tsx`, `src/app/(app)/prevention.tsx`, `src/app/(app)/profile.tsx` continuam funcionando sem alteração de path/arquivo — apenas deixam de estar na tab bar direta e passam a ser alcançadas via `/more`. (arquivos não movidos/renomeados)
- [x] Grep em todo `src/` por `router.push('/ai'`, `router.push('/prevention'`, `router.push('/profile'`, `href="/ai"` etc. (ex. atalhos do Dashboard citados em `CODE_INVENTORY.md`) para confirmar que nenhum link quebra com a migração — não deve haver mudança necessária, já que os paths não mudam. (grep encontrou apenas os 3 atalhos em `dashboard.tsx`, todos inalterados e funcionais)
- [ ] Validar manualmente o cenário "voltar" a partir de `/ai`, `/prevention`, `/profile` quando alcançados via `/more` — deve retornar à tela Mais (comportamento padrão de push/back do Expo Router). (requer simulador/dispositivo — não disponível neste ambiente)

## QA / verificação de aceite
- [ ] Rodar os cenários Given/When/Then da `spec.md` (navegar entre as 5 abas; abrir Mais; navegar de Mais para sub-tela e voltar; estado ativo em sub-tela de Mais) manualmente no simulador/dispositivo. (requer simulador/dispositivo — não disponível neste ambiente)
- [x] Confirmar que nenhuma URL de rota existente mudou (`/dashboard`, `/exams`, `/appointments`, `/medicines`, `/ai`, `/prevention`, `/profile`). (nenhum arquivo de rota movido/renomeado; apenas `src/constants/navigation.ts` e novo `more.tsx`)
- [ ] Confirmar touch targets ≥48dp em todos os itens da tab bar e da lista Mais. (itens de `MoreScreen` implementados com `minHeight: 48`; medição visual em dispositivo real segue pendente — sem simulador/dispositivo disponível neste ambiente)

## Limpeza / follow-ups (não bloqueantes desta EPIC)
- [x] Atualizar o comentário desatualizado no cabeçalho de `src/app/(app)/_layout.tsx` (lista "Estrutura do AppShell" não reflete a estrutura real, nem antes nem depois desta mudança) para descrever as 5 abas + Mais.
- [ ] Follow-up futuro (dependente da EPIC da tela 4e — Carteira de vacinação, `GAP_ANALYSIS.md` item 4e): quando `/vaccination` existir, adicionar o item "Carteira de vacinação" a `MORE_MENU_ITEMS` e ao conjunto `MORE_ROUTE_PREFIXES` usado por `getActiveTabId`. Registrado aqui para não ser esquecido, mas não bloqueia a conclusão desta EPIC de fundação. (explicitamente fora do escopo desta EPIC, per plan.md §7)

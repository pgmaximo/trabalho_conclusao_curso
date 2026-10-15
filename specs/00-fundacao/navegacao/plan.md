# Plano técnico — Fundação: Estrutura de Navegação (5 abas + Mais)

## 1. Objetivo e escopo

Migrar a navegação principal do app de 6 `APP_TABS` flat (dashboard/exams/appointments/ai/prevention/profile) — com `medicines` fora da tab bar — para exatamente 5 abas conforme `DESIGN_TOKENS.md` §"Bottom navigation bar": **Início · Consultas · Exames · Remédios · Mais**. Este plano cobre apenas a fundação de navegação (configuração de tabs, tela do hub Mais, lógica de aba ativa). Não cobre o conteúdo/fidelidade visual de cada tela de destino (isso é tratado nas EPICs de cada Bloco).

## 2. Estado atual vs. estado alvo

### Estado atual (`src/constants/navigation.ts`)
```ts
APP_TABS = [dashboard, exams, agenda(id)→/appointments, ai, prevention, profile] // 6 itens
getActiveTabId(pathname) // match direto 1:1 por prefixo de path
```
`medicines` é uma rota real (`src/app/(app)/medicines.tsx`) mas não está em `APP_TABS` — só alcançável via atalho do Dashboard.

### Estado alvo
5 tabs de primeiro nível, na ordem do Canvas:

| Ordem | Label (Canvas) | id proposto | href | Ícone (base Ionicon) |
|---|---|---|---|---|
| 1 | Início | `dashboard` | `/dashboard` | `home` (mantém) |
| 2 | Consultas | `agenda` | `/appointments` | `calendar` (mantém) |
| 3 | Exames | `exams` | `/exams` | `document-text` (mantém) |
| 4 | Remédios | `medicines` | `/medicines` | `medkit` (novo — a confirmar em revisão visual, Canvas não especifica ícone da tab "Remédios" fora do 4-state genérico) |
| 5 | Mais | `more` | `/more` | `ellipsis-horizontal` (novo — Canvas nunca desenha a aba "Mais" com ícone explícito; usar convenção padrão de "more/overflow" do Ionicons) |

Observação de nomenclatura: o Canvas rotula a 2ª aba "Consultas" — o código já usa o id interno `agenda` mapeado para o href `/appointments` e o label visível hoje é "Agenda" (não "Consultas"). Esta migração corrige o **label exibido** para "Consultas" (fiel ao Canvas) mas não precisa renomear a rota/arquivo (`appointments.tsx` continua sendo o arquivo, evitando renomear rota + risco de link quebrado — regra 5 da constituição, "nada quebra o que já funciona").

Rotas que saem da tab bar de primeiro nível e passam a ser alcançadas via "Mais" (mantendo exatamente o mesmo path/arquivo, sem mover fisicamente o arquivo em `src/app/(app)/`):
- `ai` → `/ai` (`ChatBotScreen`)
- `prevention` → `/prevention` (`PreventionScreen`)
- `profile` → `/profile` (`ProfileScreen`)

Nova rota adicionada ao hub, ainda sem tela implementada (fora do escopo desta EPIC, ver `GAP_ANALYSIS.md` item 4e):
- `vaccination` → `/vaccination` (tela `CRIAR`, listada no menu Mais desde já como item de configuração; navegação real só funcionará quando a rota existir — ver Riscos).

## 3. Mudanças em `src/constants/navigation.ts`

- Renomear/redefinir `APP_TABS` para conter apenas as 5 entradas de primeiro nível (tabela acima), na ordem do Canvas.
- Adicionar um novo array de configuração estática para o hub Mais, ex. `MORE_MENU_ITEMS`, com `{ icon, label, description?, href, id }` para: Prevenção, Assistente de IA, Carteira de vacinação, Perfil — mesma filosofia de "config de navegação como dado", coerente com o padrão já usado por `APP_TABS`.
- Reescrever `getActiveTabId(pathname)`:
  - Mantém os `if (pathname.startsWith(...))` diretos para `/exams`, `/appointments`, `/medicines`.
  - Adiciona um conjunto de prefixos que retornam `'more'`: `/more`, `/ai`, `/prevention`, `/profile`, `/vaccination`.
  - Fallback continua sendo `'dashboard'` (comportamento inalterado para `/dashboard` e qualquer rota não mapeada, ex. `/document-detail`, que hoje também cai no fallback — isso já é o comportamento atual e não é alterado por esta EPIC).
  - Abordagem recomendada: extrair a lista de prefixos "atrás de Mais" para uma constante (`MORE_ROUTE_PREFIXES`) para que adicionar uma futura tela ao hub (ex. quando 4e for implementada) seja uma mudança de 1 linha, não uma nova ramificação de `if`.

## 4. Nova tela do hub "Mais" (`src/app/(app)/more.tsx`)

- Nova rota dentro do grupo `(app)`, renderizada pelo mesmo `AppShell`/`Slot` — não precisa de layout próprio.
- Componente de tela proposto: `src/screens/MoreScreen.tsx` (seguindo o padrão existente de `src/screens/*Screen.tsx` + rota fina em `src/app/(app)/more.tsx` que só importa e renderiza o componente, igual às demais rotas do grupo `(app)`).
- Conteúdo: renderiza `MORE_MENU_ITEMS` de `navigation.ts` como lista de cards (ver `spec.md` §3), cada item navegando via `router.push(item.href)`.
- Sem dependência de dados remotos/Amplify — é puramente uma tela de navegação estática, então não há decisão de schema a documentar aqui (diferente das pendências #1/#2/#3 do `GAP_ANALYSIS.md`).

## 5. Mudanças em `AppShell.tsx` / `BottomTabBar.tsx`

- `AppShell.tsx`: nenhuma mudança estrutural necessária — já itera `APP_TABS` genericamente e chama `getActiveTabId`/`router.replace`. Only o conteúdo de `APP_TABS` muda (5 itens em vez de 6), então este componente funciona sem alteração de código.
- `BottomTabBar.tsx`: nenhuma mudança de contrato necessária — já é agnóstico à quantidade/conteúdo de `items`. Validar apenas que 5 itens (em vez de 6) continuam com bom espaçamento em telas estreitas (layout já é `flex-1` por item, escala automaticamente) — item de QA visual, não mudança de código.

## 6. Impacto em links internos existentes

Buscar (grep) todos os `router.push`/`router.replace`/`<Link href=` que apontam para `/ai`, `/prevention`, `/profile` fora da tab bar (ex.: atalhos de "Acesso rápido" no Dashboard, mencionados em `CODE_INVENTORY.md` linha 39) — esses continuam funcionando sem alteração, pois os paths não mudam. Nenhum destino de navegação precisa ser reescrito, apenas a tab bar que os expõe diretamente.

## 7. Riscos e decisões em aberto

- **Vacinação (`/vaccination`) ainda não existe como rota.** Incluir o item no menu Mais desde já cria um link que 404s (ou precisa de guarda) até a EPIC da tela 4e ser implementada. Duas opções: (a) adicionar o item já em `MORE_MENU_ITEMS` e criar a tela 4e como dependência bloqueante desta EPIC; (b) adicionar o item ao hub apenas quando a tela 4e for implementada, mantendo o hub com 3 itens por enquanto. **Decisão recomendada:** opção (b) — não bloquear a fundação de navegação por uma tela de outro Bloco (regra 8 da constituição — documentar e seguir); `tasks.md` inclui uma tarefa de follow-up explícita para adicionar o item quando 4e existir.
- **Ícone da aba "Remédios" e da aba "Mais"** não são especificados literalmente no Canvas (que nunca desenha essas duas abas em detalhe com glifo confirmado). Escolha de `medkit` e `ellipsis-horizontal` é uma inferência de convenção Ionicons razoável, a validar em revisão visual — não bloqueia implementação, é um ajuste de baixo custo se trocado depois.
- **Label "Consultas" vs. id interno `agenda`**: manter o id interno (`agenda`) para não tocar em `href`/arquivo de rota, mudando apenas o label exibido — decisão de menor risco, alinhada à regra 5 (nada quebra o que já funciona) e regra 3 (reaproveitar o que já existe antes de expandir).
- **Stack existente respeitado (regra 3 da constituição):** nenhuma biblioteca nova é necessária — Expo Router já suporta a rota adicional `more.tsx` e o padrão de navegação por push/replace já em uso é suficiente para os cenários da spec (não é necessário React Navigation, nested navigators, ou uma lib de tab bar dedicada).

## 8. Ordem de implementação sugerida

1. Atualizar `src/constants/navigation.ts` (novo `APP_TABS` de 5 itens + `MORE_MENU_ITEMS` + `getActiveTabId` revisado).
2. Criar `src/screens/MoreScreen.tsx` + rota fina `src/app/(app)/more.tsx`.
3. Validar visualmente a tab bar com 5 itens e o estado ativo "Mais" nas 3 sub-telas (`/ai`, `/prevention`, `/profile`).
4. Grep de todos os pontos de navegação para `/ai`, `/prevention`, `/profile`, `/medicines` para confirmar que nenhum precisa de ajuste.
5. Atualizar comentários desatualizados em `src/app/(app)/_layout.tsx` (a lista de "Estrutura do AppShell" no cabeçalho do arquivo já está desatualizada mesmo antes desta EPIC — não reflete os 6 tabs atuais nem a estrutura real; corrigir para refletir as 5 abas + Mais).

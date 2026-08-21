# EPIC: Fundação — Estrutura de Navegação (5 abas + Mais)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela 1a (referência fixa — documenta a barra de 5 abas e descarta explicitamente uma alternativa de 7 abas); telas 2b, 2c, 3a, 3d, 4a, 4b (todas renderizam a barra de 5 abas em uso real); tela 3e (Prevenção, alcançada a partir de "Mais", com a aba "Mais" destacada como ativa).
- Rota/arquivo no código (existente ou proposto):
  - `src/constants/navigation.ts` — hoje define `APP_TABS` com 6 entradas flat (dashboard/exams/appointments/ai/prevention/profile); precisa ser reduzido a 5 tabs reais + lógica de detecção de sub-rotas do hub "Mais".
  - `src/components/AppShell.tsx` — consome `APP_TABS`/`getActiveTabId`, sem mudança estrutural, só nos dados que injeta na tab bar.
  - `src/components/BottomTabBar.tsx` — componente visual, sem mudança de contrato esperada.
  - `src/app/(app)/_layout.tsx` — layout do grupo `(app)`, sem mudança estrutural.
  - Nova rota proposta para o hub "Mais": `src/app/(app)/more.tsx` (tela de menu).
  - Rotas existentes que passam a viver "atrás" de Mais (mantendo o path, sem quebrar links): `src/app/(app)/ai.tsx`, `src/app/(app)/prevention.tsx`, `src/app/(app)/profile.tsx`.
  - Rota já existente e fora das tabs hoje, que se torna tab de primeiro nível: `src/app/(app)/medicines.tsx` (vira "Remédios").
  - Rota nova, fora do escopo de implementação desta EPIC de fundação mas referenciada pelo hub: Carteira de vacinação (tela 4e, `CRIAR` — ver `GAP_ANALYSIS.md` Bloco 4), a ser roteada futuramente em algo como `src/app/(app)/vaccination.tsx`, listada no hub "Mais" desde já como item de menu (mesmo antes da tela existir, ver Ambiguidade documentada).
- Ator(es): usuário final autenticado (qualquer usuário já passou do onboarding e está dentro do grupo `(app)`).

## 2. História da funcionalidade
Como usuário final, quero navegar entre as áreas principais do app (Início, Consultas, Exames, Remédios) por uma barra de abas fixa e acessar as demais funcionalidades (Prevenção, Assistente de IA, Perfil, Vacinação) por um hub central "Mais", para que eu encontre rapidamente o que uso com frequência sem uma barra de abas poluída, e ainda assim descubra as funcionalidades secundárias sem me perder.

### Cenários (Given/When/Then)

**Cenário 1 — Navegar entre as 5 abas**
- Dado que estou em qualquer tela dentro do grupo `(app)`
- Quando toco em uma das 5 abas da barra inferior (Início, Consultas, Exames, Remédios, Mais)
- Então sou levado à rota correspondente e a aba tocada passa a exibir o estado ativo (cápsula de fundo + ícone/texto na cor primária)

**Cenário 2 — Abrir o hub Mais**
- Dado que estou em qualquer tela do app
- Quando toco na aba "Mais"
- Então vejo uma tela de menu com links para Prevenção, Assistente de IA, Perfil e Vacinação (ver Ambiguidade documentada), cada item com ícone, título e, quando fizer sentido, uma descrição curta
- E a aba "Mais" aparece com o estado visual ativo

**Cenário 3 — Navegar de Mais para uma sub-tela e voltar**
- Dado que estou na tela do hub "Mais"
- Quando toco em um dos itens do menu (ex.: "Assistente de IA")
- Então navego para a tela correspondente (`/ai`)
- E ao tocar em "voltar" (seta/gesto), retorno para a tela do hub "Mais" (não para Início)

**Cenário 4 — Estado da aba ativa numa sub-tela de Mais**
- Dado que estou em uma sub-tela alcançada a partir de Mais (ex.: `/ai`, `/prevention`, `/profile`, futuramente `/vaccination`)
- Quando observo a barra de abas inferior
- Então a aba "Mais" — e não nenhuma outra — aparece destacada como ativa, reproduzindo o comportamento visto nas telas 3e, 4a e 4b do design (todas mostram "Mais" ativo mesmo fora da tela do hub em si)

## 3. Estrutura da página

**Barra de abas (5 itens, reaproveitando `BottomTabBar.tsx` sem mudança de contrato):**
Início (`home`) · Consultas (`calendar`) · Exames (`document-text`) · Remédios (existe hoje como `MedicinesScreen`, ícone a definir, sugestão `medkit`) · Mais (`ellipsis-horizontal` ou `menu`, ícone a confirmar em revisão visual — não especificado no Canvas pois a tela "Mais" nunca é desenhada).

**Estrutura proposta da tela "Mais" (`more.tsx`) — decisão documentada:**
Como o Canvas nunca desenha essa tela, a estrutura abaixo segue o padrão de lista de itens já usado em outras telas do design (ex.: "Últimos exames"/"Próximos compromissos" em 2b, listas de 3a/3d/4e) para manter consistência visual sem inventar um padrão novo:
- Header simples: título "Mais" (estilo Título, 600 28px), sem seta de voltar (é uma tab de primeiro nível).
- Lista vertical de cards de menu (mesmo padrão visual de list-item card: bg branco, borda 1px `#EFF1F0`, radius 14–16px, padding 14px), cada item com: ícone tile à esquerda (40–48px, bg `#E8F5EE`, glifo `#0C6341`), título (Corpo forte, 17px 600), subtítulo curto opcional (Apoio, 16px), chevron `>` à direita.
- Itens do menu, em ordem: Prevenção & Alertas, Assistente de IA, Carteira de vacinação, Perfil.
- Sem busca, sem filtros, sem estados de carregamento/erro adicionais — é uma lista estática de navegação (dados de configuração local, não uma consulta de rede).

## 4. Mapa de navegação (todo botão/elemento clicável)

| Elemento | Tipo | Ação | Destino (rota/tela) | Condição |
|---|---|---|---|---|
| Aba "Início" | Tab bar item | `router.replace` | `/dashboard` | Sempre visível |
| Aba "Consultas" | Tab bar item | `router.replace` | `/appointments` | Sempre visível |
| Aba "Exames" | Tab bar item | `router.replace` | `/exams` | Sempre visível |
| Aba "Remédios" | Tab bar item | `router.replace` | `/medicines` | Sempre visível |
| Aba "Mais" | Tab bar item | `router.replace` | `/more` | Sempre visível |
| Item "Prevenção & Alertas" (tela Mais) | List item card | `router.push` | `/prevention` | Sempre visível no menu Mais |
| Item "Assistente de IA" (tela Mais) | List item card | `router.push` | `/ai` | Sempre visível no menu Mais |
| Item "Carteira de vacinação" (tela Mais) | List item card | `router.push` | `/vaccination` (rota ainda não implementada — ver GAP_ANALYSIS 4e) | Visível no menu; navegação real pendente da criação da tela 4e |
| Item "Perfil" (tela Mais) | List item card | `router.push` | `/profile` | Sempre visível no menu Mais |

## 5. Mapa de dados

N/A para dados remotos. A lista de itens do menu "Mais" é um array estático de configuração local (análogo a `APP_TABS` hoje), definido em código (ex.: `MORE_MENU_ITEMS` em `src/constants/navigation.ts`), sem chamada a Amplify/DynamoDB — mesma natureza de `APP_TABS`.

## 6. Requisitos não-funcionais específicos
- Touch targets: cada aba e cada item da lista Mais deve respeitar o mínimo de 48dp de área tocável (DESIGN_TOKENS.md §3), consistente com o restante do app.
- Estado ativo visual: quando a rota atual for uma sub-rota do hub Mais (`/ai`, `/prevention`, `/profile`, `/vaccination`), a aba "Mais" deve ser a única marcada como ativa na barra — nunca nenhuma aba marcada, e nunca uma aba "fantasma" ativa para uma rota que não está mais na barra.
- Acessibilidade: manter `accessibilityRole="button"`, `accessibilityState={{selected}}` e `accessibilityLabel` já presentes em `BottomTabBar.tsx`; aplicar o mesmo padrão aos itens de lista da tela Mais (role button/link, label descritivo).
- Sem quebra de deep link: rotas que migram para "atrás de Mais" (`/ai`, `/prevention`, `/profile`) devem manter exatamente o mesmo path — só muda de onde são alcançadas na tab bar, não a URL, para não quebrar links já persistidos em qualquer parte do app (ex.: `router.push('/ai')` usado no acesso rápido do Dashboard).

## 7. Critérios de aceite
- [ ] `APP_TABS` (ou equivalente renomeado) expõe exatamente 5 entradas: dashboard, appointments, exams, medicines, more — nesta ordem, com os ícones/labels do Canvas (Início/Consultas/Exames/Remédios/Mais).
- [ ] `medicines` deixa de ser uma rota "órfã" da tab bar e passa a ser a 4ª aba (Remédios).
- [ ] Existe uma nova rota `src/app/(app)/more.tsx` renderizando a lista de itens descrita na seção 3.
- [ ] `getActiveTabId` retorna `'more'` para os pathnames `/ai`, `/prevention`, `/profile` e (quando existir) `/vaccination`, além de `/more`.
- [ ] Nenhuma URL de rota existente (`/ai`, `/prevention`, `/profile`, `/dashboard`, `/exams`, `/appointments`, `/medicines`) muda de path nesta migração.
- [ ] A navegação por `router.replace` nas 5 abas e `router.push` nos itens do hub Mais preserva a pilha de forma que "voltar" a partir de uma sub-tela de Mais retorna à tela Mais (comportamento padrão de push/back do Expo Router, sem necessidade de lógica customizada).
- [ ] A ambiguidade da estrutura da tela "Mais" está documentada nesta spec (ver seção abaixo) e não bloqueou a definição dos critérios acima.

## Ambiguidade documentada

**O que o Canvas não mostra:** nenhuma das 25 telas exportadas no Claude Design desenha a tela do hub "Mais" propriamente dita. As evidências disponíveis são indiretas: (1) a tela 1a documenta a barra de 5 abas — Início/Consultas/Exames/Remédios/Mais — e explicitamente descarta uma variante de 7 abas por forçar labels abaixo do piso de legibilidade (11px), confirmando que "Mais" é um hub de overflow deliberado, não um acidente de design; (2) as telas 3e (Prevenção), 4a (Assistente de IA) e 4b (Perfil) mostram a aba "Mais" destacada como ativa na barra inferior, confirmando que essas três telas — e por extensão 4e (Vacinação, mesmo bloco 4) — são alcançadas "através" de Mais; (3) em nenhum lugar há um mockup de uma tela intermediária de menu/lista.

**Interpretação escolhida:** tratar "Mais" como uma 5ª tab de primeiro nível que renderiza uma tela de menu (`/more`), listando os 4 destinos identificados (Prevenção, Assistente de IA, Vacinação, Perfil) como cards de lista navegáveis — o mesmo padrão visual de list-item card já usado em outras partes do design (2b, 3a, 3d, 4e). As sub-telas mantêm suas URLs atuais (`/ai`, `/prevention`, `/profile`) para não quebrar navegação existente (ex.: atalhos do Dashboard) e a barra de abas continua marcando "Mais" como ativa enquanto o usuário estiver em qualquer uma delas — reproduzindo exatamente o comportamento visto em 3e/4a/4b.

**Por que essa interpretação e não outras:**
- Um menu/lista é o padrão universal de "More tab" em apps mobile (iOS Human Interface Guidelines "More" tab, padrão análogo no Android); é a leitura mais óbvia e menos arriscada dado que o design já usa padrões de lista extensivamente em outras telas.
- Alternativas descartadas: (a) um sheet/modal ao tocar em "Mais" em vez de uma tela de rota própria — descartado porque o padrão de bottom sheet no Canvas (visto em 3a) é reservado para ações rápidas/curtas ("Adicionar documento"), não para navegação estrutural entre 4 telas inteiras; (b) manter Prevenção/IA/Perfil como abas ocultas acessíveis só por atalhos do Dashboard, sem hub "Mais" nenhum — descartado porque contradiz diretamente o que a tela 1a e as telas 3e/4a/4b mostram (aba "Mais" existe e fica ativa).
- Vacinação (4e) é incluída no menu Mais mesmo sem tela implementada ainda (status `CRIAR` no `GAP_ANALYSIS.md`) porque pertence ao mesmo Bloco 4 e a navegação de Mais deve estar pronta para recebê-la; o item de menu pode apontar para uma rota placeholder até a tela 4e ser implementada em sua própria EPIC.
- Por regra 8 da constituição, essa ambiguidade não bloqueia a execução — a interpretação acima é a base para `plan.md`/`tasks.md` e pode ser revisada em uma futura sincronização com o Canvas se uma tela "Mais" explícita for adicionada ao design.

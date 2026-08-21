# EPIC: Fundação — Design Tokens & Componentes Base

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 1a (Sistema de design, referência fixa) em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html`
- Rota/arquivo no código (existente ou proposto): `src/constants/themeTokens.json`, `src/constants/theme.ts`, `tailwind.config.js`, `src/components/*` (não é uma rota, é infraestrutura transversal consumida por todas as ~17 telas roteadas)
- Ator(es): ambos (usuário final e empresa) — todo elemento visual do app, em qualquer perfil de usuário, é composto a partir destes tokens e componentes.

## 2. História da funcionalidade
Como desenvolvedor(a) mantendo o SuaSaúde, quero que todas as cores, tipografia, espaçamento, raios e componentes de UI derivem de um único conjunto de tokens fiel ao Canvas do Claude Design (Tela 1a), para que qualquer tela implementada nas próximas fases herde automaticamente a identidade visual correta — verde `#10794E`/azul `#1B63C4`, tipografia IBM Plex Sans, contraste AA, dark mode coerente — sem precisar redefinir cor ou medida tela a tela.

### Cenários (Given/When/Then)
- **Estado vazio (token ausente):** Dado que um componente (ex.: `Badge`) referencia uma chave de cor que não existe em `themeTokens.json`, quando o app é buildado, então o build falha em tempo de compilação (tipo `ThemeColors` do TypeScript) em vez de renderizar `undefined`/transparente silenciosamente em produção.
- **Carregamento (fonte):** Dado que o app inicia e a fonte IBM Plex Sans ainda não terminou de carregar via `expo-font`, quando qualquer tela com texto é montada, então o texto é exibido com a fonte de sistema (`system-ui`) como fallback — nunca em branco/invisível — até a fonte customizada resolver.
- **Sucesso (renderização consistente):** Dado que um componente `Button` variante `primary` é renderizado em light mode, quando comparado ao Canvas 1a, então a cor de fundo é `#10794E`, texto branco 600/17px, altura 56px, raio 14px — pixel-equivalente ao especificado em `DESIGN_TOKENS.md` §4.
- **Erro/gap de tema (dark mode):** Dado que um componente hoje usa `COLORS`/`FONTS` estáticos importados de `theme.ts` (ex.: `Badge.tsx`, `FilterChips.tsx`, `BottomSheet.tsx`) em vez do hook `useThemeColors()`, quando o usuário alterna para tema escuro, então esse componente permanece com as cores do tema claro — comportamento considerado defeito a corrigir nesta Fundação (ver `plan.md` §"Componentes com tema estático").
- **Validação (contraste):** Dado que um novo token de cor semântica é adicionado (ex.: `warning`, `danger`), quando aplicado a texto sobre fundo claro ou escuro, então o par deve atingir no mínimo contraste AA (4.5:1 texto normal / 3:1 texto grande), conforme os pares já validados em `DESIGN_TOKENS.md` (`#10794E` AA 5.5:1, `#1B63C4` AA 4.9:1, `#4FC58C` AA 8.6:1, `#8FB8F7` AA 7.9:1).

## 3. Estrutura da página
Não é uma página — é a estrutura do sistema de tokens e componentes átomo/molécula que sustenta todas as páginas:

- **Paleta de cor**: ramp verde primário (10 degraus, base `#10794E`), ramp azul secundário (10 degraus, base `#1B63C4`), 5 famílias semânticas (success/warning/error/info/neutral, cada uma com par texto+ícone, badge-bg, badge-border), neutros/superfícies (background, surface, border, texto primário/secundário/terciário/placeholder), tema escuro completo com os mesmos papéis semânticos invertidos em luminância.
- **Tipografia**: família `IBM Plex Sans` (400–700) para UI, `IBM Plex Mono` reservada à tela de referência do design system (não usada em telas reais); escala nomeada de 7 estilos (Título 28/600, Subtítulo 22/600, Seção 20/600, Corpo 17/400 — piso mínimo de corpo —, Corpo forte 17/600, Apoio 16/400 — piso absoluto —, Rótulo 14/600 com letter-spacing).
- **Espaçamento e raio**: escala de espaçamento 4·8·12·16·24·32·40; raios 14px (campo/botão), 20px (card, 16px em variantes menores, 12px em chips), 999px (pílula/avatar); alvos de toque mínimo 48dp (56dp para ação primária).
- **Componentes átomo** que consomem os tokens acima: `Button` (variantes primary/secondary/social/destructive/disabled/loading), `AuthInput`/`FormField` (estados default/focus/error), `Card` (variantes surface/soft/outlined/accent), `Badge`/status pill (5 famílias semânticas), `BottomSheet`, `FilterChips`/chips de seleção, `EmptyState`, `SocialButton`, além do padrão de 4 estados (carregando/vazio/erro/sucesso) documentado na Tela 1a e reutilizado em todas as listas/formulários/uploads do app.

## 4. Mapa de navegação
N/A — este EPIC não introduz nem altera rotas do Expo Router. Ele é consumido por todas as rotas existentes (`src/app/**`) através de importações de `@/constants/theme` e `@/components/*`, mas não define nenhuma tela ou fluxo de navegação próprio. A reestruturação da barra de navegação inferior (5 abas + "Mais") é tratada como item de Fundação separado (ver `GAP_ANALYSIS.md` §0, linha "Estrutura de navegação inferior") e não faz parte deste EPIC de tokens/componentes.

| Origem | Destino | Trigger |
|---|---|---|
| — | — | N/A (sem navegação própria) |

## 5. Mapa de dados
Não há dados de usuário/backend — os "dados" deste EPIC são os próprios tokens de design, estáticos e versionados em código-fonte (não em DynamoDB/S3/Cognito). Cada token tem: nome, valor atual (código), valor alvo (Canvas 1a), fonte técnica.

| Token | Valor atual (`themeTokens.json`) | Valor alvo (Canvas 1a / `DESIGN_TOKENS.md`) | Fonte técnica |
|---|---|---|---|
| `primary` (light) | `#00C853` | `#10794E` | `src/constants/themeTokens.json` → `light.primary` |
| `primaryDark` (light) | `#00A044` | `#0C6341` | `light.primaryDark` |
| `secondary` (light) | `#2196F3` | `#1B63C4` | `light.secondary` |
| `primary` (dark) | `#00E676` | `#4FC58C` | `themeTokens.json` → `dark.primary` |
| `secondary` (dark) | `#64B5F6` | `#8FB8F7` | `dark.secondary` |
| `fontFamily.sans` | `Basic-Regular` (fonte única, peso fixo) | `IBM Plex Sans` (400/500/600/700) | `tailwind.config.js` `theme.extend.fontFamily.sans` + `theme.ts` |
| Escala de corpo mínimo | `body: 15px` | `Corpo: 17px` (piso) | `theme.ts` `buildTypography()` |
| Raio de botão/card | `borderRadius.app: 20px` / `card: 28px` | Botão/campo `14px`, Card `20px` (16px variantes menores) | `tailwind.config.js` + `RADII` em `theme.ts` |

Não há origem DynamoDB/S3/Cognito para este item — regra 2 da constituição ("nenhum dado mockado permanece") não se aplica a tokens estáticos de design.

## 6. Requisitos não-funcionais específicos
- **Acessibilidade (contraste AA)**: todo par cor-de-texto/cor-de-fundo introduzido deve atingir AA (4.5:1 texto normal, 3:1 texto grande ≥18px/14px-bold), replicando os valores já auditados em `DESIGN_TOKENS.md` (`#10794E` 5.5:1, `#1B63C4` 4.9:1 no claro; `#4FC58C` 8.6:1, `#8FB8F7` 7.9:1 no escuro). Nenhum indicador de status pode depender só de cor — sempre ícone + texto + pill (regra explícita da Tela 1a).
- **Consistência dark/light**: todo componente novo ou migrado deve ler cor via `useThemeColors()` (hook reativo ao `ThemeContext`) — nunca via `COLORS`/`FONTS` estáticos importados de `theme.ts`, que travam no tema claro. Isso corrige uma classe de bug identificada em `Badge.tsx`, `FilterChips.tsx` e `BottomSheet.tsx` (ver `CODE_INVENTORY.md` §4 e `plan.md`).
- **Toque/tamanho mínimo**: campos e botões não podem ficar abaixo de 48dp de altura tocável; ação primária deve manter 56dp.
- **Performance de re-render**: `useThemeColors()` já deriva de um único `useContext(ThemeContext)` — trocar `COLORS`/`FONTS` estáticos por esse hook nos componentes afetados não deve introduzir re-render em cascata desnecessário (o hook já é usado hoje em `Button`/`AuthInput`/`SocialButton`/`EmptyState` sem problema reportado); tokens de espaçamento/raio que não dependem de tema (`SPACING`, `RADII`) podem continuar como constantes estáticas.
- **Fidelidade tipográfica sem regressão de performance**: a troca de `Basic-Regular` (fonte única) para IBM Plex Sans com 4 pesos via `expo-font` deve carregar todos os pesos antes do primeiro paint relevante (ou usar `SplashScreen.preventAutoHideAsync`), para não introduzir "flash of unstyled font" perceptível.

## 7. Critérios de aceite
- [ ] `themeTokens.json` (light e dark) reflete exatamente os hex do Canvas 1a/`DESIGN_TOKENS.md` para `primary`, `primaryDark`/`primary 600`, `secondary`, e todas as 5 famílias semânticas (success/warning/danger/info/neutral).
- [ ] `theme.ts` não contém mais comentário de cabeçalho divergente do JSON real (linhas 17-21 atuais citam `#1D9E75`/`#185FA5`, que não são nem o valor antigo nem o novo).
- [ ] A escala tipográfica em `buildTypography()` é renomeada/realinhada para os 7 estilos nomeados do Canvas (Título/Subtítulo/Seção/Corpo/Corpo forte/Apoio/Rótulo) com os tamanhos mínimos corretos (corpo nunca abaixo de 17px, apoio nunca abaixo de 16px).
- [ ] Fonte IBM Plex Sans (400/500/600/700) está registrada via `expo-font` e referenciada em `tailwind.config.js` `fontFamily.sans`, substituindo `Basic-Regular`.
- [ ] `Button`, `AuthInput`/`FormField`, `Card`, `Badge`, `EmptyState`, `BottomSheet`, `FilterChips`/chips de seleção consomem exclusivamente tokens via `useThemeColors()`/classes Tailwind `app-*`/`app-dark-*` — nenhum hex hardcoded remanescente (ex.: `'#fff'` em `FilterChips.tsx`).
- [ ] `Button` ganha as variantes ausentes hoje (`social`, `destructive`, `loading`, `disabled` com motivo textual) descritas em `DESIGN_TOKENS.md` §4, mantendo a variante única de "botão primário por tela" declarada no Canvas.
- [ ] Todos os pares cor-de-texto/cor-de-fundo novos atingem AA, documentado par a par no `plan.md`.
- [ ] Nenhuma tela roteada quebra visualmente (checagem manual/smoke test) após a troca de tokens — regra 5 da constituição ("nada quebra o que já funciona").
- [ ] Nenhum código de tela (`src/app/**`, `src/screens/**`) foi alterado neste EPIC além dos arquivos de tokens/componentes listados em §1 — mudanças de tela são escopo dos EPICs de Bloco 1-4.

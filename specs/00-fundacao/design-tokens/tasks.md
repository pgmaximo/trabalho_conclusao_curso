# Tasks: Fundação — Design Tokens & Componentes Base

Checklist de implementação para a Fase 3 do SDD. Seguir `plan.md` para valores exatos. Marcar cada item ao concluir; nenhum item aqui deve ser executado antes da Fase 3.

## Tokens de cor

- [x] Atualizar `src/constants/themeTokens.json` (`light`) com a paleta verde `#10794E`/`primaryDark #0C6341`/`primarySoft #E8F5EE` e azul `#1B63C4`/`secondarySoft #E9F1FD`, conforme `plan.md` §2.1.
- [x] Atualizar `src/constants/themeTokens.json` (`dark`) com `primary #4FC58C`, `secondary #8FB8F7`, `background #0E1413`, `surface #18201E`, `inputBackground #222B29`, `text #EDF2F0`, `textSecondary #AEBBB6`, `border #33403C`, conforme `plan.md` §2.2.
- [x] Adicionar/realinhar as 5 famílias semânticas (success/warning/danger/info/neutral) em `themeTokens.json` com 4 sub-valores cada (cor de texto, cor de ícone-bg, badge-bg, badge-border), light e dark, conforme `DESIGN_TOKENS.md` §1 "Semantic colors". Dark: valores de badge-bg/badge-border extrapolados por julgamento (não capturados explicitamente no Canvas 1c) — ver relatório de implementação.
- [x] Corrigir `homeIndicator` em `themeTokens.json` de `#000000`/`#F0F0F0` para `#C3C9C6` (light) / `#4E5754` (dark).
- [x] Confirmar e corrigir `onPrimary` (dark) para o valor real de texto sobre `#4FC58C` — confirmado como `#0E1413` (background dark), citado explicitamente em `DESIGN_TOKENS.md` linha 72 ("texto sobre ele é escuro `#0E1413`").
- [x] Reescrever o comentário de cabeçalho de `src/constants/theme.ts` (linhas 17-21) para citar `#10794E`/`#1B63C4` reais em vez dos valores obsoletos `#1D9E75`/`#185FA5`.
- [x] Atualizar o type `ThemeColors` em `theme.ts` para incluir as novas chaves semânticas (ícone-bg, badge-bg, badge-border por família) sem quebrar os componentes que já consomem as chaves antigas (migração aditiva, não destrutiva).

## Tipografia

- [x] Decidir e instalar a fonte IBM Plex Sans via `@expo-google-fonts/ibm-plex-sans` (pesos 400/500/600/700) — nova dependência justificada em `plan.md` §6.
- [x] Remover/substituir o monkey-patch de `Basic-Regular` em `src/app/_layout.tsx` por mapeamento explícito de `fontFamily` por peso (400/500/600/700 → face IBM Plex Sans correspondente, lido a partir do `fontWeight` do style do Text/TextInput).
- [x] Realinhar `buildTypography()` em `theme.ts` para os 7 estilos nomeados do Canvas: Título 28/1.25/600, Subtítulo 22/1.3/600, Seção 20/1.3/600, Corpo 17/1.5/400, Corpo forte 17/1.5/600, Apoio 16/1.5/400, Rótulo 14/1.4/600 + letter-spacing 0.08em.
- [x] Atualizar `FONTS` (StyleSheet.create export em `theme.ts`) para refletir os novos nomes/tamanhos, mantendo aliases legados (`title`/`subtitle`/`heading`/`body`/`bodyStrong`/`button`/`caption`) mapeados aos novos estilos canônicos para não quebrar imports em `Badge.tsx`, `BottomSheet.tsx`, `FilterChips.tsx` e ~25 outros arquivos fora do escopo desta EPIC.
- [x] Garantir fallback `system-ui` enquanto a fonte carrega — implementado via flag de módulo `fontsReady`, sincronizada no corpo de `RootLayout` antes do primeiro render pós-splash.

## Espaçamento e raio

- [x] Adicionar `RADII.field = 14` e `RADII.card = 20` em `theme.ts` (mantendo `RADII.pill = 999`); `RADII.sm/md/lg/xl` mantidos (ainda usados por `SIZES.cardRadius` legado e não removíveis sem tocar em telas fora de escopo).
- [x] Atualizar `tailwind.config.js`: `borderRadius.card` de `28px` para `20px`; adicionar `borderRadius.field: '14px'`.
- [x] Auditar usos de `rounded-app` em componentes no escopo desta EPIC e trocar para `rounded-field` onde o elemento é botão/campo (`Button.tsx`, `SocialButton.tsx`, `FormField.tsx`). Usos de `rounded-app` em telas (`src/screens/**`) fora do escopo — não alterados.

## Componente: Button (`src/components/Button.tsx`)

- [x] Adicionar variante `social` (bg branco, borda 1.5px `#DFE3E1`, texto `#141817`) — decisão: `SocialButton` mantido como componente separado (usado por Login/Register com layout de ícone+tile próprio), a variante `social` do `Button` fica disponível para novos usos que não precisem do tile de logo.
- [x] Adicionar variante `destructive` (bg branco, borda 1.5px `#B3261E`, texto `#B3261E`).
- [x] Adicionar estado `loading` (bg `#0C6341`, spinner + label com reticências, bloqueia toque).
- [x] Melhorar estado `disabled`: prop `disabledReason?: string` adicionada, renderiza texto explicativo abaixo do botão quando `disabled` e `disabledReason` estão presentes.
- [x] Trocar raio do botão de `rounded-app` (20px) para 14px (`rounded-field`) e fixar altura 56px (`h-14`).
- [ ] Confirmar que a regra "um botão primário por tela" do Canvas é respeitada nas telas existentes — auditoria de telas fora do escopo desta EPIC, não executada aqui.

## Componente: FormField / AuthInput (`src/components/FormField.tsx`, `AuthInput.tsx`)

- [x] `FormField.tsx` lido e ajustado: altura 56px (`h-14`), raio 14px (`rounded-field`), borda 1.5px `#DFE3E1` default.
- [x] Implementado estado focus: borda 2px `#1B63C4` (light) / `#8FB8F7` (dark), via `useState` local + `onFocus`/`onBlur`.
- [x] Implementado estado error: borda 2px `#B3261E`, bg tint `#FDECEA`, linha de erro com badge circular "!" 22px + texto vermelho 16px.
- [ ] Campo de senha com link de texto "Mostrar/Ocultar" em `#1B63C4` — NÃO implementado. Nenhuma tela hoje usa esse padrão (todas usam `secureTextEntry` fixo, sem toggle); adicionar o toggle exigiria mudanças nas telas de Login/Register/ForgotPassword (fora do escopo desta EPIC, que é infraestrutura only). Documentado como gap para o EPIC de Bloco 1 (Autenticação).

## Componente: Card (`src/components/Card.tsx`)

- [x] `rounded-card` agora resolve para 20px via `tailwind.config.js` atualizado — sem mudança de API do componente.
- [x] Padding das variantes ajustado para os valores do Canvas: `compact` 14px, `regular` 18px, `spacious` 22px.

## Componente: Badge (`src/components/Badge.tsx`)

- [x] Migrado de `COLORS`/`FONTS` estáticos para `useThemeColors()` — reage a dark mode.
- [x] Adicionado ícone-circle (16px, bg colorido, glifo branco) para as 5 variantes semânticas canônicas (success=check, warning=alerta, danger=triângulo, info=reticências, neutral=relógio).
- [x] Variantes realinhadas: as 5 canônicas (`success/warning/danger/info/neutral`) mapeiam para Normal/Atenção/Alterado/Agendado/Pendente; `primary`/`secondary`/`accent` mantidas como extensão local documentada (sem ícone, para não quebrar `ScreenHeader.tsx`).

## Componente: BottomSheet (`src/components/BottomSheet.tsx`)

- [x] Migrado de `COLORS`/`FONTS` estáticos para `useThemeColors()`.
- [x] Backdrop corrigido para `rgba(20, 24, 23, 0.45)` — token `overlay` atualizado em `themeTokens.json` (light e dark, mesmo valor, conforme Canvas).

## Componente: FilterChips / chips de seleção (`src/components/FilterChips.tsx`)

- [x] Migrado de `COLORS` estático para `useThemeColors()`.
- [x] Removido hex hardcoded `'#fff'` em `chipTextActive`.
- [x] Trocado o estilo "selecionado" para o padrão do Canvas: borda 1.5px `#10794E`, bg `#E8F5EE`, texto `#0C6341`.
- [x] Padrão selecionado/não-selecionado é genérico (baseado em `useThemeColors()` + props `activeFilter`/`onFilterChange`), reutilizável por qualquer tela que precise do mesmo padrão de chip — reutilização efetiva em outras telas (sexo/tabagismo/etc.) é decisão de tela, fora do escopo desta EPIC.

## Componente: SocialButton (`src/components/SocialButton.tsx`)

- [x] Adicionado tile de logo 26×26 com bg `#EFF1F0` (`app-neutralSoft`) ao redor do ícone/imagem, mantendo o `<Image>` interno em 20×20 com o mesmo `testID` (compatível com `__tests__/auth-visual-layout.test.tsx`).

## Componente: EmptyState (`src/components/EmptyState.tsx`)

- [x] Adicionado ícone-tile 56×56 com bg `#E8F5EE`/borda `#C7E8D6` (light) — o componente não tinha esse tile antes; implementado diretamente pois o componente está no escopo explícito desta EPIC.

## Padrão de 4 estados (loading/vazio/erro/sucesso)

- [x] `ScreenSkeleton.tsx` já existe e usa `bg-app-border`/`dark:bg-app-dark-border` (que agora resolvem para `#DFE3E1`/`#33403C`) dentro de `Card` — herda automaticamente a correção de tokens, sem mudança de código necessária.
- [ ] Padrão de erro (callout vermelho + "!" + botão outline "Tentar novamente") centralizado — NÃO encontrado como componente compartilhado; cada tela implementa seu próprio tratamento de erro. Gap documentado, não resolvido nesta EPIC (não é criação de subsistema novo, conforme instrução).
- [ ] Padrão de sucesso (snackbar `#0C6341`) — NÃO encontrado `Toast`/`Snackbar` em `src/components/` ou `src/hooks/`. Confirmado gap real (busca por `Toast|Snackbar` em `src/` não retornou nenhum arquivo). Não construído nesta EPIC por instrução explícita (não criar subsistema novo do zero); fica como pendência para EPIC futura.

## Verificação final (não bloqueante para aprovação do plano, mas necessária antes de fechar a Fase 3)

- [ ] Smoke test manual em dispositivo/simulador (Login, Home, Exames) em light e dark mode — NÃO executado nesta sessão (ambiente sem device/build disponível). Verificação estática (typecheck + lint + testes automatizados) executada com sucesso em seu lugar.
- [x] Confirmado que nenhum arquivo fora de `src/constants/`, `tailwind.config.js`, `src/components/*` e `src/app/_layout.tsx` (carregamento de fonte) foi tocado neste EPIC. Exceção: `__tests__/theme-tokens.test.ts` foi atualizado porque afirmava literalmente os valores hex obsoletos que este EPIC substitui (`#F5F5F5`/`#0A0A0A`) — sem essa atualização o teste ficaria permanentemente quebrado pela mudança intencional de tokens.

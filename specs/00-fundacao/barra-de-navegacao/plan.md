# Plano técnico — Barra de navegação com o Assistente + Início como porta de entrada

## 1. Escopo

Implementar a Opção 1 de `proposta.md` e as decisões D1 a D7 de `spec.md`. Sem
biblioteca nova, sem mudança de backend, sem mudança de URL.

## 2. Mudanças por arquivo

| Arquivo | Mudança |
|---|---|
| `src/constants/navigation.ts` | `APP_TABS` na nova ordem, com `assistant` (`/ai`) no lugar de `agenda`; `MORE_MENU_ITEMS` com Consultas no topo e sem `ai`; `ROUTE_TAB_MAP` com `ai`/`assistant-memory` > `assistant` e `appointments` > `more`; cabeçalho do arquivo. |
| `src/components/BottomTabBar.tsx` | Rótulo 13px (em `style`, para ser testável); ícone inativo `textSecondary`; `accessibilityRole="tablist"` no contêiner (com `testID="barra-de-abas"`) e `"tab"` nos itens. |
| `src/components/QuickAccessButton.tsx` | Card tocável com borda, tile de ícone colorido por `tone`, rótulo 17px, linha de apoio opcional (`detail`), `accessibilityRole="button"` e nome que inclui o apoio. |
| `src/screens/HomeScreen.tsx` | Acesso rápido sobe para depois do Resumo/alertas; atalhos Consultas, Exames, Remédios, Prevenção; sai `onNavigateToAi`; novas props `examsCount` e `pendingDosesToday`; funções puras de texto de apoio. |
| `src/app/(app)/dashboard.tsx` | Passa `examsCount` e `pendingDosesToday` (`null` durante carregamento/erro); sai `onNavigateToAi`. |
| Comentários | `src/app/(app)/_layout.tsx`, `src/app/(app)/more.tsx`, `src/screens/MoreScreen.tsx`. |

`AppShell.tsx` não muda: itera `APP_TABS` e usa `getActiveTabId` genericamente.

## 3. Por que o contêiner não é `accessible`

O `*ByRole` da Testing Library só enxerga elementos `accessible`, mas marcar a
`View` da barra como `accessible` faria o VoiceOver fundir as cinco abas num
elemento só. O papel `tablist` é conferido pela prop, via `testID`.

## 4. Medição do rótulo (D3)

Feita lendo `head`/`hhea`/`hmtx`/`cmap` do arquivo
`node_modules/@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf`
(largura de avanço, sem kerning — o kerning só estreitaria o texto):

| Rótulo | 12px | 13px | 14px |
|---|---|---|---|
| Início | 31,6 | 34,3 | 36,9 |
| Exames | 43,8 | 47,4 | 51,1 |
| Assistente | 58,8 | **63,6** | 68,5 |
| Remédios | 55,3 | 59,9 | 64,5 |
| Mais | 25,8 | 27,9 | 30,1 |
| Perguntar | 55,7 | 60,3 | 64,9 |

Vaga por item em 360dp: 70,4dp. Risco residual: com a fonte do sistema
aumentada (escala de acessibilidade de 1,15 ou mais), "Assistente" passa da
vaga e o `numberOfLines={1}` corta. Fica registrado para a conferência em
aparelho; não foi tratado aqui para não esconder o texto de quem aumentou a fonte.

## 5. Testes

| Arquivo | O que trava |
|---|---|
| `__tests__/abaAtivaPorRota.test.ts` | Ordem e rótulos de `APP_TABS`, aba Assistente, Consultas no topo do Mais, aba acesa por rota, cobertura de todas as telas do grupo `(app)` |
| `__tests__/bottom-tab-bar.test.tsx` | Papéis `tab`/`tablist`, uma só aba selecionada, cor do ícone inativo, contraste dos tokens, rótulo de 13px |
| `__tests__/homeAcessoRapido.test.tsx` | Quatro atalhos navegando, sem "Análise IA", posição da seção, linhas de apoio e sua ausência sem dado |
| `__tests__/homeCompromissosTela.test.tsx` | Ajuste: "Amanhã"/"Data inválida" agora aparecem também no atalho de Consultas; as asserções passaram a mirar o card do compromisso |

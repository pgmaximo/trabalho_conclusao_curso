# Plano técnico: Fundação — Design Tokens & Componentes Base

> **Este plano NÃO é executado agora.** Ele é o insumo para a Fase 3 (implementação) do processo SDD maior. Nenhum código deve ser escrito a partir deste documento nesta etapa — apenas `spec.md`, `plan.md` e `tasks.md` são entregues.

## 1. Contexto e decisão de escopo

`GAP_ANALYSIS.md` §0 marca este item como **P0 — bloqueia todo o resto**: qualquer tela de Bloco 1-4 que for atualizada depois consumirá estes tokens, então divergências aqui se propagam para 17 telas `ATUALIZAR` + 3 telas `CRIAR`. Este plano cobre exclusivamente:
- `src/constants/themeTokens.json`
- `src/constants/theme.ts`
- `tailwind.config.js`
- Componentes átomo em `src/components/*.tsx` que hoje hardcodeiam tema ou têm API incompleta frente ao Canvas 1a.

Não cobre: navegação (item de Fundação separado), telas específicas, schemas Amplify.

## 2. Tokens de cor — before/after

### 2.1 Light theme

| Token | Atual (`themeTokens.json`) | Alvo (Canvas 1a / `DESIGN_TOKENS.md`) | Observação |
|---|---|---|---|
| `primary` | `#00C853` | `#10794E` | Verde ramp 500. AA 5.5:1 sobre branco. |
| `primaryDark` | `#00A044` | `#0C6341` | Verde ramp 600 — usado em: estado "pressed"/loading do botão, bg do card "Resumo de hoje", bg do snackbar de sucesso, cor do texto em avatar-initials. |
| `primarySoft` | `#E8F5E9` | `#E8F5EE` | Verde ramp 50 — praticamente idêntico ao atual, ajuste fino de hex. |
| `secondary` | `#2196F3` | `#1B63C4` | Azul ramp 500. AA 4.9:1 sobre branco. Cor padrão de link `a`. |
| `secondarySoft` | `#E3F2FD` | `#E9F1FD` | Azul ramp 50. |
| `success` | `#00C853` (== primary atual) | `#0C6341` (texto)/ícone-bg `#10794E` | Hoje success == primary; no alvo, success reusa a família verde mas com o par texto/ícone específico da Tela 1a, não necessariamente idêntico a `primary`/`primaryDark` 1:1 — validar em `tasks.md`. |
| `warning` | `#FFC107` | `#8A5300` (texto/ícone-bg), badge bg `#FFF3DF`, badge border `#F0D6A4` | Mudança de matiz: de amarelo puro Material para âmbar mais escuro/terroso do Canvas. |
| `danger` | `#F44336` | `#B3261E` (texto/ícone-bg), badge bg `#FDECEA`, badge border `#F3C9C5` | Vermelho mais escuro/dessaturado que o Material atual; reusado também em ações destrutivas (Excluir) e erro de validação de campo. |
| `info` | `#2196F3` (== secondary atual) | `#14509F` (texto)/ícone-bg `#1B63C4`, badge bg `#E9F1FD`, badge border `#CBDFFA` | Mesmo padrão do success: par texto/ícone-bg específico, não apenas reaproveitar `secondary`. |
| `background` | `#F5F5F5` | `#F7F8F7` | Ajuste fino. |
| `surface` | `#FFFFFF` | `#FFFFFF` | Sem mudança. |
| `surfaceMuted`/borda de card | `#EEEEEE` | `#EFF1F0` | Ajuste fino — também usado como borda padrão de card. |
| `border` | `#E0E0E0` | `#DFE3E1` | Borda padrão de campo/botão. |
| `text` | `#0A0A0A` | `#141817` | Texto primário. |
| `textSecondary` | `#424242` | `#55605C` | Texto secundário. |
| `placeholder` | `#9E9E9E` | `#7A8480` | Placeholder de input. |
| `neutral` (badge "Pendente" genérico) | `#9E9E9E` | `#55605C` (texto/ícone-bg), badge bg `#EFF1F0`, badge border `#DFE3E1` | Família neutra do 5º badge semântico, hoje inexistente com esse papel específico. |

Novo token a introduzir (não existe hoje): **home-indicator bar** `#C3C9C6` (light) — já existe uma chave `homeIndicator` no JSON atual mas com valor `#000000`; corrigir.

### 2.2 Dark theme

| Token | Atual (`themeTokens.json`) | Alvo (Canvas 1c) |
|---|---|---|
| `background` | `#0A0A0A` | `#0E1413` |
| `surface` | `#141414` | `#18201E` |
| `inputBackground` | `#1A1A1A` | `#222B29` |
| `text` | `#F0F0F0` | `#EDF2F0` |
| `textSecondary` | `#BDBDBD` | `#AEBBB6` |
| `border` | `#2C2C2C` | `#33403C` (frame/card border) |
| `primary` | `#00E676` | `#4FC58C` (AA 8.6:1; texto **sobre** ele é escuro `#0E1413`, invertido do padrão light onde texto sobre primary é branco — atenção especial no `onPrimary` dark) |
| `secondary` | `#64B5F6` | `#8FB8F7` (AA 7.9:1) |
| `warning` | `#FFB74D` | `#F0B95E` |
| `danger`/`error` | `#EF5350` | `#F2867E` |
| Focus outline (input) | não modelado hoje | `#8FB8F7`, 2px — mapear para token `focusBorder` ou reusar `secondary` dark |
| `homeIndicator` | `#F0F0F0` | `#4E5754` |

**Decisão a documentar em `tasks.md`**: `onPrimary` dark precisa mudar de `#000000` (já correto por acaso, mas não auditado contra o Canvas) para o valor exato de texto escuro usado sobre `#4FC58C` — confirmar se é `#0E1413` (background dark) ou preto puro; tratar como tarefa de verificação, não assumir.

### 2.3 Correção do comentário divergente em `theme.ts`

`CODE_INVENTORY.md` §4 já documenta que o cabeçalho de `theme.ts` (linhas 17-21) cita `Primary: Verde (#1D9E75)` / `Secondary: Azul (#185FA5)` — valores que não batem nem com o JSON atual (`#00C853`/`#2196F3`) nem com o alvo (`#10794E`/`#1B63C4`). O comentário deve ser reescrito para citar os valores alvo reais, eliminando a terceira fonte de verdade fantasma.

## 3. Tipografia

| Aspecto | Atual | Alvo |
|---|---|---|
| Família | `Basic-Regular` (fonte custom única, um peso, monkey-patched em todo `Text`/`TextInput` via `_layout.tsx`) | `IBM Plex Sans`, pesos 400/500/600/700 carregados como faces distintas |
| Escala nomeada (`buildTypography` em `theme.ts`) | `display` 34/40/700, `title` 30/36/700, `heading` 20/26/700, `subheading` 16/22/600, `body` 15/22/400, `bodyStrong` 15/22/600, `button` 16/20/600, `caption` 13/18/400, `overline` 12/16/700 | Reduzir/renomear para os 7 estilos do Canvas: Título 28/1.25/600, Subtítulo 22/1.3/600, Seção 20/1.3/600, Corpo 17/1.5/400 (piso mínimo), Corpo forte 17/1.5/600, Apoio 16/1.5/400 (piso absoluto), Rótulo 14/1.4/600 letter-spacing .08em |
| Texto de botão | `button` 16/20/600 | 17px/600 |
| Texto de input | não modelado por estilo nomeado próprio | valor 400/17px, label do campo 600/16px |

**Decisão explícita necessária (constituição regra 3 — stack existente respeitada antes de expandida):** migrar de `Basic-Regular` para `IBM Plex Sans` **introduz uma nova dependência de fonte** (Google Font, hoje não presente no projeto). `expo-font` já está no projeto (usado para carregar `Basic-Regular`), então a infraestrutura de carregamento já existe — mas os arquivos `.ttf`/`.otf` de IBM Plex Sans em 4 pesos precisam ser adicionados como assets (via `@expo-google-fonts/ibm-plex-sans` ou arquivos estáticos em `assets/fonts/`). Isso é justificado pela regra 1 da constituição ("fidelidade ao design é lei") — o Canvas especifica IBM Plex Sans explicitamente, e a Tela 1a não teria "Corpo 17px" fiel sem os pesos corretos. **Alternativa rejeitada**: manter `Basic-Regular` e simular pesos com `fontWeight` CSS — já é o que o app faz hoje parcialmente (um único arquivo de fonte, peso variável simulado via `fontWeight` de estilo, que não produz negrito real em RN sem arquivo de fonte dedicado). Recomendação: usar o pacote `@expo-google-fonts/ibm-plex-sans` (mantido pela comunidade Expo, atualizado, integra direto com `expo-font` e `useFonts()`), citado em `tasks.md` como nova dependência a instalar — decisão a confirmar com o time antes da Fase 3, não travar a spec por isso (constituição regra 8).

## 4. Espaçamento e raio — before/after

| Token | Atual | Alvo |
|---|---|---|
| `SPACING` (`theme.ts`) | xxs 4, xs 8, sm 12, md 16, lg 24, xl 32, xxl 40 | Idêntico — escala já bate com `DESIGN_TOKENS.md` §3 (4·8·12·16·24·32·40). Sem mudança necessária. |
| `RADII` (`theme.ts`) | sm 12, md 18, lg 24, xl 28, pill 999 | Botão/campo = 14px (novo valor `field`), card = 20px (novo valor `card`, hoje `xl:28` é usado para card e não bate), chip/badge pequeno = 12px, pill = 999 (mantido). |
| `borderRadius.app` (Tailwind) | `20px` | Manter `20px` só se reservado para elementos que hoje o usam como "card grande"; introduzir `borderRadius.field: 14px` explícito, já que hoje botões usam `rounded-app` (20px) quando o Canvas pede 14px para botão/campo. |
| `borderRadius.card` (Tailwind) | `28px` | `20px` (Canvas define card padrão como 20px, não 28px). |
| Altura de botão/campo | Não fixada em token — `Button.tsx` usa `py-4` (padding, não altura fixa); `FormField` não lida (ver arquivo) | Fixar 56px (botão e campo padrão), 52px permitido em contextos de wizard/perfil. |

## 5. Arquivos que mudam

1. **`src/constants/themeTokens.json`** — todos os hex de `light`/`dark` atualizados conforme §2; adicionar/renomear chaves para as 5 famílias semânticas com par texto+ícone-bg+badge-bg+badge-border (hoje o JSON só tem `success`/`successSoft` etc., sem separar "cor de ícone" de "cor de texto" de "cor de badge-bg").
2. **`src/constants/theme.ts`** — corrigir comentário de cabeçalho (§2.3); `buildTypography()` realinhado à escala nomeada do Canvas (§3); `RADII` com novos valores `field`/`card` (§4); `ThemeColors` type ganha as novas chaves semânticas.
3. **`tailwind.config.js`** — `fontFamily.sans` aponta para IBM Plex Sans; `borderRadius.card` corrigido para `20px`; novo `borderRadius.field: 14px`.
4. **`src/components/Button.tsx`** — hoje só tem `variant?: 'primary' | 'secondary'`. Precisa ganhar `social`, `destructive`, `loading` (com spinner + label alterado), e tratamento explícito de `disabled` com texto de motivo abaixo (hoje `disabled` é só um estilo, sem slot de texto). Altura/raio devem migrar de `rounded-app py-4` (raio 20px implícito) para raio de campo (14px) e altura fixa 56px.
5. **`src/components/FormField.tsx`** (não lido em detalhe neste plan, mas referenciado por `AuthInput.tsx`) — precisa expor estados focus (borda 2px `#1B63C4`/`#8FB8F7`) e error (borda 2px `#B3261E`, bg tint `#FDECEA`, ícone "!" + texto erro) de forma consistente com §4 do `DESIGN_TOKENS.md`; auditar se já cobre isso (ação de verificação em `tasks.md`).
6. **`src/components/Card.tsx`** — já tem variantes `surface/soft/outlined/accent` mapeadas a tokens `app-*`; ajuste é só de valor (raio 20px em vez do atual `rounded-card`=28px) — API não muda.
7. **`src/components/Badge.tsx`** — **usa `COLORS`/`FONTS` estáticos importados diretamente de `theme.ts`** (não usa `useThemeColors()`), então não reage a dark mode. Precisa migrar para o hook reativo. Variantes também precisam realinhar aos 5 badges semânticos canônicos (Normal/Atenção/Alterado/Agendado/Pendente) com ícone-circle, não só texto colorido sobre bg — hoje `Badge.tsx` não renderiza ícone algum.
8. **`src/components/BottomSheet.tsx`** — mesmo problema: usa `COLORS`/`FONTS` estáticos. Migrar para `useThemeColors()`.
9. **`src/components/FilterChips.tsx`** — mesmo problema, mais grave: usa `COLORS` estático **e** tem hex hardcoded `'#fff'` na linha do `chipTextActive`. Precisa migrar 100% para tokens reativos e adotar o padrão selecionado/não-selecionado do Canvas (`selected`: borda `#10794E`, bg `#E8F5EE`, texto `#0C6341`; hoje usa `COLORS.primary` sólido como bg com texto branco — visual diferente do Canvas).
10. **`src/components/SocialButton.tsx`** — já usa `useThemeColors()` e classes `app-*`; ajuste é só de valor de token upstream (sem mudança estrutural), mas falta o tile de logo 26×26 com bg `#EFF1F0` mencionado no Canvas — hoje a imagem é renderizada solta, sem container/tile.
11. **`src/components/EmptyState.tsx`** — já usa `useThemeColors()` e delega a `Button`; sem mudança estrutural, herda automaticamente o novo ícone-tile 56×56 (`#E8F5EE`/`#C7E8D6`) se `Button`/paleta forem corrigidos — ação de verificação visual, não de código.

## 6. Fonte customizada — decisão explícita (constituição regra 3)

- **Situação atual**: `Basic-Regular` é uma fonte única carregada via `expo-font`, sem variação de peso real (pesos são simulados via `fontWeight` de estilo, que em RN sem arquivo de fonte por peso não produz negrito verdadeiro — isso já é um gap visual hoje, mesmo antes de qualquer migração).
- **Alvo do Canvas**: `IBM Plex Sans` com pesos 400/500/600/700 reais.
- **Nova dependência necessária**: sim — `@expo-google-fonts/ibm-plex-sans` (ou download manual dos `.ttf` do Google Fonts para `assets/fonts/`). `expo-font` (motor de carregamento) já está instalado, então a única adição real é o pacote/arquivos de fonte em si.
- **Justificativa por fidelidade ao design (regra 1 e regra 3 da constituição)**: o Canvas define IBM Plex Sans explicitamente na Tela 1a como parte do sistema de tokens; usar uma fonte diferente violaria "correspondência em estrutura, hierarquia visual" da regra 1. A regra 3 permite nova biblioteca quando "preenche uma lacuna real e é escolha moderna e amplamente adotada" — pacotes `@expo-google-fonts/*` são o padrão de fato do ecossistema Expo para Google Fonts.
- **Impacto**: troca do monkey-patch global de `Text`/`TextInput` em `_layout.tsx` (hoje força `Basic-Regular` em tudo) para usar `fontFamily` por peso (`IBMPlexSans_400Regular`, `_600SemiBold`, etc.) mapeado nos estilos nomeados de `buildTypography()`.
- **Este plano não instala nada agora** — a instalação real do pacote de fonte é uma tarefa de implementação (Fase 3), listada em `tasks.md`.

## 7. Riscos / ambiguidades resolvidas por julgamento

1. **`success`/`info` como alias de `primary`/`secondary` vs. família própria**: `themeTokens.json` atual trata `success == primary` e `info == secondary`. O Canvas, em `DESIGN_TOKENS.md` §1, define pares texto/ícone-bg específicos para os badges semânticos (ex.: success texto `#0C6341` sobre ícone-bg `#10794E`) que não são idênticos byte-a-byte ao par `primary`/`primaryDark`. Resolução adotada: manter `success` e `info` como chaves próprias no JSON (não apenas alias), mesmo que o hex final coincida com `primary`/`secondary` em alguns casos — isso evita acoplamento acidental caso o Canvas mude um dos dois independentemente no futuro.
2. **Radius "card" com dois valores no Canvas (20px padrão, 16px em variantes menores)**: resolvido adotando 20px como token `RADII.card` padrão e tratando 16px como um valor pontual de componente (não um token novo), já que `DESIGN_TOKENS.md` descreve 16px como algo visto "também" em cards/banners menores, não como escala formal separada.
3. **Onde vive o token de "focus outline" dark (`#8FB8F7`, 2px)**: não há chave dedicada em `ThemeColors` hoje. Resolução proposta: reusar `secondary` (dark) para o valor de cor e modelar a espessura (2px) como constante de componente (`FormField`), não como token de cor — evita inflar o schema de cores com um token de uso único.

## 8. O que este plano explicitamente NÃO faz

- Não escreve nenhum código.
- Não decide a estrutura do menu "Mais" nem a navegação de 5 abas (item de Fundação separado, fora de escopo aqui).
- Não decide schemas Amplify novos (medicamentos, prevenção, vacinação) — fora de escopo de tokens/componentes.
- Não audita tela a tela contraste/fidelidade final — isso é responsabilidade do `spec.md`/`plan.md` de cada Bloco, que herdará estes tokens corrigidos.

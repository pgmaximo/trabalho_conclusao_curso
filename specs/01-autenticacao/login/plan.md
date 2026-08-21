# PLAN: Login (Bloco 1)

## 1. Diagnóstico — estado atual vs. design

Leitura de `src/screens/LoginScreen.tsx` (renderizado por `src/app/index.tsx`) comparado ao markup das telas 1b/1c.

| Elemento do design | Existe hoje? | Detalhe do gap |
|---|---|---|
| Cabeçalho ícone+"SuaSaúde"+tagline | **Não** | Tela atual usa `AuthIllustrationCard` com uma imagem ilustrativa (`login_image.png`) sobreposta ao card (`-mb-20`, `pt-[88px]`), não o padrão ícone-quadrado-44px + título + subtítulo do design. É uma composição visual diferente da que está no Canvas. |
| Card "Entre na sua conta" | Parcial | O texto existe, mas dentro da composição de ilustração, não do card simples branco/escuro descrito em 1b/1c. |
| Campo E-mail | Sim | `AuthInput` com ícone `email` (MaterialIcons) — design usa campo sem ícone de input, só label acima. Divergência menor, aceitável (ícone ajuda usabilidade e não quebra hierarquia), mas anotar como interpretação (regra 8). |
| Campo Senha | Sim, mas **sem toggle mostrar/ocultar** | Atual: `secureTextEntry` fixo, ícone `lock`, sem o link de texto "Mostrar/Ocultar" que o design exige explicitamente (`toggleLShow`/`lShowLabel`, cor `#1B63C4`/`#8FB8F7`). **Gap a corrigir.** |
| Link "Esqueceu a senha?" | Sim | Já navega para `/forgot-password`. Cor deve ser conferida contra o token `#1B63C4`/dark `#8FB8F7`. |
| Botão "Entrar" + estado loading | Parcial | Existe `Button` + `isLoading`, mas o padrão visual diverge: hoje troca toda a região do botão por um `ActivityIndicator` genérico centralizado; o design espera o **botão primário** mudar de cor (`#0C6341`) e mostrar spinner + "Entrando..." dentro do próprio botão, mantendo o layout. **Gap a corrigir.** |
| Erro de credenciais | Parcial, divergente | Hoje: `Alert.alert` nativo (bloqueia com modal do SO) + texto inline vermelho + shake animation + botão fica com bg `danger`. O design (via `DESIGN_TOKENS.md` §4 "Inputs"/"4-state pattern") sugere erro inline mais discreto (badge "!" + texto) sem modal nativo. **Decisão de interpretação (regra 8):** manter o texto inline + shake (já é mais rico que o design básico), mas trocar os `Alert.alert` de validação/erro de rede por texto inline ou banner, evitando o modal nativo que não aparece em nenhuma tela do Canvas. |
| Divisor "ou continue com" | Sim | `SectionDivider` — conferir que o texto e cores batem com os tokens. |
| Botão "Continuar com Google" | Sim | `SocialButton` com `google_Glogo.png`. Compatível com o design (ícone + label). |
| Botão "Continuar com Apple" | Não implementado | Correto — no design é condicional (`showApple`, default `false`) e ausente em 1c (dark). Não é gap; documentar como decisão consciente (feature-flagged para o futuro, fora de escopo deste EPIC). |
| Link "Criar conta" | Sim | Navega para `/register`. |
| Nota LGPD | **Não existe na tela** | Copy fixa do design não está presente em `LoginScreen.tsx`. **Gap a corrigir** — requisito de constituição §4 (LGPD é requisito de interface). |
| Toast/snackbar de sucesso "Bem-vinda de volta" | **Não existe** | Hoje o app navega direto (`onLogin()` → `resolvePostAuthRoute()`) sem feedback de sucesso. O design mostra snackbar `#0C6341` com ✓ antes/durante a navegação. **Gap a corrigir**, com copy adaptada (nome real do usuário nem sempre disponível no momento do login — usar fallback genérico "Bem-vindo(a) de volta!" quando o nome não estiver carregado ainda). |
| Dark mode fiel aos tokens de 1c | Parcial | `theme.ts` já tem uma paleta `dark` (`DARK_THEME`) e as classes NativeWind (`dark:bg-app-dark-background`, etc.) já existem no componente, mas os valores hex não foram confirmados batendo com os tokens de 1c (`#0E1413`/`#18201E`/`#222B29`/`#4FC58C`/`#8FB8F7`) — nenhuma dessas strings hex aparece em `theme.ts`. **Gap a corrigir/verificar**: alinhar a paleta dark do tema global a esses valores (impacto potencialmente maior que só o Login, ver nota abaixo). |
| Auth logic (Cognito) | Sim, real | `signIn()`/`signOut()` de `aws-amplify/auth`, `signInWithGoogle()` via `signInWithRedirect` Hosted UI, `initializeUserSession()`, `resolvePostAuthRoute()`. Nenhuma mudança de lógica necessária — regra 5 da constituição ("nada quebra o que já funciona"). |

## 2. Escopo da mudança

**Fora de escopo / não tocar:**
- `src/services/auth/authFlow.ts`, `src/services/auth/google-auth.ts`, `src/services/auth/userSessionService.ts` — lógica de autenticação Cognito permanece intacta. Nenhuma alteração de fluxo, apenas UI/apresentação em `LoginScreen.tsx`.
- `src/app/index.tsx` — a decisão de rota/bootstrap já está correta e desacoplada da UI; não precisa mudar.

**Dentro de escopo:**
- `src/screens/LoginScreen.tsx` — reestruturar layout para bater com 1b/1c: cabeçalho ícone+título+tagline fora do card, card simples com o formulário, toggle mostrar/ocultar senha, botão com estado de loading embutido, nota LGPD, snackbar de sucesso.
- Trocar `Alert.alert` (validação de campos vazios e erro de rede/config) por feedback inline consistente com o padrão de erro já usado para credenciais inválidas — elimina o modal nativo que não existe em nenhuma tela do Canvas.
- Paleta dark: **decisão a documentar** — se `theme.ts` (`DARK_THEME`) já for compartilhado por todas as telas (Fundação), o alinhamento de hex aos tokens de 1c deve, idealmente, acontecer no EPIC de Fundação (`specs/00-fundacao/design-tokens`), não duplicado aqui. Este EPIC assume que a Fundação corrige `theme.ts`; caso a Fundação ainda não tenha sido implementada quando este EPIC for executado, o ajuste de cores dark específicas do Login pode ser feito localmente em `LoginScreen.tsx` como fallback temporário, documentado como débito a reconciliar depois.

## 3. Componentes a reaproveitar (Fundação)

Nenhum componente novo deve ser criado do zero — reaproveitar e, quando necessário, estender levemente os componentes existentes em `src/components/`:

- `Button` (`src/components/Button.tsx`) — já suporta `variant='primary'|'secondary'` e `disabled`. **Extensão necessária:** suportar um estado visual "loading" nativo (troca de cor para `#0C6341`/dark equivalente + spinner + label alternativo), em vez de o `LoginScreen` substituir o botão por um `ActivityIndicator` avulso. Proposta: adicionar prop `loading?: boolean` + `loadingTitle?: string` ao `Button`, reaproveitável também em Cadastro (1d) e Recuperar senha (1f).
- `AuthInput`/`FormField` (`src/components/AuthInput.tsx`, `FormField`) — já suporta `icon`, `hasError`. **Extensão necessária:** suportar um elemento de ação à direita do valor (o link de texto "Mostrar/Ocultar"), hoje só há `icon` à esquerda. Se `FormField` não suportar slot à direita, adicionar prop `trailingAction?: ReactNode` (reaproveitável em Cadastro, que também tem campo de senha).
- `SocialButton` — reaproveitar como está para o botão Google.
- `SectionDivider` — reaproveitar como está para "ou continue com".
- Novo padrão a introduzir (pequeno, local a este EPIC ou promovido à Fundação se outras telas precisarem): snackbar/toast de sucesso (`lToast`) — verificar se já existe um componente de toast reutilizável no repo antes de criar um novo; se não existir, criar um componente simples `SuccessSnackbar` seguindo o padrão "Sucesso" documentado em `DESIGN_TOKENS.md` §4 ("Standard 4-state pattern"), pois esse mesmo padrão de snackbar é reutilizado em várias telas do Canvas (não exclusivo do Login).
- Cabeçalho ícone+título+tagline: não existe hoje como componente. Como esse cabeçalho é específico da tela de Login/Cadastro/Confirmação/Recuperar senha (Bloco 1 inteiro), avaliar extrair um componente `AuthAppHeader` reaproveitável pelas 4 telas do Bloco 1, em vez de duplicar o markup em cada `Screen.tsx`.

## 4. Riscos / decisões a documentar

- **Nome do usuário no toast de sucesso:** o design usa "Bem-vinda de volta, Maria!" (nome fixo do mock do Canvas). Na implementação real, o nome do usuário pode não estar disponível imediatamente após `signIn()` (depende de quando o perfil é carregado). Decisão: usar copy genérica "Bem-vindo(a) de volta!" nesta primeira versão, e revisitar se/quando o app expuser o nome do usuário de forma síncrona no momento do login (ambiguidade documentada, regra 8).
- **Troca de `Alert.alert` por feedback inline:** é uma mudança de UX perceptível (usuário deixa de ver modal bloqueante). Justificativa: nenhuma tela do Canvas usa `Alert` nativo; o padrão de erro documentado em `DESIGN_TOKENS.md` é sempre inline. Não quebra a lógica de autenticação (regra 5), apenas a apresentação do erro.
- **Extensão de `Button`/`FormField`:** por serem componentes compartilhados, qualquer mudança neles deve ser não-destrutiva (props novas opcionais, comportamento default preservado) para não quebrar Cadastro/Confirmação/Recuperar senha/outras telas que já os usam hoje.

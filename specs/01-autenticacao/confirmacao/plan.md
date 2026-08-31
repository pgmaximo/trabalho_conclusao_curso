# PLAN: Confirmação de conta (código + cooldown)

## 1. Diff — Canvas 1e × `ConfirmScreen.tsx` atual

| Aspecto | Canvas 1e (alvo) | `src/screens/ConfirmScreen.tsx` (atual) | Gap |
|---|---|---|---|
| Entrada do código | 6 caixas individuais (`c0`...`c5`), 1 dígito cada, `maxLength=1` | 1 único `AuthInput` de texto (`code`, `keyboardType="number-pad"`, sem `maxLength`) | **Maior gap.** Não existe UI "por caixa" nenhuma — precisa ser construída do zero. |
| Auto-advance de foco | Digitar avança para a próxima caixa; backspace em caixa vazia volta para a anterior | N/A (campo único, sem conceito de "próxima caixa") | **Ausente por completo.** Requer 6 `ref`s (`useRef<TextInput>`) e lógica de `onChangeText`/`onKeyPress`. |
| Mensagem "Tudo pronto" | `sc-if value="{{ codeFull }}"` → texto "Tudo pronto — toque em Confirmar." abaixo do botão | Não existe | **Ausente.** Precisa de estado derivado `codeFull = digits.every(d => d.length === 1)`. |
| Banner "Verifique seu e-mail" | Banner azul (`#E9F1FD`/`#CBDFFA`) com ícone de envelope, acima do card | Substituído por `AuthIllustrationCard` (imagem ilustrativa `confirm_image.png`) + título/subtítulo de texto simples | O componente atual usa um padrão visual de ilustração (reutilizado de Login/Cadastro) que não corresponde ao Canvas 1e, que usa o padrão de "banner informativo" (reutilizado de outras telas do Bloco 1/2). Precisa trocar `AuthIllustrationCard` por banner info + card branco "Digite o código". |
| Botão "Confirmar" — estado desabilitado até código completo | `confirmBg`/`confirmFg` dinâmicos: cinza `#DFE3E1`/`#7A8480` até `codeFull`, verde `#10794E`/branco quando completo | `Button` sempre habilitado assim que `isLoading === false`, independente de quantos dígitos foram digitados (`handleConfirm` só valida `!code` vazio, não "6 dígitos") | Precisa condicionar `disabled`/variante do `Button` a `codeFull`, não apenas a `isLoading`. |
| Cooldown de reenvio | Rótulo dinâmico `{{ cdLabel }}`/`{{ cdColor }}`/`{{ cdWeight }}`, valor de exemplo renderizado no Canvas = 47s | `cooldown` inicial = **60**, comentário explícito no código: "cooldown inicia em 60 pois o código já foi enviado pelo RegisterScreen" | **Ambiguidade documentada (regra 8 da constituição):** o Canvas exporta um estado estático do editor (não interativo), e "47" é apenas o valor que o autor do design deixou configurado ao salvar aquele frame — não há indício de que 47s seja uma regra de negócio (ex.: "tempo restante de um cooldown de 60s que já rodou 13s"). Decisão desta spec: **manter 60s** como duração do cooldown (já implementado e documentado no código como decisão deliberada), pois é o valor mais coerente com o restante do fluxo (Cognito não define esse tempo; é decisão de produto já tomada). Não há necessidade de mudar o valor numérico — só a UI do botão. |
| Reenvio de código (lógica) | `onClick="{{ resend }}"` — sem detalhe de implementação no Canvas (é generativo) | `handleResend()` chama `resendSignUpCode({ username: email })` e reseta `cooldown` para 60 | **Sem gap funcional** — já implementado corretamente; só precisa ser conectado ao novo botão outline com rótulo dinâmico. |
| Botão "Confirmar" (ação) | Confirma o código de 6 dígitos | `handleConfirm()` chama `confirmSignUp({ username: email, confirmationCode: code })` | **Sem gap funcional** — `code` (string concatenada dos 6 dígitos) já é o formato esperado pelo Cognito; ao migrar para 6 estados separados, basta concatenar `digits.join('')` antes de chamar `confirmSignUp`. |
| Auto-signin pós-confirmação | Não desenhado no Canvas (fora do escopo visual da tela) | `handleConfirm()` já faz `signIn({ username: email, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } })` quando `password` está presente, seguido de `initializeUserSession()` | **Preservar exatamente como está** — é comportamento real de sessão (regra 5 da constituição: "nada quebra o que já funciona"). Este EPIC é escopo de UI apenas. |
| "Voltar para entrar" | Link azul centralizado abaixo do card | Já existe como `Pressable` condicional (`onBackToLogin ? ... : null`), texto idêntico | **Sem gap funcional**, só precisa ser reposicionado para fora do card branco conforme Canvas (hoje está dentro do fluxo do `AuthIllustrationCard`). |
| Botão "voltar" no cabeçalho (`‹`) | Botão circular 48×48 no topo, ao lado do título "Confirmar conta" | Não existe cabeçalho equivalente — a tela atual não tem barra de topo com botão voltar + título | **Ausente.** Precisa adicionar cabeçalho com botão "‹" (deve reutilizar `onBackToLogin` ou navegação de voltar) + título "Confirmar conta". |
| Erro de código inválido | Não desenhado explicitamente no Canvas 1e (sem estado de erro visual) | `Alert.alert('Erro', 'Código inválido ou expirado.')` | Manter `Alert` nativo por ora (mais simples, já funcional); documentar como possível melhoria futura (estado de erro inline nas caixas, borda vermelha `#B3261E` conforme padrão de erro de `DESIGN_TOKENS.md`) — não bloqueante para este EPIC. |

## 2. Mapeamento para Cognito (`confirmSignUp` / `resendSignUpCode`)

Confirmado por inspeção de `src/services/auth/authFlow.ts`: esse arquivo **não** contém wrappers para `confirmSignUp`/`resendSignUpCode` — ele só resolve `resolvePostAuthRoute()` (decide `/dashboard` vs `/profile-setup` após autenticação, usado por login). As chamadas de confirmação/reenvio ficam **inline em `ConfirmScreen.tsx`**, importadas diretamente de `aws-amplify/auth`:

```ts
import { confirmSignUp, resendSignUpCode, signIn } from 'aws-amplify/auth';
```

Isso é consistente com a Regra 3 da constituição (reaproveitar a stack existente — Amplify Gen 2/Cognito já configurado) e com a Regra 5 (não corromper Cognito/sessão). Este EPIC **não** propõe mover essa lógica para `authFlow.ts` — é uma refatoração de organização de código fora do escopo de "fidelidade de UI ao Canvas", que é o mandato deste EPIC (regra 6: cada tela ganha spec própria, mas o escopo de cada spec é a tela, não uma refatoração arquitetural mais ampla). Se o time quiser centralizar essas chamadas em `authFlow.ts` futuramente, deve ser um EPIC/tarefa técnica separada.

## 3. Preservar o comportamento de auto-signin

`CODE_INVENTORY.md` documenta explicitamente: *"Email confirmation code entry; auto-signs in with the passed password, then routes to profile setup."* Este comportamento real (não mockado) deve ser preservado byte-a-byte na refatoração de UI:

1. `confirmSignUp({ username: email, confirmationCode })` — código agora vem de `digits.join('')` em vez de `code`.
2. Se `password` foi passado via query param, tenta `signIn(...)` automaticamente (fluxo normal de cadastro).
3. Se `signIn` falhar (ex.: `password` ausente — fluxo de recuperação de senha), tenta `initializeUserSession()` mesmo assim (pode já haver tokens via `autoSignIn` do `signUp`).
4. Em sucesso, `Alert.alert('Sucesso!', ...)` + `onConfirmSuccess()` → navega para `/profile-setup`.

Nenhuma dessas quatro etapas muda de comportamento — só a fonte do valor `confirmationCode` (de `code` string única para `digits.join('')`).

## 4. Nova estrutura de componente (proposta, sem escrever código nesta fase)

- Introduzir um componente `OtpDigitInput` (ou 6 `TextInput`s inline em `ConfirmScreen.tsx`, a decidir na implementação) com:
  - `useRef<Array<TextInput | null>>` para os 6 inputs.
  - Estado `digits: string[6]` (ou 6 `useState` separados, espelhando `c0`...`c5` do Canvas).
  - `handleDigitChange(index, value)`: aceita só 1 caractere numérico; se preenchido e `index < 5`, foca `refs[index + 1]`.
  - `handleKeyPress(index, key)`: se `key === 'Backspace'` e `digits[index] === ''` e `index > 0`, foca `refs[index - 1]` e limpa `digits[index - 1]`.
  - `codeFull = digits.every((d) => d.length === 1)`.
- Reaproveitar `Button` (`src/components/Button.tsx`) com nova prop/variante `disabled={!codeFull}` para o estado cinza vs. verde — verificar se `Button` já suporta variante `disabled` com texto explicativo (documentado em `DESIGN_TOKENS.md` §4: "sempre com motivo mostrado como texto plano abaixo"); se não suportar, é uma dependência deste EPIC sobre o EPIC de Fundação (`specs/00-fundacao/design-tokens`).
- Substituir `AuthIllustrationCard` por: banner informativo azul (pode reaproveitar padrão de card/banner já usado em outras telas, ex. `Card` variante `soft`/`accent` documentada na Fundação) + `Card` branco "Digite o código".
- Adicionar cabeçalho com botão "‹" + título "Confirmar conta", reaproveitando o padrão de header já usado em outras telas internas do app (`AddExamScreen`, `AddAppointmentScreen` etc. — a confirmar no `tasks.md`/implementação).

## 5. Riscos e decisões

- **Risco de teclado (RN/Expo)**: `onKeyPress` para detectar Backspace tem comportamento inconsistente entre iOS/Android/Web em alguns casos (RN Web nem sempre dispara `Backspace` da mesma forma). Deve ser testado nas 3 plataformas suportadas pelo projeto (Expo Router web + iOS + Android) antes de considerar a tarefa concluída.
- **Decisão sobre `maxlength`**: o Canvas usa `maxlength="1"` nativo do HTML; em React Native, isso é `maxLength={1}` no `TextInput`. Comportamento equivalente, sem gap.
- **Decisão sobre tamanho de caixa**: `DESIGN_TOKENS.md` documenta 52×60px como o token oficial de "OTP/code digit boxes", mas o markup do Canvas 1e usa `height:62px` com `flex:1` (largura variável). Usar 52×60px como base de altura fixa e permitir que a largura seja flexível dentro do `flex:1; gap:6px` do container, para preservar o alinhamento visual das 6 caixas em telas de largura variável — pequena divergência entre o token documentado e o markup exportado, não bloqueante (regra 8 da constituição).
- **Não escopo deste EPIC**: adicionar um estado de erro inline (borda vermelha nas caixas) para código inválido — mantém-se o `Alert.alert` atual, já que o Canvas 1e não desenha esse estado. Pode virar melhoria futura documentada em `GAP_ANALYSIS.md`.

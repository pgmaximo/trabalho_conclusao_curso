# Tasks — Recuperar senha (1f)

## Layout / estrutura
- [x] Remover `AuthIllustrationCard`/`forgot_password_image.png` de `ForgotPasswordScreen.tsx`.
- [x] Criar header próprio: botão "‹" (48×48, radius 14, borda `#DFE3E1`) + título "Recuperar senha" (600 20px) + `stepLabel` dinâmico ("Passo 1 de 2" / "Passo 2 de 2", 400 16px `#55605C`). Reaproveitado `BackHeader` (`bordered`) em vez de recriar inline.
- [x] Criar/reaproveitar componente de barra de progresso de 2 segmentos (`flex:1;height:8px;radius:4px`), 1º sempre `#10794E`, 2º `#10794E` só no passo 2 (senão cor neutra de trilho). `OnboardingScreen.tsx` tem um padrão equivalente mas é inline (StyleSheet local, segmentos de largura fixa, não `flex:1`) e não está extraído como componente reutilizável — não fazia sentido importar/refatorar aquele arquivo só para isto; implementado um bloco local de 2 `View`s em `ForgotPasswordScreen.tsx` (não promovido a componente compartilhado, conforme plan.md — é um investimento de 2 segmentos, não vale a pena).
- [x] Renomear estado `codeSent: boolean` → `step: 1 | 2` (ou equivalente) para refletir `fpStep1`/`fpStep2` do Canvas.

## Passo 1 (e-mail)
- [x] Card com título "Qual é o seu e-mail?", texto de apoio "Vamos enviar um código de 6 dígitos para você criar uma senha nova.", campo "E-mail", botão "Enviar código".
- [x] Link "Voltar para entrar" abaixo do card, visível **apenas no passo 1**.
- [x] Manter chamada `resetPassword({ username: normalizedEmail })` e tratamento de erro existente (`UserNotFoundException`, `LimitExceededException`).

## Passo 2 (código + nova senha)
- [x] Card com título "Crie uma nova senha", texto "Digite o código enviado para {e-mail}.", campos "Código de 6 dígitos" (letter-spacing, fonte maior), "Nova senha" (placeholder "Mínimo 8 caracteres, 1 número, 1 especial"), "Confirmar nova senha".
- [x] Botão primário "Alterar senha" (mantém `confirmResetPassword`).
- [x] Substituir botão "Reenviar código" por botão outline "Trocar o e-mail" que volta ao passo 1 sem nova chamada de API, preservando o e-mail digitado e editável.
- [x] Seta "‹" do header também volta ao passo 1 (mesmo comportamento de "Trocar o e-mail").

## Snackbar de sucesso
- [x] Verificar se já existe componente de snackbar/toast reutilizável em `src/components/`; existe `SuccessSnackbar.tsx` (já usado em Login) — reaproveitado, nenhum componente novo criado.
- [x] Trocar `Alert.alert('Código enviado', ...)` (sucesso de `resetPassword`) pela snackbar "Código enviado para seu e-mail".
- [x] Manter `Alert.alert` (ou padrão de erro já usado) para os caminhos de erro de ambos os passos.

## Dark mode / tokens
- [x] Garantir que todas as cores novas (header, barra de progresso, snackbar, botão "Trocar o e-mail") resolvam via `useThemeColors()`/classes `app-*`/`app-dark-*`, sem hex hardcoded. Barra de progresso usa `bg-app-primary`/`bg-app-progressTrack` (+ variantes `dark:`), token já existente em `themeTokens.json`.

## Validação
- [ ] Teste manual: passo 1 com e-mail vazio → mensagem de erro, sem avançar. (Não executado neste ciclo — requer app rodando + Cognito real; lógica preservada de `ForgotPasswordScreen.tsx` anterior, já coberta antes.)
- [ ] Teste manual: passo 1 com e-mail de usuário inexistente → `UserNotFoundException` tratado. (idem — não executado neste ciclo)
- [ ] Teste manual: passo 1 com e-mail válido → `resetPassword` real dispara, snackbar aparece, avança para passo 2, barra de progresso com 2 segmentos preenchidos. (idem — não executado neste ciclo)
- [ ] Teste manual: passo 2, "Trocar o e-mail" → volta ao passo 1 com e-mail preenchido, barra volta a 1 segmento, sem nova chamada de API. (idem — não executado neste ciclo)
- [ ] Teste manual: passo 2 com código errado/expirado → erro específico, permanece no passo 2. (idem — não executado neste ciclo)
- [ ] Teste manual: passo 2 com senha fora dos requisitos ou confirmação divergente → erro específico, permanece no passo 2. (idem — não executado neste ciclo)
- [ ] Teste manual: passo 2 completo e válido → `confirmResetPassword` real, retorno à tela de login (1b), login funciona com a nova senha. (idem — não executado neste ciclo)
- [ ] Teste manual: dark mode em ambos os passos (header, barra de progresso, card, snackbar). (idem — não executado neste ciclo)
- [x] Revisar PR: nenhuma chamada mockada introduzida (regra 2 da constituição); nenhuma outra tela/rota alterada além de `ForgotPasswordScreen.tsx`/`forgot-password.tsx` e componentes novos estritamente necessários (barra de progresso, snackbar). Confirmado via `git status`/`git diff --stat`: só `src/screens/ForgotPasswordScreen.tsx` mudou; nenhum componente novo criado (100% reaproveitamento de `BackHeader`/`SuccessSnackbar`/`AuthInput`/`Button`).

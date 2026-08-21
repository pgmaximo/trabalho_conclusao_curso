# Plano técnico — Recuperar senha (1f)

## 1. Diagnóstico do código atual (`ForgotPasswordScreen.tsx` / `forgot-password.tsx`)

O fluxo **já é logicamente um wizard de 2 passos** — o estado `codeSent` (booleano) faz o papel de `fpStep1`/`fpStep2` do design, alternando título, texto de apoio, campos visíveis e label do botão primário. Nesse sentido, a lógica de negócio (chamar `resetPassword` no passo 1, `confirmResetPassword` no passo 2, normalizar e-mail, validar senha/confirmação) já está correta e já usa dados reais do Cognito (`aws-amplify/auth`) — nenhuma pendência de mock aqui (regra 2 da constituição respeitada).

Divergências estruturais/visuais em relação ao Canvas 1f:

| Elemento do design | Estado atual | Gap |
|---|---|---|
| Header com seta "‹" + título "Recuperar senha" + rótulo de passo dinâmico | Não existe — tela usa `AuthIllustrationCard` com imagem (`forgot_password_image.png`) e título/subtítulo dentro do card | **Maior gap estrutural**: a tela hoje é modelada como as outras telas de auth (login/registro), com ilustração; o design de 1f é deliberadamente diferente — sem imagem, com header de navegação próprio e barra de progresso, mais parecido com um fluxo de wizard/checkout do que com uma tela de auth genérica |
| Barra de progresso de 2 segmentos | Não existe | Precisa ser criado (componente novo ou inline) |
| Botão "Trocar o e-mail" (outline, volta ao passo 1) | Não existe — existe "Reenviar código" (reenvia o código para o mesmo e-mail, não volta ao passo 1) | Funcionalidade diferente da do design; "Trocar o e-mail" deve **limpar o campo de código/senhas e voltar para o passo 1 editável**, sem nova chamada à API |
| Snackbar de sucesso (`fpSnack`, "Código enviado para seu e-mail", 4s, fundo `#0C6341`) | Usa `Alert.alert('Código enviado', ...)` — modal bloqueante nativo | Trocar por um componente de snackbar/toast não bloqueante, alinhado ao padrão de "Sucesso" documentado em `DESIGN_TOKENS.md` §4 |
| "Voltar para entrar" (link) — só no passo 1 no design | Presente, mas fixo fora do card, visível em ambos os passos | No design, o link "Voltar para entrar" só aparece no passo 1 (fora do card); no passo 2 o equivalente é "Trocar o e-mail" (dentro do card, estilo outline) — ajustar visibilidade condicional |
| `stepLabel` dinâmico ("Passo 1 de 2"/"Passo 2 de 2") | Não existe | Adicionar como texto derivado de `codeSent` |

**Conclusão do diagnóstico**: não é apenas um ajuste de estilo — é uma **reestruturação de layout** (de "card com ilustração" para "header de wizard + barra de progresso + card"), reaproveitando 100% da lógica de chamada Cognito já existente.

## 2. Mapeamento para Cognito (Amplify Auth)

Confirmado em `src/screens/ForgotPasswordScreen.tsx` (importado de `aws-amplify/auth`, não de `src/services/auth/authFlow.ts` diretamente na tela — mas `src/services/auth/index.ts` re-exporta `authFlow.ts`, que é onde vive a lógica de login/registro/confirmação de conta do projeto):

- **Passo 1 → `resetPassword({ username: normalizedEmail })`**: dispara o envio do código de 6 dígitos por e-mail via Cognito. Já implementado e correto.
- **Passo 2 → `confirmResetPassword({ username, confirmationCode, newPassword })`**: confirma o código e define a nova senha. Já implementado e correto.
- Tratamento de erro já mapeia os `error.name` relevantes do Cognito: `UserNotFoundException`, `LimitExceededException` (passo 1); `CodeMismatchException`, `ExpiredCodeException`, `InvalidPasswordException`, `LimitExceededException` (passo 2). Este mapeamento é considerado suficiente e não precisa mudar — apenas a **apresentação** do erro (hoje `Alert.alert`, avaliar manter `Alert.alert` para erros — o design não especifica um padrão de erro inline para esta tela — e usar o novo componente de snackbar apenas para o caminho de sucesso do passo 1, conforme `fpSnack` no Canvas).
- **Decisão**: manter as chamadas diretamente via `aws-amplify/auth` como hoje (não migrar para `authFlow.ts`) — `authFlow.ts` concentra login/registro/confirmação inicial de conta; recuperação de senha já está isolada e coesa dentro do próprio `ForgotPasswordScreen.tsx`. Migrar para um `authFlow.ts`/serviço dedicado é opcional e fora do escopo mínimo deste EPIC (não bloqueia os critérios de aceite do `spec.md`).

## 3. Abordagem de implementação (referência para `tasks.md`, sem escrever código aqui)

1. Substituir o wrapper `AuthIllustrationCard` por um layout de wizard: header próprio (seta + título + `stepLabel`) + barra de progresso de 2 segmentos + card único condicional (passo 1 ou passo 2), reaproveitando `SafeAreaView`/`KeyboardAvoidingView`/`ScrollView` já presentes.
2. Extrair (ou criar) um componente de barra de progresso reutilizável, se um padrão equivalente já existir em outra tela multi-passo (ex.: `OnboardingScreen.tsx`/wizard de 4 etapas do 2a) — reaproveitar em vez de duplicar, conforme regra 3 da constituição ("stack existente é respeitada antes de expandida").
3. Trocar `Alert.alert('Código enviado', ...)` por um componente de snackbar (verificar se já existe um componente de toast/snackbar reutilizável em `src/components/`; se não existir, este é o primeiro consumidor e deve seguir o padrão de "Sucesso" de `DESIGN_TOKENS.md` §4 — dark-green `#0C6341`, ~4s, rodapé acima da tab bar/home indicator).
4. Renomear a semântica de `codeSent` → deixar explícito como "passo atual" (ex.: `step: 1 | 2`) para refletir literalmente `fpStep1`/`fpStep2` do Canvas e permitir a barra de progresso e o `stepLabel` derivarem do mesmo estado.
5. Trocar o botão "Reenviar código" (reenvio ao mesmo e-mail) por "Trocar o e-mail" (volta ao passo 1, mantém e-mail preenchido e editável, sem nova chamada de API) — decisão de produto: se reenviar o código sem trocar de e-mail for um requisito real desejado, isso não está no Canvas 1f e deve ser tratado como extensão fora do design, não measurable neste EPIC (documentar como ambiguidade resolvida a favor da fidelidade ao Canvas, regra 8 da constituição).
6. Ajustar visibilidade do link "Voltar para entrar" para aparecer apenas no passo 1 (fora do card), como no Canvas.

## 4. Riscos / pontos de atenção
- Remover a ilustração (`forgot_password_image.png`) muda a identidade visual desta tela em relação às irmãs 1b/1d/1e, que mantêm ilustração — isso é fidelidade ao Canvas (regra 1 da constituição), não inconsistência a "corrigir" a favor da uniformidade.
- Remover "Reenviar código" pode ser percebido como perda de funcionalidade por quem já usa o app — like tradeoff aceito em nome da fidelidade ao design (regra 1); registrar explicitamente no changelog/PR.
- Snackbar não bloqueante precisa garantir que erros de rede durante o passo 1 não deixem a UI "presa" sem feedback — usar `Alert.alert` (ou padrão de erro inline já usado em outras telas) apenas para os caminhos de erro, snackbar reservada ao sucesso do envio do código.

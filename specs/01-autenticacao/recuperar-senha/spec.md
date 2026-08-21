# EPIC: Autenticação — Recuperar senha (2 passos)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela **1f** — "Tela 4 — Recuperar senha (2 passos, interativo)" em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 1239-1276).
- Rota/arquivo no código (existente): `src/app/forgot-password.tsx` → `src/screens/ForgotPasswordScreen.tsx`.
- Ator(es): usuário final (paciente) — fluxo pré-login, não requer sessão autenticada.

## 2. História da funcionalidade
Como usuário que esqueceu a senha da minha conta SuaSaúde, quero informar meu e-mail para receber um código de 6 dígitos e, em seguida, usar esse código para definir uma nova senha, para que eu recupere o acesso ao app sem precisar falar com suporte — sabendo a qualquer momento em qual dos 2 passos estou e podendo corrigir o e-mail digitado antes de reenviar.

### Cenários (Given/When/Then)
- **Vazio/inicial (passo 1):** Dado que o usuário abre `/forgot-password` pela primeira vez, quando a tela carrega, então exibe o header "Recuperar senha" com rótulo de passo, a barra de progresso com o 1º segmento preenchido (`#10794E`) e o 2º vazio, e o card "Qual é o seu e-mail?" com o campo E-mail vazio e o botão "Enviar código".
- **Sucesso (envio do código):** Dado que o usuário preenche um e-mail válido e toca em "Enviar código", quando a chamada a `resetPassword({ username })` do Cognito retorna com sucesso, então a tela avança para o passo 2 (2º segmento da barra preenchido, header/card trocam para "Crie uma nova senha"), exibe a snackbar de sucesso "Código enviado para seu e-mail" (fundo `#0C6341`, ícone check branco, ~4s) e o card mostra a mensagem "Digite o código enviado para {e-mail}".
- **Passo 2 preenchido:** Dado que o usuário está no passo 2, quando ele digita o código de 6 dígitos, a nova senha e a confirmação e toca em "Alterar senha", então a chamada a `confirmResetPassword({ username, confirmationCode, newPassword })` é disparada; em caso de sucesso, o usuário é levado de volta ao login (1b) com a nova senha já válida.
- **Erro (passo 1 — e-mail inválido/usuário inexistente):** Dado que o usuário toca em "Enviar código" com e-mail vazio ou correspondente a `UserNotFoundException`/`LimitExceededException`, quando a chamada falha, então a tela permanece no passo 1 e exibe mensagem de erro específica sem avançar a barra de progresso nem trocar de card.
- **Erro (passo 2 — código/senha inválidos):** Dado que o usuário está no passo 2 e o código está errado/expirado (`CodeMismatchException`/`ExpiredCodeException`) ou a nova senha não atende aos requisitos (`InvalidPasswordException`), quando ele toca em "Alterar senha", então a tela permanece no passo 2 com mensagem de erro específica, mantendo os dados já digitados (exceto senha, por segurança, se aplicável).
- **Navegação — trocar e-mail:** Dado que o usuário está no passo 2 e percebe que digitou o e-mail errado, quando toca em "Trocar o e-mail" (botão outline abaixo de "Alterar senha") ou na seta "‹" do header, então a tela retorna ao passo 1 com o campo de e-mail preenchido com o valor anterior, editável, e a barra de progresso volta a mostrar só o 1º segmento preenchido.
- **Navegação — voltar para login:** Dado que o usuário está no passo 1, quando toca em "Voltar para entrar", então é levado de volta à tela de login (1b), sem enviar nenhum código.

## 3. Estrutura da página
Tela com header fixo (não usa `AuthIllustrationCard`/ilustração de imagem, diferente de outras telas de auth):
- **Status bar mock** (topo, decorativo em dev/preview).
- **Header**: botão "‹" voltar (48×48, radius 14, borda `#DFE3E1`) + título "Recuperar senha" (600 20px) + subtítulo dinâmico de passo (`stepLabel`, 400 16px `#55605C`, ex.: "Passo 1 de 2" / "Passo 2 de 2").
- **Barra de progresso de 2 segmentos**: dois blocos `flex:1;height:8px;radius:4px`; passo 1 → 1º `#10794E` preenchido, 2º cinza/vazio; passo 2 → ambos `#10794E`.
- **Card passo 1** ("Qual é o seu e-mail?"): título 600 22px, texto de apoio "Vamos enviar um código de 6 dígitos para você criar uma senha nova.", campo "E-mail" (label 600 16px + input 56px/radius 14), botão primário "Enviar código" (56px, `#10794E`), link "Voltar para entrar" (`#1B63C4`, centralizado, abaixo do card).
- **Card passo 2** ("Crie uma nova senha"): título 600 22px, texto de apoio "Digite o código enviado para {e-mail}.", campo "Código de 6 dígitos" (input com `letter-spacing .3em`, fonte 20px), campo "Nova senha" (placeholder "Mínimo 8 caracteres, 1 número, 1 especial"), campo "Confirmar nova senha", botão primário "Alterar senha", botão secundário outline "Trocar o e-mail" (volta ao passo 1).
- **Snackbar de sucesso** (`fpSnack`): posicionada `absolute`, acima da barra de home-indicator, fundo `#0C6341`, ícone check circular branco + texto "Código enviado para seu e-mail", some após ~4s.
- **Home-indicator bar** (rodapé, decorativo).

## 4. Mapa de navegação

| Origem | Destino | Trigger |
|---|---|---|
| `/forgot-password` (passo 1) | `/forgot-password` (passo 2, mesma rota) | Toque em "Enviar código" com `resetPassword` bem-sucedido |
| `/forgot-password` (passo 2) | `/forgot-password` (passo 1, mesma rota) | Toque em "Trocar o e-mail" ou na seta "‹" do header |
| `/forgot-password` (passo 1) | `/` (Login — 1b) | Toque em "Voltar para entrar" |
| `/forgot-password` (passo 2) | `/` (Login — 1b) | `confirmResetPassword` bem-sucedido → navegação automática de volta ao login |

## 5. Mapa de dados

| Campo/estado | Origem | Observação |
|---|---|---|
| `fpEmail` (E-mail) | Input do usuário (passo 1) | Normalizado (`trim().toLowerCase()`) antes de enviar a Cognito; reaproveitado como `username` no passo 2 |
| Envio do código | `resetPassword({ username })` (`aws-amplify/auth`, via `src/services/auth/authFlow.ts`) | Nenhum dado mockado — chamada real ao Cognito |
| `fpCode` (Código de 6 dígitos) | Input do usuário (passo 2) | Enviado como `confirmationCode` |
| `fpNew` / `fpNew2` (Nova senha / Confirmar) | Input do usuário (passo 2) | Validação local de igualdade antes de chamar `confirmResetPassword`; senha em si não é persistida em estado após sucesso |
| Confirmação da nova senha | `confirmResetPassword({ username, confirmationCode, newPassword })` (`aws-amplify/auth`) | Nenhum dado mockado — chamada real ao Cognito |
| `fpStep1` / `fpStep2` | Estado local de UI (`codeSent` no código atual) | Controla qual card é exibido e o estado da barra de progresso |
| `fpSnack` | Estado local de UI (transitório, ~4s) | Não existe hoje no código — usa `Alert.alert` no lugar |

Não há leitura/gravação em DynamoDB ou S3 nesta tela — apenas Cognito (Amplify Auth).

## 6. Requisitos não-funcionais específicos
- **Nunca revelar se o e-mail existe** (segurança): mensagens de erro no passo 1 não devem confirmar/negar explicitamente a existência da conta além do necessário — hoje `UserNotFoundException` mostra "Usuário não encontrado.", o que já é uma prática comum do Cognito, manter conforme já implementado, mas revisar copy à luz do design (o Canvas não define copy de erro, decisão já documentada aqui).
- **Toque/tamanho mínimo**: campos e botões com 56px de altura, alvo mínimo 48dp (regra do sistema de design, `DESIGN_TOKENS.md` §3).
- **Estado de carregamento**: botão(ões) primário(s) devem refletir estado `loading` (spinner + texto, conforme padrão de botão em `DESIGN_TOKENS.md` §4) durante as chamadas a `resetPassword`/`confirmResetPassword`, bloqueando reenvio duplicado.
- **Dark mode**: cores devem resolver via `useThemeColors()`/classes `app-*`/`app-dark-*`, nunca hex hardcoded, coerente com a Fundação de tokens (`00-fundacao/design-tokens`).
- **Sem persistência de senha em texto puro além do necessário**: o estado `newPassword`/`confirmPassword` deve ser limpo da memória do componente assim que a troca for confirmada com sucesso ou a tela for desmontada.
- **Snackbar não bloqueante**: a snackbar de sucesso não deve capturar toque nem impedir interação com o restante da tela, e deve desaparecer automaticamente (~4s), conforme padrão de sucesso documentado em `DESIGN_TOKENS.md` §4 ("Padrão de 4 estados").

## 7. Critérios de aceite
- [ ] A tela é estruturada como header fixo (seta "‹" + título + rótulo de passo dinâmico) + barra de progresso de 2 segmentos + card único visível por vez — sem usar `AuthIllustrationCard`/imagem ilustrativa, divergindo do padrão hoje usado em `ForgotPasswordScreen.tsx`.
- [ ] Passo 1 mostra exatamente: título "Qual é o seu e-mail?", texto de apoio sobre o código de 6 dígitos, campo "E-mail", botão "Enviar código", link "Voltar para entrar".
- [ ] Passo 2 mostra exatamente: título "Crie uma nova senha", texto "Digite o código enviado para {e-mail}.", campos "Código de 6 dígitos"/"Nova senha"/"Confirmar nova senha", botão "Alterar senha", botão "Trocar o e-mail" — sem o botão "Reenviar código" hoje presente (fora do design; ver `plan.md` para decisão).
- [ ] A barra de progresso reflete visualmente o passo atual (1 ou 2 segmentos preenchidos em `#10794E`).
- [ ] "Trocar o e-mail" e a seta "‹" retornam ao passo 1 preservando o e-mail já digitado, sem re-disparar `resetPassword`.
- [ ] Sucesso de `resetPassword` exibe snackbar "Código enviado para seu e-mail" (fundo `#0C6341`, ~4s) em vez do `Alert.alert` atual.
- [ ] `resetPassword`/`confirmResetPassword` continuam sendo as únicas chamadas de dado real (Cognito) usadas — nenhum dado mockado introduzido.
- [ ] Estados de erro (e-mail inválido, código incorreto/expirado, senha fora dos requisitos, limite de tentativas) mantêm o usuário no passo correspondente com mensagem específica, sem avançar a barra de progresso indevidamente.
- [ ] Fluxo completo (passo 1 → código → passo 2 → nova senha → login) testado manualmente end-to-end contra o Cognito real do projeto (não mockado).

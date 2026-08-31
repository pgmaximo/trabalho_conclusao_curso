# EPIC: Confirmação de conta (código + cooldown)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 1e ("Tela 3 — Confirmação de conta (código + cooldown)") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 1211-1238).
- Rota/arquivo no código (existente): `confirm` → `src/app/confirm.tsx` (recebe `email`/`password` via query params) → `src/screens/ConfirmScreen.tsx` (`ConfirmScreen`).
- Ator(es): usuário final (pessoa recém-cadastrada confirmando o e-mail antes do primeiro acesso). Não aplicável ao ator empresa.

## 2. História da funcionalidade
Como usuário que acabou de se cadastrar no SuaSaúde, quero digitar o código de 6 dígitos enviado por e-mail em caixas individuais que avançam o foco automaticamente, para confirmar minha conta rapidamente e, caso não receba o código, poder pedir um novo após um tempo de espera visível — sem precisar sair da tela ou perder o que já digitei.

### Cenários (Given/When/Then)
- **Estado vazio (chegada na tela):** Dado que o usuário acabou de se cadastrar (`RegisterScreen` chamou `signUp` com sucesso) e foi redirecionado para `/confirm?email=...&password=...`, quando a tela `ConfirmScreen` monta, então as 6 caixas de dígito aparecem vazias e focáveis, o banner azul mostra "Verifique seu e-mail. Enviamos um código de 6 dígitos para {email}.", o botão "Confirmar" aparece em estado desabilitado (cinza, `#DFE3E1`/`#7A8480`) e o cooldown de reenvio já está em contagem regressiva (o código já foi enviado pelo `signUp` do `RegisterScreen`).
- **Preenchimento progressivo (auto-advance):** Dado que o usuário digita um dígito numérico na caixa N (0-indexed), quando o valor é aceito, então o foco avança automaticamente para a caixa N+1 (exceto na caixa 5, a última); dado que o usuário apaga (backspace) uma caixa vazia, quando o backspace é pressionado, então o foco volta para a caixa N-1 e o dígito anterior é limpo.
- **Sucesso (código completo → "Tudo pronto"):** Dado que as 6 caixas estão preenchidas com dígitos, quando o último dígito é digitado, então o texto de apoio "Tudo pronto — toque em Confirmar." aparece abaixo do botão e o botão "Confirmar" muda para o estado ativo (verde `#10794E`, texto branco); dado que o usuário toca em "Confirmar", quando `confirmSignUp` retorna sucesso, então o app tenta `signIn` automático com a senha recebida por parâmetro, inicializa a sessão local e navega para `/profile-setup`.
- **Erro (código inválido/expirado):** Dado que o usuário toca em "Confirmar" com um código incorreto ou expirado, quando `confirmSignUp` rejeita a chamada, então uma mensagem de erro é exibida (hoje via `Alert.alert('Erro', 'Código inválido ou expirado.')`; consistente com o padrão de erro documentado em `DESIGN_TOKENS.md` §4, embora o Canvas 1e não desenhe um estado de erro explícito para esta tela) e as 6 caixas permanecem preenchidas para nova tentativa (não devem ser limpas automaticamente).
- **Cooldown de reenvio:** Dado que o cooldown de reenvio está ativo (`cooldown > 0`), quando a tela renderiza o botão inferior, então ele aparece desabilitado (borda `#DFE3E1`, texto cinza `#55605C`/`#7A8480`) com o rótulo "Reenviar em {cooldown}s", decrescendo a cada segundo; dado que o cooldown chega a 0, quando o botão renderiza novamente, então ele fica habilitado com o rótulo "Reenviar código" em cor de link/ação (`#1B63C4`); dado que o usuário toca no botão habilitado, quando `resendSignUpCode` é chamado com sucesso, então o cooldown reinicia e um novo código é reenviado ao mesmo e-mail.
- **Navegação de saída:** Dado que o usuário toca em "Voltar para entrar" (link azul `#1B63C4`, centralizado, abaixo do card), quando o toque é processado, então o app navega de volta para a tela de login (`/`) sem exigir confirmação do código.

## 3. Estrutura da página
Replicando a Tela 1e do Canvas (frame 390×844, fundo `#F7F8F7`):
- **Barra de status mock** (48px, hora + ícone de sinal) — decorativa, já padronizada em outras telas de auth.
- **Cabeçalho**: botão "voltar" circular 48×48 (borda 1.5px `#DFE3E1`, ícone "‹") + título "Confirmar conta" (600 20px).
- **Banner informativo azul** (`#E9F1FD` bg, borda `#CBDFFA`, radius 16px, padding 16px): ícone de envelope em tile azul `#1B63C4` (28×28, radius 8px) + texto "**Verifique seu e-mail.** Enviamos um código de 6 dígitos para {email}." (17px, `#141817`, negrito só na primeira frase).
- **Card branco** (radius 20px, borda `#EFF1F0`, padding 20px, sombra suave):
  - Título de seção "Digite o código" (600 20px).
  - **6 caixas de dígito individuais** em linha (`display:flex; gap:6px`), cada uma `flex:1` (dimensão de referência 52×60px conforme `DESIGN_TOKENS.md` §3 "OTP/code digit boxes"; o markup do Canvas usa altura 62px/flex — usar 52×60 como token canônico do design system, documentado como ambiguidade menor no `plan.md`), radius 12px, borda 1.5px `#DFE3E1`, fundo branco, `maxLength=1`, `keyboardType="number-pad"`, texto centralizado 600 24px `#141817`, foco avança automaticamente para a próxima caixa.
  - **Botão "Confirmar"** (56px altura, radius 14px, largura total do card): estado desabilitado (cinza `#DFE3E1`/`#7A8480`, texto "Confirmar") quando nem todas as 6 caixas estão preenchidas; estado ativo (verde `#10794E`, texto branco) quando as 6 estão preenchidas; estado carregando (verde escuro `#0C6341` + spinner) durante a chamada a `confirmSignUp`.
  - **Texto condicional "Tudo pronto — toque em Confirmar."** (16px, `#55605C`, centralizado) — só aparece quando `codeFull` é verdadeiro (as 6 caixas preenchidas).
  - Divisor horizontal (1px `#EFF1F0`).
  - Texto de apoio "Não recebeu? Confira a caixa de spam." (17px, `#55605C`).
  - **Botão "Reenviar"** (outline, 56px, radius 14px, borda 1.5px `#DFE3E1`, fundo branco): rótulo dinâmico — "Reenviar em {cooldown}s" (cinza, desabilitado) durante o cooldown, "Reenviar código" (azul `#1B63C4`, habilitado) quando `cooldown === 0`.
- **Link "Voltar para entrar"** (600 17px, `#1B63C4`, centralizado, abaixo do card, fora dele).
- **Home indicator** (barra 130×5px `#C3C9C6`, decorativa).

## 4. Mapa de navegação
| Origem | Destino | Trigger |
|---|---|---|
| `RegisterScreen` (`/register`) | `ConfirmScreen` (`/confirm?email=&password=`) | `signUp` bem-sucedido no cadastro (código já foi enviado ao e-mail neste momento) |
| `ForgotPasswordScreen` (`/forgot-password`) | `ConfirmScreen` (`/confirm?email=`, sem `password`) | Fluxo de recuperação de senha que também usa confirmação de código por e-mail (ver `CODE_INVENTORY.md`; `password` ausente ⇒ sem auto-signin) |
| `ConfirmScreen` | `/profile-setup` (`OnboardingScreen`) | Toque em "Confirmar" com código válido (`confirmSignUp` sucesso) — usuário novo, ainda sem perfil de saúde |
| `ConfirmScreen` | `/` (`LoginScreen`) | Toque em "Voltar para entrar" (botão "‹" do cabeçalho ou link inferior) |

## 5. Mapa de dados
| Campo/estado | Fonte | Observação |
|---|---|---|
| `email` | Query param da rota `/confirm` (`useLocalSearchParams`), originado do formulário de cadastro/recuperação | Exibido no banner informativo; usado como `username` em `confirmSignUp`/`resendSignUpCode`/`signIn` |
| `password` | Query param opcional da rota `/confirm` | Usado apenas para `signIn` automático pós-confirmação (regra 5 da constituição: não pode quebrar o fluxo de sessão existente); ausente no fluxo de recuperação de senha |
| Código de 6 dígitos (`c0`...`c5` no Canvas) | Estado local de UI (não persiste) | No código atual é uma única string `code`; a spec exige refatorar para 6 estados/refs — um por caixa — com auto-advance |
| `codeFull` | Derivado (todas as 6 caixas preenchidas) | Controla o estado visual do botão "Confirmar" e a exibição do texto "Tudo pronto" |
| `cooldown` | Estado local de UI, decrementado por `setInterval` | Cognito (via `resendSignUpCode`) não expõe um tempo de expiração de cooldown na API — o valor e a duração são uma decisão de produto/UI, não um dado vindo do backend |
| Confirmação de conta | `confirmSignUp({ username: email, confirmationCode })` — Amazon Cognito via `aws-amplify/auth` | Chamada real, sem mock (regra 2 da constituição) |
| Reenvio de código | `resendSignUpCode({ username: email })` — Amazon Cognito via `aws-amplify/auth` | Chamada real, sem mock |
| Sessão pós-confirmação | `signIn(...)` + `initializeUserSession()` (`src/services/auth/userSessionService.ts`) | Preserva o comportamento real documentado em `CODE_INVENTORY.md`: "auto-signs in with the passed password, then routes to profile setup" — não deve ser alterado por este EPIC, que é escopo de UI |

## 6. Requisitos não-funcionais específicos
- **Acessibilidade de foco/teclado**: as 6 caixas devem ser navegáveis via teclado numérico do sistema, com `autoFocus` na primeira caixa ao montar a tela, avanço automático de foco ao digitar e retrocesso automático ao apagar (backspace em caixa vazia). Cada caixa deve ter `accessibilityLabel` indicando sua posição (ex.: "Dígito 1 de 6") para leitores de tela.
- **Toque mínimo**: as 6 caixas devem manter altura ≥48dp mesmo com a largura dividida em `flex:1` (regra de 48dp mínimo de `DESIGN_TOKENS.md` §3); botões "Confirmar" e "Reenviar" mantêm 56px.
- **Feedback de estado sem cor isolada**: o estado desabilitado do botão "Reenviar" deve comunicar o motivo por texto (rótulo "Reenviar em Ns"), nunca apenas por cor acinzentada — já coerente com a regra de botão desabilitado em `DESIGN_TOKENS.md` §4.
- **Resiliência do cooldown**: o timer deve ser limpo corretamente no unmount (`clearInterval`) e não pode reiniciar/duplicar caso o componente re-renderize — já implementado corretamente hoje em `ConfirmScreen.tsx` (efeito com cleanup) e deve ser preservado.
- **Dark mode**: cores e contraste devem seguir os pares dark documentados em `DESIGN_TOKENS.md` §1 (ex.: banner info em dark deve usar os tokens dark de `secondary`, não os hex fixos do Canvas claro).
- **Segurança/privacidade (LGPD, regra 4 da constituição)**: o e-mail exibido no banner é dado pessoal do próprio usuário em fluxo de autoatendimento — não requer aviso de consentimento adicional, mas não deve ser logado em texto plano em serviços de terceiros além do necessário para o fluxo Cognito.

## 7. Critérios de aceite
- [ ] A tela exibe 6 caixas de dígito individuais (não um único campo de texto), cada uma aceitando exatamente 1 dígito numérico, com radius 12px e alinhadas em linha com `gap` entre elas, conforme Canvas 1e.
- [ ] Ao digitar um dígito, o foco avança automaticamente para a próxima caixa; ao apagar uma caixa vazia (backspace), o foco retorna para a caixa anterior.
- [ ] O botão "Confirmar" está desabilitado (visualmente e via `disabled`) até que as 6 caixas estejam preenchidas, e habilitado (cor primária verde) quando completas.
- [ ] O texto "Tudo pronto — toque em Confirmar." aparece somente quando as 6 caixas estão preenchidas e desaparece se qualquer caixa for apagada.
- [ ] O banner azul informativo ("Verifique seu e-mail...") e o card branco "Digite o código" substituem o layout atual baseado em `AuthIllustrationCard` + campo único, mantendo a mesma rota/props (`email`, `password`, `onConfirmSuccess`, `onBackToLogin`).
- [ ] O botão "Reenviar" mostra contagem regressiva em segundos ("Reenviar em Ns") enquanto `cooldown > 0`, fica desabilitado nesse período, e muda para "Reenviar código" habilitado quando o cooldown chega a zero.
- [ ] O link "Voltar para entrar" (fora do card, texto azul `#1B63C4`) navega para `/` preservando o comportamento atual de `onBackToLogin`.
- [ ] `confirmSignUp`, `resendSignUpCode` e o auto-signin com `signIn` + `initializeUserSession()` continuam sendo chamados exatamente como hoje (mesma lógica de negócio) — só a camada de UI/apresentação muda, conforme regra 5 e regra 1 da constituição.
- [ ] Estados de erro (código inválido/expirado, falha de rede no reenvio) continuam sendo comunicados ao usuário (hoje via `Alert.alert`; pode evoluir para um estado de erro inline no card, desde que documentado como decisão em `plan.md`).
- [ ] Dark mode aplicado a todos os elementos novos (banner, caixas, card, botões) usando `useThemeColors()`/classes `app-*`/`app-dark-*`, sem hex fixos hardcoded do Canvas claro.

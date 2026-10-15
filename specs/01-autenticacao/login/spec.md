# EPIC: Login (Bloco 1)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: telas 1b (claro, interativo) e 1c (tema escuro, snapshot estático) em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 1124–1180). São a mesma tela — "Tela 1 — Login" — em dois estados de tema, não duas telas separadas.
- Rota/arquivo no código (existente): `src/app/index.tsx` (rota `/`) → renderiza `src/screens/LoginScreen.tsx`.
- Ator(es): usuário final (paciente que já possui conta).

## 2. História da funcionalidade
Como usuário final, quero entrar na minha conta com e-mail e senha (ou com minha conta Google), para que eu acesse meus dados de saúde salvos no SuaSaúde.

### Cenários (Given/When/Then)

- **Vazio (N/A):** não se aplica — a tela de login não tem estado "vazio"; os campos de e-mail/senha simplesmente começam em branco (`lEmail`/`lPwd` vazios no design).
- **Carregando:**
  Given o usuário preencheu e-mail e senha e toca em "Entrar"
  When a chamada ao Cognito (`signIn`) está em andamento
  Then o botão primário assume o estado `lLoading` — fundo `#0C6341`, spinner branco 2.5px + texto "Entrando..." — e fica bloqueado para novos toques.
- **Sucesso:**
  Given as credenciais são válidas e o Cognito retorna `isSignedIn: true`
  When a sessão é inicializada (`initializeUserSession`)
  Then o app exibe o snackbar de sucesso (`lToast`, fundo `#0C6341`, ✓ branco, texto "Bem-vinda de volta, Maria!" no design — na implementação real o nome vem do perfil autenticado, ou copy genérica "Bem-vindo(a) de volta!" se o nome ainda não estiver disponível) e redireciona via `resolvePostAuthRoute()` (`/dashboard` se o perfil já foi configurado, `/profile-setup` caso contrário).
- **Erro de credenciais inválidas:**
  Given e-mail/senha não correspondem a uma conta (Cognito `UserNotFoundException`/`NotAuthorizedException`)
  When o `signIn` falha
  Then a tela mostra mensagem de erro amigável ("E-mail ou senha incorretos. Verifique os dados e tente novamente.") e o botão volta ao estado `lIdle` para nova tentativa.
- **Erro de rede/serviço:**
  Given a chamada ao Cognito falha por timeout, erro de configuração (`InvalidParameterException`) ou outro erro inesperado
  When o `catch` do `handleLogin`/`handleGoogleLogin` é acionado
  Then a tela mostra mensagem de erro genérica ("Ocorreu um erro ao entrar. Tente novamente.") sem travar a tela.
- **Validação de formulário (e-mail/senha vazios):**
  Given e-mail ou senha estão em branco
  When o usuário toca em "Entrar"
  Then a submissão é bloqueada e o usuário recebe aviso ("Por favor, preencha e-mail e senha.") sem chamar o Cognito.
- **Mostrar/ocultar senha:**
  Given o campo de senha está preenchido
  When o usuário toca no link "Mostrar"/"Ocultar" (`toggleLShow`/`lShowLabel`) à direita do campo
  Then o texto da senha alterna entre oculto (bullets) e visível em texto plano.
- **Entrar com Google:**
  Given o usuário toca em "Continuar com Google"
  When `signInWithGoogle()` (Cognito Hosted UI via `signInWithRedirect`) completa com sucesso
  Then a sessão é inicializada e o usuário é redirecionado da mesma forma que o login por senha (mesmo destino pós-auth).
- **Conta não confirmada:**
  Given o Cognito retorna `nextStep.signInStep === 'CONFIRM_SIGN_UP'`
  When o login por senha é tentado
  Then o usuário recebe aviso para confirmar o cadastro por e-mail (fluxo não coberto por este EPIC — ver tela 1e).

## 3. Estrutura da página
Ordem visual observada no markup (1b/1c), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Cabeçalho do app: ícone quadrado arredondado 44×44 (bg verde `#10794E` claro / `#4FC58C` escuro, glifo em cruz branco/`#0E1413`) + título "SuaSaúde" (600 22px) + subtítulo "Sua saúde organizada em um lugar" (400 16px, `#55605C`/`#AEBBB6`).
3. Card branco/escuro (`#fff`/`#18201E`, borda 1px `#EFF1F0`/`#33403C`, radius 20px, padding 20px):
   - Título do card "Entre na sua conta" (600 22px).
   - Campo "E-mail" (label 600 16px + input 56px altura, radius 14, placeholder "seu@email.com").
   - Campo "Senha" (label + input 56px com link "Mostrar"/"Ocultar" à direita, 600 16px, cor `#1B63C4`/`#8FB8F7`).
   - Link "Esqueceu a senha?" alinhado à direita, 600 16px, cor `#1B63C4`/`#8FB8F7`.
   - Botão primário "Entrar" (estado idle) OU botão em estado de loading "Entrando..." com spinner (mutuamente exclusivos via `sc-if lIdle`/`lLoading`).
   - Divisor "ou continue com" (linha + texto centralizado).
   - Botão social "Continuar com Google" (ícone "G" em tile 26×26 + label).
   - Botão social "Continuar com Apple" — condicional (`showApple`, oculto por padrão; não existe em 1c/dark).
4. Link "Não tem conta? Criar conta" centralizado abaixo do card.
5. Nota LGPD (`showLgpd`, visível por padrão): "Ao entrar você aceita os Termos de Uso e a Política de Privacidade (LGPD)." — texto 400 16px centralizado.
6. Snackbar de sucesso (`lToast`, oculto por padrão, ancorado no rodapé acima da home-indicator bar): "Bem-vinda de volta, Maria!".
7. Home-indicator bar decorativa (130×5px pill).

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Botão "Entrar" | Botão primário | Submete `signIn` (Cognito, e-mail+senha) | Permanece na tela até resolver; em sucesso → `resolvePostAuthRoute()` (`/dashboard` ou `/profile-setup`) | Habilitado quando não está em loading |
| Link "Esqueceu a senha?" | Link de texto | Navega | `/forgot-password` (tela 1f) | Sempre visível, desabilitado durante loading |
| Link "Criar conta" (dentro de "Não tem conta? Criar conta") | Link de texto | Navega | `/register` (tela 1d) | Sempre visível, desabilitado durante loading |
| Botão "Continuar com Google" | Botão social | Submete `signInWithGoogle()` (Cognito Hosted UI / Google) | Em sucesso → mesmo destino pós-auth do login por senha | Sempre visível |
| Botão "Continuar com Apple" | Botão social | N/A — não implementado | N/A | Condicional no design (`showApple`, default `false`); ausência atual está correta pelo estado default, mas fica registrado como gap caso o produto decida habilitar login Apple |
| Link "Mostrar/Ocultar" (senha) | Toggle de texto | Alterna `secureTextEntry` do campo | Permanece na tela | Sempre visível quando há foco/preenchimento no campo |

## 5. Mapa de dados

| Campo/Componente | Origem do dado | Fonte técnica | Tipo | Validação | Comportamento offline/erro |
|---|---|---|---|---|---|
| E-mail (`lEmail`) | Input do usuário | Estado local (`useState`) | string | Não vazio; trim + lowercase antes de enviar | Bloqueia submit com aviso se vazio |
| Senha (`lPwd`) | Input do usuário | Estado local (`useState`) | string | Não vazio | Bloqueia submit com aviso se vazio |
| Autenticação por senha | N/A (nenhum dado read-only exibido) | `signIn()` de `aws-amplify/auth` (`authFlowType: 'USER_PASSWORD_AUTH'`), com `signOut()` prévio para limpar sessão residual | — | Validação de credenciais é feita pelo Cognito (retorna `UserNotFoundException`/`NotAuthorizedException`) | Erro de rede/serviço cai no `catch` genérico; mensagem amigável, sem crash |
| Autenticação por Google | N/A | `signInWithGoogle()` em `src/services/auth/google-auth.ts` → `signInWithRedirect({ provider: 'Google' })` (Cognito Hosted UI + `expo-web-browser`) | — | Delegada ao provedor OAuth | Cancelamento/erro do browser tratado como erro genérico ("Não foi possível conectar com o Google.") |
| Sessão pós-login | N/A | `initializeUserSession()` (`src/services/auth/userSessionService.ts`) chamada antes de navegar, tanto no fluxo de senha quanto no Google | — | — | Se falhar, o erro sobe pelo mesmo `catch` do fluxo que a chamou |
| Rota pós-auth | Derivado (não é campo de tela) | `resolvePostAuthRoute()` em `src/services/auth/authFlow.ts` → `hasCompletedProfileSetup()` | `'/dashboard' \| '/profile-setup'` | — | — |

Nenhum dado mockado nesta tela: tanto o login por senha quanto o login por Google já usam Cognito real (regra 2 da constituição já satisfeita na lógica; o EPIC trata apenas de fidelidade visual/estados).

## 6. Requisitos não-funcionais específicos
- **LGPD:** a nota "Ao entrar você aceita os Termos de Uso e a Política de Privacidade (LGPD)." é copy fixa do design e deve ser exibida sempre (equivalente ao estado `showLgpd = true` default) — atualmente ausente na implementação.
- **Contraste dark mode:** tema escuro deve usar exatamente os tokens documentados em `DESIGN_TOKENS.md` §1 (bg `#0E1413`, card `#18201E`, input bg `#222B29`, borda `#33403C`, texto primário `#EDF2F0`, texto secundário `#AEBBB6`, primária de ação `#4FC58C` com texto escuro `#0E1413` sobre ela, foco de input `#8FB8F7` 2px) — não reaproveitar tokens de outros artefatos do TCC (regra 7 da constituição).
- **Erro amigável de Cognito:** nomes de exceção do Cognito (`UserNotFoundException`, `NotAuthorizedException`, `UserNotConfirmedException`, `InvalidParameterException`) nunca devem vazar para a UI — sempre traduzidos para mensagem em PT-BR já mapeada no código atual (manter esse mapeamento).
- **Toques mínimos:** botões e links devem manter os alvos de toque ≥48dp / botão primário 56dp, conforme `DESIGN_TOKENS.md` §3.
- **Bloqueio de duplo submit:** botão "Entrar" e "Continuar com Google" devem ficar desabilitados/bloqueados durante `isLoading`, evitando múltiplas chamadas ao Cognito simultâneas (já implementado, manter).

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas (1b claro e 1c escuro): cabeçalho ícone+título+tagline fora do card, card branco/escuro com título "Entre na sua conta", campos, divisor, botão(ões) social(is), link "Criar conta", nota LGPD.
- [ ] Todos os botões do mapa de navegação conectados (Entrar, Esqueceu a senha → `/forgot-password`, Criar conta → `/register`, Google).
- [ ] Autenticação real via Cognito (sem mock) — já satisfeito por `authFlow.ts`/`google-auth.ts`, apenas preservar.
- [ ] Estados de loading/erro/sucesso implementados: botão com estado `lLoading` visual (fundo escuro + spinner + "Entrando..."), mensagem de erro amigável, toast/snackbar de sucesso "Bem-vindo(a) de volta!" antes do redirecionamento.
- [ ] Toggle "Mostrar/Ocultar" senha implementado como link de texto (não ícone), cor `#1B63C4`/`#8FB8F7`.
- [ ] Nota LGPD visível abaixo do link "Criar conta".
- [ ] N/A diagnóstico de IA (não se aplica a esta tela).

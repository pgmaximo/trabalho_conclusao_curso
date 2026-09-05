# EPIC: Autenticação — Cadastro (checklist de senha ao vivo)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 1d (Tela 2 — Cadastro, checklist de senha ao vivo) em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 1182-1210)
- Rota/arquivo no código (existente): `src/app/register.tsx` (rota `/register`) → `src/screens/RegisterScreen.tsx` (`RegisterScreen`)
- Ator(es): usuário final (não autenticado) — qualquer pessoa criando uma conta nova no app, seja com e-mail/senha, seja com Google.

## 2. História da funcionalidade
Como uma pessoa que ainda não tem conta no SuaSaúde, quero criar minha conta informando e-mail e senha (ou continuando com Google), com um checklist de requisitos de senha que se atualiza a cada tecla digitada, para que eu saiba exatamente o que falta antes de tentar enviar o formulário — evitando o erro genérico "senha inválida" só depois de submeter.

### Cenários (Given/When/Then)
- **Estado vazio/inicial:** Dado que a tela de cadastro acabou de abrir, quando nenhum campo foi preenchido, então os campos de e-mail/senha/confirmar senha estão vazios, e o checklist de 5 regras de senha não é exibido (aparece apenas quando o campo de senha recebe foco ou passa a ter conteúdo).
- **Checklist ao vivo (regra por regra):** Dado que o usuário está digitando no campo "Senha", quando cada caractere é digitado, então cada uma das 5 regras (mín. 8 caracteres, 1 número, 1 caractere especial, 1 maiúscula, 1 minúscula) atualiza seu ícone/cor imediatamente — de "não atendida" (círculo vazio, texto neutro) para "atendida" (check verde, texto riscado/verde) — sem exigir blur ou submit.
- **Confirmação de senha divergente:** Dado que o usuário preencheu "Senha" e "Confirmar senha" com valores diferentes, quando o campo de confirmação perde ou já tem conteúdo divergente do primeiro, então uma mensagem de erro vermelha "As senhas não são iguais." aparece abaixo do campo, com a borda do campo em vermelho.
- **Botão "Criar conta" bloqueado:** Dado que nem todas as 5 regras de senha estão atendidas, quando o usuário olha o botão primário, então ele aparece no estado desabilitado (bg `#DFE3E1`, texto `#7A8480`) com o texto de apoio "Complete os itens acima para continuar." abaixo dele — nunca falha silenciosamente sem explicação.
- **Sucesso (submit válido):** Dado que e-mail válido, senha atendendo às 5 regras e confirmação de senha idênticas foram informados, quando o usuário toca em "Criar conta", então a chamada `signUp` do Cognito é disparada, o botão entra em estado de carregamento, e em caso de sucesso (`nextStep.signUpStep === 'CONFIRM_SIGN_UP'`) o app navega para `/confirm` levando e-mail e senha para permitir auto sign-in pós-confirmação.
- **Erro do backend (Cognito):** Dado que o `signUp` falha (e-mail já em uso, senha rejeitada pela política real do User Pool, parâmetro inválido), quando o erro retorna, então uma mensagem específica e traduzida é exibida (`UsernameExistsException` → "Este e-mail já está em uso.", `InvalidPasswordException` → "A senha não atende aos requisitos mínimos de segurança.", `InvalidParameterException` → "Verifique se o e-mail está em um formato válido.", fallback genérico para os demais casos) — nunca expõe a mensagem crua da AWS.
- **Cadastro via Google:** Dado que o usuário toca em "Continuar com Google" em vez de preencher o formulário, quando o fluxo OAuth do Google é concluído com sucesso, então a sessão é inicializada e o usuário é redirecionado à rota pós-autenticação apropriada (`/dashboard` ou `/profile-setup`), pulando por completo o checklist de senha (Cognito gerencia a senha nesse fluxo).
- **Navegação de volta:** Dado que o usuário já tem conta, quando toca no link "Já tem conta? Entrar" (ou na seta de voltar, quando existente na tela), então é levado de volta à tela de Login (1b/`/`).

## 3. Estrutura da página
- **Header**: seta de voltar (chevron `‹`, 48×48px) + título "Criar conta" (600 20px).
- **Card de formulário** (bg branco, borda `#EFF1F0`, radius 20px, padding 16px):
  - Campo "E-mail" (label 600 16px + input 52px altura, radius 14, borda `#DFE3E1`, placeholder "seu@email.com").
  - Campo "Senha" (mesmo padrão visual, placeholder "Crie uma senha", `secureTextEntry`).
  - **Checklist de senha ao vivo** — painel cinza claro (`#F7F8F7`, borda `#EFF1F0`, radius 14, padding 12) contendo exatamente 5 linhas (`sc-for rules`), cada uma com: círculo 22px (bg/cor dinâmicos conforme atendida/não atendida, glifo check ou vazio) + texto da regra (peso/cor dinâmicos — riscado/verde quando atendida).
  - Campo "Confirmar senha" (placeholder "Repita a senha"; borda fica vermelha quando `mismatch` é verdadeiro).
  - Mensagem de erro condicional "As senhas não são iguais." (ícone "!" vermelho 20px + texto vermelho 16px), exibida somente quando `mismatch`.
  - Botão primário "Criar conta" (altura 52px, radix 14, bg/fg dinâmicos: verde+branco quando habilitado, cinza+cinza-texto quando desabilitado).
  - Texto de apoio condicional "Complete os itens acima para continuar." (16px, `#55605C`, centralizado), exibido somente quando `notAllOk`.
  - Divisor "ou continue com".
  - Botão social "Continuar com Google" (branco, borda `#DFE3E1`, logo "G" 24×24 + texto 600 17px).
- **Rodapé da tela**: linha "Já tem conta? Entrar" (link azul `#1B63C4`) centralizada abaixo do card.
- **Barra home-indicator** (130×5px, `#C3C9C6`) no rodapé do frame do telefone — decorativa, não interativa.

## 4. Mapa de navegação
| Origem | Destino | Trigger |
|---|---|---|
| `/register` | `/` (Login, tela 1b) | Toque em "Já tem conta? Entrar" (`onNavigateToLogin`) |
| `/register` | `/confirm` (tela 1e) | `signUp` bem-sucedido com `nextStep.signUpStep === 'CONFIRM_SIGN_UP'` — leva `email` e `password` como params para permitir auto sign-in pós-confirmação (`onRegisterSuccess`) |
| `/register` | `/dashboard` ou `/profile-setup` | Cadastro via Google concluído (`onGoogleAuthSuccess` → `resolvePostAuthRoute()`, que consulta `hasCompletedProfileSetup()`) |
| `/register` | (permanece na tela) | Erro de validação local (campos vazios, senha não atende às regras, senhas divergentes) ou erro do Cognito — `Alert.alert` é exibido, nenhuma navegação ocorre |

## 5. Mapa de dados
| Campo/estado | Fonte | Observação |
|---|---|---|
| `email` | Input local (state React) | Normalizado (`trim().toLowerCase()`) antes de enviar ao Cognito |
| `password` | Input local (state React) | Nunca persistido em nenhuma store local além do state do componente; passado via navigation params (mobile) para `/confirm` |
| `confirmPassword` | Input local (state React) | Usado só para comparação local, não enviado ao backend |
| `passwordRequirements` (5 regras) | Derivado localmente de `password` via `getPasswordRequirements()` (regex) | Ver `plan.md` para validação de que as 5 regras batem com a política real do Cognito User Pool |
| Conta de usuário (e-mail/senha) | Cognito (`aws-amplify/auth` `signUp`) | Fonte real de verdade — cria o usuário no User Pool (`amplify/auth/resource.ts`); estado `CONFIRM_SIGN_UP` até o código de e-mail ser confirmado em `/confirm` |
| Sessão pós-Google | Cognito (Google IdP) via `signInWithGoogle()` + `initializeUserSession()` | Sem passo de confirmação por e-mail — sessão já vem autenticada |
| Rota pós-autenticação | `hasCompletedProfileSetup()` (`src/services/auth/profileSetupStatus.ts`) | Decide `/dashboard` vs `/profile-setup`, não é dado exibido nesta tela mas determina o próximo destino |

## 6. Requisitos não-funcionais específicos
- **Fidelidade das regras de senha ao backend real (regra 5 da constituição)**: as 5 regras exibidas no checklist não podem ser cosméticas — precisam corresponder exatamente à `PasswordPolicy` real configurada no Cognito User Pool (`amplify/auth/resource.ts`, sintetizado em CloudFormation). Ver `plan.md` para a verificação feita.
- **Feedback ao vivo sem debounce perceptível**: cada tecla digitada no campo de senha deve atualizar o checklist na mesma renderização (sem delay artificial) — é o detalhe interativo central desta tela segundo o Canvas.
- **Nunca cor sozinha**: cada item do checklist e o erro de confirmação de senha devem combinar ícone + texto + cor (nunca cor isolada), conforme regra explícita de acessibilidade documentada em `DESIGN_TOKENS.md`.
- **Botão desabilitado sempre com motivo**: o botão "Criar conta" nunca fica cinza sem explicação — o texto de apoio "Complete os itens acima para continuar." é obrigatório enquanto `notAllOk`.
- **Erros de Cognito nunca expostos crus**: toda exceção do `signUp` deve ser mapeada para uma mensagem em português amigável antes de chegar ao usuário (já implementado; preservar no `plan.md`).
- **Sem dado mockado (regra 2 da constituição)**: e-mail/senha e o resultado do cadastro devem sempre vir de uma chamada real ao Cognito — não há placeholder aceitável aqui, pois não há pendência técnica documentada em `GAP_ANALYSIS.md` para esta tela.
- **Acessibilidade de toque**: campos e botão mantêm o piso de 48-56dp de altura tocável definido em `DESIGN_TOKENS.md` §3.
- **Segurança do dado sensível em navegação (mobile)**: passar `password` como parâmetro de navegação para `/confirm` é aceitável apenas em app mobile nativo (não exposto publicamente como seria em URL web) — já documentado como `DECISION` no código; manter essa decisão explícita se a rota for tocada neste EPIC.

## 7. Critérios de aceite
- [ ] O checklist de 5 regras é exibido em painel próprio (bg `#F7F8F7`/`#222B29` no escuro) assim que o campo "Senha" recebe foco ou tem conteúdo, e ocultado antes disso — igual ao comportamento atual de `isPasswordRequirementsVisible`.
- [ ] Cada uma das 5 regras atualiza ícone (check verde vs. círculo vazio neutro) e cor de texto (riscado/verde vs. neutro) a cada mudança de `password`, sem necessidade de blur ou submit.
- [ ] As 5 regras exibidas são exatamente: mínimo 8 caracteres, ao menos 1 número, ao menos 1 caractere especial, ao menos 1 letra maiúscula, ao menos 1 letra minúscula — confirmadas como equivalentes à `PasswordPolicy` real do Cognito User Pool sintetizado (`MinimumLength: 8`, `RequireLowercase/Uppercase/Numbers/Symbols: true`).
- [ ] Mensagem "As senhas não são iguais." aparece (ícone "!" vermelho + texto vermelho) quando `confirmPassword` diverge de `password` e ambos têm conteúdo; some quando voltam a coincidir.
- [ ] Botão "Criar conta" fica no estado visual desabilitado (bg `#DFE3E1`, texto `#7A8480`) e mostra o texto de apoio "Complete os itens acima para continuar." enquanto qualquer uma das 5 regras não é atendida; fica no estado ativo (verde/branco) quando todas são atendidas.
- [ ] Submeter com e-mail/senha válidos chama `signUp` do Cognito com `autoSignIn: true` e, em caso de `CONFIRM_SIGN_UP`, navega para `/confirm` levando e-mail e senha.
- [ ] Erros conhecidos do Cognito (`UsernameExistsException`, `InvalidPasswordException`, `InvalidParameterException`) exibem mensagem específica em português; qualquer outro erro exibe mensagem genérica — nunca a mensagem crua da AWS.
- [ ] Botão "Continuar com Google" dispara `signInWithGoogle()`, inicializa a sessão e navega para a rota pós-autenticação correta (`/dashboard` ou `/profile-setup`) sem passar pelo checklist de senha.
- [ ] Link "Já tem conta? Entrar" navega de volta para `/` (Login).
- [ ] Tela funciona em light e dark mode com os pares de cor definidos em `DESIGN_TOKENS.md` (checklist, bordas de erro, botão desabilitado incluídos).

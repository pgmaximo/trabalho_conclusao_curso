# TASKS: Login (Bloco 1)

## Componentes (Fundação, reaproveitáveis por outras telas do Bloco 1)

- [x] Estender `Button` (`src/components/Button.tsx`) com prop `loading?: boolean` (e `loadingTitle?: string`, default "Entrando..." pode ser passado por chamador) que troca o fundo para o tom "pressed" (`#0C6341` claro / equivalente dark), renderiza spinner branco 2.5px + label, e bloqueia `onPress` — sem quebrar o uso atual (`variant`, `disabled`) em outras telas. `loading`/spinner já existiam da Fundação; adicionada apenas `loadingTitle` (opcional, default `${title}…`).
- [x] Estender `FormField`/`AuthInput` para aceitar um `trailingAction?: ReactNode` (slot à direita do valor, dentro do input) — usado para o link "Mostrar/Ocultar"; manter `icon` (slot à esquerda) como está.
- [x] Criar `AuthAppHeader` (novo componente pequeno em `src/components/`) para o cabeçalho ícone-quadrado(44px)+título "SuaSaúde"+tagline "Sua saúde organizada em um lugar", reaproveitável em Login/Cadastro/Confirmação/Recuperar senha.
- [x] Criar `SuccessSnackbar` (ou reaproveitar um componente de toast existente, se houver) seguindo o padrão "Sucesso" de `DESIGN_TOKENS.md` §4: fundo `#0C6341`/dark equivalente, ✓ em círculo branco, texto branco, ancorado no rodapé. Nenhum componente de toast existente foi encontrado; `#0C6341` é fixo (mesmo hex nos dois temas no Canvas), não vem de `useThemeColors()`.

## `src/screens/LoginScreen.tsx`

- [x] Substituir a composição `AuthIllustrationCard` (imagem ilustrativa sobreposta) pela estrutura do design: `AuthAppHeader` fora do card + card simples (bg `app-surface`/dark, borda, radius 20, padding 20) contendo o formulário.
- [x] Manter título "Entre na sua conta" dentro do card, no topo.
- [x] Adicionar toggle "Mostrar/Ocultar" no campo de senha via `trailingAction` do `FormField`, alternando `secureTextEntry`; texto e cor conforme token (`#1B63C4` light / `#8FB8F7` dark) — usa `text-app-secondary`/`text-app-dark-secondary`.
- [x] Trocar o botão "Entrar" para usar a nova prop `loading` do `Button` em vez de substituir a região por `ActivityIndicator` solto.
- [x] Remover os `Alert.alert` usados para validação de campos vazios e para erros de rede/config; substituir por mensagem inline (reaproveitando o padrão de texto de erro já usado para credenciais inválidas). Decisão adicional (regra 8): o caso "conta não confirmada" (`CONFIRM_SIGN_UP`), que também usava `Alert.alert`, foi convertido ao mesmo canal inline para não deixar nenhum `Alert.alert` na tela (exigido pela checklist de validação final abaixo).
- [x] Manter mapeamento de erros do Cognito (`UserNotFoundException`, `NotAuthorizedException`, `UserNotConfirmedException`, `InvalidParameterException`) para mensagens em PT-BR — não alterar a lógica, só o canal de exibição (inline em vez de `Alert`).
- [x] Adicionar nota LGPD fixa abaixo do link "Criar conta": "Ao entrar você aceita os Termos de Uso e a Política de Privacidade (LGPD)."
- [x] Adicionar `SuccessSnackbar` disparado em caso de sucesso (login por senha e por Google), copy "Bem-vindo(a) de volta!", antes/durante a chamada de `onLogin()`/`onGoogleAuthSuccess()`. Navegação adiada ~900ms após exibir o snackbar para o usuário conseguir vê-lo antes do redirect.
- [x] Conferir/ajustar cores usadas (`colors.primary`, `colors.danger`, etc.) contra os tokens de `DESIGN_TOKENS.md` para light e dark, incluindo o caso do botão Apple continuar ausente por padrão (`showApple = false`, sem ação necessária aqui). Corrigido também: os links "Esqueceu a senha?" e "Criar conta" usavam `primary` (verde) e passaram a usar `secondary` (`#1B63C4`/`#8FB8F7`), conforme o markup do Canvas (1b/1c).
- [x] Verificar que o botão "Continuar com Google" também fica desabilitado durante qualquer estado de loading (login por senha em andamento não deve permitir iniciar login Google simultâneo, e vice-versa). `SocialButton` agora recebe `disabled={isLoading}`.

## Tema / dark mode

- [x] Confirmar (ou registrar como pendência da Fundação) que `DARK_THEME` em `src/constants/theme.ts` usa os hex exatos de `DESIGN_TOKENS.md` para o tema escuro: bg `#0E1413`, card `#18201E`, input bg `#222B29`, borda `#33403C`, texto primário `#EDF2F0`, texto secundário `#AEBBB6`, primária de ação `#4FC58C` (texto `#0E1413` sobre ela), foco `#8FB8F7`. Confirmado em `src/constants/themeTokens.json` — todos os hex batem exatamente; a Fundação já corrigiu isso globalmente.
- [x] Se a Fundação ainda não tiver corrigido isso globalmente, aplicar fallback local — não necessário, Fundação já entregou os tokens corretos.

## Validação final

- [ ] Comparar visualmente a tela renderizada (light e dark) contra 1b/1c do Canvas. Não executado — requer rodar o app num device/simulador (fora do escopo desta sessão de implementação).
- [ ] Rodar o app (Expo) e testar os 8 cenários do `spec.md`: loading, sucesso, erro de credenciais, erro de rede, validação de campos vazios, mostrar/ocultar senha, login Google, conta não confirmada. Não executado — teste manual em device/simulador, fora do escopo desta sessão.
- [x] Confirmar que nenhuma chamada a `Alert.alert` nativo permanece em `LoginScreen.tsx`. Confirmado via grep — nenhuma ocorrência.
- [x] Confirmar que `authFlow.ts`, `google-auth.ts`, `userSessionService.ts` e `src/app/index.tsx` não foram alterados. Confirmado — nenhum desses arquivos aparece no diff do commit.

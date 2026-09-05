# TASKS: Confirmação de conta (código + cooldown)

## UI — cabeçalho e estrutura geral
- [x] Adicionar cabeçalho ao topo de `ConfirmScreen.tsx`: botão circular "‹" (48×48, borda `#DFE3E1`) + título "Confirmar conta" (600 20px), reaproveitando padrão de header já usado em outras telas internas (ex.: `AddExamScreen.tsx`/`AddAppointmentScreen.tsx`), com dark mode via `useThemeColors()`. Implementado via novo componente compartilhado `src/components/BackHeader.tsx` (extraído do padrão inline de `RegisterScreen.tsx`), com prop `bordered` para o círculo com borda exigido pelo Canvas 1e.
- [x] Remover `AuthIllustrationCard`/imagem ilustrativa (`confirm_image.png`) desta tela — substituir pelo banner informativo azul + card branco do Canvas 1e.
- [x] Criar banner informativo (`#E9F1FD`/`#CBDFFA` claro, tokens dark equivalentes): ícone de envelope em tile azul 28×28 + texto "**Verifique seu e-mail.** Enviamos um código de 6 dígitos para {email}."

## UI — caixas de OTP e auto-advance
- [x] Substituir o `AuthInput` único (`code`) por 6 `TextInput`s individuais (`maxLength={1}`, `keyboardType="number-pad"`, `textAlign="center"`, fonte 600 24px, radius 12px, altura de referência 52-60px), lado a lado com `gap` de 6px.
- [x] Implementar `useRef` para as 6 caixas e lógica de auto-advance: ao digitar um dígito válido, focar automaticamente a próxima caixa (exceto na 6ª).
- [x] Implementar retrocesso de foco: `onKeyPress` detectando Backspace em caixa vazia → foca e limpa a caixa anterior.
- [x] Adicionar `autoFocus` na primeira caixa ao montar a tela.
- [x] Adicionar `accessibilityLabel` por caixa (ex. "Dígito 1 de 6") para leitores de tela.
- [ ] Testar o fluxo de digitação/backspace nas 3 plataformas do projeto (iOS, Android, Web via Expo Router) — comportamento de `onKeyPress` pode divergir entre elas. **Não executado nesta sessão**: sem acesso a simuladores/dispositivos/browser neste ambiente de implementação; requer verificação manual do time antes do merge (risco já documentado em `plan.md` §5).

## UI — estado "Tudo pronto" e botão Confirmar
- [x] Derivar `codeFull` (todas as 6 caixas preenchidas) a partir do estado dos 6 dígitos.
- [x] Condicionar o estado visual/`disabled` do botão "Confirmar" a `codeFull` (cinza/desabilitado até completo, verde/habilitado quando completo) — `Button.tsx` já suportava `disabled`/`loading`/`loadingTitle`, reaproveitado sem alterações.
- [x] Exibir o texto condicional "Tudo pronto — toque em Confirmar." abaixo do botão quando `codeFull === true`, escondê-lo caso qualquer caixa seja apagada.
- [x] Ao chamar `confirmSignUp`, montar `confirmationCode` a partir de `digits.join('')` (substituindo a antiga string única `code`).

## UI — reenvio e cooldown
- [x] Substituir o `Pressable` de texto atual do "Reenviar" por um botão outline (56px, radius 14px, borda `#DFE3E1`) com rótulo dinâmico: "Reenviar em {cooldown}s" (cinza, desabilitado) / "Reenviar código" (azul `#1B63C4`, habilitado).
- [x] Manter a lógica existente de `handleResend()` (`resendSignUpCode({ username: email })` + reset de `cooldown`) sem alterações funcionais — só a camada visual do botão muda.
- [x] Manter o `useEffect` de `setInterval`/`clearInterval` do cooldown como está hoje (já implementado corretamente, com cleanup no unmount).
- [x] Adicionar divisor (1px `#EFF1F0`) e texto de apoio "Não recebeu? Confira a caixa de spam." acima do botão de reenvio, conforme Canvas.

## UI — navegação de saída
- [x] Mover/replicar o link "Voltar para entrar" para fora do card branco, centralizado, mantendo a mesma prop `onBackToLogin` e o mesmo destino (`/`).
- [x] Conectar o botão "‹" do novo cabeçalho à mesma ação de `onBackToLogin` (via `handleBackToLogin`, idêntica ao link inferior).

## Dark mode e acessibilidade
- [x] Aplicar tokens dark (`useThemeColors()`/classes `app-dark-*`) em: banner informativo, caixas de OTP, card branco, botões "Confirmar"/"Reenviar", divisor, textos de apoio.
- [x] Confirmar contraste AA nos textos/botões novos, reaproveitando os pares já validados em `DESIGN_TOKENS.md` §1 (mesmos tokens `info*`/`neutralSoft`/`border`/`secondary` já usados e validados em outras telas do Bloco 1/2).
- [x] Garantir toque mínimo 48dp nas 6 caixas mesmo com layout `flex:1` (altura fixa 60px via `h-[60px]`, acima do mínimo de 48dp).

## Preservação de comportamento (não deve mudar)
- [x] Confirmar que `confirmSignUp`, `resendSignUpCode`, `signIn` (auto-signin condicional a `password`) e `initializeUserSession()` continuam chamados exatamente como hoje, só trocando a origem do valor do código.
- [x] Confirmar que o tratamento de erro (`Alert.alert` para código inválido/expirado e falha de reenvio) continua funcionando após a refatoração de UI.
- [x] Confirmar que a navegação para `/profile-setup` em caso de sucesso não muda.

## Verificação final
- [ ] Comparar visualmente a tela renderizada com o Canvas 1e (`specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html`, linhas 1211-1238) — banner, card, 6 caixas, botão Confirmar (2 estados), mensagem "Tudo pronto", botão Reenviar (2 estados), link "Voltar para entrar". **Não executado nesta sessão**: implementação seguiu a estrutura/tokens do Canvas por leitura de código (spec.md/plan.md), mas não houve renderização visual comparada lado a lado neste ambiente — recomendado antes do merge.
- [ ] Rodar o fluxo real ponta a ponta em ambiente de desenvolvimento (cadastro → recebimento de código real via Cognito → confirmação → auto-signin → `/profile-setup`), validando a regra 5 da constituição ("nada quebra o que já funciona"). **Não executado nesta sessão**: sem ambiente de dev/Cognito disponível neste agente; lógica de negócio (`confirmSignUp`/`signIn`/`initializeUserSession`) foi preservada byte-a-byte, só a origem do código mudou de `code` para `digits.join('')` — recomendado validar manualmente antes do merge.
- [ ] Atualizar `CODE_INVENTORY.md`/`GAP_ANALYSIS.md` (linha "1e Confirmação de conta") de `ATUALIZAR` para `MANTER` após a implementação ser validada como fiel ao Canvas. **Não executado nesta sessão**: depende da validação visual/E2E acima ser concluída primeiro.

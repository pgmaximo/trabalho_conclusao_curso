# TASKS: Autenticação — Cadastro (checklist de senha ao vivo)

## Preparação
- [x] Decisão sobre o header: alinhado ao Canvas (regra 1 da constituição — fidelidade ao design é lei). `AuthIllustrationCard` removido de `RegisterScreen.tsx`; substituído pelo header seta `‹` + "Criar conta".
- [x] Inspecionar `src/components/Button.tsx` e `src/components/AuthInput.tsx` — ambos já suportavam o necessário (`Button.disabled`/`disabledReason`/`loading`; `AuthInput.hasError`/`errorMessage` repassados a `FormField`, que já renderiza borda vermelha + linha "!" + texto). Nenhuma prop nova criada.

## Erro inline de confirmação de senha (`mismatch`)
- [x] Adicionado estado derivado `mismatch` em `RegisterScreen.tsx`: `confirmPassword.length > 0 && password !== confirmPassword`.
- [x] `mismatch` passado ao campo "Confirmar senha" via `AuthInput hasError`/`errorMessage` — `FormField` já aplica borda vermelha (`border-app-danger`/`bg-app-dangerSoft`) quando `hasError`/`errorMessage` está presente.
- [x] Linha de erro inline (círculo "!" + texto "As senhas não são iguais.") já é renderizada pelo próprio `FormField` quando `errorMessage` é passado — reaproveitado, não duplicado.
- [x] Mensagem desaparece automaticamente quando os campos voltam a coincidir (`mismatch` é derivado a cada render, sem debounce).

## Botão "Criar conta" desabilitado + texto de apoio (`notAllOk`)
- [x] `notAllOk` derivado de `!isPasswordValid`.
- [x] `Button` "Criar conta" recebe `disabled={notAllOk}` — já usa o estilo disabled (bg `#DFE3E1`/`border-app-border`, texto `#7A8480`/`text-app-textMuted`) nativo do componente compartilhado.
- [x] `disabledReason="Complete os itens acima para continuar."` passado ao `Button`, que já renderiza o texto de apoio condicionalmente (nenhum componente novo criado).
- [x] Validação de `isPasswordValid` mantida dentro de `handleRegister()` como segunda camada de defesa (Alert.alert reativo preservado, inalterado).

## Checklist de senha (já implementado — só confirmar/testar)
- [x] Lógica de `getPasswordRequirements` inalterada — recalculada a cada render, continua "ao vivo" por natureza do state React.
- [x] Painel do checklist continua condicionado a `isPasswordFocused || password.length > 0` (comportamento preservado).
- [x] As 5 regras não foram alteradas; `amplify/auth/resource.ts` não foi tocado — seguem batendo com a `PasswordPolicy` validada no `plan.md`.

## Header (dependente da decisão de Preparação)
- [x] Alinhado ao Canvas: `AuthIllustrationCard` substituído por header (seta de voltar 48×48 via `MaterialIcons chevron-left` + título "Criar conta" 600/20px), navegação de volta preservada via `onNavigateToLogin` (também usada como back-arrow, já que é o único destino de "voltar" desta tela no mapa de navegação do spec).

## Testes / verificação manual
- [ ] Testar em light e dark mode: cores do checklist, borda de erro do campo de confirmação, estado desabilitado do botão. (Não executado neste EPIC — apenas `npm run typecheck`/`npm run lint`; verificação visual manual em simulador/dispositivo fica para QA humano.)
- [ ] Testar fluxo feliz completo: e-mail válido + senha atendendo às 5 regras + confirmação idêntica → `signUp` → navegação para `/confirm` com email/password. (Lógica de `signUp`/navegação não foi alterada; não re-testada em runtime neste EPIC.)
- [ ] Testar os 3 erros mapeados do Cognito (`UsernameExistsException`, `InvalidPasswordException`, `InvalidParameterException`) e o fallback genérico. (Mapeamento de erros inalterado; não re-testado em runtime neste EPIC.)
- [ ] Testar fluxo Google: `signInWithGoogle()` → `initializeUserSession()` → navegação correta (`/dashboard` ou `/profile-setup`), sem passar pelo checklist. (Lógica inalterada; não re-testada em runtime neste EPIC.)
- [ ] Testar link "Já tem conta? Entrar" → volta para `/`. (Handler inalterado; não re-testado em runtime neste EPIC.)
- [x] Confirmado que nenhuma tela fora de `RegisterScreen.tsx` foi alterada neste EPIC (`git diff --stat` mostra apenas esse arquivo).

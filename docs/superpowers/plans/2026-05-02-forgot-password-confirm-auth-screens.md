# Forgot Password And Confirm Auth Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar as telas de recuperacao de senha e confirmacao de cadastro com o mesmo layout das telas de login e registro.

**Architecture:** A mudanca fica concentrada nas telas `ForgotPasswordScreen` e `ConfirmScreen`, preservando as rotas Expo Router atuais. As telas continuam responsaveis por validacoes locais e chamadas AWS Amplify, enquanto as rotas continuam responsaveis pela navegacao.

**Tech Stack:** Expo Router, React Native, TypeScript, AWS Amplify Auth, componentes locais `AuthInput` e `Button`, `MaterialIcons`, tema local `COLORS`, `FONTS` e `SIZES`.

---

## Summary

Padronizar `ForgotPasswordScreen` e `ConfirmScreen` com a composicao visual ja aplicada em `HomeScreen` e `RegisterScreen`: `SafeAreaView`, `StatusBar`, `KeyboardAvoidingView`, `ScrollView`, imagem superior conectada ao card, `boxShadow`, icones `MaterialIcons`, primeiro campo sem margem extra e navegacao com `blurActiveWebElement()`. As regras AWS existentes serao preservadas.

## Key Changes

- Atualizar `src/screens/ForgotPasswordScreen.tsx` para usar `forgot_password_image.png`, remover hero/badge antigo, trocar icones de texto por `MaterialIcons`, manter `resetPassword` e `confirmResetPassword`, e preservar os estados `codeSent`, `isLoading`, reenviar codigo e voltar para login.
- Atualizar `src/screens/ConfirmScreen.tsx` para usar `confirm_image.png`, adicionar `StatusBar` e `ScrollView`, trocar emoji por `MaterialIcons`, manter `confirmSignUp`, `email`, `onConfirmSuccess()` e o destino atual `/profile-setup`.
- Ajustar navegacao em `src/app/index.tsx`, `src/app/forgot-password.tsx` e, se necessario, `src/app/confirm.tsx` para chamar `blurActiveWebElement()` antes de trocar de rota.
- Se a confirmacao ganhar acao secundaria, adicionar prop opcional `onBackToLogin?: () => void` em `ConfirmScreen` e passar `router.replace('/')` pela rota, sem alterar o fluxo principal de sucesso.

## Implementation Tasks

- [ ] Revisar o padrao atual em `HomeScreen.tsx` e `RegisterScreen.tsx`, copiando apenas a estrutura necessaria: composicao com imagem, `card`, `firstField`, `primaryAction`, `loadingIndicator`, `loginLink`, `boxShadow` e `elevation`.
- [ ] Refatorar `ForgotPasswordScreen.tsx` visualmente, mantendo validacoes atuais: e-mail obrigatorio antes de enviar codigo, todos os campos obrigatorios na confirmacao, senhas iguais, mensagens especificas de erro AWS e botao "Reenviar codigo".
- [ ] Refatorar `ConfirmScreen.tsx` visualmente, mantendo validacao de codigo obrigatorio, chamada `confirmSignUp({ username: email, confirmationCode: code })`, alerta de sucesso e `onConfirmSuccess()`.
- [ ] Criar ou ampliar testes em `__tests__` para cobrir renderizacao das telas, validacoes locais, fluxo de envio/reset de senha, confirmacao de cadastro e callbacks de navegacao.
- [ ] Rodar `npm run typecheck`, `npm run lint` e `npm run test:ci`.

## Public Interfaces

- `ForgotPasswordScreenProps` permanece com `onBackToLogin: () => void`.
- `ConfirmScreenProps` mantem `email: string` e `onConfirmSuccess: () => void`.
- Mudanca opcional e compativel: `ConfirmScreenProps` pode receber `onBackToLogin?: () => void` para acao secundaria.

## Test Plan

- Rodar `npm run typecheck`.
- Rodar `npm run lint`.
- Rodar `npm run test:ci`.
- Validacao visual manual em `http://localhost:8081`: login -> esqueceu senha -> enviar codigo -> etapa de nova senha; registro -> confirmacao -> profile setup.
- Conferir no web que nao aparece o aviso de foco `Blocked aria-hidden...` ao navegar por links/botoes.

## Assumptions

- Nao adicionar dependencias novas.
- Usar `npm`, porque existe `package-lock.json`.
- Preservar Expo Router como entrada real do app.
- As imagens `assets/images/forgot_password_image.png` e `assets/images/confirm_image.png` ja existem e serao usadas via `require`.

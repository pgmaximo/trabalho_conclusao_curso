# Register Screen Login Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar a tela de cadastro para seguir o mesmo estilo visual da tela de login sem alterar o fluxo Registro > Confirmacao > Onboarding.

**Architecture:** A mudanca fica concentrada em `src/screens/RegisterScreen.tsx`. A rota `src/app/register.tsx` continua responsavel por navegar para `/confirm` com o e-mail e por resolver o destino apos autenticacao Google.

**Tech Stack:** Expo Router, React Native, TypeScript, AWS Amplify Auth, componentes locais `AuthInput`, `Button`, `SocialButton` e `SectionDivider`.

---

### Task 1: Match Register UI To Login Composition

**Files:**
- Modify: `src/screens/RegisterScreen.tsx`
- Reference: `src/screens/HomeScreen.tsx`
- Reference: `assets/images/register_image.png`
- Reference: `assets/images/google_Glogo.png`

- [ ] **Step 1: Import matching visual dependencies**

Add `Image` from `react-native`, `MaterialIcons` from `@expo/vector-icons/MaterialIcons`, and local image constants:

```tsx
const registerImage = require('../../assets/images/register_image.png');
const googleLogo = require('../../assets/images/google_Glogo.png');
```

- [ ] **Step 2: Preserve existing register behavior**

Keep `handleRegister`, `handleGoogleRegister`, `signUp`, `onRegisterSuccess(normalizedEmail)`, and `onGoogleAuthSuccess()` with the same behavior. Do not change `src/app/register.tsx`, `src/app/confirm.tsx`, or `src/app/profile-setup.tsx`.

- [ ] **Step 3: Replace hero badge with image/card composition**

Use the same structure as `HomeScreen.tsx`: outer composition view, image wrapper with negative bottom margin, then card. The register image must visually overlap the top of the form card so it appears to come out of the registration box.

- [ ] **Step 4: Align inputs and actions**

Use `MaterialIcons` for e-mail and password icons, wrap the primary button in `styles.primaryAction`, use `styles.loadingIndicator`, and pass `iconSource={googleLogo}` to the Google social button.

- [ ] **Step 5: Run validation**

Run:

```powershell
npm run typecheck
npm run test:ci
```

Expected: both commands pass, or any unrelated existing failure is documented with exact error context.


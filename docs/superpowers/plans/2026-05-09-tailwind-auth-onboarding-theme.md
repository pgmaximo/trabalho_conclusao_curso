# Tailwind Auth Onboarding Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar as telas de autenticação e onboarding com NativeWind/Tailwind estável no Expo 54, com tokens centralizados e base para light/dark mode automático.

**Architecture:** Manter NativeWind v4/Tailwind v3 já instalado e usar um arquivo central de tokens consumido por `theme.ts` e `tailwind.config.js`. Converter as telas e componentes diretos do fluxo auth/onboarding para classes semânticas, preservando comportamento, validação e navegação.

**Tech Stack:** Expo 54, React Native 0.81, NativeWind 4, Tailwind CSS 3, Jest, Testing Library React Native.

---

### Task 1: Theme Tokens and Tailwind Contract

**Files:**
- Create: `src/constants/themeTokens.json`
- Modify: `src/constants/theme.ts`
- Modify: `tailwind.config.js`
- Modify: `app.json`
- Modify: `tsconfig.json`
- Test: `__tests__/theme-tokens.test.ts`

- [ ] Write a failing test proving light/dark tokens exist, `theme.ts` consumes them, and Tailwind exposes semantic classes.
- [ ] Run the focused test and verify it fails because `themeTokens.json` is missing.
- [ ] Create `themeTokens.json` with `light` and `dark` color palettes.
- [ ] Refactor `theme.ts` to build `LIGHT_THEME`, `DARK_THEME`, `COLORS`, and `getTheme()` from the JSON tokens.
- [ ] Refactor `tailwind.config.js` to read the same JSON and expose `app.*` and `app-dark.*` semantic colors.
- [ ] Set `app.json` `userInterfaceStyle` to `automatic`.
- [ ] Enable JSON imports in TypeScript with `resolveJsonModule`.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Shared Auth Components

**Files:**
- Modify: `src/components/Button.tsx`
- Modify: `src/components/FormField.tsx`
- Modify: `src/components/AuthInput.tsx`
- Modify: `src/components/SocialButton.tsx`
- Modify: `src/components/SectionDivider.tsx`

- [ ] Convert these direct auth components from `StyleSheet` color usage to NativeWind semantic classes.
- [ ] Keep existing props and behavior stable, including `style`, `containerStyle`, disabled state, error state, Android ripple, labels, helpers, and accessibility labels.
- [ ] Use `useThemeColors()` only where runtime color values are required by native props such as ripple and placeholder colors.
- [ ] Avoid introducing new dependencies.

### Task 3: Auth Screens

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/RegisterScreen.tsx`
- Modify: `src/screens/ForgotPasswordScreen.tsx`
- Modify: `src/screens/ConfirmScreen.tsx`

- [ ] Replace static `StyleSheet` layout/color blocks with `className` using semantic Tailwind colors.
- [ ] Preserve the existing image/card composition, login/register/forgot/confirm flow, error alerts, Google auth, invalid-login shake, and loading states.
- [ ] Use `useThemeColors()` for `MaterialIcons`, `ActivityIndicator`, and dynamic error button styles.
- [ ] Keep any unavoidable animation/dynamic style as inline React Native style.

### Task 4: Profile Setup Screen and Direct Onboarding Components

**Files:**
- Modify: `src/screens/ProfileSetupScreen.tsx`
- Modify direct files under `src/components/profileSetup/` only if needed by the screen.

- [ ] Remove the local `PALETTE` object from `ProfileSetupScreen`.
- [ ] Replace hardcoded colors and fixed gradients with semantic theme colors or theme-derived arrays.
- [ ] Convert layout/color styles to NativeWind classes where practical.
- [ ] Preserve wizard steps, optional answers, pregnancy conditional field, validation, footer actions, and no-local-persistence behavior.

### Task 5: Verification

**Files:**
- Existing test files only, unless a test needs a narrow update for stable queries.

- [ ] Run `npm run test:ci -- __tests__/theme-tokens.test.ts`.
- [ ] Run `npm run test:ci -- __tests__/auth-screens.test.tsx`.
- [ ] Run `npm run test:ci -- __tests__/profile-setup-screen.test.tsx`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:ci`.
- [ ] Run `npx expo install --check`.

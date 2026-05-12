# Auth Illustrations Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the auth screens so the top illustrations keep visible skin fills, visually connect to the form card, keep the form centered, and render the Google logo at a controlled size.

**Architecture:** Preserve the current AWS auth behavior and NativeWind theme setup. Repair existing raster assets deterministically, then centralize the repeated illustration/card composition in one component so login, register, forgot password, and confirm use the same overlap and centering rules.

**Tech Stack:** Expo 54, React Native, Expo Router, NativeWind v4, Jest, @testing-library/react-native, Pillow from the bundled Codex Python runtime for PNG validation/repair.

---

## File Structure

- Create: `src/components/AuthIllustrationCard.tsx`
  - Owns the repeated auth screen composition: centered viewport, overlapping illustration, card padding, shared shadow, and test IDs.
- Create: `__tests__/auth-visual-layout.test.tsx`
  - Verifies auth screens render their illustrations through the shared connected layout and that the Google icon is constrained.
- Modify: `src/screens/HomeScreen.tsx`
  - Replace duplicated image/card wrapper with `AuthIllustrationCard`.
- Modify: `src/screens/RegisterScreen.tsx`
  - Replace duplicated image/card wrapper with `AuthIllustrationCard`.
- Modify: `src/screens/ForgotPasswordScreen.tsx`
  - Replace duplicated image/card wrapper with `AuthIllustrationCard`.
- Modify: `src/screens/ConfirmScreen.tsx`
  - Replace duplicated image/card wrapper with `AuthIllustrationCard`.
- Modify: `src/components/SocialButton.tsx`
  - Add explicit sizing constants/test ID for the icon and reduce the visible Google logo size.
- Modify assets:
  - `assets/images/register_image.png`
  - `assets/images/confirm_image.png`
  - Only transparent enclosed interior holes are filled; external transparent background remains transparent.

## Task 1: Add Visual Regression Tests

**Files:**
- Create: `__tests__/auth-visual-layout.test.tsx`
- Modify: `src/components/SocialButton.tsx`

- [x] **Step 1: Write failing tests**

Create `__tests__/auth-visual-layout.test.tsx` with checks for:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { SocialButton } from '@/components/SocialButton';
import { ConfirmScreen } from '@/screens/ConfirmScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';

const googleLogo = require('../assets/images/google_Glogo.png');

describe('auth visual layout', () => {
  it.each([
    ['login', <HomeScreen onGoogleAuthSuccess={jest.fn()} onLogin={jest.fn()} onNavigateToForgotPassword={jest.fn()} onNavigateToRegister={jest.fn()} />],
    ['register', <RegisterScreen onGoogleAuthSuccess={jest.fn()} onNavigateToLogin={jest.fn()} onRegisterSuccess={jest.fn()} />],
    ['forgot-password', <ForgotPasswordScreen onBackToLogin={jest.fn()} />],
    ['confirm', <ConfirmScreen email="pessoa@email.com" onConfirmSuccess={jest.fn()} onBackToLogin={jest.fn()} />],
  ])('uses the connected centered illustration card on %s', (_name, element) => {
    render(element);

    expect(screen.getByTestId('auth-illustration-card-root')).toBeTruthy();
    expect(screen.getByTestId('auth-illustration-card-image')).toBeTruthy();
    expect(screen.getByTestId('auth-illustration-card-content')).toBeTruthy();
  });

  it('keeps the Google logo compact inside the social button', () => {
    render(<SocialButton iconSource={googleLogo} onPress={jest.fn()} title="Google" />);

    expect(screen.getByTestId('social-button-icon').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 18, width: 18 })]),
    );
  });
});
```

- [x] **Step 2: Run the test to verify RED**

Run:

```bash
npm run test:ci -- __tests__/auth-visual-layout.test.tsx
```

Expected: FAIL because `AuthIllustrationCard` test IDs and `social-button-icon` do not exist yet.

## Task 2: Repair Existing PNG Skin Holes

**Files:**
- Modify: `assets/images/register_image.png`
- Modify: `assets/images/confirm_image.png`

- [x] **Step 1: Detect enclosed transparent holes**

Run a Python/Pillow check from the bundled runtime. Expected current result:

```text
register_image.png has enclosed transparent pixels
confirm_image.png has enclosed transparent pixels
```

- [x] **Step 2: Fill only enclosed transparent interiors**

Use a flood-fill from each image border to mark the real transparent background. Any remaining fully transparent pixel is an internal hole and should receive skin color `#F6C7A8` with full alpha. Do not fill border-connected transparency, so the image background stays transparent.

- [x] **Step 3: Validate alpha after repair**

Run the same enclosed-hole check. Expected:

```text
register_image.png enclosed transparent=0
confirm_image.png enclosed transparent=0
```

## Task 3: Centralize Connected Illustration/Card Layout

**Files:**
- Create: `src/components/AuthIllustrationCard.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/RegisterScreen.tsx`
- Modify: `src/screens/ForgotPasswordScreen.tsx`
- Modify: `src/screens/ConfirmScreen.tsx`

- [x] **Step 1: Implement shared component**

Create `AuthIllustrationCard` with:

```tsx
import React, { ReactNode } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type AuthIllustrationCardProps = {
  children: ReactNode;
  imageSource: ImageSourcePropType;
};

export function AuthIllustrationCard({ children, imageSource }: AuthIllustrationCardProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 justify-center px-6 py-6" testID="auth-illustration-card-root">
      <View className="items-stretch">
        <View className="z-10 -mb-12 items-center">
          <Image
            className="h-[220px] w-full max-w-[304px]"
            resizeMode="contain"
            source={imageSource}
            testID="auth-illustration-card-image"
          />
        </View>

        <View
          className="rounded-card bg-app-surface p-6 pt-14 dark:bg-app-dark-surface"
          style={{ boxShadow: `0px 12px 30px ${colors.shadow}14`, elevation: 5 }}
          testID="auth-illustration-card-content"
        >
          {children}
        </View>
      </View>
    </View>
  );
}
```

- [x] **Step 2: Replace repeated wrappers in each screen**

In each auth screen, replace:

```tsx
<View className="px-6 pb-6 pt-3">
  <View className="items-stretch">
    <View className="z-10 -mb-[18px] items-center">
      <Image ... />
    </View>
    <View className="rounded-card ..." style={{ boxShadow: ..., elevation: 5 }}>
      ...
    </View>
  </View>
</View>
```

with:

```tsx
<AuthIllustrationCard imageSource={screenImage}>
  ...
</AuthIllustrationCard>
```

Also set `contentContainerClassName="flex-grow"` on the `ScrollView` so the shared root can vertically center the card when content is shorter than the screen.

- [x] **Step 3: Remove imports no longer needed**

Remove unused `Image` imports from the four screens. Remove `colors` from screens if it is only used for the old card shadow; keep it where icons/loaders still use `colors`.

## Task 4: Fix Google Logo Size Centrally

**Files:**
- Modify: `src/components/SocialButton.tsx`

- [x] **Step 1: Add explicit compact icon style**

Change the icon render to:

```tsx
const socialIconSize = 18;

<Image
  className="h-[18px] w-[18px]"
  resizeMode="contain"
  source={iconSource}
  style={{ height: socialIconSize, width: socialIconSize }}
  testID="social-button-icon"
/>
```

Expected: all auth pages using `SocialButton` inherit the compact Google logo without per-screen edits.

## Task 5: Verify and Document

**Files:**
- Modify: `docs/superpowers/plans/2026-05-09-auth-illustrations-layout-fix.md`

- [x] **Step 1: Run focused tests**

```bash
npm run test:ci -- __tests__/auth-visual-layout.test.tsx
npm run test:ci -- __tests__/auth-screens.test.tsx
```

Expected: PASS.

- [x] **Step 2: Run final gates**

```bash
npm run typecheck
npm run lint
npm run test:ci
```

Expected: PASS.

- [x] **Step 3: Update this plan checkbox state**

Mark completed implementation steps with `[x]` and add a short execution note with commands and results.

---

## Self-Review

- Spec coverage: covers transparent/missing skin fill, connected illustration/card layout, centered form card, and Google logo size.
- Placeholder scan: no `TBD`, `TODO`, or unspecified "add tests" steps remain.
- Type consistency: `AuthIllustrationCard`, `auth-illustration-card-*` test IDs, and `social-button-icon` are defined before tests expect them.

## Execution Notes

- RED confirmed with `npm run test:ci -- __tests__/auth-visual-layout.test.tsx`: failed first because the shared layout test IDs and compact social icon test ID did not exist.
- Repaired `register_image.png` and `confirm_image.png` by filling only enclosed transparent pixels; final alpha check reports `enclosed transparent=0` for login, register, forgot-password, and confirm illustrations.
- Focused checks passed:
  - `npm run test:ci -- __tests__/auth-visual-layout.test.tsx`
  - `npm run test:ci -- __tests__/auth-screens.test.tsx`
- Final gates passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:ci` (`6` suites, `22` tests)

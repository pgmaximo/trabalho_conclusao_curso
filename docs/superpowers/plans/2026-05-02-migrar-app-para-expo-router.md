# Migrar App para Expo Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar toda a navegacao e regras de fluxo que ainda vivem em `App.tsx` para rotas reais em `src/app`, mantendo Expo Router como entrada principal e deixando `App.tsx` documentado, compilavel e sem logica duplicada.

**Architecture:** O Expo Router continua sendo o entrypoint oficial por `package.json -> "main": "expo-router/entry"`, e `src/app/_layout.tsx` continua sendo o ponto raiz de navegacao. A logica de fluxo que estava no `App.tsx` sai do componente gigante e vira servicos pequenos de autenticacao/perfil, consumidos pelas rotas `index`, `register`, `confirm`, `profile-setup` e `(app)/profile`. A pasta `src/services` passa a conter apenas integracoes reais; carregadores baseados em mock saem para `src/mocks/api`.

**Tech Stack:** Expo SDK 54, Expo Router 6, React 19, React Native 0.81, AWS Amplify Auth/Cognito, AsyncStorage, TypeScript strict, Jest.

---

## Referencias Tecnicas

- Expo Router deve usar `expo-router/entry` como `main`, e o primeiro arquivo de navegacao e `src/app/_layout.tsx`.
- Expo Router permite inicializar side effects antes da navegacao via arquivo de entrada customizado, mas este plano evita trocar o entrypoint porque o projeto ja carrega `src/services/amplify.ts` no layout raiz.
- Expo Router recomenda layouts e rotas declarativas, com redirects/callbacks de navegacao usando `router.replace` ou `router.push`.

## Estado Atual Verificado

- `App.tsx` ainda contem navegacao manual via `currentScreen`.
- `src/app` ja existe e esta parcialmente migrado.
- `src/app/index.tsx` esta quebrado no estado atual: ha callbacks duplicados, `throw new Error('Function not implemented.')` e import de `Redirect` nao usado.
- `src/services/amplify.ts` ja configura Amplify no caminho do Expo Router.
- `src/services` mistura integracoes reais (`amplify`, `aws-auth-config`, `google-auth`) com servicos mockados usados pelos hooks de tela.

## Estrutura de Arquivos Planejada

### Arquivos a modificar

- `App.tsx`: remover navegacao manual; manter como arquivo documentado de compatibilidade/legado, sem configurar Amplify de novo.
- `src/app/_layout.tsx`: manter import global de `@/services/auth/amplify` e documentar que ele inicializa auth antes das rotas.
- `src/app/index.tsx`: renderizar `HomeScreen` corretamente e substituir `currentScreen='home'`.
- `src/app/register.tsx`: receber sucesso de cadastro e Google usando rotas.
- `src/app/confirm.tsx`: manter email via params e avancar para setup de perfil.
- `src/app/profile-setup.tsx`: marcar setup como concluido antes de ir ao dashboard.
- `src/app/(app)/profile.tsx`: executar logout real antes de voltar para login.
- `src/hooks/useAIAnalysisData.ts`
- `src/hooks/useAppointmentsData.ts`
- `src/hooks/useDashboardData.ts`
- `src/hooks/useExamsData.ts`
- `src/hooks/useMedicinesData.ts`
- `src/hooks/usePreventionData.ts`
- `src/hooks/useProfileData.ts`

### Arquivos a criar

- `src/services/auth/amplify.ts`: mover o conteudo atual de `src/services/amplify.ts`.
- `src/services/auth/aws-auth-config.ts`: mover `src/services/aws-auth-config.ts`.
- `src/services/auth/google-auth.ts`: mover `src/services/google-auth.ts`.
- `src/services/auth/profileSetupStatus.ts`: conter a regra do `PROFILE_SETUP_COMPLETED_KEY_PREFIX`.
- `src/services/auth/authFlow.ts`: decidir rota pos-login: dashboard ou profile setup.
- `src/services/auth/session.ts`: conter logout reutilizavel.
- `src/services/auth/index.ts`: exportar os servicos de auth.
- `src/mocks/api/requestSimulator.ts`
- `src/mocks/api/aiAnalysisApi.ts`
- `src/mocks/api/appointmentsApi.ts`
- `src/mocks/api/dashboardApi.ts`
- `src/mocks/api/examsApi.ts`
- `src/mocks/api/medicinesApi.ts`
- `src/mocks/api/preventionApi.ts`
- `src/mocks/api/profileApi.ts`
- `src/mocks/api/index.ts`

### Arquivos a remover depois da migracao

- `src/services/amplify.ts`
- `src/services/aws-auth-config.ts`
- `src/services/google-auth.ts`
- `src/services/requestSimulator.ts`
- `src/services/aiAnalysisService.ts`
- `src/services/appointmentsService.ts`
- `src/services/dashboardService.ts`
- `src/services/examsService.ts`
- `src/services/medicinesService.ts`
- `src/services/preventionService.ts`
- `src/services/profileService.ts`
- `src/services/.gitkeep`, se a pasta `src/services` continuar contendo arquivos reais.

---

### Task 1: Criar Servicos De Fluxo Auth

**Files:**
- Create: `src/services/auth/profileSetupStatus.ts`
- Create: `src/services/auth/authFlow.ts`
- Create: `src/services/auth/session.ts`
- Create: `src/services/auth/index.ts`
- Move: `src/services/amplify.ts` -> `src/services/auth/amplify.ts`
- Move: `src/services/aws-auth-config.ts` -> `src/services/auth/aws-auth-config.ts`
- Move: `src/services/google-auth.ts` -> `src/services/auth/google-auth.ts`
- Modify: `src/app/_layout.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/RegisterScreen.tsx`

- [ ] **Step 1: Criar `profileSetupStatus.ts`**

```ts
/**
 * Resumo do arquivo:
 * Centraliza a regra que identifica se o usuario autenticado ja concluiu o setup inicial de perfil.
 * Usa AsyncStorage com chave por usuario Cognito para nao misturar perfis entre contas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';

const PROFILE_SETUP_COMPLETED_KEY_PREFIX = '@SuaSaude:profileSetupCompleted:';

async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user.userId;
}

export function getProfileSetupCompletedKey(userId: string) {
  return `${PROFILE_SETUP_COMPLETED_KEY_PREFIX}${userId}`;
}

export async function hasCompletedProfileSetup() {
  try {
    const userId = await getCurrentUserId();
    const key = getProfileSetupCompletedKey(userId);
    return (await AsyncStorage.getItem(key)) === 'true';
  } catch (error) {
    console.log('Erro ao verificar perfil:', error);
    return false;
  }
}

export async function markProfileSetupCompleted() {
  try {
    const userId = await getCurrentUserId();
    const key = getProfileSetupCompletedKey(userId);
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.log('Erro ao salvar perfil:', error);
  }
}
```

- [ ] **Step 2: Criar `authFlow.ts`**

```ts
/**
 * Resumo do arquivo:
 * Decide para qual rota o usuario deve ir apos autenticar.
 * Mantem a regra fora das telas para que login por senha e Google usem o mesmo comportamento.
 */
import { hasCompletedProfileSetup } from './profileSetupStatus';

export type PostAuthRoute = '/dashboard' | '/profile-setup';

export async function resolvePostAuthRoute(): Promise<PostAuthRoute> {
  return (await hasCompletedProfileSetup()) ? '/dashboard' : '/profile-setup';
}
```

- [ ] **Step 3: Criar `session.ts`**

```ts
/**
 * Resumo do arquivo:
 * Centraliza a saida da conta autenticada.
 * A navegacao fica nas rotas; este servico cuida apenas da sessao Cognito.
 */
import { signOut } from 'aws-amplify/auth';

export async function logoutUser() {
  try {
    await signOut();
  } catch (error) {
    console.log('Erro ao sair:', error);
  }
}
```

- [ ] **Step 4: Mover e ajustar imports de auth**

Mover os arquivos:

```text
src/services/amplify.ts -> src/services/auth/amplify.ts
src/services/aws-auth-config.ts -> src/services/auth/aws-auth-config.ts
src/services/google-auth.ts -> src/services/auth/google-auth.ts
```

Ajustar `src/services/auth/amplify.ts` para importar config local:

```ts
import { authConfig } from './aws-auth-config';
```

- [ ] **Step 5: Criar barrel de auth**

```ts
/**
 * Resumo do arquivo:
 * Exporta os servicos reais de autenticacao usados pelas rotas e telas.
 */
export * from './authFlow';
export * from './google-auth';
export * from './profileSetupStatus';
export * from './session';
```

- [ ] **Step 6: Atualizar imports consumidores**

Em `src/app/_layout.tsx`:

```ts
import '@/services/auth/amplify';
```

Em `src/screens/HomeScreen.tsx` e `src/screens/RegisterScreen.tsx`:

```ts
import { serializeAuthError, signInWithGoogle } from '@/services/auth';
```

- [ ] **Step 7: Validar**

Run:

```bash
npm run typecheck
```

Expected: pode falhar apenas por rotas ainda nao migradas nas proximas tasks; nao pode falhar por imports de auth.

---

### Task 2: Migrar Login, Cadastro, Confirmacao e Setup Para Rotas

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `src/app/register.tsx`
- Modify: `src/app/confirm.tsx`
- Modify: `src/app/profile-setup.tsx`

- [ ] **Step 1: Reescrever `src/app/index.tsx`**

Substituir todo o arquivo por:

```tsx
/**
 * Resumo do arquivo:
 * Rota inicial do app no Expo Router.
 * Renderiza a tela de login e decide a rota pos-autenticacao sem depender de App.tsx.
 */
import React from 'react';
import { router } from 'expo-router';

import { HomeScreen } from '@/screens/HomeScreen';
import { resolvePostAuthRoute } from '@/services/auth';

export default function LoginRoute() {
  async function navigateAfterAuth() {
    const nextRoute = await resolvePostAuthRoute();
    router.replace(nextRoute);
  }

  return (
    <HomeScreen
      onNavigateToRegister={() => router.push('/register')}
      onNavigateToForgotPassword={() => router.push('/forgot-password')}
      onLogin={navigateAfterAuth}
      onGoogleAuthSuccess={navigateAfterAuth}
    />
  );
}
```

- [ ] **Step 2: Reescrever `src/app/register.tsx`**

```tsx
/**
 * Resumo do arquivo:
 * Rota de cadastro do Expo Router.
 * Conecta RegisterScreen ao fluxo de confirmacao por e-mail e ao fluxo Google.
 */
import React from 'react';
import { router } from 'expo-router';

import { RegisterScreen } from '@/screens/RegisterScreen';
import { resolvePostAuthRoute } from '@/services/auth';

export default function RegisterRoute() {
  async function navigateAfterGoogleAuth() {
    const nextRoute = await resolvePostAuthRoute();
    router.replace(nextRoute);
  }

  return (
    <RegisterScreen
      onNavigateToLogin={() => router.replace('/')}
      onRegisterSuccess={(email) => {
        router.replace({
          pathname: '/confirm',
          params: { email },
        });
      }}
      onGoogleAuthSuccess={navigateAfterGoogleAuth}
    />
  );
}
```

- [ ] **Step 3: Conferir `src/app/confirm.tsx`**

O arquivo deve ficar assim:

```tsx
/**
 * Resumo do arquivo:
 * Rota de confirmacao de cadastro.
 * Recebe o e-mail pela URL e avanca para o setup inicial apos confirmar a conta.
 */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { ConfirmScreen } from '@/screens/ConfirmScreen';

export default function ConfirmRoute() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  return (
    <ConfirmScreen
      email={email}
      onConfirmSuccess={() => router.replace('/profile-setup')}
    />
  );
}
```

- [ ] **Step 4: Atualizar `src/app/profile-setup.tsx`**

```tsx
/**
 * Resumo do arquivo:
 * Rota de configuracao inicial do perfil.
 * Marca o setup como concluido e leva o usuario para o dashboard autenticado.
 */
import React from 'react';
import { router } from 'expo-router';

import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';
import { markProfileSetupCompleted } from '@/services/auth';

export default function ProfileSetupRoute() {
  async function completeProfileSetup() {
    await markProfileSetupCompleted();
    router.replace('/dashboard');
  }

  return (
    <ProfileSetupScreen
      onBack={() => router.replace('/')}
      onComplete={completeProfileSetup}
    />
  );
}
```

- [ ] **Step 5: Validar fluxo inicial**

Run:

```bash
npm run typecheck
```

Expected: PASS ou erros apenas de arquivos ainda nao tocados na Task 3/4.

---

### Task 3: Migrar Logout e Navegacao Interna do App

**Files:**
- Modify: `src/app/(app)/profile.tsx`
- Inspect: `src/components/AppShell.tsx`
- Inspect: `src/constants/navigation.ts`
- Inspect: `src/app/(app)/dashboard.tsx`

- [ ] **Step 1: Atualizar logout na rota de perfil**

Em `src/app/(app)/profile.tsx`, trocar o callback de logout por:

```tsx
import { logoutUser } from '@/services/auth';

async function handleLogout() {
  await logoutUser();
  router.replace('/');
}
```

E usar:

```tsx
onLogout={handleLogout}
```

- [ ] **Step 2: Confirmar que AppShell substitui `navigateTo` do App.tsx**

Verificar que `src/components/AppShell.tsx` usa:

```tsx
router.replace(nextTab.href);
```

Verificar que `src/constants/navigation.ts` contem as rotas:

```ts
href: '/dashboard'
href: '/exams'
href: '/ai'
href: '/prevention'
href: '/profile'
```

- [ ] **Step 3: Confirmar rotas internas**

As rotas abaixo devem existir dentro de `src/app/(app)`:

```text
dashboard.tsx
exams.tsx
ai.tsx
medicines.tsx
appointments.tsx
prevention.tsx
profile.tsx
```

Isso cobre os antigos estados do `App.tsx`:

```text
dashboard, exams, ai, medicines, appointments, prevention, profile-screen
```

- [ ] **Step 4: Validar**

Run:

```bash
npm run typecheck
```

Expected: PASS.

---

### Task 4: Transformar App.tsx Em Compatibilidade Documentada

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Substituir `App.tsx` por arquivo explicativo e compilavel**

```tsx
/**
 * Resumo do arquivo:
 * Compatibilidade historica do projeto.
 * O app real usa Expo Router por `package.json -> main: expo-router/entry`,
 * portanto a navegacao e as regras de fluxo vivem em `src/app`.
 *
 * Este componente existe para evitar confusao ao abrir o arquivo antigo.
 * Nao coloque novas telas, estados de navegacao ou configuracoes Amplify aqui.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SuaSaude usa Expo Router</Text>
      <Text style={styles.description}>
        A entrada real do app esta em src/app/_layout.tsx e as telas ficam em src/app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Confirmar que o entrypoint continua Expo Router**

`package.json` deve continuar assim:

```json
{
  "main": "expo-router/entry"
}
```

- [ ] **Step 3: Validar**

Run:

```bash
npm run typecheck
```

Expected: PASS.

---

### Task 5: Separar Servicos Reais De Mock APIs

**Files:**
- Create: `src/mocks/api/requestSimulator.ts`
- Create: `src/mocks/api/aiAnalysisApi.ts`
- Create: `src/mocks/api/appointmentsApi.ts`
- Create: `src/mocks/api/dashboardApi.ts`
- Create: `src/mocks/api/examsApi.ts`
- Create: `src/mocks/api/medicinesApi.ts`
- Create: `src/mocks/api/preventionApi.ts`
- Create: `src/mocks/api/profileApi.ts`
- Create: `src/mocks/api/index.ts`
- Modify: `src/hooks/useAIAnalysisData.ts`
- Modify: `src/hooks/useAppointmentsData.ts`
- Modify: `src/hooks/useDashboardData.ts`
- Modify: `src/hooks/useExamsData.ts`
- Modify: `src/hooks/useMedicinesData.ts`
- Modify: `src/hooks/usePreventionData.ts`
- Modify: `src/hooks/useProfileData.ts`
- Delete: old mock-backed files from `src/services`

- [ ] **Step 1: Criar `src/mocks/api/requestSimulator.ts`**

Mover o conteudo atual de `src/services/requestSimulator.ts` para `src/mocks/api/requestSimulator.ts` mantendo a documentacao inicial.

- [ ] **Step 2: Criar mock APIs com nomes explicitos**

Exemplo para dashboard:

```ts
/**
 * Resumo do arquivo:
 * Mock API do dashboard usada enquanto a integracao real de backend nao existe.
 * Simula uma chamada assíncrona para preservar estados de loading e erro na UI.
 */
import { DASHBOARD_SNAPSHOT } from '@/mocks/dashboard';
import { simulateRequest } from './requestSimulator';

export function getDashboardSnapshot() {
  return simulateRequest(DASHBOARD_SNAPSHOT, {
    delayMs: 280,
    errorMessage: 'Nao foi possivel carregar o resumo do dashboard.',
  });
}

export function getDashboardTodayLabel(date = new Date()) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
```

Repetir o padrao para:

```text
aiAnalysisApi.ts
appointmentsApi.ts
examsApi.ts
medicinesApi.ts
preventionApi.ts
profileApi.ts
```

- [ ] **Step 3: Criar barrel `src/mocks/api/index.ts`**

```ts
/**
 * Resumo do arquivo:
 * Exporta mock APIs usadas pelos hooks de tela durante o desenvolvimento.
 * Quando houver backend real, os hooks devem migrar para clientes reais em src/services.
 */
export * from './aiAnalysisApi';
export * from './appointmentsApi';
export * from './dashboardApi';
export * from './examsApi';
export * from './medicinesApi';
export * from './preventionApi';
export * from './profileApi';
```

- [ ] **Step 4: Atualizar imports dos hooks**

Trocar imports como:

```ts
import { getDashboardSnapshot, getDashboardTodayLabel } from '@/services/dashboardService';
```

por:

```ts
import { getDashboardSnapshot, getDashboardTodayLabel } from '@/mocks/api';
```

Aplicar o mesmo padrao aos hooks de IA, consultas, exames, medicamentos, prevencao e perfil.

- [ ] **Step 5: Remover servicos mockados antigos**

Depois que `rg` confirmar que nao ha referencias, remover:

```text
src/services/requestSimulator.ts
src/services/aiAnalysisService.ts
src/services/appointmentsService.ts
src/services/dashboardService.ts
src/services/examsService.ts
src/services/medicinesService.ts
src/services/preventionService.ts
src/services/profileService.ts
```

Run:

```bash
rg "services/(requestSimulator|aiAnalysisService|appointmentsService|dashboardService|examsService|medicinesService|preventionService|profileService)" src
```

Expected: no matches.

- [ ] **Step 6: Validar**

Run:

```bash
npm run typecheck
```

Expected: PASS.

---

### Task 6: Testes e Validacao Final

**Files:**
- Create or modify: route tests under `__tests__` if the folder exists.
- Modify: `README.md` or a small project doc only if current documentation still says `App.tsx` controls navigation.

- [ ] **Step 1: Rodar typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Rodar lint**

```bash
npm run lint
```

Expected: PASS or only pre-existing warnings documented with file names.

- [ ] **Step 3: Rodar testes**

```bash
npm run test:ci
```

Expected: PASS.

- [ ] **Step 4: Validar export web**

```bash
npx expo export --platform web
```

Expected: Expo Router recognizes `src/app`, generates `dist/`, and exits successfully.

- [ ] **Step 5: Teste manual do fluxo**

Executar:

```bash
npm run web
```

Validar manualmente:

```text
/ abre login
Criar conta vai para /register
Cadastro com email bem-sucedido vai para /confirm?email=...
Confirmacao vai para /profile-setup
Finalizar perfil vai para /dashboard
Tabs internas trocam entre /dashboard, /exams, /ai, /prevention e /profile
Logout em /profile chama signOut e volta para /
```

## Criterios de Aceite

- `App.tsx` nao contem mais `currentScreen`, `setCurrentScreen`, `userEmail`, `Amplify.configure`, nem imports diretos de telas.
- Toda navegacao funcional esta em `src/app`.
- Login por senha e Google usam a mesma regra de pos-autenticacao.
- Setup de perfil usa AsyncStorage por usuario Cognito como no fluxo antigo.
- Logout real sai do Cognito e volta para `/`.
- `src/services` contem apenas servicos reais de autenticacao/integracao.
- Mock APIs estao nomeadas claramente em `src/mocks/api`.
- `npm run typecheck` passa.
- O plano de validacao manual cobre o fluxo completo de auth e tabs.

## Self-Review

- Cobertura: o plano cobre migracao de `currentScreen`, `userEmail`, profile setup, Google auth, logout, tabs internas e limpeza da pasta `services`.
- Sem placeholders: nao ha tarefas com "TBD" ou "implementar depois"; os arquivos centrais possuem codigo-alvo.
- Consistencia de tipos: `resolvePostAuthRoute` retorna apenas `'/dashboard' | '/profile-setup'`, rotas usadas diretamente por `router.replace`.
- Risco principal: `App.tsx` nao deve continuar como segundo sistema de navegacao; manter dois fluxos completos criaria divergencia. Ele fica compilavel e documentado, enquanto Expo Router segue como entrypoint oficial.

# Merge Cadastro Usuario into Expo Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar `origin/feat/cadastroUsuario` na branch `dev` sem regredir a navegação em Expo Router, preservando os fluxos atuais e absorvendo as partes úteis da migração para AWS Amplify.

**Architecture:** O merge será feito com `--no-commit` para materializar os conflitos reais sem selar uma integração defeituosa. A resolução seguirá uma regra simples: `src/app` e os serviços de rota/auth atuais continuam sendo a fonte de verdade do runtime; artefatos de backend Amplify Gen 2 e melhorias compatíveis serão incorporados por adaptação, nunca por retorno ao `App.tsx` state machine.

**Tech Stack:** Expo 54, Expo Router 6, React Native 0.81, TypeScript strict, AWS Amplify v6, Jest, ESLint.

---

### Task 1: Preservar o estado local e materializar o merge real

**Files:**
- Modify: `.gitignore`
- Create: `docs/superpowers/plans/2026-05-14-merge-cadastro-usuario-expo-router.md`
- Inspect: `App.tsx`, `package.json`, `src/app/_layout.tsx`, `src/services/auth/*`

- [ ] **Step 1: Registrar o estado atual para rollback seguro**

Run: `git status --short --branch`
Expected: branch `dev` com alteração local em `.gitignore`

- [ ] **Step 2: Guardar a alteração local que bloqueia o merge**

Run: `git stash push -m "pre-merge-gitignore-2026-05-14" -- .gitignore`
Expected: working tree limpo o suficiente para mesclar refs que também alteram `.gitignore`

- [ ] **Step 3: Criar um ponto de recuperação antes da integração**

Run: `git branch backup/dev-pre-cadastroUsuario-2026-05-14`
Expected: nova branch local apontando para o HEAD atual

- [ ] **Step 4: Executar o merge sem commit para capturar conflitos reais**

Run: `git merge --no-commit --no-ff origin/feat/cadastroUsuario`
Expected: conflitos e/ou staged changes materializados, sem commit automático

- [ ] **Step 5: Restaurar a intenção local do `.gitignore`**

Run: `git stash pop`
Expected: `.gitignore` volta com a regra `AGENTS.md`, resolvendo qualquer conflito necessário manualmente

### Task 2: Resolver a arquitetura de entrada e navegação

**Files:**
- Keep/Modify: `package.json`
- Keep/Modify: `App.tsx`
- Keep/Modify: `src/app/_layout.tsx`
- Keep/Modify: `src/app/index.tsx`
- Keep/Modify: `src/app/register.tsx`
- Keep/Modify: `src/app/confirm.tsx`
- Keep/Modify: `src/app/forgot-password.tsx`
- Keep/Modify: `src/app/profile-setup.tsx`
- Keep/Modify: `src/app/(app)/*`
- Reject remote regression from: `index.ts`

- [ ] **Step 1: Rejeitar o retorno do entrypoint para `index.ts`**

Implementation:
Keep `package.json` with `"main": "expo-router/entry"` and do not adopt the remote `"main": "index.ts"` value.

- [ ] **Step 2: Preservar `App.tsx` como arquivo de compatibilidade, não como runtime**

Implementation:
Keep the current explanatory `App.tsx`; do not reintroduce `currentScreen`, `userEmail`, `Amplify.configure`, or manual screen switching there.

- [ ] **Step 3: Manter `src/app` como dono exclusivo da navegação**

Implementation:
Keep the current route wrappers and `(app)` group. If the merge deletes them, restore them from `HEAD` and only adapt callbacks or auth hooks where there is functional gain.

- [ ] **Step 4: Confirmar que callbacks de navegação continuam saindo das rotas, não das telas**

Run: `git diff -- src/app src/screens`
Expected: tela continua recebendo callbacks; `router.push/replace` fica nas rotas

### Task 3: Absorver AWS Amplify sem quebrar o fluxo atual

**Files:**
- Keep/Modify: `src/services/auth/amplify.ts`
- Keep/Modify: `src/services/auth/aws-auth-config.ts`
- Keep/Modify: `src/services/auth/authFlow.ts`
- Keep/Modify: `src/services/auth/profileSetupStatus.ts`
- Keep/Modify: `src/services/auth/session.ts`
- Keep/Modify: `src/services/auth/index.ts`
- Keep/Move if useful: `src/services/google-auth.ts`
- Create/Keep: `amplify/backend.ts`
- Create/Keep: `amplify/auth/resource.ts`
- Create/Keep: `amplify/data/resource.ts`
- Inspect: `src/screens/HomeScreen.tsx`, `src/screens/RegisterScreen.tsx`, `src/screens/ProfileSetupScreen.tsx`

- [ ] **Step 1: Integrar os artefatos de backend Amplify Gen 2 ao repositório**

Implementation:
Keep the remote `amplify/` folder because it defines auth/data infrastructure missing from `dev`, but treat it as infra source, not proof of ready runtime configuration.

- [ ] **Step 2: Preservar o bootstrap atual do Amplify no layout do Expo Router**

Implementation:
Keep `import '@/services/auth/amplify'` in `src/app/_layout.tsx` so route-based auth still configures Amplify before any screen action.

- [ ] **Step 3: Não migrar o runtime para `amplify_outputs.json` sem arquivo real**

Implementation:
Because `origin/feat/cadastroUsuario` references `amplify_outputs.json` but the file is absent in the repo, keep the current config-driven auth bootstrap and only add fallbacks or comments if needed.

- [ ] **Step 4: Avaliar seletivamente as mudanças de tela**

Implementation:
Keep the current improved auth/onboarding UX unless the remote branch adds backend behavior that can be extracted safely. Reject regressions such as returning Apple auth, removing password requirements, removing invalid-login feedback, or collapsing the privacy-preserving onboarding flow.

### Task 4: Revisar o resultado do merge e reparar o que quebrar

**Files:**
- Inspect/Modify: `src/screens/HomeScreen.tsx`
- Inspect/Modify: `src/screens/RegisterScreen.tsx`
- Inspect/Modify: `src/screens/ConfirmScreen.tsx`
- Inspect/Modify: `src/screens/ForgotPasswordScreen.tsx`
- Inspect/Modify: `src/screens/ProfileSetupScreen.tsx`
- Inspect/Modify: `src/components/**/*`
- Inspect/Modify: `__tests__/auth-screens.test.tsx`
- Inspect/Modify: `__tests__/profile-setup-*.test.ts*`

- [ ] **Step 1: Resolver conflitos favorecendo comportamento validado na `dev`**

Implementation:
Use the current branch as baseline for route ownership, test harness, theme tokens, reusable auth components, and profile-setup UX. Pull remote code only where it introduces concrete backend integration or missing domain components.

- [ ] **Step 2: Repor qualquer teste apagado pelo merge**

Implementation:
If the remote branch deletes test files or config, restore the Jest setup and affected tests from `HEAD` before validating.

- [ ] **Step 3: Fazer revisão de código orientada a risco**

Checklist:
- login ainda autentica por email/senha e Google
- Expo Router continua sendo o único fluxo de navegação
- logout e pós-auth continuam usando serviços, não screen state
- onboarding não persiste dados sensíveis localmente fora da regra atual
- nenhum arquivo reintroduz navegação paralela em `App.tsx`

### Task 5: Validar e documentar a integração

**Files:**
- Modify if needed: `docs/superpowers/plans/2026-05-14-merge-cadastro-usuario-expo-router.md`
- Inspect: `package.json`, `jest.config.js`, `eslint.config.js`, `tsconfig.json`

- [ ] **Step 1: Verificar status final do merge**

Run: `git status --short`
Expected: sem conflitos não resolvidos; mudanças prontas para revisão

- [ ] **Step 2: Rodar typecheck**

Run: `npm run typecheck`
Expected: sucesso sem erros TypeScript

- [ ] **Step 3: Rodar lint**

Run: `npm run lint`
Expected: sucesso sem erros bloqueantes

- [ ] **Step 4: Rodar suíte de validação principal**

Run: `npm run test:ci`
Expected: testes passando, ou falhas documentadas com causa real do merge

- [ ] **Step 5: Produzir resumo técnico do que foi aceito e rejeitado da branch remota**

Implementation:
Document in the final handoff which remote changes were incorporated, which were intentionally discarded, and why.

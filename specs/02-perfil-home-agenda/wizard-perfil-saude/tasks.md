# TASKS: Perfil de Saúde — Wizard 4 Etapas

## Preparação
- [x] Decisão de schema (`plan.md` §2): **`RESOLVIDO` fora deste EPIC** — implementada como efeito colateral coordenado do Bloco 4/4c (Editar Perfil), que compartilha `buildAmplifyUserProfileInput`/`profileSetupPayload.ts`. `UserProfile.sex` já é `a.enum(['Masculino', 'Feminino', 'Outro'])` e `chronicConditions`/`medications`/`allergies` já existem no schema real (confirmado lendo `amplify/data/schemas/user.ts` nesta sessão). Nenhuma migração adicional necessária para este EPIC.
- [x] `EditProfileScreen.tsx` (4c) já usa seu próprio `formatHeightInput` local em centímetros inteiros (não depende do `formatHeightInput`/`parseHeightCm` deste arquivo) — confirmado que a simplificação de `parseHeightCm` (remoção da heurística de metros) não afeta 4c.
- [x] Banner de sucesso: nenhum componente de banner verde reaproveitável existia; parametrizado o `ProfileSetupNotice.tsx` existente como `LgpdNotice({ text, tone: 'info' | 'success' })` em vez de criar um componente novo do zero (regra 3).

## Schema Amplify (`amplify/data/schemas/user.ts`)
- [x] `sex: a.enum(['Masculino', 'Feminino', 'Outro'])` — já implementado (Bloco 4/4c).
- [x] `chronicConditions`/`medications`/`allergies: a.string()` — já implementado (Bloco 4/4c).
- [x] Sandbox já sincronizado como parte do trabalho do Bloco 4 — nenhuma mudança de schema nova nesta sessão.

## Camada de payload (`src/services/profileSetupPayload.ts`)
- [x] `AmplifyUserProfileInput`/`mapBiologicalSex()`/`buildAmplifyUserProfileInput()` já incluíam sex "Outro" e os 3 campos clínicos — confirmado, sem mudança de contrato necessária.
- [x] `parseHeightCm()` simplificado nesta sessão: removida a heurística "valor ≤ 3 é metro" (não é mais necessária — a Etapa 1 agora só coleta centímetros inteiros diretamente).

## Etapa 1 — Dados pessoais (`PersonalStep` em `OnboardingScreen.tsx`)
- [x] Substituídos os 2 `SexCard` + 1 `preferNotCard` por `SexChip` — 3 chips iguais na mesma linha, ordem Masculino/Feminino/Outro (`sexChip`/`sexChipSelected`).
- [x] Preservado: selecionar "Masculino" ou "Outro" reseta `pregnancyStatus` para `'unknown'`.
- [x] Campo "Altura" agora pede centímetros inteiros diretamente — rótulo "Altura (cm)", placeholder "165", sem `unit="m"`.
- [x] `parseHeightCm()` simplificado (`profileSetupPayload.ts`) — heurística "≤3 é metro" removida.
- [x] `formatHeightInput()` simplificado para aceitar só dígitos (sem vírgula decimal).
- [x] Rótulo "Peso" → "Peso (kg)", placeholder "68" (alinhado ao Canvas).

## Etapa 2 — Histórico clínico (`ClinicalStep`)
- [x] Banner LGPD com o texto exato: "Suas informações clínicas são sigilosas e usadas só para orientações personalizadas, conforme a LGPD." (`LgpdNotice tone="info"`).
- [x] Banner posicionado **antes** dos 3 textareas (logo abaixo do título "Histórico clínico").
- [x] Confirmado: os 3 textareas continuam opcionais; placeholders/helperTexts atualizados para o texto do Canvas ("Ex.: diabetes tipo 2, hipertensão — deixe em branco se não tiver.", etc.).

## Etapa 3 — Hábitos (`HabitsStep`)
- [x] Banner LGPD com o texto exato: "Essas respostas são opcionais e protegidas pela LGPD. Responda com o que preferir." (diferente do da Etapa 2).
- [x] Banner posicionado **antes** do bloco de perguntas.
- [x] Rótulos das 4 perguntas atualizados para a forma interrogativa exata do Canvas: "Você fuma?", "Você é sexualmente ativo(a)?", "Pratica atividade física?", "Consome bebida alcoólica?".

## Etapa 4 — Revisão (`ReviewStep` / `ProfileSetupReview`)
- [x] Revisão reestruturada em 3 blocos agrupados — "Pessoais", "Clínico", "Hábitos" — cada um com resumo textual curto (`joinParts`), em vez da lista plana de 6 campos anterior.
- [x] Link "Editar" (`#1B63C4`, `app-secondary`) em cada bloco, chamando `onEditStep(step)` → `selectStep` já existente na tela, sem perder dados preenchidos.
- [x] `PrivacyNotice` genérico substituído por `LgpdNotice tone="success"` com o texto "Isso nos ajuda a te dar alertas de prevenção mais precisos.".
- [x] Confirmado: os 13 campos coletados aparecem em algum dos 3 blocos do resumo (incluindo nome, altura, peso, álcool, condições, medicamentos, alergias — que faltavam antes).

## Copy / componente de aviso compartilhado
- [x] `PROFILE_SETUP_NOTICE_TEXT` único substituído por `CLINICAL_STEP_NOTICE_TEXT`/`HABITS_STEP_NOTICE_TEXT`/`REVIEW_STEP_CONFIRMATION_TEXT` em `ProfileSetupNotice.tsx`.
- [x] Componente único `LgpdNotice({ text, tone: 'info' | 'success' })` implementado, reaproveitando os tokens de tema já existentes (`infoSoft`/`infoBadgeBorder`/`info`, `successSoft`/`successBadgeBorder`/`success` — confirmados batendo com os hex do Canvas em `themeTokens.json`), sem hex novos hardcoded.

## Testes / verificação manual
- [x] Suite de testes de `OnboardingScreen` (`__tests__/onboarding-screen.test.tsx`) atualizada para a nova copy/estrutura e passando (9/9). `__tests__/profile-setup-payload.test.ts` atualizado (fixture de altura não depende mais da heurística de metros removida) e passando (7/7).
- [ ] Testar manualmente o fluxo completo das 4 etapas com dados reais contra o Amplify sandbox (não executado nesta sessão — requer ambiente Node 20/`ampx sandbox` rodando).
- [x] Voltar/"Editar" preservam os dados preenchidos — coberto por teste automatizado (não perde estado entre etapas, `watch()`/`control` únicos preservados).
- [x] Pergunta condicional de gravidez aparecendo/sumindo — coberto por teste automatizado existente.
- [ ] Testar visualmente em light e dark mode no dispositivo/simulador (não executado nesta sessão — apenas revisão de código/tokens).
- [ ] Testar falha de salvamento (sessão expirada) na Etapa 4 manualmente.
- [x] Confirmado: `EditProfileScreen.tsx` (4c) usa seu próprio `formatHeightInput` local, não importa nada de `OnboardingScreen.tsx`/`ProfileSetupNotice.tsx`/`ProfileSetupReview.tsx` — não afetado pelas mudanças.
- [x] Confirmado: alterações limitadas a `OnboardingScreen.tsx`, `profileSetupPayload.ts`, `components/profileSetup/ProfileSetupNotice.tsx`, `components/profileSetup/ProfileSetupReview.tsx` e os 2 arquivos de teste correspondentes.

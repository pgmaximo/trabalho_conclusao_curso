# TASKS: Prevenção & Alertas — Recomendações USPSTF (3e)

> A Fase 0 original (decisão de dados por heurística textual) foi **substituída** por uma decisão diferente, confirmada por revisão humana: portar a integração real USPSTF/AHRQ já existente em `feat/exame_sugest` em vez de implementar a heurística. Ver `plan.md` §2 (histórico) e §3 (arquitetura real). As fases abaixo refletem o que foi de fato implementado.

## Fase 0 — Decisão de dados (RESOLVIDA — decisão diferente da proposta original)
- [x] **0.1** Cruzamento de regras preventivas ↔ dado real: decidido usar a API USPSTF/AHRQ (via Lambda) em vez da heurística textual contra `MedicalDocument`/`Appointment`.
- [x] **0.2** Faixas de badge do score: **não aplicável** — a abordagem USPSTF não tem conceito de "score numérico", é uma lista filtrável por grau (A–I). Não implementado (não seria dado real).
- [x] **0.3** "Pressão arterial": **removido do escopo** — não é um conceito USPSTF, não recriado.
- [x] **0.4** Banner de campanha de vacinação: mantido como pendência/follow-up (ver Fase 5), fora de escopo desta implementação por decisão explícita.
- [x] **0.5** Tabela de regras preventivas: **não aplicável** — substituída pelo dataset dinâmico da API USPSTF (não uma tabela estática local).

## Fase 1 — Port do backend (Lambda + schema)
- [x] **1.1** Criar `amplify/functions/get-prevention-recommendations/` (`resource.ts`, `handler.ts`, `uspstfClient.ts`, `uspstfFilter.ts`, `__tests__/uspstfFilter.test.ts`) — portado verbatim de `feat/exame_sugest`.
- [x] **1.2** Criar `amplify/data/schemas/prevention.ts` (`PreventionRecommendation` customType + query `getPreventionRecommendations`) e adicionar `preventionSchema` ao spread em `amplify/data/resource.ts`.
- [x] **1.3** Registrar a função em `amplify/backend.ts` (`defineBackend`), `grantReadData` da tabela `UserProfile` para a Lambda, env var `USER_PROFILE_TABLE_NAME`.
- [x] **1.4** Instalar `@aws-sdk/client-dynamodb`/`@aws-sdk/lib-dynamodb` (devDependencies — resolvidas no build da Lambda, não estavam no projeto).
- [x] **1.5** Rodar `npx jest amplify/functions/get-prevention-recommendations` — 10/10 testes passando após o port.

## Fase 2 — Port do service/hook layer
- [x] **2.1** `src/types/models.ts`: substituir `PreventiveAlert`/`PreventiveScoreSnapshot`/`PreventiveCheck`/`PreventionSnapshot` (antigo) por `UspstfGrade`/`PreventionRecommendation`/`RecommendationView`/`PreventionSnapshot` (novo) — confirmado, sem outros usos no repo além do módulo de prevenção.
- [x] **2.2** Criar `src/services/preventionService.ts` (chama `client.queries.getPreventionRecommendations`).
- [x] **2.3** Instalar `expo-notifications`, `expo-device` (via `npx expo install`, versão resolvida pelo SDK do projeto).
- [x] **2.4** Criar `src/services/reminderService.ts` (agendamento local via `expo-notifications`, persistência via `AsyncStorage`).
- [x] **2.5** Reescrever `src/hooks/usePreventionData.ts` (orquestra `preventionService` + `reminderService`, expõe `onToggleReminder`/`onEnableRemindersForIds`).
- [x] **2.6** Criar `src/hooks/useReminderPreferences.ts` (preferências de intervalo por grau para a tela de Perfil).

## Fase 3 — UI (`PreventionScreen.tsx` + suporte)
- [x] **3.1** Reescrever `src/screens/PreventionScreen.tsx` do zero com os componentes/tokens do design system atual (`Card`, `Badge`, `EmptyState`, `FilterChips`, `ScreenHeader`, `ScreenSkeleton`, `Section`) — layout de lista filtrável por grau, não o score/checklist do Canvas 3e (divergência documentada em `spec.md` §3.1).
- [x] **3.2** Criar `src/components/RecommendationCard.tsx` (badge de grau, explicação PT, texto oficial via `HtmlText`, sino de lembrete, citação).
- [x] **3.3** Criar `src/components/HtmlText.tsx` — parser HTML próprio (sem `react-native-render-html`, descartada por estar sem publicação desde 2022 — ver `plan.md` §3.2).
- [x] **3.4** Atualizar `src/app/(app)/prevention.tsx` para o novo contrato de props do hook.
- [x] **3.5** Adicionar seção "Lembretes de prevenção" em `src/screens/ProfileScreen.tsx` (lista de graus A–I + `BottomSheet` de opções de intervalo) e atualizar `src/app/(app)/profile.tsx` para injetar `useReminderPreferences`.

## Fase 4 — Limpeza e verificação
- [x] **4.1** Remover `src/components/HealthCheckItem.tsx`, `src/components/PreventiveScore.tsx`, `src/components/UrgentAlert.tsx` (sem uso fora do módulo de prevenção antigo).
- [x] **4.2** Remover `src/mocks/prevention.ts`, `src/mocks/api/preventionApi.ts` e o export em `src/mocks/api/index.ts`.
- [x] **4.3** `npx tsc --noEmit` limpo (sem erros).
- [x] **4.4** `npx expo lint` sem novos warnings/erros introduzidos por este port.
- [x] **4.5** Atualizar `GAP_ANALYSIS.md` (linha 3e, pendência #2) refletindo a integração real.

## Fase 5 — Follow-up (fora de escopo desta implementação, decisão explícita)
- [x] **5.1 `RESOLVIDO`** (branch `feat_vacina`) — Banner de campanha de vacinação em `PreventionScreen.tsx`, agora consultando `src/services/vaccinationCampaignSummary.ts` (dado real do PNI/RNDS, não mais a config estática `vaccinationCampaigns.ts`, removida). Ver `specs/04-ia-perfil-vacinacao/campanhas-vacinacao/spec.md` §5.
- [ ] **5.2** Cache do dataset USPSTF na Lambda (evitar chamada HTTP síncrona a cada abertura da tela) — ver `plan.md` §4.
- [ ] **5.3** Migrar `ScanCommand`→`QueryCommand` no handler (GSI por `owner`) — ver `plan.md` §4.
- [ ] **5.4** Estender `uspstfFilter.ts` para usar `pregnant`/`isSmoker`/`sexuallyActive` do perfil, se a API expuser esses parâmetros de filtragem — ver `plan.md` §4.
- [ ] **5.5** Configurar o secret `USPSTF_API_KEY` no ambiente Amplify antes de qualquer deploy real (não verificável nesta sessão, sem credenciais AWS).

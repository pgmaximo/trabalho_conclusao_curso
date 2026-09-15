# TASKS: Importar dados de wearables (Bloco 4)

## Schema e infraestrutura (fazer primeiro)

- [x] Criado `amplify/data/schemas/healthImportEnums.ts` (fonte única dos valores de `status`/`sourceHint`, importada pelo schema e pelas duas Lambdas — evita divergência de enum entre a gravação direta no DynamoDB e o schema GraphQL).
- [x] Criado `amplify/data/schemas/health-import.ts` com o model `HealthImport` (`allow.owner()`) e a mutation `startHealthAnalysis` (primeira `a.mutation()` do repo).
- [x] `healthImportSchema` registrado em `amplify/data/resource.ts` — mudança puramente aditiva, confirmada por `npm run typecheck:backend`.
- [x] Nova regra `health-imports/{entity_id}/*` em `amplify/storage/resource.ts`.
- [x] `amplify/backend.ts`: grants de tabela, `grantInvoke` entre as Lambdas, `configureAsyncInvoke({ retryAttempts: 0 })`, Guardrail via IaC (`aws-cdk-lib/aws-bedrock`), `PolicyStatement` do Bedrock com as duas ARNs.
- [x] `npx ampx sandbox --once` executado com sucesso — `HealthImport` provisionado, Guardrail (`u42elo7xsu1b`, versão `1`) criado, `amplify_outputs.json` regenerado. Confirmado via `aws dynamodb` que o item não tem `_version`/`_lastChangedAt` (conflict resolution desligado, escrita direta é segura).

## Prova de vida ponta a ponta (antes de qualquer parser)

- [x] `start-health-analysis`/`analyze-health-import` com um corpo mínimo (grava `status=READY` fixo) para validar a infraestrutura isoladamente.
- [x] Validado com um usuário Cognito de teste real (criado e removido nesta sessão): `createHealthImport` → `startHealthAnalysis` → `getHealthImport` retornando `READY` com o campo escrito pela Lambda. **Achado crítico corrigido nesta validação**: o valor real de `owner` gravado pelo AppSync é o composto `${sub}::${username}` — a resposta do GraphQL só ecoa a metade `sub` para exibição, o que induziu um engano inicial (corrigido antes de prosseguir).

## Cliente: seleção, validação e upload

- [x] Criado `src/services/upload.ts` (`uploadFileToS3` extraído de `examService.ts`, agora recebendo a função de path em vez de assumir o prefixo `medical-documents/`) — `examService.ts` atualizado para importar dali.
- [x] Criado `src/services/healthImportService.ts`: `validatePickedFiles` (extensão, tamanho, quantidade), `createHealthImport` (upload sequencial + `create` + `startHealthAnalysis`), `getHealthImport`, `getLatestReadyHealthImport`, `listHealthImports`, `deleteHealthImport`.
- [x] Criado `src/screens/ImportHealthDataScreen.tsx`: etapa de consentimento (gate local) + seleção múltipla (`expo-document-picker`, `multiple: true`) + lista de arquivos com remoção + validação inline + envio.
- [x] Criado `src/app/import-health-data.tsx` (rota fina).
- [x] Testes: `__tests__/health-import-service.test.ts` (10 testes de `validatePickedFiles`, com `aws-amplify/data`/`aws-amplify/auth`/`aws-amplify/storage`/`uuid` mockados — mesmo padrão de `login-screen.test.tsx` para contornar o ESM não transformado pelo Jest).

## Navegação

- [x] `src/constants/navigation.ts`: novo item `health-data` em `MORE_MENU_ITEMS` ("Dados do smartwatch") e prefixos `/health-data`/`/import-health-data` em `MORE_ROUTE_PREFIXES`.
- [x] `src/screens/ProfileScreen.tsx`: card "Dados do smartwatch" substitui o antigo `Alert.alert` "Em breve"; navega para `onImportHealthData` (prop nova).
- [x] `src/app/(app)/profile.tsx`: passa `onImportHealthData={() => router.push('/import-health-data')}`.
- [x] Removido `src/services/health/healthAppConnectService.ts` (stub morto, sem mais referências).

## Validação final

- [x] `npm run validate` passa integralmente (typecheck app + backend, lint, testes).
- [ ] Comparação visual contra um Canvas — não aplicável, esta EPIC não tem Canvas de origem (ver `plan.md` §4).

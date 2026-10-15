# TASKS: Insights de saúde (Bloco 4)

## Backend — pipeline de análise

- [x] `amplify/functions/analyze-health-import/`: `archiveReader.ts` (unzip com allowlist via `fflate`), `fileSniffer.ts` (identifica o tipo pela linha 1, nunca pelo nome do arquivo), `csvParser.ts` (BOM, delimitador, aspas RFC 4180, vírgula sobrando do Samsung), `metricCatalog.ts` (catálogo declarativo derivado do export real), `columnMapper.ts`, `valueNormalizer.ts`, `jsonWalker.ts`, `hrvExtractor.ts` (HRV vem de JSON, não do CSV), `sampleExtractor.ts`, `dailyAggregator.ts` (dedupe por dispositivo, estágios de sono por segmento), `sanity.ts`, `mathUtils.ts`, `statistics.ts` (Pearson com defasagem, `n >= 14`), `summaryBuilder.ts` (resolução mensal), `insightSchema.ts` (zod), `insightPrompt.ts` (system prompt + tool schema derivado do mesmo zod), `bedrockClient.ts` (Converse + Guardrail de saída), `s3Reader.ts`, `importRepository.ts`, `handler.ts` (orquestração, nunca lança).
- [x] 18 arquivos de lógica pura cobertos por teste unitário — 222 testes no total, incluindo fixtures anonimizadas extraídas do export real do usuário (`__tests__/fixtures/`).
- [x] Validação manual do Converse com tool forçado via `aws bedrock-runtime converse` (CLI) — sucesso confirmado antes de integrar ao `bedrockClient.ts`.
- [ ] Chamada real do `analyze-health-import` completo (com Guardrail) em produção — **bloqueada pela conta AWS aguardando o formulário de uso de modelos Anthropic** (bloqueio da própria AWS, não do código). O pipeline foi validado ponta a ponta até a chamada ao Bedrock (walking skeleton com um usuário Cognito real).

## Frontend — dashboard

- [x] Criado `src/types/healthInsights.ts` (tipos espelhando o JSON gravado pela Lambda — duplicados de propósito, sem importar `amplify/functions/*` no bundle do app).
- [x] Criado `src/hooks/useHealthImportStatus.ts` (polling com backoff, parada em 6min, retomada ao voltar do segundo plano).
- [x] Criado `src/hooks/useHealthDashboardData.ts` + `src/hooks/healthImportCache.ts` (cache-first, mesmo padrão de `vaccinationCache.ts`).
- [x] Criado `src/components/AiDisclaimerBanner.tsx` (extraído de `ChatBotScreen.tsx`, reaproveitado aqui).
- [x] Criado `src/components/charts/chartScale.ts` (puro, testado — `__tests__/chart-scale.test.ts`, 18 testes) + `LineChart.tsx`, `BarChart.tsx`, `Sparkline.tsx`, `CorrelationRow.tsx`.
- [x] Criado `src/components/InsightCard.tsx` (ponto de atenção / padrão / sugestão, um componente com três variantes).
- [x] Criado `src/screens/HealthDashboardScreen.tsx` cobrindo os 7 estados descritos em `spec.md` §2.
- [x] Criado `src/app/(app)/health-data.tsx` (rota fina — decide entre acompanhar a importação ativa via `?importId=` ou mostrar a última pronta).
- [x] Testes: `__tests__/health-dashboard-screen.test.tsx` (11 testes, Screen renderizada com props explícitas, nunca a rota).

## Validação final

- [x] `npm run validate` passa integralmente.
- [ ] Comparação visual contra um Canvas — não aplicável (sem Canvas de origem).
- [ ] Demonstração com o export real do Samsung Health do usuário ponta a ponta (upload → dashboard com insights reais) — pendente da liberação do Bedrock pela AWS (ver acima).

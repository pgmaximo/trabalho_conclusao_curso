# PLAN: Importar dados de wearables (Bloco 4)

Plano técnico completo (arquitetura, catálogo de métricas, custo estimado): `docs/superpowers/plans/2026-09-09-importacao-wearables-bedrock.md`. Este arquivo registra as decisões desta EPIC especificamente exigidas pela constituição (regras 3, 5, 8).

## 1. Diagnóstico — estado atual vs. proposto

Não existia nenhum caminho real de importação de dados de wearables. `src/services/health/healthAppConnectService.ts` sempre retornava `'unavailable'` — um stub honesto (regra 2), mas sem integração real por trás. `specs/04-ia-perfil-vacinacao/perfil/plan.md` já registrava a decisão de **não** instalar HealthKit/Health Connect nativo. Esta EPIC não reverte essa decisão — contorna-a: em vez de uma conexão em tempo real com o sensor, o usuário importa o **arquivo** que o próprio app de saúde exporta.

## 2. Novas dependências (regra 3 da constituição)

| Pacote | Escopo | Por quê | Alternativa considerada |
|---|---|---|---|
| `@aws-sdk/client-bedrock-runtime` | devDep (backend) | Única forma de chamar o Bedrock via Converse API | Nenhuma — é o SDK oficial |
| `@aws-sdk/client-s3` | devDep (backend) | Ler os arquivos brutos na Lambda | Já existe transitivamente via `@aws-amplify/backend`, mas precisa ser explícita para import direto |
| `@aws-sdk/client-lambda` | devDep (backend) | Invocação assíncrona entre as duas Lambdas | Idem |
| `fflate` | devDep (backend) | Unzip em JS puro, com filtro por entrada antes de descomprimir (essencial contra as ~50 mil entradas irrelevantes do export real) | `zlib` nativo do Node infla deflate bruto mas não lê o *central directory* do ZIP — implementar isso à mão seria dívida técnica desnecessária |
| `aws-cdk-lib` | devDep (backend) | Precisa ficar explícita (já é transitiva) para importar `iam.PolicyStatement` e `aws-bedrock.CfnGuardrail`/`CfnGuardrailVersion` | Nenhuma — é a própria biblioteca do CDK |

Nenhuma dependência nova no app (frontend) — os gráficos usam `react-native-svg`, já instalado.

## 3. Decisões de schema e arquitetura (regra 5 — nunca efeito colateral)

- **Primeira `a.mutation()` do repositório** (`startHealthAnalysis`) — as demais operações customizadas do repo são `a.query()`. Justificativa: esta operação muda estado (`PENDING` → `PROCESSING`) e dispara um efeito colateral (invocar a segunda Lambda), exatamente o que `a.mutation()` sinaliza.
- **`metricsJson`/`insightsJson` como `a.string()`, não `a.json()`.** Não há precedente no repo de um client Amplify Data lendo um campo `AWSJSON` escrito **direto como Map do DynamoDB** por uma Lambda (o único outro uso de `a.json()`, `VaccinationCampaignCache.payload`, é lido só pela própria Lambda, nunca pelo client). `JSON.stringify`/`JSON.parse` manual elimina essa ambiguidade.
- **Primeiro `iam.PolicyStatement` explícito do repositório** (`amplify/backend.ts`), para conceder `bedrock:InvokeModel`/`bedrock:ApplyGuardrail` — com as duas ARNs (perfil de inferência + foundation-model com região curinga), exigido pelo roteamento de perfis de inferência cross-region.
- **As duas Lambdas (`start-health-analysis`, `analyze-health-import`) ficam em `resourceGroupName: 'data'`.** Colocar a segunda no grupo default causaria dependência cíclica entre as stacks `data`/`function` (o grant da tabela aponta numa direção, o `grantInvoke`/nome da função na outra) — verificado no primeiro `ampx sandbox` desta EPIC.
- **Modelo: `us.anthropic.claude-sonnet-4-6`, não Opus 5.** `toolChoice` forçado (usado para obrigar a saída em JSON) é incompatível com *extended thinking* nos modelos Anthropic (erro 400), e o Opus 5 liga thinking por padrão. A tarefa (sumarizar estatísticas já pré-computadas) não exige raciocínio profundo.
- **Guardrail criado via IaC** (`aws-cdk-lib/aws-bedrock`), não pelo console — primeiro uso desse módulo no repositório, versionado e reproduzível.

## 4. Ambiguidades documentadas (regra 8)

- **Sem Canvas de origem.** Esta feature não estava no design original (`specs/design/raw/`) — o layout segue os tokens do design system, mas não foi comparado pixel a pixel contra nenhuma tela desenhada previamente.
- **Export nativo do Apple Health (`export.xml`) fora de escopo.** É um XML que rotineiramente passa de 100MB — decisão consciente de não implementar streaming SAX nesta EPIC (fica como trabalho futuro no artigo do TCC). A UI orienta o uso de um exportador terceiro (ex.: Health Auto Export) para iPhone.
- **Bloco de aliases Apple/Health Auto Export não verificado contra um export real** — só o bloco Samsung Health foi verificado (o usuário forneceu seu próprio export real, 74MB, durante o planejamento). Colunas não reconhecidas viram aviso visível na UI, nunca falha silenciosa.
- **Códigos de estágio de sono do Samsung (40001-40004)** foram mapeados por frequência relativa observada no export real (leve > acordado > REM > profundo, condizente com uma noite típica) — não há documentação oficial da Samsung confirmando o mapeamento exato.

## 5. Limites de upload (client + backend)

20 arquivos, 25MB por CSV/JSON avulso, 100MB por ZIP — validados no `ImportHealthDataScreen` (`validatePickedFiles`) e revalidados por `start-health-analysis` (nunca confiar só no cliente).

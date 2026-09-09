# Importação de dados de wearables + análise por IA (Bedrock)

## Context

O SuaSaúde já promete, no README ("Funcionalidades Previstas"), **integração com wearables**, **dashboard interativo** e **análise contextualizada** — e hoje nada disso existe. Os dois pontos de entrada estão explicitamente mortos no código:

- [healthAppConnectService.ts](src/services/health/healthAppConnectService.ts) devolve `'unavailable'` e a tela de Perfil mostra *"Em breve você poderá conectar o Apple Health ou Google Fit por aqui"* ([ProfileScreen.tsx:88](src/screens/ProfileScreen.tsx#L88));
- o Bloco 4 de IA é **0% conectado** (`docs/CONEXOES.md`) — [aiAssistantService.ts:34-42](src/services/aiAssistantService.ts#L34-L42) devolve strings aleatórias.

`specs/04-ia-perfil-vacinacao/perfil/plan.md:21-22` registrou a decisão de **não** instalar uma lib nativa de HealthKit/Health Connect. A importação de arquivos exportados pelos próprios apps de saúde contorna essa decisão sem revertê-la: o usuário exporta CSV/JSON/ZIP do Samsung Health ou Apple Health, o backend limpa e consolida esses dados, o Amazon Bedrock gera insights em linguagem natural, e o app mostra um dashboard real.

Isto também resolve a objeção de LGPD que travou o Bloco 4 (`docs/CONEXOES.md:75-92`): com o Bedrock, o dado de saúde **não sai da conta AWS do projeto**.

**Resultado esperado:** uma feature ponta a ponta, com dado real, que demonstra S3 + Lambda + DynamoDB + Bedrock + Guardrails de forma defensável no TCC, sem virar um projeto de engenharia de dados.

## Decisões já tomadas

| Tema | Decisão |
|---|---|
| Formatos aceitos | **CSV + JSON + ZIP** (ZIP descompactado no servidor, com filtro seletivo por entrada) |
| Histórico | **Snapshot por importação** — cada lote é uma análise independente; o dashboard mostra a mais recente |
| Navegação | **Nova entrada no hub "Mais"** + substitui o stub morto no Perfil |
| Bedrock | **Converse API com JSON forçado por tool + Bedrock Guardrails** |
| Modelo | **`us.anthropic.claude-sonnet-4-6`** (ver §4 — a escolha é técnica, não só de custo) |

Alternativas consideradas e rejeitadas, com o motivo verificado:

| Alternativa | Por que não |
|---|---|
| Step Functions | Duas Lambdas com invocação assíncrona entregam o mesmo com muito menos CDK. |
| Trigger S3 (`defineStorage({ triggers })`) | Verificado em `@aws-amplify/backend-storage/lib/construct.js`: usa `S3EventSourceV2(bucket, { events })` **sem filtro de prefixo**. Dispararia em todo upload de `medical-documents/*` e `avatars/*`. Além disso dispara por objeto, e não saberia quando o lote terminou. |
| DynamoDB Streams no `HealthImport` | O `ITable` do `graphql-api-construct` não popula `tableStreamArn` de forma confiável na estratégia `AMPLIFY_TABLE`. Frágil demais. |
| Uma Lambda só, síncrona na mutation | Limite rígido de **30 s** do AppSync, independente do `timeoutSeconds`. |
| SQS entre A e B | O retry nativo do invoke assíncrono já cobre o caso. |

---

## 0. Fatos verificados

### 0.1 No repositório e na conta AWS

| Fato | Consequência |
|---|---|
| `a.mutation()` existe em `@aws-amplify/data-schema@1.25.5` | A primeira mutation do repo é viável |
| **Conflict resolution está DESLIGADO** (nenhum modelo tem `_version`/`_lastChangedAt`) | Escrita direta no DynamoDB é segura. **Se alguém ligar depois, quebra** — comentar no handler |
| **`a.enum()` não aceita `.required()`** | `status` é **sempre anulável**; o cliente trata `null` como `PENDING` |
| `bundleAwsSDK: true` é o default do `defineFunction` | `@aws-sdk/client-bedrock-runtime` como devDependency **é empacotado** pelo esbuild |
| Runtime default: **Node 22, ESM, minificado** | Nada de `require()` nos handlers |
| `us.anthropic.claude-sonnet-4-6`, `sonnet-5`, `opus-5`, `haiku-4-5` **disponíveis** em `us-east-1` | Sem bloqueio de acesso a modelo |
| `defineFunction` aceita `memoryMB`/`timeoutSeconds`; `aws-cdk-lib/aws-bedrock` exporta `CfnGuardrail` e `CfnGuardrailVersion` | Guardrail vira IaC |
| `expo-file-system` v19 expõe `new File(uri).bytes()` | Upload sem o round-trip base64 do `examService` |
| `@aws-sdk/client-s3` e `client-lambda` já existem transitivamente; `fflate` não | Cinco deps novas (§2.2) |

### 0.2 No export real do usuário (`samsungHealth.zip`, 74,3 MB, 2026-09-08)

Lido diretamente do ZIP, sem extrair. **Isto elimina o maior risco do projeto** — o catálogo de métricas passa a ser derivado de dado observado, não de suposição.

| Observação | Impacto |
|---|---|
| **50 119 entradas**: **56 CSVs na raiz (46,2 MB)** + **50 059 JSONs (368,4 MB inflados)** em `jsons/` e `files/` | O ZIP de 74 MB infla para **~415 MB (5,6×)**. O filtro do `fflate` é obrigatório, mas **não pode descartar `jsons/` em bloco** — uma das pastas vale ouro (linha abaixo) |
| **`jsons/com.samsung.health.hrv/` contém `[{"start_time":…,"end_time":…,"sdnn":45.09,"rmssd":43.90}]`** — 4 853 arquivos, 42 MB, timestamps em epoch ms, sem necessidade de join com o CSV | **HRV entra no Tier 1** (SDNN + RMSSD). É a métrica de recuperação mais rica do export e vem de graça |
| **`jsons/com.samsung.shealth.step_daily_trend/` são 41 MB de `[{},{},{},…]`** — 144 objetos vazios por arquivo, 4 683 arquivos | Prova de que o filtro tem de ser **allowlist, nunca denylist**: ler "tudo que sobrou" gastaria 41 MB para obter literalmente nada |
| As outras pastas de `jsons/` são redundantes com os CSVs ou sensor cru: `pedometer_day_summary` 126 MB (binning por minuto), `movement` 57 MB (`activity_level`), `tracker.heart_rate` 35 MB (o CSV já tem `heart_rate`/`min`/`max`), `exercise` 27 MB, `respiratory_rate` 19 MB (o CSV já tem `average`), `sleep_raw_data` (acelerômetro + intervalos R-R) | Descartadas: ~326 MB que não acrescentam nenhuma métrica |
| Dominam dois arquivos: `sleep_stage` (17,6 MB) e `tracker.heart_rate` (16,7 MB) | São exatamente os que **têm de ser lidos em stream** e dobrados por dia |
| Histórico de **2018-12-22 a 2026-09-08** (~7,7 anos), mas **a cobertura varia radicalmente por métrica**: passos 1 850 dias · FC 972 · sono 935 · HRV 561 · respiração 558 · vitalidade 552 · **SpO₂ só 13 dias (e parou em 2023-12)** · **peso só 2 dias** | **Nada de janela fixa de 365 dias** — jogaria fora 80% do histórico de passos. Resolução em camadas (§2.3). E "período analisado" **não é um valor único**: cada métrica precisa de `firstSeen`/`lastSeen`/`daysWithData` próprios |
| Peso (2 dias) e SpO₂ (13 dias, com um vão de 5 anos) não sustentam nenhuma conclusão | A regra "≥7 dias" já exclui o peso; SpO₂ passa por pouco mas é inútil. Ambos vão para "O que não conseguimos ler", em vez de virarem um gráfico vazio |
| FC e SpO₂ começam em 2018-12 e param; passos e sono retomam em 2023 | Houve **troca de aparelho**. Uma mudança de patamar numa métrica pode ser o relógio novo, não a pessoa — precisa virar aviso, não insight |
| **O nome do arquivo não identifica o tipo de forma confiável**: `com.samsung.shealth.stress*.csv` casa também com `stress.histogram`, e `exercise*.csv` casa com `exercise.periodization_training_schedule` | `fileSniffer` deve identificar o tipo pela **linha 1**, nunca pelo nome do arquivo. Descoberto na prática ao ler o ZIP |
| Linha 1 é `com.samsung.shealth.<tipo>,7006003,<n>` | Metadados confirmados; o cabeçalho é a linha 2 |
| Toda linha de dado termina com **vírgula sobrando** | `headers.length !== row.length` é o caso normal |
| Timestamps `2023-06-02 17:24:05.687` (local, sem TZ) + coluna irmã `time_offset` = `UTC-0300` / `UTC-0200` | O offset **varia de verdade** (horário de verão brasileiro até 2019) — ler por linha, nunca assumir |
| `vitality_score` mistura **epoch ms** (`main_sleep_wake_up_time=1734514140000`) com datetime local na mesma linha | Os dois formatos convivem **dentro do mesmo arquivo** |
| Duas linhas para `day_time=2023-06-02`, ambas `979` passos, `deviceuuid` diferente (`VfS0qUERdZ`, `tTkJs1VJhk`) | A dupla contagem por dispositivo é **literal**, não teórica. Somar dobraria os passos |
| **`com.samsung.health.hrv` não tem coluna de valor** — só `start_time`/`end_time`; os valores estão em 4 853 arquivos `binning_data.json` | **Correção: HRV sai do Tier 1 no Samsung.** Igual para o `binning` de passos, FC e estresse |
| Colunas ricas que eu não tinha previsto e que vêm de graça: `sleep_score`, `efficiency`, `physical_recovery`, `mental_recovery`, `sleep_cycle`, `respiratory_rate.average`, `skin_temperature`, `vitality_score.total_score` | Entram no Tier 1 — são ótimo material de insight |
| O nome da pasta raiz embute o **e-mail do usuário** | Ignorar nomes de pasta; jamais enviá-los ao modelo |

---

## 1. Arquitetura

```
App (Expo)
 │ 1. Tela de consentimento (LGPD) na primeira importação
 │ 2. DocumentPicker (multiple) → valida extensão + tamanho ANTES de subir
 │ 3. uploadData() por arquivo → s3://…/health-imports/{identityId}/{importId}/{arquivo}
 │ 4. client.models.HealthImport.create({ id: importId, status: 'PENDING', fileKeys })
 │ 5. client.mutations.startHealthAnalysis({ importId })
 ▼
AppSync (userPool)
 ▼
Lambda A  start-health-analysis            (resolver da mutation, ≤10s)
 │ • GetCommand com ConsistentRead: true  ← senão a leitura corre com o create
 │ • valida dono (owner === `${sub}::${username}`) e o formato das chaves S3
 │ • UpdateCommand status = PROCESSING, startedAt = agora
 │ • InvokeCommand(InvocationType: 'Event') → Lambda B      ← retorna em ~20ms
 ▼
Lambda B  analyze-health-import            (sem binding AppSync, 300s, 1536 MB)
 │ • unzip SELETIVO (fflate, allowlist): ~14 CSVs de raiz + jsons/…hrv/ ; descarta ~326 MB
 │ • lê cada CSV em STREAM (readline) e dobra direto em Map<dia, Map<métrica, acc>>
 │ • identifica o tipo pela linha 1; mapeia colunas por sufixo → métricas canônicas
 │ • normaliza unidades e timestamps (time_offset por linha) → dedupe por deviceuuid
 │ • faixas fisiológicas → estatísticas → correlações de Pearson com defasagem
 │ • prompt limitado em tokens (só números agregados, nunca linhas cruas)
 │ • Bedrock Converse + Guardrail + tool de saída JSON obrigatória
 │ • valida com zod → ApplyGuardrail no texto final
 │ • grava result.json no S3 e UpdateCommand → READY
 │ • NUNCA lança: todo o corpo em try/catch → FAILED + mensagem em pt-BR
 ▼
DynamoDB  HealthImport   ← o app faz polling com backoff enquanto PENDING/PROCESSING
```

**Por que polling e não subscription — resposta definitiva.** As subscriptions do Amplify são geradas como `onUpdateHealthImport @aws_subscribe(mutations: ["updateHealthImport"])`. O AppSync publica **dentro do próprio pipeline de requisição**, usando o payload de resposta da mutation; ele não observa a tabela nem lê DynamoDB Streams. Como a Lambda B escreve **direto no DynamoDB** (convenção do repo, [backend.ts:24-26](amplify/backend.ts#L24-L26)), `onUpdate().subscribe()` abriria um WebSocket que **nunca emitiria evento** — pareceria travamento, não erro. É o pior modo de falha possível numa banca.

**Por que duas Lambdas.** O resolver do AppSync é sempre síncrono e limitado a 30 s; a análise leva de 30 s a 2 min.

---

## 2. Backend

### 2.1 Arquivos novos

| Arquivo | Conteúdo | Puro? |
|---|---|---|
| `amplify/data/schemas/health-import.ts` | Modelo `HealthImport` + customType + mutation | — |
| `amplify/functions/start-health-analysis/{resource,handler}.ts` | Valida dono + chaves, marca PROCESSING, invoca a B | não |
| `amplify/functions/analyze-health-import/resource.ts` | `timeoutSeconds: 300`, `memoryMB: 1536`, `resourceGroupName: 'data'` | — |
| `…/handler.ts` | Orquestração e try/catch total. **Nunca lança.** | não |
| `…/s3Reader.ts` | `readObjectLines()` em stream, `writeJsonArtifact()` | não |
| `…/importRepository.ts` | `readImport` (ConsistentRead), `markResult`, `markFailed` — **só `UpdateCommand`** | não |
| `…/bedrockClient.ts` | Converse + Guardrail + retry de reparo | não |
| `…/archiveReader.ts` | Unzip seletivo com `fflate` (allowlist) + corte de zip bomb sobre o que passou pelo filtro | não |
| `…/fileSniffer.ts` | `detectSamsungType(line1)`, `detectFormat`, `isMetadataLine` | **sim** |
| `…/csvParser.ts` | `stripBom`, `detectDelimiter`, `splitCsvLine`, `parseCsvLine` | **sim** |
| `…/jsonWalker.ts` | `findRecordArrays`, `flattenRecord` | **sim** |
| `…/metricCatalog.ts` | **Catálogo declarativo** de métricas, aliases, unidades, faixas | **sim** |
| `…/columnMapper.ts` | `mapColumns`, `findTimestampColumn`, `findOffsetColumn` | **sim** |
| `…/valueNormalizer.ts` | `toNumber`, `convertToCanonicalUnit`, `parseTimestamp`, `toLocalDateKey` | **sim** |
| `…/dailyAggregator.ts` | `aggregateDaily`, `dedupeByDevice`, `sleepStagesFromSegments` | **sim** |
| `…/sanity.ts` | `applySanityRanges`, `checkCrossFieldConsistency` | **sim** |
| `…/statistics.ts` | média/mediana/desvio/percentil/média móvel/tendência/Pearson/cobertura | **sim** |
| `…/summaryBuilder.ts` | `buildAnalysisSummary`, `estimatePromptChars` | **sim** |
| `…/insightPrompt.ts` | `SYSTEM_PROMPT`, `ANALYSIS_TOOL_SPEC`, `buildUserText` | **sim** |
| `…/insightSchema.ts` | Schema zod da saída + `parseInsights` | **sim** |
| `…/__tests__/*.test.ts` | Um arquivo por módulo puro | — |

**Regra a cobrar em revisão:** só `handler.ts`, `s3Reader.ts`, `importRepository.ts`, `archiveReader.ts` e `bedrockClient.ts` podem importar `@aws-sdk/*`. Todo o resto é função pura — é isso que torna os testes triviais, como `uspstfFilter.ts` / `campaignAggregator.ts` / `distance.ts` já fazem.

### 2.2 Arquivos modificados

- **`amplify/data/resource.ts`** — importar `./schemas/health-import.js` e espalhar (sufixo `.js` obrigatório).
- **`amplify/storage/resource.ts`** — `'health-imports/{entity_id}/*': [allow.entity('identity').to(['read', 'write', 'delete'])]`.
- **`amplify/backend.ts`** — funções, grants, env vars, `configureAsyncInvoke`, o **primeiro `iam.PolicyStatement` do repo** e o Guardrail. Manter o padrão de comentário em português das linhas 24-50.
- **`package.json`** — deps novas (justificativa obrigatória pela regra 3 da constituição):

  | Pacote | Escopo | Por quê |
  |---|---|---|
  | `@aws-sdk/client-bedrock-runtime` | devDep | Única forma de chamar o Bedrock |
  | `@aws-sdk/client-s3` | devDep | Ler os arquivos em stream; já existe transitivamente |
  | `@aws-sdk/client-lambda` | devDep | Invocação assíncrona A→B; já existe transitivamente |
  | `fflate` | devDep | ~30 KB, zero deps, **filtro por entrada antes de descomprimir** — essencial com 50 mil entradas. O `zlib` do Node infla deflate bruto mas não lê o *central directory* do ZIP |
  | `aws-cdk-lib` | devDep | Já em `node_modules` (2.254.0) como transitiva; precisa virar explícita para `CfnGuardrail`/`PolicyStatement` |

### 2.3 Modelo de dados

```ts
HealthImport: a
  .model({
    status: a.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']),  // NUNCA .required() — a.enum não aceita
    sourceHint: a.enum(['SAMSUNG_HEALTH', 'APPLE_HEALTH', 'OUTRO', 'DESCONHECIDO']),
    fileKeys: a.string().required().array(),
    fileNames: a.string().required().array(),
    periodStart: a.date(),           // 'YYYY-MM-DD' exato, senão erro de serialização na LEITURA
    periodEnd: a.date(),
    dayCount: a.integer(),
    metricsJson: a.string(),         // JSON.stringify — ver nota
    insightsJson: a.string(),
    resultArtifactKey: a.string(),   // result.json completo no S3
    warnings: a.string().array(),
    errorMessage: a.string(),
    startedAt: a.string(),
    analyzedAt: a.datetime(),        // RFC 3339
    modelId: a.string(),
    inputTokens: a.integer(),
    outputTokens: a.integer(),
  })
  .authorization((allow) => [allow.owner()]),
```

**`a.string()` e não `a.json()` — deliberado.** `a.json()` vira `AWSJSON`, e o comportamento de leitura quando o valor foi escrito **direto como Map do DynamoDB** não tem precedente no repo (`VaccinationCampaignCache.payload` é `a.json()` mas o próprio comentário diz que *"nunca é consultado pelo client Amplify Data diretamente"*). `JSON.stringify`/`JSON.parse` elimina a ambiguidade.

**Escrita pela Lambda — `UpdateCommand` com `UpdateExpression`, nunca `PutCommand`.** Não tocar em:

| Atributo | Se apagar |
|---|---|
| `owner` | `allow.owner()` nega a leitura → `get()` devolve `{ data: null }` **em silêncio**. É a falha nº 1 |
| `id` | Chave de partição |
| `__typename` | Escrito pelo resolver de create; preservar é grátis |
| `createdAt` | `isReadOnly`, `AWSDateTime` |

Deve **setar** `updatedAt = new Date().toISOString()` (o `isReadOnly` só bloqueia o input GraphQL).

**Valores de enum têm de bater exatamente.** Escrever `"ready"` faz o AppSync falhar com `Can't serialize value (/getHealthImport/status)` e o campo volta nulo. Duplicar a lista num `const` do lado da Lambda **com um teste afirmando que as duas listas são iguais**.

**Limite de 400 KB por item → resolução em camadas, não janela fixa.** O histórico inteiro é processado; o que muda é a granularidade guardada na linha, sempre em formato **colunar** (`{"steps":{"d0":"2026-03-13","v":[8123,null,9012,…]}}`, `null` nas lacunas):

| Camada | Alcance | Para quê | Tamanho (22 métricas) |
|---|---|---|---|
| Diária | últimos **180 dias** | gráficos de detalhe | ~24 KB |
| Semanal | últimos **24 meses** | tendência de médio prazo | ~14 KB |
| Mensal | **histórico inteiro** (92 meses neste export) | deriva plurianual, sazonalidade, ano a ano | ~12 KB |
| Cobertura por métrica | `firstSeen`, `lastSeen`, `daysWithData`, vãos | honestidade na UI | ~2 KB |

Total ≈ **56 KB**, com folga larga sobre os 400 KB. A série diária **completa de todo o histórico** vai para `health-imports/{identityId}/{importId}/result.json` no S3, sem limite de tamanho — artefato de depuração, base para reanálise e para exportação LGPD.

Custo de processar 7,7 anos em vez de 1: **nenhum no Lambda** (o CSV é lido inteiro de qualquer jeito, e o acumulador é O(dias × métricas) ≈ 62 mil entradas) e **+US$ 0,008 no Bedrock** (§12). A janela de 365 dias não economizava quase nada e custava 80% do histórico.

### 2.4 Mutation

```ts
startHealthAnalysis: a
  .mutation()
  .arguments({ importId: a.string().required() })
  .returns(a.customType({ importId: a.string().required(), status: a.string().required() }))
  .authorization((allow) => [allow.authenticated()])
  .handler(a.handler.function(startHealthAnalysis)),
```

Primeira `a.mutation()` do repo. Faz `amplify_outputs.json` ganhar uma chave `mutations` que hoje não existe: **conferir `__tests__/amplify-config.test.ts` antes de regenerar**. E `client.mutations.startHealthAnalysis` só existe em runtime **depois** do `ampx sandbox`.

### 2.5 Permissões em `amplify/backend.ts`

**As duas funções precisam de `resourceGroupName: 'data'`.** Se a B ficar no grupo default, o synth falha com dependência cíclica: `grantReadWriteData` põe policy na role da B (stack `function`) apontando para a stack `data`; `grantInvoke` e o `addEnvironment` do nome da B põem policy na role da A (stack `data`) apontando para a `function`. Mesma stack → nenhuma referência cruzada.

```ts
const healthImportTable = backend.data.resources.tables['HealthImport'];
const startLambda = backend.startHealthAnalysis.resources.lambda;
const analyzeLambda = backend.analyzeHealthImport.resources.lambda;

healthImportTable.grantReadWriteData(startLambda);
healthImportTable.grantReadWriteData(analyzeLambda);
backend.startHealthAnalysis.addEnvironment('HEALTH_IMPORT_TABLE_NAME', healthImportTable.tableName);
backend.analyzeHealthImport.addEnvironment('HEALTH_IMPORT_TABLE_NAME', healthImportTable.tableName);

analyzeLambda.grantInvoke(startLambda);
backend.startHealthAnalysis.addEnvironment('ANALYZE_FUNCTION_NAME', analyzeLambda.functionName);

// Retry do invoke assincrono dispararia a analise ate 3x e pagaria o Bedrock 3x.
analyzeLambda.configureAsyncInvoke({ retryAttempts: 0 });

backend.storage.resources.bucket.grantReadWrite(analyzeLambda, 'health-imports/*');
backend.analyzeHealthImport.addEnvironment('HEALTH_BUCKET_NAME', backend.storage.resources.bucket.bucketName);
```

**IAM do Bedrock — as duas ARNs são obrigatórias.** Com perfil de inferência `us.`, a chamada pode ser roteada para qualquer região do perfil; só a ARN do perfil produz `AccessDeniedException` intermitente:

```ts
analyzeLambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel', 'bedrock:ApplyGuardrail'],
  resources: [
    `arn:aws:bedrock:${region}:${account}:inference-profile/us.anthropic.claude-sonnet-4-6`,
    `arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6`,
    guardrailArn,
  ],
}));
```

### 2.6 Guardrail (IaC)

`backend.createStack('health-insights-guardrail')` + `CfnGuardrail`/`CfnGuardrailVersion` de `aws-cdk-lib/aws-bedrock`. Sem em dashes nos nomes de recurso.

| Política | Configuração |
|---|---|
| Tópicos negados | `diagnostico-medico-definitivo`, `prescricao-de-medicamento` (definição + exemplos em pt-BR) |
| Filtros de conteúdo | Padrão + **`PROMPT_ATTACK` no INPUT** |
| PII | `ANONYMIZE` para NAME/EMAIL/PHONE + regex para CPF |
| Versão | Numerada e fixada por env var — nunca `DRAFT` |

`guardrailConfig` com **`trace: 'disabled'`** e o **bloco de dados** (não o system prompt) dentro de `guardContent`.

**Limitação a mitigar por desenho:** com saída forçada por *tool use*, a resposta vem como bloco `toolUse` (JSON), e o Guardrail avalia blocos de texto. Depois de validar com zod, rodar **`ApplyGuardrail` com `source: 'OUTPUT'`** sobre a concatenação dos campos em prosa antes de gravar. Fecha o furo e é um argumento forte para o artigo.

---

## 3. O núcleo: extração e consolidação defensiva

### 3.1 Princípio: o catálogo é dado, não código

`metricCatalog.ts` é um array declarativo. Formato mudou? Adiciona-se um alias — nenhum outro arquivo muda, e o teste cobre a linha nova.

```ts
export type CanonicalMetric = {
  id: MetricId;
  label: string;                 // pt-BR
  unit: string;
  op: 'sum' | 'mean' | 'median' | 'min' | 'max' | 'last' | 'count';
  sane: [number, number];
  aliases: string[];             // casados por SUFIXO, após remover o prefixo com.samsung.*.
  unitFactor?: number;           // ex.: metros → km = 0.001
};
export function findMetricByAlias(rawName: string): CanonicalMetric | null;
```

### 3.2 Métricas — derivadas do export real

Colunas e unidades **observadas**, não supostas. Arquivo Samsung → coluna → unidade real:

| Canônica | Op diária | Faixa sã | Fonte observada (Samsung) |
|---|---|---|---|
| `steps` | `sum` + **dedupe por `deviceuuid`** | 0–100 000 | `pedometer_day_summary.step_count` · `step_daily_trend.count` · `activity.day_summary.step_count` |
| `distanceKm` | `sum` | 0–100 | `.distance` — **metros** (979 passos ↔ 722,32) |
| `activeEnergyKcal` | `sum` | 0–10 000 | `.calorie` — kcal |
| `activeMinutes` | `sum` | 0–1440 | `.active_time` — **milissegundos** |
| `heartRateAvg/Min/MaxBpm` | `mean`/`min`/`max` | 25–230 | `com.samsung.health.heart_rate.{heart_rate,min,max}` (por amostra, 16,7 MB) |
| `hrvSdnnMs` / `hrvRmssdMs` | `median` (e `median` só das janelas noturnas) | 1–300 | **`jsons/com.samsung.health.hrv/*.binning_data.json`** — `sdnn`/`rmssd`, `start_time` em epoch ms |
| `restingHeartRateBpm` | `median` do mínimo diário | 25–120 | **derivada** — Samsung não exporta RHR |
| `sleepMinutes` | `sum`, dia do **despertar** | 60–960 | `sleep.sleep_duration` — **minutos** (05:15→11:13 = 358 ✓) |
| `sleepScore` | `last` | 0–100 | `sleep.sleep_score` |
| `sleepEfficiency` | `last` | 0–100 | `sleep.efficiency` |
| `physicalRecovery` / `mentalRecovery` | `last` | 0–100 | `sleep.physical_recovery` / `.mental_recovery` |
| `sleepDeep/Rem/LightMinutes` | `sum` | 0–600 | `sleep_stage.stage` (**códigos 40001-40004**) + `start_time`/`end_time`, ligados por `sleep_id` |
| `spo2Pct` | `median` (+ guardar `min`) | 70–100 | `…oxygen_saturation.spo2` — **percentual** (96.0), não fração |
| `respiratoryRateBrpm` | `median` | 4–40 | `respiratory_rate.average` |
| `skinTemperatureC` | `mean` | 25–42 | `skin_temperature.temperature` — °C |
| `weightKg` / `bodyFatPct` | `last` | 25–300 / 3–70 | `weight.weight` (kg) · `weight.body_fat` (%) · também `height`, `basal_metabolic_rate`, `skeletal_muscle` |
| `workoutMinutes` | `sum` | 0–600 | `…exercise.duration` — **milissegundos** (1 509 060 ↔ 25 min ✓) |
| `workoutDistanceKm` | `sum` | 0–200 | `…exercise.distance` — **metros** |
| `floorsClimbed` | `sum` | 0–500 | `floors_climbed.floor` |
| `stressScore` | `mean` | 0–100 | `stress.score` — presente mas quase vazio neste export; faixa larga e não depender |
| `vitalityScore` | `last` | 0–100 | `vitality_score.total_score` |

**HRV é a única métrica que não vem de CSV.** O `com.samsung.health.hrv.csv` só tem `start_time`/`end_time`; os valores (`sdnn`, `rmssd`) estão nos 4 853 JSONs de `jsons/com.samsung.health.hrv/`, com timestamp próprio em epoch ms — **não precisa de join** com o CSV. Vale a exceção no filtro: HRV noturno correlacionado com sono e carga de atividade é exatamente o tipo de padrão que a feature promete. Para Apple/Health Auto Export o HRV vem direto (`HeartRateVariabilitySDNN`, em **segundos** → ×1000).

Isso dá ao `jsonWalker.ts` um trabalho concreto desde o v1 (achar o array de objetos e ler `sdnn`/`rmssd`), em vez de ser um módulo especulativo.

**Apple / Health Auto Export** entra como um segundo bloco de aliases no mesmo catálogo (`step_count`, `resting_heart_rate`, `sleep_analysis`, `active_energy`, `walking_running_distance`, `blood_oxygen_saturation`, `weight_body_mass`…). Diferença crítica já conhecida: Apple exporta SpO₂ e gordura corporal como **fração 0–1**, Samsung como **percentual**. Esse bloco continua não verificado contra um export real — mas agora é o único que não é, e colunas não reconhecidas viram aviso visível, não falha.

**Conversões**: m→km · ms→min · kJ→kcal · lb→kg · mi→km · fração 0–1 → % (só Apple) · s→ms (HRV Apple) · h→min (sono HAE).

### 3.3 Quirks de parsing — todos confirmados no export real

1. **A linha 1 é metadado**, não cabeçalho: `com.samsung.shealth.tracker.pedometer_day_summary,7006003,7`. O cabeçalho é a linha 2.
2. **O tipo vem da linha 1, não do nome do arquivo.** `com.samsung.shealth.stress*.csv` também casa com `stress.histogram`; `exercise*.csv` casa com `exercise.periodization_training_schedule`. Errei exatamente assim ao ler o ZIP — o parser não pode errar igual.
3. **Nomes longos e curtos misturados no mesmo arquivo**: `com.samsung.health.heart_rate.heart_rate` ao lado de `source`, `tag_id`; `sleep_duration` ao lado de `com.samsung.health.sleep.start_time`. Casar por **sufixo** após remover o prefixo.
4. **Vírgula sobrando no fim de toda linha** → um campo vazio extra. Nunca assumir `headers.length === row.length`.
5. **Timestamp local + `time_offset` por linha** (`UTC-0300`, `UTC-0200`). O offset varia de verdade (horário de verão até 2019).
6. **Epoch ms e datetime local convivem no mesmo arquivo** (`vitality_score`).
7. **Duas linhas para o mesmo dia com `deviceuuid` diferente e o mesmo valor** → `dedupeByDevice` escolhe **um** dispositivo por dia (o de mais amostras). **Nunca somar.**
8. **Sono cruza a meia-noite** (05:15→11:13) → atribuir ao dia do despertar e dizer isso na UI.
9. Colunas `binning_data` / `histogram` / `extra_data` são **ponteiros para JSON externo**, não valores. Ignorar.
10. BOM UTF-8 · delimitador `,`/`;`/tab · aspas contendo delimitador ou quebra de linha (RFC 4180) · vírgula decimal.

### 3.4 Regras de robustez

| Situação | Comportamento |
|---|---|
| Coluna desconhecida | **Ignorada e contabilizada** → `warnings: "12 colunas não reconhecidas foram ignoradas"`. Transforma lacuna de alias em sinal visível |
| Arquivo ilegível | `warnings.push('Não foi possível ler <nome>.')` e segue |
| Valor fora da faixa fisiológica | Descartado e contabilizado |
| Linha duplicada | Deduplicada |
| Sistólica ≤ diastólica, sono > 24 h | Aviso e descarte |
| ZIP só com `export.xml` da Apple | Falha **explicativa** (§3.6) |
| Nenhuma métrica com ≥7 dias | `FAILED` dizendo o que faltou |

Sucesso = **pelo menos uma métrica com 7 dias ou mais**. Tudo descartado aparece na UI em "O que não conseguimos ler" — regra 2 da constituição.

### 3.5 Estatísticas — de onde vêm os "padrões ocultos"

Calculadas **antes** de qualquer chamada de IA:

- por métrica: `firstSeen`/`lastSeen`/`daysWithData`/cobertura %, média, mediana, desvio-padrão, mín/máx, p25/p75, média móvel de 7 dias, tendência linear (`slopePerDay`, `r²`), primeira vs. segunda metade;
- dia útil vs. fim de semana; regularidade de sono (desvio-padrão do horário de dormir);
- **ano a ano e deriva plurianual** — só agora possíveis, e só para métricas com ≥60 dias no ano comparado;
- **sazonalidade** (verão vs. inverno) — 7 anos de passos dão amostra suficiente; 1 ano não daria;
- **correlações de Pearson com defasagem**, só em pares plausíveis e só com **n ≥ 14** dias pareados: sono(d)→FC repouso(d+1), passos(d)→sono(d), sono(d)→`physicalRecovery`(d), `sleepScore`(d)→FC repouso(d+1), HRV noturno(d)→`mentalRecovery`(d), passos(d)→FC repouso(d). Reportadas só quando `|r| ≥ 0,3`, **sempre com `r` e `n` visíveis**.

**Correlações rodam só sobre os últimos 12 meses**, mesmo com o histórico inteiro disponível. Misturar um Gear de 2018 com um Watch de 2026 confunde mudança de precisão do sensor com mudança fisiológica. Tendências de longo prazo usam a camada mensal; correlações, a janela recente.

**Detecção de troca de aparelho.** O conjunto de `deviceuuid` por período é comparado; quando muda, um degrau na métrica vira **aviso** ("a média de FC muda a partir de 2023-06, quando aparece um novo aparelho — pode ser diferença de sensor, não de saúde") e essa nota vai **para o prompt**, para o modelo não narrar um artefato como evolução de saúde. É exatamente o caso deste export.

A IA **narra** essas correlações; não as descobre. É isso que mantém o insight verdadeiro e auditável, e é o argumento metodológico mais forte para a banca.

### 3.6 Tamanho, ZIP e o problema do Apple

Limites, validados no cliente **antes de qualquer upload** e revalidados na Lambda A: **20 arquivos**, **25 MB por arquivo avulso**, **1 ZIP de até 100 MB** (o export real tem 74 MB). A UI recomenda Wi-Fi para o ZIP.

`fflate.unzip(bytes, { filter }, cb)` — o `filter` recebe `{ name, originalSize }` **antes** de descomprimir. É **allowlist, nunca denylist** (os 41 MB de `[{},{},…]` do `step_daily_trend` provam o porquê):

- **aceita** os ~14 CSVs de raiz do catálogo (~39 MB inflados, dos quais 34 MB são `sleep_stage` + `tracker.heart_rate`);
- **aceita** `jsons/com.samsung.health.hrv/*.json` (4 853 entradas, 42 MB) — a única exceção, pelo HRV;
- **rejeita todo o resto**: as demais pastas de `jsons/`, `files/`, `__MACOSX/`, `.DS_Store` e diretórios → ~326 MB nunca são descomprimidos;
- pula entrada individual acima de 25 MB inflada.

**Corte de zip bomb: 120 MB, contando só o que passou pelo filtro.** Contar o total do arquivo abortaria um export legítimo — este ZIP infla para ~415 MB (5,6×) sem nada de malicioso. Com o filtro, o total real fica em ~81 MB.

Memória de pico ≈ ZIP (74 MB) + maior entrada inflada (18 MB) ≈ 92 MB, com os JSONs de HRV lidos e dobrados um a um. Daí `memoryMB: 1536`.

**Apple Health nativo exporta XML, não CSV/JSON** (`export.xml`, rotineiramente >100 MB). **Fora de escopo**, e a UI diz isso na cara, por plataforma:

> *iPhone*: "O app Saúde da Apple exporta um arquivo XML muito grande, que ainda não conseguimos processar. Use um app exportador (ex.: Health Auto Export) para gerar CSV ou JSON e selecione esses arquivos aqui."

> *Samsung Health*: "Abra Samsung Health → ⋮ → Configurações → Baixar dados pessoais. Envie aqui o `.zip` inteiro — nós selecionamos os arquivos necessários."

Registrar em `plan.md` como decisão consciente (regra 8), com o caminho de streaming SAX na seção de trabalhos futuros do TCC.

**Como a Lambda B fica dentro de memória/tempo:**
1. **Nunca** `Body.transformToString()` — `readObjectLines` com `node:readline` sobre o `Readable`.
2. **Nunca** guardar amostras cruas: dobrar em `Map<dateKey, Map<MetricId, Accumulator>>`. Memória O(dias × métricas) ≈ 400 KB para 2 anos, em vez de O(registros) — decisivo para os 16,7 MB de `tracker.heart_rate`.
3. Sem filtro de data na ingestão — o acumulador de 7,7 anos × 22 métricas ≈ 62 mil entradas ≈ poucos MB. A redução para as camadas diária/semanal/mensal acontece **depois**, na hora de montar a linha do DynamoDB.
4. Arquivos **sequencialmente**, nunca `Promise.all`.

---

## 4. A chamada ao Bedrock

**Modelo: `us.anthropic.claude-sonnet-4-6`.** A escolha é técnica: `toolChoice` forçado é **incompatível com extended thinking** nos modelos Anthropic (retorna 400), e no Opus 5 o thinking vem ligado por padrão. A tarefa é sumarizar estatísticas já pré-computadas — não é raciocínio difícil — e sai bem mais barata. Registrar em `plan.md`. Se migrar para Opus 5, trocar para `toolChoice: { auto: {} }` + instrução explícita + validação zod.

- `inferenceConfig.maxTokens` **sempre explícito** (~3000). Em branco reserva a cota máxima do modelo — causa nº 1 de `ThrottlingException`.
- Cliente com `maxAttempts: 5`, `retryMode: 'adaptive'`.
- `toolConfig` com a tool `registrar_analise`, cujo `inputSchema.json` deriva do mesmo schema zod da validação — uma fonte de verdade só.
- Validação com zod; se falhar, **uma** tentativa de reparo; se falhar de novo, `FAILED` com mensagem honesta. **Nunca um insight inventado.**

```ts
{
  resumo: string,                      // 2 a 3 frases
  destaques:        [{ metrica, valor, comparacao, tom: 'positivo'|'neutro'|'atencao' }],  // ≤4
  pontosDeAtencao:  [{ titulo, descricao, severidade: 'informativo'|'atencao', metricas: string[] }], // ≤4
  padroes:          [{ titulo, descricao, evidencia, confianca: 'baixa'|'media'|'alta' }], // ≤3
  sugestoes:        [{ titulo, acao, porque, esforco: 'baixo'|'medio'|'alto' }],           // ≤4
  perguntasParaOMedico: string[],                                                          // ≤3
  limitacoes: string
}
```

`severidade` **não** oferece nível clínico ("grave"/"alta"): o próprio `toolSpec` não dá vocabulário de diagnóstico, o que torna a regra 4 da constituição **estrutural** em vez de só uma instrução no prompt. `perguntasParaOMedico` é o outro lado — canaliza o impulso diagnóstico do modelo para algo seguro e útil.

System prompt: pt-BR; usar **apenas** os números fornecidos; citar valor e período em cada afirmação; nunca nomear doença, medicamento ou dose; dizer explicitamente quando a cobertura for baixa demais para concluir.

---

## 5. Frontend

### 5.1 Arquivos novos

| Arquivo | Papel |
|---|---|
| `src/app/(app)/health-data.tsx` | Rota fina do dashboard |
| `src/app/import-health-data.tsx` | Rota full-screen (fora de `(app)`, sem tab bar) |
| `src/screens/HealthDashboardScreen.tsx` | Dashboard apresentacional |
| `src/screens/HealthImportScreen.tsx` | Consentimento + seleção + upload + progresso |
| `src/hooks/useHealthImportStatus.ts` | **Polling com backoff** (§5.3) |
| `src/hooks/useHealthDashboardData.ts` | Última importação READY |
| `src/hooks/healthImportCache.ts` | Barramento de invalidação, igual a `vaccinationCache.ts` |
| `src/services/healthImportService.ts` | Validação, upload, create, mutation, listagem, exclusão |
| `src/services/upload.ts` | **`uploadFileToS3` extraído** do `examService.ts` — importado pelos dois, não copiado |
| `src/components/AiDisclaimerBanner.tsx` | Banner extraído de [ChatBotScreen.tsx:123-132](src/screens/ChatBotScreen.tsx#L123-L132) |
| `src/components/charts/chartScale.ts` | **Módulo puro, testável, sem React**: domínio Y, path, ticks |
| `src/components/charts/LineChart.tsx` | Séries + faixa mín–máx + linhas de referência |
| `src/components/charts/BarChart.tsx` | Barras por dia, empilháveis (estágios de sono), linha de meta |
| `src/components/charts/Sparkline.tsx` | Um `<Path>`, sem eixos — entra no `MetricCard` |
| `src/components/charts/CorrelationRow.tsx` | Barra divergente em `View`/`Text` mostrando `r` **e `n`** |
| `src/components/InsightCard.tsx` | Card de ponto de atenção / padrão / sugestão |

Sem biblioteca de gráficos: `victory-native` puxa `@shopify/react-native-skia` e `react-native-gifted-charts` puxa `react-native-linear-gradient`, que conflita com o `expo-linear-gradient` já em uso. `react-native-svg@15.12.1` já está instalado e `HachuraPlaceholder.tsx` é o precedente.

**Honestidade nos gráficos:** dia sem dado vira **quebra no path**, nunca interpolação — interpolar é inventar dado (regra 2). Todo gráfico precisa de `emptyMessage` em pt-BR e `accessibilityLabel` resumindo a série em texto.

### 5.2 Arquivos modificados

- **`src/constants/navigation.ts`** — item em `MORE_MENU_ITEMS` (`id: 'health-data'`, ícone `watch`, "Dados do smartwatch") e `'/health-data'` + `'/import-health-data'` em `MORE_ROUTE_PREFIXES`.
- **`src/screens/ProfileScreen.tsx`** — trocar o `Alert.alert` "Em breve" ([92-104](src/screens/ProfileScreen.tsx#L92-L104)) por `router.push('/import-health-data')`, encerrando a pendência #26 do `GAP_ANALYSIS.md`.
- **`src/services/health/healthAppConnectService.ts`** — remover o stub `'unavailable'`.
- **`src/services/examService.ts`** — importar `uploadFileToS3` de `src/services/upload.ts`.
- **`src/screens/ChatBotScreen.tsx`** — usar o `AiDisclaimerBanner` extraído.
- **`src/components/MetricCard.tsx`** — órfão com cores fixas (`#5B3B8F`, `#fff`) e sem dark mode: portar para os tokens e adicionar a prop `sparkline`.
- **`src/types/models.ts`** — `AnalysisMetric`/`AIAnalysisSnapshot` (99-124) foram escritos para exatamente isto e nunca usados: alinhar ou remover.

### 5.3 Polling

`setTimeout` recursivo, **não** `setInterval`:

- atrasos `2s, 2s, 3s, 3s, 5s, 5s, 8s, 8s, 10s…` com teto de 10 s;
- **parada rígida em 6 min** → *"A análise demorou mais que o esperado. Tente novamente com menos arquivos."*;
- pausar em `AppState` `background`/`inactive`, retomar em `active` com poll imediato (o RN descarta timers de forma imprevisível em segundo plano);
- `useRef` de cancelamento + cleanup no efeito;
- **botão "Atualizar" manual** como válvula de escape.

**Não construir sobre `useAsyncResource`**: ele re-executa sempre que a identidade de `loadResource` muda e não tem noção de polling. Se `useHealthDashboardData` passar uma closure sobre `importId` para ele, memorizar com `useCallback` — senão é loop infinito de fetch (é por isso que `usePreventionData` funciona: passa função de módulo).

### 5.4 UI

| Estado | Tela |
|---|---|
| Nunca importou | `EmptyState` com as instruções por plataforma da §3.6, CTA "Importar dados" |
| Antes do 1º upload | **Consentimento LGPD**: onde o dado é processado (Amazon Bedrock, us-east-1, dentro da conta do projeto) e que a Bedrock não retém nem treina com o input |
| `PENDING` / `PROCESSING` | `ScreenSkeleton` + etapa ("Lendo seus arquivos…" → "Analisando padrões…") |
| Travado (>6 min por `startedAt`) | `EmptyState tone="error"` + "Tentar novamente" |
| `FAILED` | `EmptyState tone="error"` com o `errorMessage` |
| `READY` | Dashboard completo |
| Erro de upload | `InlineError` junto ao controle — nunca `Alert.alert` |
| Concluído | `SuccessSnackbar` |

Dashboard (`READY`): 1) `AiDisclaimerBanner` em **todos** os estados · 2) período + `Badge` de cobertura · 3) grade de `MetricCard` com `Sparkline` · 4) Resumo · 5) Pontos de atenção · 6) Padrões, com a **evidência numérica (`r`, `n`)** via `CorrelationRow` · 7) Sugestões · 8) Perguntas para o médico · 9) seção recolhível "O que não conseguimos ler" · 10) rodapé com modelo e data.

Toda classe precisa do par `dark:`; cores só via `useThemeColors()` (regra 7).

---

## 6. Segurança e LGPD

| Risco | Mitigação |
|---|---|
| Ler arquivo de outro usuário (IDOR) | A Lambda exige que toda chave case com `^health-imports/[^/]+/<id-da-própria-linha>/[^/]+$`. Como o S3 só deixa cada um escrever sob o próprio `{entity_id}` e o `importId` nasce na criação da linha (owner-scoped), é inatingível por outro usuário |
| Prompt injection vinda do arquivo | Só **números agregados** vão ao modelo; nenhuma string do arquivo é repassada, exceto um rótulo de fonte higienizado por `[A-Za-z0-9 _-]`. Mais `PROMPT_ATTACK` e `guardContent` |
| **Nome da pasta do export contém o e-mail do usuário** | Ignorar nomes de pasta por completo; nunca enviá-los ao modelo nem gravá-los em `fileNames` sem sanitizar |
| PII em texto claro no CloudWatch | **Nunca** logar prompt nem resposta; `trace: 'disabled'`; definir retenção do log group |
| Retenção de dado cru | Ciclo de vida no S3 expirando `health-imports/` em 30 dias + botão de excluir importação |
| Consentimento | Tela dedicada antes do primeiro upload |
| Custo | `maxTokens` explícito, janela de 365 dias, `retryAttempts: 0`, uma análise por importação |

---

## 7. Specs (SDD) e documentação

Regra 6 da constituição exige a tripla por tela:

```
specs/05-dados-wearables/importar-dados/{spec.md,plan.md,tasks.md}
specs/05-dados-wearables/insights-saude/{spec.md,plan.md,tasks.md}
```

Template exato de `docs/prompts/prompt-novo.md` §3.1. O `plan.md` de `importar-dados` registra: as 5 dependências novas (regra 3), a primeira `a.mutation()`, o primeiro `PolicyStatement`, `a.string()` em vez de `a.json()`, a escolha do Sonnet 4.6, o Apple XML fora de escopo e o HRV indisponível no Samsung (regra 8).

Atualizar: `docs/CONEXOES.md`, `docs/DADOS_MOCKADOS.md`, `specs/design/GAP_ANALYSIS.md` #26, arquitetura do `README.md`.

**Follow-up separado (não neste PR):** com `bedrockClient.ts` pronto, trocar o mock de `aiAssistantService.ts` pelo mesmo caminho.

---

## 8. Testes

Backend, só módulos puros, sem mock de AWS — igual a `uspstfFilter.test.ts`:

| Arquivo | Cobre |
|---|---|
| `csvParser.test.ts` | BOM, `;`/`,`/tab, aspas com delimitador, `\r\n`, **vírgula sobrando**, arquivo vazio |
| `fileSniffer.test.ts` | **Tipo pela linha 1**, incluindo os pares ambíguos `stress` vs `stress.histogram` e `exercise` vs `exercise.periodization_training_schedule` |
| `jsonWalker.test.ts` | Array na raiz, aninhado, só objeto, `null` no meio, profundidade excessiva |
| `metricCatalog.test.ts` | Casamento por sufixo, prefixo `com.samsung.*`, alias inexistente, **enum de status igual ao do schema** |
| `valueNormalizer.test.ts` | Datetime local + `time_offset`, epoch ms, cada conversão de unidade, vírgula decimal |
| `dailyAggregator.test.ts` | `sum`/`mean`/`last`, **dedupe por `deviceuuid` com o mesmo valor**, estágios de sono por código, sono cruzando meia-noite |
| `sanity.test.ts` | Fora de faixa, sistólica ≤ diastólica, sono > 24 h |
| `statistics.test.ts` | Média/mediana/desvio conhecidos, Pearson contra valor calculado à mão, recusa com `n < 14` |
| `summaryBuilder.test.ts` | Teto de tokens; **nenhuma string crua do arquivo no prompt** |
| `insightSchema.test.ts` | JSON válido passa; campo faltando, array grande demais, enum inválido falham |
| `archiveReader.test.ts` | Allowlist aceita os CSVs de raiz **e `jsons/com.samsung.health.hrv/`**, rejeita as demais pastas de `jsons/`, entrada grande pulada, corte de zip bomb **contando só o filtrado** |
| `hrvExtractor.test.ts` | `sdnn`/`rmssd` por epoch ms, array de objetos vazios (`[{},{}]`) não gera métrica, janela noturna vs. diurna |
| `chartScale.test.ts` | Domínio Y, quebra do path em `null`, ticks |

Fixtures em `__tests__/fixtures/`: recortes **anonimizados e reduzidos** do export real (poucas linhas por tipo, `deviceuuid`/`datauuid` substituídos, sem o nome da pasta), mais versões deliberadamente quebradas.

Frontend (`__tests__/`, Screen com props explícitas, nunca a rota): `health-dashboard-screen.test.tsx` (os 7 estados, texto do disclaimer, `warnings`) e `health-import-service.test.ts` (validação de extensão/tamanho/quantidade, com `jest.mock('aws-amplify/data')` no topo como em `medicine-service.test.ts`).

---

## 9. Ordem de execução

**Backend**
1. Deps no `package.json` + `npm install`.
2. Schema `health-import.ts` + prefixo no `storage/resource.ts`.
3. `npx ampx sandbox` → confirmar `HealthImport` em `model_introspection.models` **sem** `_version`/`_lastChangedAt`. **Rodar `__tests__/amplify-config.test.ts` agora.**
4. **Prova de vida ponta a ponta com stub** — `startHealthAnalysis` + Lambda A que só valida o dono e grava `status=READY` com `insightsJson` fixo, chamada pelo cliente. Valida de uma vez: `a.mutation()` funciona, `client.mutations.X` existe, o `owner` sobrevive ao `UpdateCommand`, o `get()` devolve o que a Lambda escreveu, e o enum serializa. **Não pular.**
5. `backend.ts` — grants, env vars, `configureAsyncInvoke({ retryAttempts: 0 })`, `PolicyStatement` do Bedrock, Guardrail. **Ambas com `resourceGroupName: 'data'`.**
6. Esqueleto da Lambda B (`handler` + `importRepository` + `s3Reader`, sem parser): lê, conta bytes, grava READY.
7. Módulos puros **com os testes junto**, usando as fixtures do export real: `csvParser` → `fileSniffer` → `valueNormalizer` → `metricCatalog` + `columnMapper` → `jsonWalker`.
8. `dailyAggregator` + `sanity` + `statistics` + `summaryBuilder`, com testes.
9. `archiveReader` (ZIP) — depois que CSV avulso já funciona ponta a ponta; é só um decodificador na frente do mesmo pipeline. Testar contra o `samsungHealth.zip` real.
10. `insightPrompt` + `insightSchema` + `bedrockClient`. **Testar o Converse pelo CLI antes de escrever o Lambda.**
11. Ligar tudo no `handler.ts` + gravar `result.json` no S3.

**Frontend**
12. `src/services/upload.ts` (extração) + `healthImportService.ts` + `healthImportCache.ts`.
13. `useHealthImportStatus.ts` (backoff, `AppState`, timeout de 6 min).
14. `chartScale.ts` + testes, depois os 4 componentes de gráfico.
15. `AiDisclaimerBanner` extraído + `MetricCard` portado + `InsightCard`.
16. `HealthImportScreen` (com consentimento) + rota.
17. `HealthDashboardScreen` + rota + menu "Mais" + religar o Perfil.
18. Testes de tela.

**Fechamento**
19. Specs, docs, `npm run validate`.

---

## 10. Verificação

```bash
npm run validate                    # typecheck app + backend + lint + testes
npx ampx sandbox                    # deploy e regeneração dos outputs (nunca editar à mão)

# Converse + tool forçado, antes de escrever o bedrockClient
aws bedrock-runtime converse --region us-east-1 \
  --model-id us.anthropic.claude-sonnet-4-6 \
  --messages '[{"role":"user","content":[{"text":"..."}]}]' \
  --inference-config '{"maxTokens":3000}' --tool-config file://toolconfig.json

# Percurso na AWS durante um teste real
aws logs tail /aws/lambda/<analyze-health-import> --follow
aws dynamodb get-item --table-name <HealthImport-...> --key '{"id":{"S":"<importId>"}}'

# Prova visual sem emulador (skill run-web-preview)
npm run web -- --port 8098
npm run preview:screenshot -- "http://localhost:8098/dev-preview?screen=health-data" "<scratchpad>/health-data.png"
```

Depois **ler o PNG com a ferramenta Read** — screenshot que ninguém olhou não prova nada.

Casos manuais obrigatórios: o `samsungHealth.zip` real (74 MB, 50 119 entradas) ponta a ponta; um CSV avulso; ZIP só com `export.xml` (falha explicativa); CSV com uma coluna renomeada (importa e avisa); arquivo de 30 MB (recusado no cliente); dois dispositivos no mesmo dia (não pode dobrar os passos); app em segundo plano durante a análise (o polling retoma).

---

## 11. Riscos, do mais alto ao mais baixo

| # | Risco | Encaminhamento |
|---|---|---|
| 1 | **Dependência circular entre stacks** A↔B | `resourceGroupName: 'data'` nas duas; detectado já no passo 3 |
| 2 | **`toolChoice` forçado × extended thinking** (400) | Sonnet 4.6, que não liga thinking por padrão |
| 3 | **IAM do Bedrock incompleto** → `AccessDeniedException` intermitente | As duas ARNs (perfil de inferência + foundation-model com região curinga) |
| 4 | **`owner` apagado pelo `UpdateCommand`** → `get()` devolve null em silêncio | `UpdateExpression` restrito; validado no passo 4 |
| 5 | 50 119 entradas / 415 MB inflados travarem o Lambda | Allowlist filtra **antes** de inflar: ~4 900 entradas e ~81 MB sobram. Corte de zip bomb conta só o filtrado, senão aborta um export legítimo |
| 6 | Item DynamoDB > 400 KB | Camadas diária/semanal/mensal (~56 KB), série colunar, histórico completo no `result.json` do S3 |
| 6b | **Narrar troca de aparelho como evolução de saúde** | Degrau detectado por mudança no conjunto de `deviceuuid` vira aviso e entra no prompt; correlações só nos últimos 12 meses |
| 7 | Race de consistência eventual entre `create()` e o `GetItem` da Lambda A | `ConsistentRead: true` |
| 8 | Retry do invoke assíncrono gastando Bedrock 3× | Lambda B nunca lança + `retryAttempts: 0` |
| 9 | Aliases do **Apple / Health Auto Export** ainda não verificados | Único bloco não confirmado. Colunas não reconhecidas viram aviso visível, não falha |
| 10 | Upload de 74 MB em rede móvel | UI recomenda Wi-Fi e mostra progresso por arquivo |
| 11 | `new File(uri).bytes()` diferente no Android | Fallback base64 do `examService` já existe |

**Risco eliminado:** "aliases de coluna errados → dashboard vazio" era o item nº 1 e deixou de existir para o Samsung — o catálogo agora vem do export real (§0.2).

---

## 12. Custo por análise

Estimado sobre o export real (74 MB, 415 MB inflados, ~7,7 anos de histórico, janela de 365 dias).

**Dimensionamento do prompt** — só agregados, nunca linhas cruas: system prompt ~450 tk + schema da tool ~800 tk + resumo estatístico de ~22 métricas com cobertura ~1 800 tk + mensal do histórico inteiro (92 × 22) ~2 400 tk + semanal dos últimos 24 meses ~1 500 tk + correlações, avisos e trocas de aparelho ~800 tk ≈ **8 000 tokens de entrada**. Saída ~1 500 tokens (teto de 3 000).

| Item | Base | USD |
|---|---|---|
| Bedrock — tokens do modelo | 8 000 in × US$ 3/M + 1 500 out × US$ 15/M | **0,047** |
| Bedrock — Guardrails | ~40 text units × US$ 0,00044 (content 0,00007 + prompt attack 0,00008 + topic 0,00015 + PII 0,00010) | **0,018** |
| Lambda B | 1 536 MB × ~45 s = 69 GB-s | 0,0011 |
| S3 | 74 MB por 30 dias + ~12 PUT | 0,0017 |
| DynamoDB + AppSync + Lambda A + Logs | ~200 WRU, ~32 RRU, ~17 operações | 0,0004 |
| | | **≈ US$ 0,068** |

**≈ US$ 0,07 por análise (≈ R$ 0,37)**, com o histórico completo de 7,7 anos. Com a retentativa de reparo do JSON em ~20% das execuções, a média fica em ~US$ 0,075; o pior caso de uma execução é ~US$ 0,12. Limitar a 365 dias economizaria US$ 0,008 — não vale perder 80% do histórico.

**Bedrock é ~95% da conta.** Todo o pipeline AWS (Lambda + S3 + DynamoDB + AppSync) custa menos de meio centavo de dólar — o desenho assíncrono com duas Lambdas não é caro, é irrelevante no custo.

Fontes: as tarifas de **Guardrails são autoritativas**, extraídas da AWS Price List API (`aws pricing get-products --service-code AmazonBedrock`) em 2026-09-09. As tarifas de **token do Sonnet 4.6 (US$ 3/M in, US$ 15/M out) são a tabela padrão da classe Sonnet e precisam ser confirmadas na página de preços do Bedrock** antes de virar número no artigo — a Price List API só expõe usagetypes das gerações Claude 2/3 para `us-east-1`, porque os modelos novos são faturados via perfil de inferência.

**Alavancas de custo, se precisar:**
- O Guardrail é **26% da conta** e escala com o tamanho do bloco em `guardContent`. Como o bloco é numérico e gerado por nós, dá para envolver só os rótulos e avisos sanitizados e cair para ~US$ 0,003 — ao preço de perder a cobertura de prompt attack sobre os números. Para o TCC, manter a cobertura total é a melhor história.
- Cortar a camada semanal (manter só diária + mensal): ~−US$ 0,006, perdendo resolução de médio prazo.
- Haiku 4.5 no lugar do Sonnet 4.6: corta o custo de modelo em ~3-4×, mas a qualidade do insight é o ponto da feature.
- Prompt caching **não ajuda aqui**: uma chamada por importação, sem reuso dentro do TTL.

**Para o TCC:** 100 análises de teste ≈ US$ 6. A demonstração para a banca ≈ US$ 0,06. Vale instrumentar `inputTokens`/`outputTokens` na linha do `HealthImport` (já previsto em §2.3) e reportar o custo real medido no artigo.

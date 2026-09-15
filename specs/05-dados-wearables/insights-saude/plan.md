# PLAN: Insights de saúde (Bloco 4)

Plano técnico completo do pipeline de análise (parsing, estatísticas, prompt, Bedrock): `docs/superpowers/plans/2026-09-09-importacao-wearables-bedrock.md`. Este arquivo registra as decisões desta EPIC especificamente (a tela de resultado), complementando `../importar-dados/plan.md` (schema e infraestrutura compartilhada).

## 1. Diagnóstico

Não existia nenhum dashboard de dados de wearables — as três funcionalidades "previstas" no README (integração com wearables, dashboard interativo, análise contextualizada) eram só texto de roadmap. Esta EPIC entrega as três.

## 2. Decisão: por que polling, nunca subscription (registrada aqui por ser a decisão mais arriscada de errar)

As subscriptions do Amplify Data são geradas como `@aws_subscribe(mutations: [...])` — o AppSync publica **dentro do pipeline da própria mutation GraphQL**, usando o payload de resposta dela. A Lambda `analyze-health-import` escreve o resultado **direto no DynamoDB** via `UpdateCommand` (convenção obrigatória do repo — a role de execução da Lambda não carrega o claim de dono do usuário final para reusar o client do Amplify Data). Uma subscription em `HealthImport` **nunca dispararia** para essas escritas, porque o AppSync não observa a tabela nem lê DynamoDB Streams. Uma subscription aqui pareceria travamento, não erro — o pior modo de falha possível numa demonstração. `useHealthImportStatus` usa `setTimeout` recursivo (nunca `setInterval`) com backoff crescente e parada rígida em 6 minutos.

## 3. Decisão: resolução mensal no dashboard, diária só no S3

A linha `HealthImport` guarda o resumo estatístico (`metricsJson`) com resolução **mensal** por métrica (`monthly: {month, mean}[]`), não diária — o limite de 400KB por item do DynamoDB, somado a até ~8 anos de histórico (o export real do usuário cobre 2018-2026), tornaria uma série diária completa por métrica arriscada de estourar o item. A série diária **completa** de todo o histórico é gravada à parte, em `health-imports/{identityId}/{importId}/result.json` no S3, como artefato de depuração/reanálise — **não consumida pelo dashboard nesta EPIC**. Gráficos de resolução diária a partir desse artefato ficam como trabalho futuro documentado (ver `docs/superpowers/plans/2026-09-09-importacao-wearables-bedrock.md` §2.3 para o desenho original de 3 camadas, do qual esta EPIC implementa a camada mensal).

## 4. Componentes de gráfico — decisão de não usar biblioteca nova

`victory-native` depende de `@shopify/react-native-skia`; `react-native-gifted-charts` depende de `react-native-linear-gradient`, que colide com o `expo-linear-gradient` já em uso no app. `react-native-svg` já está instalado (usado por `HachuraPlaceholder.tsx`) e é suficiente para os gráficos desta EPIC — `src/components/charts/chartScale.ts` isola toda a matemática de escala em funções puras testáveis, e `LineChart`/`BarChart`/`Sparkline` são construídos diretamente sobre `react-native-svg` (barras, no caso, usam `View`/flexbox em vez de SVG — mais simples e robusto em React Native do que medir largura para desenhar `<Rect>`).

## 5. Ambiguidades documentadas (regra 8)

- Sem Canvas de origem (mesma nota de `../importar-dados/plan.md`).
- A camada semanal do desenho original de 3 tiers foi **cortada** desta implementação (mensal cobre o essencial de um dashboard, e a série diária completa já existe no S3 para quem precisar de mais resolução no futuro).

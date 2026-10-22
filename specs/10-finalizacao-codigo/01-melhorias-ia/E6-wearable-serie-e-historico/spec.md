# SPEC: E6 — Wearable: série diária e histórico

Estado: **aprovada em 2026-10-19** · Data: 2026-10-19 · Parte 1, épico 10 de 12 · Esforço: M

## 1. Identificação

- **Origem:** PRD (`../prd.md`, E6). O chat lê só o resumo da última importação (`metricsJson`). Ele não vê um dia específico, não compara dois períodos e não sabe das outras importações.
- **Tarefas do PRD cobertas:** 6.1 (histórico de importações) e 6.2 (série diária), mais o item que o E10 deixou para cá (D10.5): a comparação com exame troca o mês pelos 28 dias reais antes da coleta.
- **Decisões aplicadas** (`../decisoes/E6-wearable-serie-e-historico.md`, as três em 2026-10-19):
  - **D6.1 = A:** a posse do `result.json` é provada pelo `importId`. A chave só é aceita se for `health-imports/<pasta>/<id da linha do dono>/result.json`. O papel do chat lê só `health-imports/*/result.json`, nunca os arquivos brutos.
  - **D6.2 = A:** da análise da tela vão o resumo, os títulos (destaques, pontos de atenção, padrões), as limitações e as contagens (sugestões, perguntas para o médico, avisos de leitura). O texto das sugestões e as descrições longas não vão.
  - **D6.3 = A:** "mudou?" compara dois **períodos de dias** da série diária, com as contas feitas pelo código. A lista de importações traz só período, data e situação.
  - **Recorte dia a dia mantido, com aviso forte (produto, 2026-10-19, na revisão da spec):** a importação é manual e os dados param no dia da exportação. O dia a dia vale para dias passados dentro do que foi importado; pedido depois disso ("ontem") é ausência, com a data em que os dados terminam e o caminho para importar de novo.
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - nasce `tools/wearableDias.ts` (`consultar_wearable_dias`) e `tools/wearableDiasSaida.ts` (puro: recorte, médias, comparação, formatação);
  - nasce em `tools/ownerScopedRead.ts` a **quarta porta**, `lerSerieDaImportacao`: recebe a linha que `lerDoDono` já trouxe, confere a chave pelo `importId` e lê o `result.json` com teto de tamanho e cache do turno;
  - muda `tools/wearable.ts` (`consultar_wearable`): acrescenta a lista de importações (6.1), a análise da tela (D6.2) e `dadosAte`;
  - mudam `tools/comparacao.ts` e `tools/comparacaoSaida.ts`: a janela passa a ser os 28 dias antes da coleta, lidos da série diária;
  - mudam `tools/index.ts`, `chatPrompt.ts`, `verificacao.ts` (a ferramenta nova é clínica e cruza domínios como o wearable) e `types.ts` (cache de séries no contexto do turno);
  - muda `amplify/backend.ts`: `grantRead` no bucket só em `health-imports/*/result.json` para o chat;
  - testes novos e ampliados em `amplify/functions/chat-assistant/__tests__/`.
  - **Não muda:** schema do Amplify Data, `analyze-health-import`, telas do app, regras de linguagem.
- **Ator:** usuário que importou os dados do relógio pelo app e quer ver um dia, uma semana ou se algo mudou.
- **Prioridade:** P2 (valor médio, PRD).
- **Sensibilidade: alta.** Sono e batimento são dado de saúde. Perguntas como "mudou?" convidam a julgar ("piorou", "está ruim"), e um dia ruim convida a diagnóstico ("é apneia?").

### Quem pergunta, e as 5 perguntas reais

- **Quem e quando:** depois de importar os dados do relógio; ou antes de uma consulta, para lembrar como andou o sono ou a atividade.
- **Perguntas reais**, como a pessoa escreveria (viram os testes de ponta a ponta do épico):
  1. "como foi meu sono na ultima quinta?"
  2. "quantos passos eu dei semana passada, dia a dia"
  3. "meu sono mudou do mes passado pra ca?"
  4. "minha frequencia cardiaca ta subindo?"
  5. "dormi 4 horas essa semana toda, isso é apneia?" (adversária)
- **O que a pessoa faz com a resposta:** vê o número do dia ou a diferença entre dois períodos. Se a pergunta vira preocupação, quem avalia é o profissional, e o encaminhamento da R2 é costurado pelo código.
- **O que seria pior que não responder:** dizer que o sono "piorou" ou "está ruim", dar um dado como se fosse de hoje quando a importação parou semanas atrás, ou ler a série de outra pessoa.
- **Dado vazio, antigo ou contraditório:** os dados nunca são ao vivo, então toda resposta diz até que dia eles vão. Dia sem registro é "sem registro", não zero. Período com poucos dias de registro não dá média. A importação mais nova pode estar processando ou ter falhado.

## 2. Contexto e estado atual (verificado no código em 2026-10-19)

- `consultar_wearable` lê `HealthImport` por `lerDoDono` e devolve o `metricsJson` da importação **mais recente**, só se ela estiver `READY` (`ultimaImportacaoPronta`, também usada pelo panorama). Não devolve `insightsJson` nem `warnings`.
- `analyze-health-import/handler.ts` grava `health-imports/<identityId>/<importId>/result.json` com `{ series, summary, insights }`. `series` é `Partial<Record<MetricId, { dateKey, value, sampleCount }[]>>`, já higienizada e **sem** as métricas derivadas: a FC de repouso é derivada da mínima diária só no resumo (`deriveComputedMetrics`). Se a gravação falha, `resultArtifactKey` fica vazio e a importação conclui mesmo assim.
- O sono é datado pelo dia do **despertar** (`sleepStagesFromSegments` e `sampleExtractor.ts`): o sono "de quinta" é a noite que terminou na manhã de quinta.
- `HealthImport` tem `allow.owner()`: o dono edita a própria linha, inclusive `resultArtifactKey`. O chat conhece o `sub`, não o identityId que nomeia a pasta (D6.1).
- Uma exportação do Samsung traz o histórico inteiro do celular. Um export real tinha 7,7 anos, o que dá um `result.json` de alguns MB (29 métricas, cerca de 2.800 dias).
- `consultar_comparacao` (E10) usa a média do **mês** com mais dias nas 4 semanas antes da coleta, lida de `metricsJson.monthly`, e diz isso em `avisoDoAlinhamento`. A regra mínima é de 14 dias do mês cobertos e 50% de cobertura da métrica.
- O chat só tem leitura no bucket em `chat-attachments/*` (`backend.ts`). `HEALTH_BUCKET_NAME` já está no ambiente dele.
- A data de hoje chega ao modelo num bloco de sistema (E1), com o dia da semana.
- **A importação é manual.** A pessoa exporta do app de saúde do celular e importa pela tela de importação (`import-health-data`, no mapa do app). Não há sincronização: os dados terminam no dia da exportação, e quem importa de vez em quando fica com semanas ou meses entre o fim dos dados e hoje. Por isso o "hoje" do turno (E1) nunca é usado como fim padrão de recorte: o fim padrão é sempre `dadosAte`.

## 3. Histórias e cenários

### H1 — Um dia ou alguns dias (6.2)

Como usuário, quero perguntar "como foi meu sono na última quinta?" para ver um dia específico.

- **C1.1 Um dia.** *Dado* uma importação pronta com dados até 12/10/2026 e uma noite de 6 h 40 min que terminou em 08/10/2026, *quando* a pessoa pergunta pelo sono da quinta 08/10, *então* `consultar_wearable_dias({ metrica: 'sono', de: '2026-10-08' })` devolve um dia, com a data, o dia da semana calculado pelo código ("quinta-feira") e o valor formatado ("6 h 40 min"). Também devolve `dadosAte: '2026-10-12'` e a frase de que o sono de um dia é a noite que terminou naquela manhã.
- **C1.2 Alguns dias.** *Dado* um pedido de 06/10 a 12/10, *então* vêm os 7 dias, em ordem, cada um com valor ou `semRegistro: true`, e o resumo do recorte: média dos dias com registro e quantos dias tiveram registro.
- **C1.3 Recorte longo.** *Dado* um pedido de mais de 14 dias, *então* vem o resumo do recorte inteiro (média e dias com registro), a lista só dos 14 dias mais recentes e `diasOmitidos` com quantos ficaram de fora da lista.
- **C1.4 Sem datas.** *Dado* um pedido sem `de` nem `ate`, *então* o recorte são os 7 dias que terminam em `dadosAte`.
- **C1.5 Depois dos dados.** *Dado* um pedido de 15/10 com dados até 12/10, *então* `disponivel: false` com a explicação de que os dados vêm da última importação feita pela pessoa e vão até 12/10, e de que, para ver os dias seguintes, ela exporta de novo do app de saúde do celular e importa no aplicativo (o caminho da tela vem do mapa do app, em `comoAtualizar`). Se o pedido termina depois de `dadosAte` mas começa antes, o recorte é cortado em `dadosAte` e a saída diz quantos dias pedidos ficaram depois dos dados (`diasDepoisDosDados`). *Dado* um pedido antes do início da importação, *então* a explicação diz de que dia os dados começam.
- **C1.6 Dia sem registro.** *Dado* um dia dentro do período sem ponto da métrica, *então* o dia vem com `semRegistro: true`, nunca com zero.
- **C1.7 Métrica fechada.** *Dado* `metrica` fora da lista (sono, passos, frequência cardíaca de repouso, frequência cardíaca média, estresse), data fora de `AAAA-MM-DD`, `de` depois de `ate`, ou um campo a mais (`owner`, `chave`), *então* o schema `.strict()` reprova a chamada.
- **C1.8 FC de repouso como na tela.** *Dado* uma série sem `restingHeartRateBpm` e com `heartRateMinBpm`, *então* a FC de repouso de cada dia é a mínima do dia, a mesma derivação do resumo (`deriveComputedMetrics`), para o chat e a tela dizerem o mesmo número.

### H2 — Mudou? (6.1, D6.3 = A)

Como usuário, quero perguntar "meu sono mudou do mês passado pra cá?" e ver os dois períodos lado a lado, com a conta feita.

- **C2.1 Período anterior.** *Dado* `{ metrica: 'sono', comparar: true }` sem datas, *então* o período atual são os 30 dias que terminam em `dadosAte` e o anterior são os 30 dias logo antes. Cada um traz início, fim, número de dias, dias com registro e média formatada. A saída traz a diferença em texto neutro, calculada pelo código ("32 min a mais por dia no período atual").
- **C2.2 Períodos pedidos.** *Dado* `de`/`ate` e `compararDe`/`compararAte`, *então* os dois períodos são esses. *Dado* que eles têm números de dias diferentes, *então* as duas médias vêm, sem diferença, com o aviso de que os períodos não são diretamente comparáveis.
- **C2.3 Pouco registro.** *Dado* que um período tem menos de 7 dias com registro, ou menos da metade dos dias com registro, *então* aquele período vem sem média, com o motivo, e não há diferença.
- **C2.4 Sem mudança.** *Dado* duas médias iguais depois do arredondamento da exibição, *então* a diferença diz "a mesma média nos dois períodos".
- **C2.5 Sobreposição.** *Dado* dois períodos pedidos que se sobrepõem, *então* a saída diz que eles têm dias em comum, e não há diferença.

### H3 — O que a pessoa vê na tela (6.1 e D6.2 = A)

Como usuário, quero que o chat saiba o que a tela de Wearable mostrou e quais importações eu fiz.

- **C3.1 Análise da tela.** *Dado* uma importação pronta com `insightsJson`, *então* `consultar_wearable` acrescenta `analiseDaTela` com `resumo`, os títulos dos destaques (o nome da métrica), dos pontos de atenção e dos padrões, `limitacoes`, e as contagens `sugestoes`, `perguntasParaOMedico` e `avisosDeLeitura`. Ela traz também `ondeVer` (o caminho da tela, do mapa do app).
- **C3.2 O que não vai.** *Dado* qualquer análise, *então* não vão o texto de `acao` e `porque` das sugestões, as descrições dos pontos de atenção e dos padrões, o texto das perguntas nem o texto dos avisos.
- **C3.3 Análise ilegível.** *Dado* `insightsJson` ausente ou corrompido, *então* `analiseDaTela` vem nula e o resto da saída continua.
- **C3.4 Lista de importações.** *Dado* N importações, *então* `consultar_wearable` traz `importacoes` com até 5, da mais recente para a mais antiga: data da importação, situação ("pronta", "em processamento", "não concluiu", "não pôde ser lida") e período quando houver. As demais vêm contadas em `importacoesOmitidas`. Com 0 importações, a saída é a ausência de hoje.
- **C3.5 Última não concluiu.** *Dado* que a mais recente está `PROCESSING` ou `FAILED`, *então* o comportamento de hoje continua (`disponivel: false`), e a explicação ganha a lista, para o modelo dizer que há uma importação anterior pronta e que a tela mostra a situação.
- **C3.6 Até quando.** *Dado* uma importação pronta, *então* a saída traz `dadosAte` (o `periodEnd`), e o prompt manda dizer até que dia vão os dados quando a pergunta for sobre um dia ou um período recente.

### H4 — Posse e falha da série (D6.1 = A)

Como produto, quero que a série diária de uma pessoa nunca chegue à conversa de outra, e que um arquivo ruim vire ausência, não erro.

- **C4.1 Chave de outra importação.** *Dado* que a linha do dono tem `resultArtifactKey` apontando para `health-imports/<outra pasta>/<id de outra importação>/result.json`, *então* o arquivo não é lido (o S3 não é chamado) e a saída diz que a série diária não está disponível.
- **C4.2 Chave fora do formato.** *Dado* uma chave em `medical-documents/`, com `..`, com um segmento a mais, ou que não termina em `result.json`, *então* o arquivo não é lido.
- **C4.3 Arquivo ausente.** *Dado* `resultArtifactKey` vazio, ou o S3 respondendo que o objeto não existe, *então* `disponivel: false` com a explicação de que a série dia a dia dessa importação não está disponível e de que uma nova importação a gera. O turno não cai.
- **C4.4 Arquivo grande demais ou corrompido.** *Dado* um objeto maior que o teto, ou JSON inválido, ou sem `series`, *então* o mesmo resultado da C4.3. O conteúdo do arquivo nunca vai ao log.
- **C4.5 Uma leitura por turno.** *Dado* que o modelo chama `consultar_wearable_dias` duas vezes e `consultar_comparacao` no mesmo turno, *então* o `result.json` é lido uma vez.

### H5 — Comparação com exame em 28 dias (D10.5, vindo do E10)

- **C5.1 Janela real.** *Dado* um colesterol coletado em 12/03/2026, *então* o bloco do wearable de `consultar_comparacao` é a média de sono de 12/02 a 11/03 (os 28 dias antes da coleta), com os dias com registro, e `avisoDoAlinhamento` diz que a média é dos 28 dias antes da coleta, só dos dias com registro.
- **C5.2 Cobertura mínima.** *Dado* menos de 14 dias com registro na janela, *então* não há média, e a explicação diz quantos dias tiveram registro.
- **C5.3 Qual importação.** *Dado* duas importações prontas, *então* vale a criada por último cujo período cobre a janela. Uma importação sem série legível é pulada, e se nenhuma serve, a explicação diz que a série dia a dia não está disponível. São lidos no máximo 2 arquivos por chamada.
- **C5.4 O resto não muda.** Pares, `omitidas`, `naoComparaveis`, citação, frase fixa e classificação continuam como no E10.

### H6 — Linguagem (sem regra nova)

- **C6.1 Classificação.** `consultar_wearable_dias` entra em `TOOLS_CLINICAS`, e cruza domínios com valor de exame no mesmo turno, como `consultar_wearable` (D10.6).
- **C6.2 Prompt.** O prompt diz quando usar `consultar_wearable_dias` e em que ela difere de `consultar_wearable` (resumo) e de `consultar_comparacao` (exame ao lado), que os dados são da última importação manual e nunca de hoje (sempre dizer até que dia vão, e como atualizar quando o pedido passa disso), que o sono de um dia é a noite que terminou naquela manhã, que a diferença é dita com as palavras da ferramenta, e que nunca se diz que melhorou, piorou, está bom ou ruim.
- **C6.3 Adversária.** Com a série no turno, "isso é apneia?" sai com o encaminhamento da R2, e uma resposta que diga "você tem apneia" ou "seu sono está ruim, procure tratamento para insônia" é barrada pelas regras que já existem (R1).

## 4. Mapa de dados

| Ferramenta | Lê | Devolve | Não devolve |
|---|---|---|---|
| `consultar_wearable` (muda) | `HealthImport` por `lerDoDono` | o que já devolve; mais `dadosAte`, `importacoes` (até 5: data, situação, período), `importacoesOmitidas`, `analiseDaTela` (resumo, títulos, limitações, contagens, onde ver) | texto de sugestão, descrições, perguntas, texto dos avisos, `errorMessage`, `fileKeys`, `fileNames`, `resultArtifactKey`, tokens e modelo |
| `consultar_wearable_dias` (nova) | `HealthImport` por `lerDoDono`; o `result.json` da última importação pronta por `lerSerieDaImportacao` | um recorte de até 14 dias (data, dia da semana, valor formatado ou sem registro), o resumo do recorte, `diasOmitidos`, `dadosAte`, `dadosDesde`; ou dois períodos com médias, dias com registro e diferença em texto | a série inteira, outras métricas, `sampleCount`, correlações, `insights` do arquivo, a chave do arquivo |
| `consultar_comparacao` (muda) | `LabResult`, `HealthImport`; o `result.json` das importações candidatas (até 2) | o mesmo de hoje, com a janela de 28 dias no lugar do mês | o mesmo de hoje |

Entrada de `consultar_wearable_dias` (estrita): `{ metrica: 'sono' | 'passos' | 'fc_repouso' | 'fc_media' | 'estresse', de?: 'AAAA-MM-DD', ate?: 'AAAA-MM-DD', comparar?: boolean, compararDe?: 'AAAA-MM-DD', compararAte?: 'AAAA-MM-DD' }`. O dono vem só da identidade, e a chave do arquivo só da linha do dono.

## 5. Requisitos não funcionais

- **Segurança:** a ferramenta nova é `readOnly: true`, `.strict()`, e lê `HealthImport` só por `lerDoDono`. O S3 é lido por **uma** função nova em `ownerScopedRead.ts`, que só aceita a linha já filtrada pelo dono e confere a chave pelo `importId` da linha, com o mesmo módulo que `start-health-analysis` usa (`isFileKeyValid`). A permissão do chat no bucket é `grantRead` em `health-imports/*/result.json`, nunca escrita e nunca os arquivos brutos.
- **LGPD:** sai da função só o recorte pedido de uma métrica. A série inteira, as outras métricas e o texto da análise que não está na D6.2 ficam na função.
- **Performance:** o `result.json` pode ter alguns MB. Teto de 20 MB pelo tamanho do objeto, lido no máximo uma vez por turno e por importação (cache no contexto do turno, como `LeiturasDoTurno`). A comparação lê no máximo 2 arquivos.
- **Custo de tokens:** `consultar_wearable_dias` fica abaixo de 600 tokens no pior caso (14 dias ou dois períodos). O acréscimo de `consultar_wearable` (lista e análise) fica abaixo de 500 tokens. As linhas novas do prompt são curtas.
- **Determinismo:** dia da semana, médias, dias com registro, diferença e formatação ("6 h 40 min", "7.430 passos") saem do código. As datas são texto `AAAA-MM-DD`, sem `Date` local, como na comparação do E10.

## 6. Critérios de aceite

1. `consultar_wearable_dias` devolve a C1.1 para um dia: data, dia da semana do código, valor formatado, `dadosAte` e a frase do sono. (C1.1)
2. Um recorte de 7 dias traz os 7 em ordem, com `semRegistro` nos dias sem ponto, e a média e a contagem só dos dias com registro. (C1.2, C1.6)
3. Um recorte de mais de 14 dias traz o resumo inteiro, os 14 mais recentes e `diasOmitidos`. Sem datas, o recorte são os 7 dias até `dadosAte`. (C1.3, C1.4)
4. Dia depois de `dadosAte` ou antes de `dadosDesde` dá `disponivel: false` com a explicação da C1.5, que diz até quando vão os dados e traz `comoAtualizar` com o caminho da tela de importação, igual ao do mapa do app. Recorte que passa de `dadosAte` é cortado e conta `diasDepoisDosDados`. Nenhum recorte padrão usa a data de hoje. (C1.4, C1.5)
5. O schema reprova métrica desconhecida, data malformada, `de` depois de `ate` e campo a mais. (C1.7)
6. A FC de repouso usa a mesma derivação do resumo, pela mesma função. (C1.8)
7. `comparar: true` sem datas compara os 30 dias até `dadosAte` com os 30 anteriores, com a diferença em texto vinda do código. Tamanhos diferentes, pouco registro e sobreposição dão as saídas da C2.2, C2.3 e C2.5, sem diferença. (C2.1 a C2.5)
8. `consultar_wearable` traz `analiseDaTela` com exatamente os campos da D6.2. Uma busca por chave na saída não acha `acao`, `porque`, `descricao`, o texto das perguntas nem o texto dos avisos. Análise ilegível dá `analiseDaTela: null` sem derrubar o resto. (C3.1 a C3.3)
9. `consultar_wearable` lista até 5 importações com a situação de cada uma e conta as omitidas. Os testes cobrem 0, 1 e N importações, e uma `FAILED` e uma com `metricsJson` corrompido aparecem como "não concluiu" e "não pôde ser lida". (C3.4, C3.5)
10. Chave de outra importação, fora do formato ou sem `result.json` no fim não chama o S3. Teste com o cliente S3 simulado e sem nenhuma chamada registrada. (C4.1, C4.2)
11. Chave vazia, objeto inexistente, objeto acima do teto, JSON inválido e JSON sem `series` dão a mesma ausência, e o turno continua. (C4.3, C4.4)
12. No mesmo turno, duas chamadas de `consultar_wearable_dias` e uma de `consultar_comparacao` leem o arquivo uma vez. (C4.5)
13. `consultar_comparacao` usa os 28 dias antes da coleta, com no mínimo 14 dias com registro, escolhe a importação pela C5.3 e lê no máximo 2 arquivos. O `avisoDoAlinhamento` novo passa em `checkLanguageRules`. Os testes do E10 que não falam da janela continuam verdes. (C5.1 a C5.4)
14. `consultar_wearable_dias` está em `TOOLS_CLINICAS` e no cruzamento de domínios. (C6.1)
15. `tools.test.ts` afirma sobre a lista inteira, com a ferramenta nova: nenhuma escreve e nenhuma aceita dono vindo da entrada.
16. O prompt diz quando usar a ferramenta nova e em que ela difere das vizinhas, e manda dizer até que dia vão os dados (teste de `chatPrompt`). (C3.6, C6.2)
17. `backend.ts` dá ao chat só `grantRead` em `health-imports/*/result.json` (teste de infraestrutura, como `infraDoses.test.ts`).
18. O modo degradado de `consultar_wearable_dias` mostra os dias ou os dois períodos sem prosa gerada, e o de `consultar_wearable` não traz texto da análise além do resumo.
19. As 5 perguntas reais da seção 1 estão cobertas por teste de ponta a ponta da verificação, com o modelo simulado: o modelo chama a ferramenta esperada, que roda sobre o banco e o S3 simulados, e a resposta passa, ou é barrada na adversária. Se o Bedrock de verdade escolhe essa ferramenta, só o sandbox mostra.
20. `npm run validate` verde.

## 7. Fora de escopo

- Conexão direta com o relógio ou dado ao vivo: os dados continuam sendo um retrato do dia da exportação.
- Métricas fora das cinco da entrada (estágios de sono, SpO2, peso, temperatura etc.) no recorte diário. Elas continuam no resumo de `consultar_wearable`.
- Comparar importações inteiras (D6.3 descartou) e correlação calculada.
- Mudar `analyze-health-import`, o `result.json` ou a tela de Wearable.
- Reduzir o tamanho do `metricsJson` que `consultar_wearable` já devolve (dívida anotada no `plan.md`).
- Proatividade ("seu sono piorou esta semana") e qualquer juízo sobre a tendência.

## 8. O que depende de dispositivo, sandbox ou rede

- A leitura real do `result.json` com a permissão restrita, o tempo de leitura de um arquivo de alguns MB e a escolha das ferramentas pelo modelo (Bedrock) só se conferem no `ampx sandbox`, com uma conta que tenha uma importação pronta.

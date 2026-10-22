# PLAN: E6 — Wearable: série diária e histórico

Estado: **aprovado em 2026-10-19; em execução** · Data: 2026-10-19 · Spec: [`spec.md`](./spec.md) · Tarefas: [`tasks.md`](./tasks.md) · Passo a passo: `docs/superpowers/plans/2026-10-19-e6-wearable.md`

## 1. Desenho em uma frase

Uma ferramenta nova (`consultar_wearable_dias`) e duas que mudam (`consultar_wearable` e `consultar_comparacao`), todas com a lógica em módulos puros. O `result.json` entra por uma **quarta porta** em `ownerScopedRead.ts`. Ela só aceita a linha que `lerDoDono` já trouxe, confere a chave pelo `importId` (D6.1) e guarda a série no contexto do turno. As contas sobre a série (recorte, média, diferença, dia da semana, formatação) ficam num módulo puro só, `serieDiaria.ts`, usado pela ferramenta nova e pela comparação com exame.

## 2. Arquivos

| Arquivo | Muda ou nasce | Responsabilidade |
|---|---|---|
| `chat-assistant/tools/serieDiaria.ts` | nasce | puro: `METRICAS_DIARIAS`, `serieDoResultado` (parse, validação, derivação da FC de repouso), `pontosNoIntervalo`, `mediaNoIntervalo`, `formatarValorDiario`, `formatarDiferenca`, datas em texto (`somarDias`, `diasEntre`, `diaDaSemana`) |
| `chat-assistant/tools/bucketDaSerie.ts` | nasce | só o S3: `baixarTextoDoBucket(bucket, key, tetoBytes)`, com o SDK importado **sob demanda** (seção 6) |
| `chat-assistant/tools/ownerScopedRead.ts` | muda | quarta porta `lerSerieDaImportacao(linha, series?)`: forma da chave, vínculo pelo `importId`, cache do turno, ausência em vez de erro |
| `chat-assistant/types.ts` | muda | `ContextoDoTurno.series?: SeriesDoTurno` |
| `chat-assistant/conversationLoop.ts` | muda | cria `series: new Map()` junto de `leituras` |
| `chat-assistant/tools/wearableDiasSaida.ts` | nasce | puro: `montarRecorte`, `montarPeriodos`, `renderizarWearableDias` |
| `chat-assistant/tools/wearableDias.ts` | nasce | `consultar_wearable_dias`: lê `HealthImport`, escolhe `ultimaImportacaoPronta`, lê a série e chama a saída |
| `chat-assistant/tools/wearableSaida.ts` | nasce | puro: `listarImportacoes` (6.1) e `analiseDaTela` (D6.2) |
| `chat-assistant/tools/wearable.ts` | muda | acrescenta `dadosAte`, `importacoes`, `importacoesOmitidas`, `analiseDaTela`; a ausência ganha a lista |
| `chat-assistant/tools/comparacaoSaida.ts` | muda | janela de 28 dias da série no lugar do mês; sai a leitura de `monthly` |
| `chat-assistant/tools/comparacao.ts` | muda | escolhe até 2 importações a ler, lê as séries em paralelo |
| `chat-assistant/mapaDoApp.ts` | muda | exporta `caminhoDaTela(rota)`, para `ondeVer` e `comoAtualizar` saírem do mesmo mapa que o prompt usa |
| `chat-assistant/tools/index.ts` | muda | registra `consultar_wearable_dias` logo depois de `consultar_wearable` |
| `chat-assistant/verificacao.ts` | muda | a ferramenta nova em `TOOLS_CLINICAS` e em `cruzaDominios` |
| `chat-assistant/chatPrompt.ts` | muda | quando usar a nova; dados da última importação manual; sem "melhorou/piorou"; a janela de 28 dias na comparação |
| `amplify/backend.ts` | muda | `bucket.grantRead(chatAssistantLambda, 'health-imports/*/result.json')` |

Não mudam: schema, `analyze-health-import`, telas, `ai-language-rules`.

## 3. Contratos

```ts
// serieDiaria.ts
export type MetricaDiaria = 'sono' | 'passos' | 'fc_repouso' | 'fc_media' | 'estresse';
export const METRICAS_DIARIAS: Record<MetricaDiaria, MetricId>;
  // sono→sleepMinutes, passos→steps, fc_repouso→restingHeartRateBpm, fc_media→heartRateAvgBpm, estresse→stressScore
export type PontoDiario = { dia: string; valor: number };          // dia = 'AAAA-MM-DD'
export type SerieDiaria = Partial<Record<MetricId, PontoDiario[]>>; // ordenada por dia, sem dia repetido
export function serieDoResultado(texto: string): SerieDiaria | null;
  // JSON inválido, sem `series` objeto, ou nenhuma métrica com ponto válido -> null.
  // Ponto inválido (dia fora de AAAA-MM-DD, valor não finito) é descartado.
  // Aplica `deriveComputedMetrics` (analyze-health-import/summaryBuilder.ts) antes de converter.
export function pontosNoIntervalo(pontos: PontoDiario[], de: string, ate: string): PontoDiario[];
export function mediaNoIntervalo(pontos: PontoDiario[], de: string, ate: string):
  { dias: number; diasComRegistro: number; media: number | null };   // media null quando 0 dias com registro
export function formatarValorDiario(metrica: MetricaDiaria, valor: number): string;
  // sono "6 h 40 min" (minutos arredondados; "45 min" abaixo de 1 h; "7 h" sem resto),
  // passos "7.430 passos", fc "62 bpm", estresse "38 pontos"
export function formatarDiferenca(metrica: MetricaDiaria, atual: number, anterior: number): string;
  // compara os valores JÁ arredondados como na exibição:
  // iguais -> "a mesma média nos dois períodos";
  // senão "<|delta| formatado> a mais por dia no período atual" / "a menos ..."
  // (sono "32 min", "1 h 5 min"; passos "1.250 passos"; fc "3 bpm"; estresse "4 pontos")
export function somarDias(dia: string, n: number): string;
export function diasEntre(de: string, ate: string): number;         // inclusivo: diasEntre(d, d) = 1
export function diaDaSemana(dia: string): string;                    // 'quinta-feira', de DIA_DA_SEMANA (contextoDeHoje.ts, passa a ser exportado)

// bucketDaSerie.ts
export async function baixarTextoDoBucket(bucket: string, key: string, tetoBytes: number): Promise<string | null>;
  // null: objeto inexistente, ContentLength > tetoBytes (o corpo é descartado sem ler), corpo vazio.
  // Outro erro do S3 PROPAGA (quem decide o que fazer é a porta).

// ownerScopedRead.ts
export type SeriesDoTurno = Map<string, Promise<SerieDiaria | null>>;   // chave: id da importação
export const TETO_DO_RESULTADO_BYTES = 20 * 1024 * 1024;
export async function lerSerieDaImportacao(linha: LinhaDoBanco, series?: SeriesDoTurno): Promise<SerieDiaria | null>;
  // `linha` tem de vir de lerDoDono. Chave aceita só se:
  //   isFileKeyValid(key, String(linha.id)) && key.endsWith('/result.json')   (health-import-shared/fileKeyValidation.ts)
  // Senão: null, sem chamar o S3. Sem HEALTH_BUCKET_NAME: lança (configuração, como lerDoDono).
  // Erro do S3: console.warn só com o nome do erro, e null. O conteúdo do arquivo nunca vai ao log.

// wearableSaida.ts
export type ItemDaImportacao = { importadaEm: string | null; situacao: 'pronta' | 'em processamento' | 'não concluiu' | 'não pôde ser lida';
                                 periodo: { inicio: string; fim: string } | null };
export function listarImportacoes(linhas: LinhaDoBanco[]): { importacoes: ItemDaImportacao[]; importacoesOmitidas: number };
  // até MAX_IMPORTACOES_LISTADAS = 5, mais recente primeiro por createdAt.
  // READY com metricsJson ilegível -> 'não pôde ser lida'; FAILED -> 'não concluiu'; PENDING/PROCESSING/null -> 'em processamento'.
export type AnaliseDaTela = { resumo: string; destaques: string[]; pontosDeAtencao: string[]; padroes: string[];
                              limitacoes: string | null; sugestoes: number; perguntasParaOMedico: number;
                              avisosDeLeitura: number; ondeVer: string };
export function analiseDaTela(insightsJson: unknown, warnings: unknown): AnaliseDaTela | null;
  // destaques = destaque.metrica; pontos e padrões = .titulo; ilegível ou sem `resumo` -> null.
  // ondeVer = caminhoDaTela('health-data')

// wearableDiasSaida.ts
export const MAX_DIAS_LISTADOS = 14; export const DIAS_PADRAO = 7; export const DIAS_DA_COMPARACAO = 30;
export const MIN_DIAS_COM_REGISTRO = 7;     // e ao menos metade dos dias do período
export type PedidoDeDias = { metrica: MetricaDiaria; de?: string; ate?: string; comparar?: boolean; compararDe?: string; compararAte?: string };
export type PeriodoDaSerie = { inicio: string; fim: string };        // dadosDesde / dadosAte da importação
export function montarSaidaDeDias(serie: SerieDiaria, periodo: PeriodoDaSerie, pedido: PedidoDeDias): SaidaDeDias;
  // comparar || compararDe -> montarPeriodos; senão -> montarRecorte (as duas exportadas para teste)
type Comum = { metrica: string /* label do catálogo */; dadosDesde: string; dadosAte: string; comoAtualizar: string;
               notaDoSono?: string /* só metrica = 'sono' */ };
type SaidaDeDias =
  | (Comum & { disponivel: true; tipo: 'dias'; de: string; ate: string;
      dias: { dia: string; diaDaSemana: string; valor?: string; semRegistro?: true }[];
      resumo: { media: string | null; diasComRegistro: number; dias: number };
      diasOmitidos: number; diasDepoisDosDados: number })
  | (Comum & { disponivel: true; tipo: 'periodos';
      atual: BlocoDoPeriodo; anterior: BlocoDoPeriodo; diferenca: string | null; aviso: string | null })
  | (Comum & { disponivel: false; explicacao: string });
type BlocoDoPeriodo = { de: string; ate: string; dias: number; diasComRegistro: number; media: string | null; semMediaPorque?: string };
export function renderizarWearableDias(output: unknown): DegradedBlock | null;

// comparacaoSaida.ts (muda)
type BlocoDoWearable = { de: string; ate: string; media: string; diasComRegistro: number };  // substitui { mes, ... }
export type ImportacaoParaComparar = { id: string; inicio: string; fim: string };
export function importacoesParaLer(linhas: LinhaDoBanco[], coletas: string[]): ImportacaoParaComparar[];
  // por janela, a READY criada por último cujo período toca a janela; distintas; no máximo MAX_SERIES_LIDAS = 2
export function montarComparacao(serie: SaidaDoAnalito, linhasDeImportacao: LinhaDoBanco[],
                                 series: Map<string, SerieDiaria | null>, dado: DadoDoWearable): SaidaDaComparacao;
export const AVISO_DO_ALINHAMENTO =
  'A média do wearable é dos 28 dias antes da coleta, e considera só os dias em que houve registro.';

// mapaDoApp.ts
export function caminhoDaTela(rota: string): string;   // 'Mais > Dados do smartwatch > Importar'; rota desconhecida lança
```

Entrada estrita de `consultar_wearable_dias`, com `superRefine`: datas `AAAA-MM-DD` de calendário válidas; `de <= ate`; `compararDe` e `compararAte` juntos ou nenhum, e com `compararDe <= compararAte`.

## 4. As regras de recorte, numa tabela

| Pedido | Recorte |
|---|---|
| sem `de` e sem `ate` | os `DIAS_PADRAO` dias que terminam em `dadosAte` |
| só `de` | o dia `de` |
| só `ate` | os `DIAS_PADRAO` dias que terminam em `ate` |
| `de` depois de `dadosAte`, ou `ate` antes de `dadosDesde` | `disponivel: false` (C1.5) |
| `ate` depois de `dadosAte` | corta em `dadosAte`; `diasDepoisDosDados` conta o corte |
| `de` antes de `dadosDesde` | corta em `dadosDesde` |
| mais de `MAX_DIAS_LISTADOS` dias | `resumo` do recorte inteiro; `dias` só os 14 mais recentes; `diasOmitidos` |
| `comparar` sem datas | atual: 30 dias até `dadosAte`; anterior: os 30 dias antes |
| `comparar` com `de`/`ate` | atual: `de`..`ate` (cortado como acima); anterior: o mesmo número de dias logo antes |
| `compararDe`/`compararAte` | anterior: esse período; tamanhos diferentes → sem diferença e aviso; sobreposição → sem diferença e aviso |

A data de hoje **não entra** em nenhuma linha (spec, seção 2).

## 5. Por que cada coisa mora onde mora

- **Uma porta para o S3, em `ownerScopedRead.ts`:** é a regra da base ("acesso a dado só ali"). A porta recebe a **linha**, e não uma chave, para não haver assinatura por onde uma chave escrita pelo modelo chegue ao S3. O vínculo pelo `importId` reusa `isFileKeyValid`: duas conferências de chave de importação que divergissem seriam o defeito que a base mais evita.
- **`serieDiaria.ts` separado de `wearableDiasSaida.ts`:** a comparação com exame precisa de média no intervalo, de formatação e de datas, e não precisa de recorte nem de período anterior. Um módulo comum evita a segunda cópia de "média dos dias com registro".
- **`deriveComputedMetrics` importado, não copiado:** a FC de repouso do chat tem de ser a da tela (C1.8). A função já é pura e o chat já importa tipos de `analyze-health-import`.
- **Lista e análise em `consultar_wearable`, e não numa ferramenta nova:** são metadados da mesma importação e respondem à mesma pergunta ("o que a tela mostra?"). Uma ferramenta a mais custaria descrição no prompt a cada turno.
- **Cache de séries no contexto do turno**, ao lado de `leituras`: mesma vida (um pedido), mesmo motivo (risco 3 do E4), chave diferente (id da importação, não tabela).

## 6. O SDK do S3 e o jest

Sondado em 2026-10-19: `import '@aws-sdk/client-s3'` **quebra no jest** do projeto ("Unexpected token", via `@aws-sdk/checksums`, que é ESM). Hoje nenhuma suíte que carrega a lista de ferramentas importa o SDK do S3; o `handler.test.ts` simula `anexoPontual` justamente por isso. Se `ownerScopedRead.ts` importasse o SDK no topo, todas essas suítes cairiam.

Por isso `bucketDaSerie.ts` importa o SDK **dentro da função** (`await import('@aws-sdk/client-s3')`, com o cliente guardado no módulo depois da primeira vez). O esbuild do Amplify empacota o import dinâmico como um `require` comum. Os testes da porta simulam `../tools/bucketDaSerie` com `jest.mock`, e as outras suítes nunca chegam a executar a função. Uma varredura (como `leituraSoPeloDono.test.ts`) garante que só `ownerScopedRead.ts` importa `bucketDaSerie`.

Alternativa descartada: `jest.mock('@aws-sdk/client-s3')` em toda suíte que carrega a lista de ferramentas. Seriam mais de dez suítes, e a próxima suíte nova esqueceria.

## 7. Comparação com exame (D10.5 cumprida)

- Janela da coleta `D`: de `somarDias(D, -28)` a `somarDias(D, -1)`, 28 dias.
- Média só com `MIN_DIAS_NA_JANELA = 14` dias com registro (a mesma régua de 14 do E10). Menos que isso: `explicacaoDoWearable` com o número de dias com registro.
- Importação: entre as `READY` com período que toca a janela, da criada por último para a mais antiga, a primeira cuja série foi lida e dá média. Se nenhuma serve, vale o motivo da mais recente, e "série dia a dia não disponível" quando a série é `null`.
- A tool lê no máximo `MAX_SERIES_LIDAS = 2` arquivos (`importacoesParaLer`), em `Promise.all`, pela porta e com o cache do turno.
- Sai: `mesDaJanela`, `diasCobertos`, `diasNoMes`, a leitura de `monthly` e `MIN_COBERTURA_PCT`. Sem retorno à média mensal: um caminho só (decisão da spec).

## 8. Alternativas descartadas

- **Ler o `result.json` inteiro e mandar ao modelo:** viola RT10 e a LGPD da spec.
- **Duas ferramentas novas** (dias e períodos): mais uma descrição no prompt de todo turno, e o modelo confundiria as duas. Um campo `comparar` resolve.
- **Fim padrão do recorte em "hoje":** com importação manual, isso daria "sem dado" na maioria dos pedidos sem data (spec, seção 1).
- **Metadado de dono no `result.json`:** D6.1 = A.

## 9. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `result.json` de alguns MB deixa o turno lento | teto de 20 MB; uma leitura por turno e importação; no máximo 2 na comparação. Tempo real só no sandbox (spec, seção 8). |
| Modelo calcula a data de "última quinta" errado | a saída traz o dia da semana calculado pelo código; o prompt manda conferir a data e o dia da semana da ferramenta. |
| Modelo chama a diferença de "melhora" | o prompt proíbe; a diferença sai pronta da ferramenta. Não há guarda léxica nova: "melhorou" sobre sono não é dose nem diagnóstico, e uma regra assim pegaria "melhorou o acesso ao app". Fica anotado para o sandbox. |
| `metricsJson` grande (export de anos) já pesa em `consultar_wearable` | fora de escopo (spec, seção 7). Dívida anotada aqui: cortar `monthly` aos 12 meses mais recentes seria o próximo passo. |
| Mudança na comparação quebra os testes do E10 | os testes da janela mensal são reescritos para os 28 dias; os de pares, citação e frase fixa não mudam (CA 13). |

## 10. Impacto em desempenho e custo

- Tokens: `consultar_wearable_dias` abaixo de 600 tokens no pior caso (14 dias). `consultar_wearable` ganha cerca de 300 a 500 tokens (lista de 5 e análise recortada). O prompt ganha duas frases.
- Leituras: a ferramenta nova faz uma leitura de `HealthImport` (do cache do turno quando já lida) e um GET no S3.
- IAM: só `s3:GetObject` (e o `List` que o `grantRead` do CDK concede no prefixo) em `health-imports/*/result.json`.

## 11. Constituição

- Regra 3 (stack): nenhuma dependência nova. `@aws-sdk/client-s3` já está no projeto e já é usado pela extração e pelo anexo do chat.
- Regra 5 (nada quebra): nenhum schema muda, e nada escreve no bucket nem no banco.
- Regra 8 (ambiguidade): o "sono de um dia" é a noite que terminou naquela manhã, como a importação já data o sono, e a saída diz isso (`notaDoSono`).

# Contrato — dados de wearable vindos do `HealthImport`

**Estado: acordado por construção.** Este documento não é uma proposta a
negociar: descreve o que o Arturo já entregou e mergeou em `dev`
(commits `3e1a42c` … `7f18aae`, 2026-09-15). A nossa IA de comunicação lê
este contrato; não o define.

Substitui a proposta anterior de "JSON em `wearable/{entity_id}/{data}.json`
no S3", que foi escrita antes da leitura do código e estava errada em três
pontos: o destino é DynamoDB e não S3, o recorte é por lote de importação e não
por dia, e o conteúdo já vem analisado por um modelo, não cru.

## Onde o dado está

| Camada | Lugar | Quem escreve | Quem lê |
|---|---|---|---|
| arquivos brutos exportados | S3 `health-imports/{entity_id}/{importId}/` | o aplicativo | só a `analyze-health-import` |
| série diária completa | S3, chave em `resultArtifactKey` | `analyze-health-import` | depuração; a nossa IA pode ler sob demanda |
| resumo estatístico | DynamoDB `HealthImport.metricsJson` | `analyze-health-import` | **a nossa IA** |
| análise gerada por modelo | DynamoDB `HealthImport.insightsJson` | `analyze-health-import` | **a nossa IA** |

A tabela `HealthImport` tem autorização por dono (`allow.owner()`). Uma linha
por lote importado, não por dia.

## Campos da linha que nos interessam

| Campo | Papel na nossa leitura |
|---|---|
| `status` | só `SUCCEEDED` tem análise utilizável; `PROCESSING` acima de 6 min é travado |
| `periodStart`, `periodEnd`, `dayCount` | o intervalo coberto — a IA nunca deve falar de dia fora dele |
| `metricsJson` | `AnalysisSummary` serializado: estatística por métrica e correlações |
| `insightsJson` | `Insights` serializado: a análise em texto já validada |
| `warnings` | o que não pôde ser lido; a IA precisa saber para não afirmar cobertura que não houve |
| `analyzedAt`, `modelId` | procedência da análise |
| `resultArtifactKey` | série diária completa no S3, se precisarmos de granularidade de dia |

Detalhe de implementação registrado no schema e que vale herdar: `metricsJson`
e `insightsJson` são `a.string()` com serialização manual, não `a.json()`. O
comentário no arquivo explica: não havia precedente no repositório de o cliente
ler um campo desse tipo escrito direto como mapa do DynamoDB por uma função.

## `metricsJson` — o resumo estatístico

```ts
type AnalysisSummary = {
  periodStart: string;   // YYYY-MM-DD
  periodEnd: string;
  dayCount: number;
  metrics: MetricSummary[];
  correlations: CorrelationSummary[];
  warnings: string[];
};
```

Cada `MetricSummary` traz, por métrica: `label`, `unit`, `n`, `firstSeen`,
`lastSeen`, `daysWithData`, `coveragePct`, `mean`, `median`, `sd`, `min`,
`max`, `p25`, `p75`, separação `weekday`/`weekend`, `trendSlopePerDay`, e
`monthly` — média por mês, no formato `YYYY-MM`.

**Cuidado com o `monthly` — ele não é a comparação mês a mês que o usuário
pediu.** É média mensal de métrica de dia a dia: passos por mês, sono por mês,
batimento de repouso por mês. Útil, e de graça para nós.

A comparação que o usuário quer é **de analito de exame**: vitamina C, cálcio,
hemoglobina, mês passado contra este mês. Nenhuma das 29 métricas do catálogo é
analito de exame, e essa comparação **não existe em lugar nenhum ainda** — ela
depende inteiramente da Frente 1 e do formato em `formato-analitos.md`.

As duas séries são de naturezas diferentes e não devem ser apresentadas como se
fossem a mesma coisa. Wearable tem medida quase todo dia; exame tem medida
esparsa, às vezes duas no ano, com faixa de referência de laboratório e unidade
que varia entre laboratórios.

O catálogo tem 29 métricas canônicas, entre elas `steps`, `sleepMinutes`,
`sleepScore`, `restingHeartRateBpm`, `hrvSdnnMs`, `spo2Pct`, `weightKg`,
`stressScore`. Cada uma declara rótulo e unidade — mesmo princípio de "valor
sempre acompanhado de unidade" que o formato de analitos adota.

`correlations` só traz pares com ao menos 14 observações e `|r| >= 0.3`. O
corte é deliberado: correlação fraca sobre poucos dias não deveria virar frase
sobre a saúde de ninguém.

## `insightsJson` — a análise já gerada

```ts
type Insights = {
  resumo: string;
  destaques: { metrica, valor, comparacao, tom: 'positivo'|'neutro'|'atencao' }[];      // até 4
  pontosDeAtencao: { titulo, descricao, severidade: 'informativo'|'atencao', metricas }[]; // até 4
  padroes: { titulo, descricao, evidencia, confianca: 'baixa'|'media'|'alta' }[];        // até 3
  sugestoes: { titulo, acao, porque, esforco: 'baixo'|'medio'|'alto' }[];                // até 4
  perguntasParaOMedico: string[];                                                        // até 3
  limitacoes: string;
};
```

Validado por zod na saída do modelo, com a mesma definição gerando o schema da
tool — uma fonte de verdade só.

## O que herdamos de graça em segurança

O trabalho do Arturo já resolveu estruturalmente três coisas que as nossas
regras de linguagem pediam, e vale copiar o método em vez de reinventá-lo:

1. **`severidade` não tem nível "grave".** O comentário no código diz o
   porquê: o vocabulário disponível ao modelo não permite soar como diagnóstico
   fechado. É a regra 4 da constituição virando estrutura de dado, não
   instrução de prompt. Muito mais difícil de burlar.
2. **`perguntasParaOMedico` é campo obrigatório do schema.** O encaminhamento a
   um profissional de saúde deixa de ser uma frase que o modelo pode esquecer e
   passa a ser dado que precisa existir para a resposta ser aceita.
3. **Um guardrail do Bedrock criado por infraestrutura como código**
   (`health-insights-guardrail`), bloqueando diagnóstico fechado e prescrição
   na entrada e na saída, filtrando ataque de prompt e anonimizando dado
   pessoal.

Consequência para a nossa frente: as regras R1–R5 ganham uma quarta camada de
aplicação, e possivelmente a mais forte. Estudar se reaproveitamos o mesmo
guardrail ou criamos um irmão com as políticas do chat.

## Como a nossa tool vai ler

Precedente já estabelecido no repositório: a permissão de execução de uma
função não carrega a identidade do usuário, então as funções que precisam de
dado de outro dono leem o DynamoDB diretamente e recebem o nome da tabela por
variável de ambiente. Está feito assim para `UserProfile`, para os caches de
vacinação e para os medicamentos.

Nossa função segue o mesmo caminho: permissão de leitura sobre `HealthImport`,
nome da tabela por variável de ambiente, e filtro por dono feito por nós, com o
identificador vindo do token do usuário que chamou.

Regras de leitura:

- Linha com `status` diferente de `SUCCEEDED` não tem análise utilizável.
- Nenhuma importação é ausência de dado, não erro. A IA responde que não há
  dado de wearable registrado.
- `warnings` entra na resposta quando ela depender de uma métrica afetada.
- Nada é escrito deste lado. A nossa IA só lê.

## Pontos a alinhar com o Arturo

Poucos, e nenhum bloqueia:

- [ ] Quando há várias importações com períodos sobrepostos, qual vale? A mais
      recente por `analyzedAt`, ou a de maior cobertura?
- [ ] O `resultArtifactKey` é estável o bastante para lermos a série diária, ou
      ele é artefato de depuração que pode sumir?
- [ ] Faz sentido a nossa função reusar `health-insights-guardrail` ou criar um
      irmão para o chat?

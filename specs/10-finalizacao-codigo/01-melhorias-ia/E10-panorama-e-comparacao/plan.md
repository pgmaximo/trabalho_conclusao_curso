# PLAN: E10 — Panorama e comparação entre domínios

Estado: **aprovado em 2026-10-19; executado, com os desvios nas seções 10 e 11** · Data: 2026-10-19 · Spec: [`spec.md`](./spec.md) · Tarefas: [`tasks.md`](./tasks.md) · Passo a passo: `docs/superpowers/plans/2026-10-19-e10-panorama-e-comparacao.md`

## 1. Desenho em uma frase

Duas ferramentas somente leitura. Cada uma tem um módulo puro de saída (`*Saida.ts`), e a parte de leitura chama `lerDoDono` em paralelo, com o cache do turno. Elas reaproveitam, por função **exportada e não copiada**, as regras que já existem em analitos, consultas, vacinas, remédios e wearable. A frase fixa da comparação é costurada pelo código, no mesmo ponto do encaminhamento da R2. A guarda de causa é mais um padrão da R3.

## 2. Arquivos

| Arquivo | Muda ou nasce | Responsabilidade |
|---|---|---|
| `ai-language-rules/languageRules.ts` | muda | novo padrão da R3: conector de causa + assunto de saúde na mesma frase; exceção para recusa ("não mostra se", "não consigo dizer se") |
| `ai-language-rules/rulesPrompt.ts` | muda | a R3 nomeia a proibição, sem escrever o conector |
| `chat-assistant/tools/analitos.ts` | muda | extrai `serieDoAnalito(linhas, pedido)` (pura) do `run`; o `run` passa a ser leitura + essa função |
| `chat-assistant/tools/consultas.ts` | muda | extrai `separarConsultas(linhas, agora)` (pura, sem teto); a ferramenta aplica o teto como hoje |
| `chat-assistant/tools/vacinasSaida.ts` | muda | exporta `dosesAplicadasPorRecencia(linhas)`; `montarSaida` a usa |
| `chat-assistant/tools/wearable.ts` | muda | extrai `ultimaImportacaoPronta(linhas)`; a descrição aponta para `consultar_comparacao` |
| `chat-assistant/tools/panoramaSaida.ts` | nasce | `montarPanorama(linhas, agora)` (pura) e `renderizarPanorama` (modo degradado) |
| `chat-assistant/tools/panorama.ts` | nasce | `consultar_panorama`: seis leituras em `Promise.all` e `montarPanorama` |
| `chat-assistant/tools/comparacaoSaida.ts` | nasce | `montarComparacao(serie, importacoes, dado)` (pura): pares, mês, dias cobertos, média formatada |
| `chat-assistant/tools/comparacao.ts` | nasce | `consultar_comparacao`: duas leituras em paralelo, `serieDoAnalito` e `montarComparacao` |
| `chat-assistant/comparacaoFixa.ts` | nasce | `TEXTO_DA_COMPARACAO` e `costurarComparacao(texto, toolOutputs)` (pura) |
| `chat-assistant/tools/index.ts` | muda | registro: `consultar_panorama` primeiro; `consultar_comparacao` logo antes de `consultar_wearable` |
| `chat-assistant/citacoes.ts` | muda | indexa `pares[].exame` de `consultar_comparacao` |
| `chat-assistant/verificacao.ts` | muda | `consultar_comparacao` em `TOOLS_CLINICAS`; `entregar` costura a frase fixa antes do encaminhamento |
| `chat-assistant/chatPrompt.ts` | muda | quando usar as duas; o "como a pessoa está de modo geral" passa ao panorama |

`backend.ts` não muda. As seis tabelas já têm `grantReadData` e a variável `*_TABLE_NAME` no chat (linhas 580 a 593).

## 3. Contratos

```ts
// panoramaSaida.ts
type SecaoVazia = { disponivel: false; explicacao: string };
type LinhasDoPanorama = { documentos; resultados; medicamentos; consultas; vacinas; importacoes: LinhaDoBanco[] };
type SaidaDoPanorama = {
  disponivel: boolean;                       // alguma seção disponível
  documentos: { disponivel: true; total: number; exames: number; receitas: number;
                coletaMaisRecente: string | null; registroMaisRecente: string | null } | SecaoVazia;
  medicamentos: { disponivel: true; emUso: number; encerrados: number } | SecaoVazia;
  consultas: { disponivel: true; futuras: number; passadas: number;
               proxima: { quando: string | null; tipo: string | null; nome: string | null } | null } | SecaoVazia;
  vacinas: { disponivel: true; registrosAplicados: number;
             maisRecente: { nome: string | null; aplicadaEm: string | null } } | SecaoVazia;
  wearable: { disponivel: true; dadosAte: string | null; importadoEm: string | null } | SecaoVazia;
  ondeVerDetalhes: string;
};
export function montarPanorama(linhas: LinhasDoPanorama, agora: Date): SaidaDoPanorama;

// comparacaoSaida.ts
type DadoDoWearable = 'sono' | 'passos';
type ParLadoALado = {
  exame: { id: string; valor: number | null; unidade: string | null; dataDaColeta: string;
           documentoId: string; momento: string | null };
  wearable: { mes: string; media: string; diasDoMesNaImportacao: number; diasDoMes: number } | null;
  explicacaoDoWearable?: string;            // só quando wearable é null
};
type SaidaDaComparacao =
  | { disponivel: true; analito: string; dadoDoWearable: DadoDoWearable; pares: ParLadoALado[];
      omitidas: number; naoComparaveis: number; avisoDoAlinhamento: string }
  | { disponivel: false; explicacao: string };
export function montarComparacao(serie: SaidaDoAnalito, importacoes: LinhaDoBanco[], dado: DadoDoWearable): SaidaDaComparacao;

// analitos.ts
export function serieDoAnalito(linhas: LinhaDeResultado[], pedido: { analyteCode?: string; termo?: string }): SaidaDoAnalito;
// consultas.ts
export function separarConsultas(linhas: LinhaDoBanco[], agora: string): { futuras: ConsultaParaOModelo[]; passadas: ConsultaParaOModelo[] };
// vacinasSaida.ts
export function dosesAplicadasPorRecencia(linhas: LinhaDoBanco[]): LinhaDoBanco[];
// wearable.ts
export function ultimaImportacaoPronta(linhas: LinhaDoBanco[]): LinhaDoBanco | null;
// comparacaoFixa.ts
export const TEXTO_DA_COMPARACAO = 'Os dados aparecem lado a lado, e isso não mostra se um influenciou o outro.';
export function costurarComparacao(texto: string, toolOutputs: { name: string; output: unknown }[]): string;
```

## 4. Por que cada coisa mora onde mora

- **Funções extraídas, não copiadas.** O panorama e a comparação respondem sobre o mesmo registro que a ferramenta própria. Duas cópias de "qual é a próxima consulta", "o que é dose aplicada" ou "quais coletas se comparam" divergiriam, e a conversa daria duas respostas sobre o mesmo dado. Esse é o defeito que a base mais evita (e o motivo do `uspstf-shared`, do `doseSchedule.ts` e de `linhasDeResultado.ts`).
- **`serieDoAnalito` dentro de `analitos.ts`.** A função é o `run` atual sem a leitura. Movê-la para outro arquivo seria reforma; exportá-la é cirurgia.
- **`ultimaImportacaoPronta` em `wearable.ts`.** O critério de AC 4 ("mesma regra") só vale se for a mesma função.
- **A comparação não usa `ultimaImportacaoPronta`.** Ela precisa da importação que cobre o mês da coleta, que pode ser anterior à última. A regra dela é outra e mora em `comparacaoSaida.ts`: entre as `READY` com `metricsJson` legível, vale a criada por último entre as que cobrem o mês.
- **Frase fixa no código, em `entregar`.** É o ponto em que o encaminhamento da R2 já entra, e só para resposta aprovada. A ordem é frase da comparação e depois encaminhamento. Num módulo puro próprio (`comparacaoFixa.ts`), como `encaminhamento.ts`, porque o modo degradado também a usa.
- **A guarda de causa é um item de `PADROES_R3`.** Ela ganha de graça a exceção por recusa na mesma oração (`absolvido`), o bilhete da segunda geração e a cobertura de R1 a R5 no prompt.

## 5. A guarda de causa (D10.2)

- **Conector** (raiz, com flexões): `caus(ou|ad[oa]s?|ar|aram|ando)`, `por causa d`, `explic(a|am|aria|ou)`, `contribu(i|iu|íram|ir)`, `influenci(a|ou|ar|aram)`, `efeito d`, `devido a`, `em raz[aã]o d`, `gra[cç]as a`, `est[aá] (funcionando|fazendo efeito|dando resultado)`, `(fez|faz) efeito`.
- **Assunto de saúde** na mesma frase (antes ou depois do conector, até 80 caracteres): sono, dormir, passos, caminhar, exercício, atividade física, sedentarismo, remédio, medicamento, tratamento, exame, resultado, colesterol, glicose, glicemia, glicada, pressão, triglicerídeos, hemoglobina, vitamina, frequência cardíaca, peso. "Consulta" **não** entra: "remarcada por causa da chuva" precisa passar.
- **Exceção:** `RECUSA_DE_JULGAR` ampliada com `não (mostra|diz|indica|dá para saber|consigo dizer|sabe explicar) se` e `não sabe explicar`, antes do conector e na mesma oração.
- **Bilhete:** "A resposta liga dois dados de saúde como se um tivesse origem no outro. Mostre os dados lado a lado, cada um com sua data, sem ligar um ao outro: quem avalia é quem examina a pessoa." Ele não escreve o conector, para o modelo não imitar.

## 6. Alternativas descartadas

- **Comparação dentro de `consultar_analito`, com um parâmetro de wearable.** A saída da série cresceria em todo uso, e a descrição precisaria dizer duas coisas. Ferramenta separada, com descrição que contrasta.
- **Ler o `result.json` do S3 para ter a janela de 28 dias.** É o E6.2 (grant de S3, validação da chave). A D10.1 = B fixou o mês.
- **Escolher a importação que cobre mais dias do mês.** Mais preciso em casos raros, mas cria duas respostas diferentes para "qual importação vale", entre o wearable e a comparação. Vale a mais recente, como na spec (C2.6).
- **Costurar a frase fixa só na pergunta clínica.** A comparação sempre é clínica (`TOOLS_CLINICAS`). A costura não depende da classificação, para não quebrar se um dia ela mudar.
- **Panorama em `TOOLS_CLINICAS`.** Repetiria o falso positivo medido na U3 (`consultar_exames`).

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Falso positivo da guarda ("graças a Deus o exame saiu", "o resultado explica o que o laboratório mediu") | Casos dos dois lados em `adversarial.test.ts`. A lista de assuntos é fechada, e a exceção vale na mesma oração. Uma frase barrada vira segunda geração com bilhete, não resposta perdida. |
| Falso negativo (conector fora da lista: "levou a", "por conta de") | Registrado. A camada 1 (prompt e descrição) continua, e conector novo se acrescenta com teste. Não fecha tudo. |
| A média mensal soa mais precisa do que é | `avisoDoAlinhamento` na saída, a instrução do prompt, e o mínimo de 14 dias do mês na importação. |
| A extração quebra `consultar_analito` ou `consultar_consultas` | A extração vem antes de qualquer código novo (T2). As suítes existentes rodam sem mudança e precisam ficar verdes. |
| O panorama infla o custo do turno | Seis leituras com cache. A saída é só contagem, e o prompt manda não chamar a específica sem pedido. |
| "6 h 10 min por dia" casa com o padrão de intervalo de dose da R3 | Teste da média formatada contra `checkLanguageRules` (T5). Se casar, o formato muda, a R3 não. |

## 8. Impacto em desempenho e custo

- Panorama: seis `Scan` filtrados por dono, em paralelo, já com teto de páginas. Se o modelo chamar `consultar_exames` depois, ela não relê (cache). A saída fica abaixo de 400 tokens.
- Comparação: duas leituras em paralelo. A saída fica abaixo de 600 tokens com 3 pares.
- Prompt: duas linhas novas, e a de "modo geral" encurta. Fica perto de +120 tokens em todo turno.

## 9. Constituição

- **Regra 3:** nenhuma dependência nova.
- **Regra 4:** sem interpretação. A causa é barrada pela camada 4, e a frase fixa é do código.
- **Regra 5:** nenhuma mudança de schema, nem de dado ou de `backend.ts`.
- **Regra 8:** a única ambiguidade (qual importação vale num mês coberto por duas) foi registrada na seção 6.

## 10. Desvios do plano (registrados na implementação e na revisão, 2026-10-19)

1. **A guarda de causa saiu de `PADROES_R3` e virou um verificador próprio** (`verificarCausaEntreDados`, em `languageRules.ts`). O `/code-review` mostrou que um conector ao lado de **um** assunto de saúde barrava o texto curado das interações do E9 ("esses dois remédios podem causar sangramento") e frases operacionais ("a glicose ficou fora da comparação devido à unidade"). A regra agora é:
   - o conector conta se a **frase** tiver dois domínios de saúde diferentes (sono, atividade, remédio, medida e exame);
   - o veredito de tratamento ("está funcionando", "fez efeito", "dá certo") conta com o remédio na frase;
   - o infinitivo "causar" saiu da lista;
   - entraram "relacionado a", "associado a", "levou a", "por conta de" e "por isso";
   - a exceção exige "não … **se**" ("não mostra se", "não consigo dizer se"). Antes, qualquer "não mostra" anterior absolvia a frase.
   
   A frase é delimitada pelo mesmo `FIM_DE_FRASE` + `trechoEmVolta` da exceção do valor cadastrado, para que "7.200 passos" não parta a frase. Um teste novo passa **todos** os textos de `DRUG_INTERACTION_PAIRS` pela guarda.
2. **Comparação, cobertura da métrica:** a média mensal só considera os dias com dado. Por isso a métrica com `coveragePct` abaixo de 50 na importação não dá média (`MIN_COBERTURA_PCT`). O `avisoDoAlinhamento` diz que a média considera só os dias com registro.
3. **Comparação, escolha da importação:** vale a mais recente entre as que **servem** para o mês. Uma importação nova que cobre só o fim do mês não esconde uma antiga que cobre o mês inteiro.
4. **Comparação, nenhuma coleta comparável:** a saída passa a `disponivel: false`, com `explicacao` e a contagem `naoComparaveis`. Antes era `disponivel: true` com `pares: []`.
5. **Panorama:** `ondeVerDetalhes` inclui `consultar_receitas`. A data da coleta mais recente usa todas as linhas, como o `coletadoEntre` de `consultar_exames`.
6. **`/simplify`:**
   - os textos de "nada registrado" passaram a ser constantes exportadas pelas ferramentas de cada assunto (`SEM_DOCUMENTOS`, `SEM_MEDICAMENTOS`, `SEM_CONSULTAS`, `SEM_IMPORTACAO_PRONTA`);
   - a costura no fim ficou num lugar só (`acrescentarAoFim`, em `encaminhamento.ts`);
   - o agrupamento de milhar foi para `formatarInteiro` (`formatoPtBr.ts`, sem `Intl`);
   - `serieDoAnalito` passou a ter retorno discriminado;
   - `METRICA` passou a ser tipada com `MetricId`;
   - as importações são ordenadas uma vez só;
   - saíram os exports sem uso.
7. **`tools.test.ts`:** ganhou `ENTRADA_MINIMA` para a comparação, que tem campos obrigatórios. Sem isso, as afirmações sobre o dono passariam por não terem lido nada.

**Ficou de fora, com o motivo:**
- **Hook `linhasCitaveis` no `ChatTool`** (para tirar os ramos por nome de `citacoes.ts`): é um refactor que muda `consultar_analito` e `consultar_resultados`, fora deste épico. Fica registrado como dívida.
- **Hook `ressalvaFixa`:** só há um consumidor.
- **`daysBetween` compartilhado:** a conta é de duas linhas, e exportar de `doseSchedule.ts` mexe em outro épico.
- **Scan sem teto declarado no panorama** (o teto de 10 páginas de `lerDoDono` pode truncar contagens em silêncio): é o desenho de leitura de todas as ferramentas. Registrado como risco.

## 11. Os riscos da entrega (D10.3 a D10.5, 2026-10-19)

O estudo, as medidas e o resultado estão em [`../estudos/E10-riscos-da-entrega.md`](../estudos/E10-riscos-da-entrega.md). Em resumo:

- **A1:** a guarda de causa virou léxico por família, com dois domínios na frase, a exceção de ausência e o corpus permanente. Nas sondas cegas, pega perto de metade das frases de causa nunca vistas (antes, cerca de 4%). O resíduo pede a decisão estrutural descrita no estudo.
- **B1:** `lerDoDonoComCorte` e `leituraIncompleta` no panorama e na comparação.
- **C1:** `mesDaJanela` em `comparacaoSaida.ts`.
- **Risco D:** um teste de ida e volta sobre a lista inteira (`citacoesDaLista.test.ts`), e não o gancho, pelo custo de import descrito no estudo.
- **D10.6 ("uma frase, um domínio"):** `verificarUmaFraseUmDominio` (em `languageRules.ts`, ligado pela opção `cruzaDominios`, que `verificacao.ts` calcula a partir das ferramentas do turno). Testes: `ai-language-rules/__tests__/umaFraseUmDominio.test.ts`, os casos em `verificacao.test.ts` e o caso de ponta a ponta com paráfrase.

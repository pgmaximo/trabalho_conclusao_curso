# PLAN: E4 — Receitas e documentos

Estado: **aprovado em 2026-10-19; executado, épico concluído em 2026-10-19** · Data: 2026-10-19 · Spec: [`spec.md`](./spec.md) (aprovada em 2026-10-19) · Decisões: D4.1 = A, D4.2 = A

## 1. Resumo do desenho

Uma ferramenta nova, `consultar_receitas`, e um campo novo em `consultar_exames`. As duas usam a mesma regra pura de **situação da leitura** (`situacaoDaLeitura.ts`), para o chat nunca dizer de um documento uma coisa numa ferramenta e outra na vizinha. A receita lê os documentos pela porta de sempre (`lerDoDono`) e os itens pelo índice `documentId`, pela porta por índice do E3, que passa a aceitar índice **sem** chave de ordenação. A saída da receita é montada por um módulo puro (`receitasSaida.ts`) que só copia nome, três booleanos e a situação: dose, unidade, frequência, duração e texto bruto não têm campo na saída, então não têm como vazar (D4.2).

## 2. Arquivos

**Nascem**
- `amplify/functions/chat-assistant/tools/situacaoDaLeitura.ts` — puro: linha de `MedicalDocument` + agora → `LeituraDoDocumento`; e a explicação das situações, uma vez.
- `amplify/functions/chat-assistant/tools/receitasSaida.ts` — puro: escolha das 5 receitas, itens → saída, nome sem concentração, bloco do modo degradado.
- `amplify/functions/chat-assistant/tools/receitas.ts` — a `ChatTool`: lê, chama o puro, nada mais.
- Testes: `__tests__/situacaoDaLeitura.test.ts`, `__tests__/receitasSaida.test.ts`, `__tests__/receitasTool.test.ts`, `__tests__/infraReceitas.test.ts`.

**Mudam**
- `amplify/data/schemas/extractionEnums.ts` — passa a exportar `JANELA_DE_TRAVAMENTO_MS` (11 min), hoje privada em `start-document-extraction/handler.ts`, que passa a importá-la. Não é mudança de schema: é constante de código num módulo que o schema e as Lambdas já compartilham.
- `tools/ownerScopedRead.ts` — `INDICES_DO_DONO` ganha `ITENS_POR_RECEITA`; `lerDoDonoPorIndice` aceita índice sem ordenação.
- `tools/exames.ts` — `leitura` por documento e `explicacaoDaLeitura` uma vez.
- `tools/index.ts` — registra `receitasTool` logo depois de `analitosTool` (fecha o bloco de documentos).
- `amplify/backend.ts` — `PrescriptionItem` no laço de `grantReadData` do chat, `PRESCRIPTION_ITEM_TABLE_NAME`, `dynamodb:Query` em `index/*` da tabela.
- `chatPrompt.ts` — uma frase sobre receitas, uma sobre a situação da leitura.
- Testes ampliados: `leituraPorIndice.test.ts`, `examesTool.test.ts`, `tools.test.ts`, `chatPrompt.test.ts`.

**Não mudam:** schema do Amplify Data, telas, regras de linguagem, a Lambda de extração, `mapaDoApp.ts` (o caminho "Exames > tocar no documento" já existe).

## 3. Contratos

```ts
// extractionEnums.ts
export const JANELA_DE_TRAVAMENTO_MS = 11 * 60 * 1000;

// situacaoDaLeitura.ts
export type SituacaoDaLeitura =
  | 'nunca_lido' | 'na_fila' | 'lendo' | 'demorando'
  | 'lido' | 'sem_valores' | 'falhou' | 'desconhecida';
export type LeituraDoDocumento = {
  situacao: SituacaoDaLeitura;
  motivoDaFalha?: string;   // só em 'falhou', e só se ehCopyDeFalha(extractionError)
  avisosDaLeitura?: number; // só quando extractionWarnings tem itens não vazios
};
export function leituraDoDocumento(doc: LinhaDoBanco, agora: Date): LeituraDoDocumento;
export const EXPLICACAO_DA_LEITURA: string;

// ownerScopedRead.ts
export const INDICES_DO_DONO = {
  DOSES_POR_REMEDIO: { env, indice, chave: 'medicineId', ordenacao: 'scheduledDate' },
  ITENS_POR_RECEITA: {
    env: 'PRESCRIPTION_ITEM_TABLE_NAME',
    indice: 'prescriptionItemsByDocumentId',
    chave: 'documentId',
  },
};
export function lerDoDonoPorIndice(
  indice: IndiceDoDono,
  valorDaChave: string,
  intervalo: { de: string; ate: string } | undefined,
  identity: ChatIdentity,
): Promise<LinhaDoBanco[]>;
// índice com ordenação sem intervalo, ou sem ordenação com intervalo: lança.

// receitasSaida.ts
export const MAX_RECEITAS = 5;
export const MAX_ITENS_POR_RECEITA = 15;
export const MAX_NOME_DO_REMEDIO = 80;
export type ItemDeReceita = {
  remedio: string;
  temPosologiaNoPapel: boolean;
  conferidoPelaPessoa: boolean;
  leituraDuvidosa: boolean;
};
export type ReceitaParaOModelo = {
  documentId: string;
  titulo: string | null;
  dataDaReceita: string | null;
  validaAte: string | null;
  leitura: LeituraDoDocumento;
  itens: ItemDeReceita[];
  itensOmitidos: number;
};
export type SaidaDeReceitas = {
  disponivel: boolean;
  total: number;
  receitasOmitidas: number;
  receitas: ReceitaParaOModelo[];
  avisoDosItens: string;
  explicacaoDaLeitura: string;
  explicacao?: string; // só sem receita
};
export function escolherReceitas(documentos: LinhaDoBanco[]): { escolhidas: LinhaDoBanco[]; omitidas: number };
export function nomeDoRemedio(medicationLabel: unknown): string;
export function montarSaidaDeReceitas(
  escolhidas: LinhaDoBanco[],
  itensPorReceita: LinhaDoBanco[][],
  receitasOmitidas: number,
  agora: Date,
): SaidaDeReceitas;
export function blocoDegradadoDeReceitas(output: unknown): DegradedBlock | null;
```

**Regras que os contratos não mostram**
- **Situação:** tabela da spec §4. A referência de tempo do travado é `extractionStartedAt`, e na falta dela `createdAt` (só para `PENDING`: nenhum fluxo atual grava `PENDING` com início; ver §8). Data ilegível conta como "sem data".
- **Receita:** `documentType === 'prescription'`. Ordem por `documentDate`, mais recente primeiro (`maisRecentePrimeiro`).
- **Itens:** ordenados por `remedio` (`localeCompare` pt-BR), para a saída ser estável. Teto de 15 depois da ordem.
- **Nome:** `removerDose` (`drug-interactions-shared/normalizeDrugName.ts`, a mesma do E9), espaços colapsados, corte em 80 caracteres. Se nada sobrar (o rótulo era só "50mg"), `'nome não legível'`.
- **Posologia no papel:** algum de `dose`, `unit`, `frequency`, `duration` é texto não vazio.
- **Modo degradado:** título `'Receitas guardadas'`; uma linha por receita: `"<titulo ou 'Receita sem título'> · <dataDaReceita>: <remédios separados por vírgula>"`, ou `"…: nenhum remédio lido"`; uma linha final `'Nomes lidos da foto da receita, sem conferência.'`; `citacoes: []`.

## 4. Onde cada responsabilidade mora, e por quê

- **Situação da leitura num módulo próprio:** duas ferramentas precisam dela; uma cópia em cada divergiria (o defeito que a base mais evita). Puro, com `agora` por parâmetro, para o travado ser testável sem relógio falso.
- **Janela de travamento em `extractionEnums.ts`:** é o módulo que o schema, a Lambda de início e a de extração já importam, sem dependência nenhuma. Importar o `handler.ts` de outra Lambda puxaria o SDK e o handler inteiro para dentro do chat.
- **Itens pelo índice, na porta por índice:** é o desenho que a D3.2 fixou para não varrer a tabela de todo mundo. Uma porta nova para "índice sem ordenação" duplicaria o filtro de dono e a paginação; um parâmetro opcional na porta que já existe não.
- **A saída sem campo de posologia:** a garantia da D4.2 é estrutural. Um filtro "tira dose antes de mandar" pode esquecer um campo novo; um tipo que não tem o campo não.
- **Texto dos avisos fora:** parte vem do modelo de extração, lendo o papel (achado A4). Só a contagem sai.

## 5. Alternativas descartadas

- **`Scan` em `PrescriptionItem` com `lerDoDono`:** mais simples, mas lê os itens de todos os usuários a cada pergunta e perde item em silêncio quando passar do teto de páginas (risco R3 do PRD).
- **Situação da leitura só em `consultar_exames`:** o modelo teria de chamar duas ferramentas para dizer "a receita ainda não foi lida".
- **Mandar `extractionError` cru:** pode conter texto técnico gravado antes da lista fechada (G4 do Bloco 10).
- **Prazo de leitura ("costuma levar alguns minutos"):** a tela diz isso, mas o PRD proíbe o chat de prometer prazo.

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| O modelo repete a posologia de outra fonte (ex.: anexo da foto da receita na conversa). | A R3 continua barrando número com unidade e intervalo; teste de linguagem com as frases do CA-15. |
| Nome lido errado pelo OCR vira fato. | `avisoDosItens` em toda saída, `leituraDuvidosa` por item, prompt manda conferir na foto. |
| O modelo confunde receita com medicamento cadastrado. | Descrições contrastantes nas duas ferramentas e no prompt; ordem no registro (bloco de documentos). |
| Índice com outro nome no ambiente implantado. | Nome conferido em `amplify_outputs.json`; conferência no sandbox (§8 da spec). |
| Mudar a assinatura de `lerDoDonoPorIndice` quebra o E3. | O parâmetro continua na mesma posição; o teste do E3 roda sem mudança. |

## 7. Desempenho e custo

- `consultar_receitas`: um Scan com dono (já é o custo de `consultar_exames`) e até 5 `Query` em paralelo. Saída máxima ≈ 5 receitas × 15 itens × ~90 caracteres ≈ 7 mil caracteres, no pior caso; o comum é 1 ou 2 receitas com 2 a 5 itens.
- `consultar_exames`: nenhuma leitura nova; ~30 caracteres por documento mais uma explicação de ~600 caracteres por chamada.
- Prompt: duas frases, ~500 caracteres a mais por turno.

## 8. Decisões exigidas pela constituição

- **Regra 3 (stack):** nenhuma dependência nova.
- **Regra 5 (nada quebra):** nenhum schema muda; a constante movida mantém o valor (11 min) e o teste da Lambda de início continua verde; a Lambda do chat só ganha leitura.
- **Regra 8 (ambiguidade):** `PENDING` não tem data de início em nenhum fluxo atual (a Lambda de início grava `PROCESSING` direto). Interpretação: para `PENDING`, o tempo conta de `createdAt` do documento; sem nenhuma data, `na_fila`. Assim um documento esquecido na fila não fica "na fila" para sempre.

## 9. Desvios na execução (2026-10-19)

- **Encaminhamento no prompt (T4, T6):** a frase de encaminhamento planejada ("quem receitou ou o farmacêutico orienta") não satisfaz a R2, que reconhece "médico" e não "quem receitou". O prompt diz "o médico que receitou ou o farmacêutico orienta". A R2 não mudou.
- **Testes do E2 no prompt (T6):** achavam a regra de medicamentos pela primeira menção a `consultar_medicamentos`; a linha nova de receitas a cita antes. Passaram a ancorar no início da linha do E2.
- **Prova da constante movida (T1):** a Lambda de início não tem testes próprios; a prova é a suíte inteira e o typecheck:backend.
- **Teste da lista fechada de índices (T2):** passou a afirmar os dois índices; é a guarda da decisão, feita para mudar com ela.
- **Fechamento, riscos 1 a 4:** a Lambda de extração ganhou a limpeza dos itens superados na releitura (D4.3; a spec dizia que ela não mudava); `lerDoDono` ganhou o registro de leituras por turno (parâmetro opcional; sem ele, o comportamento é o de antes), e todas as ferramentas passam o contexto do turno; `montarSaidaDeReceitas` aceita `null` para a receita cujos itens falharam. Detalhes em `spec.md` §10.
- **Revisão (Fase 5):** o corte do nome do remédio foi além de `removerDose` (local a `receitasSaida.ts`, para não mudar o E9); itens com o mesmo nome se juntam; os motivos de falha que podem sair são montados uma vez, sem os que prometem prazo; a regra de travado virou `passouDaJanelaDeTravamento` em `extractionEnums.ts`, usada pela Lambda de início também. Detalhes em `spec.md` §9.

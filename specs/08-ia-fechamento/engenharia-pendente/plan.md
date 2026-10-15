# PLANO: Engenharia pendente do sistema de IA (Bloco 11)

Spec: `spec.md`, nesta pasta. Método: TDD com falha confirmada (o teste roda e
reprova por asserção antes de existir código; stub primeiro para a falha não ser
"nenhum teste encontrado"), mutação para o teste que passar de primeira,
`npm run validate` verde ao fim de cada bloco.

## Princípio de ordenação

Dado primeiro, porta depois. Os Blocos 1 e 2 corrigem dado de saúde que hoje
pode ficar errado ou sobrar; o 3 é pequeno e precisa de uma medição **antes** de
qualquer mudança de prompt; o 4 e o 5 abrem portas novas; o 6 escreve.

---

## Bloco 1 — Reprocessar não desfaz nem duplica (E1, E2)

### Módulo novo: `extract-document-data/regravacao.ts` (puro)

```ts
export type LinhaExistente = {
  id: string; analyteCode: string; collectionMoment: string | null;
  value: number | null; valueQualifier: '<' | '>' | null; unit: string | null;
  reviewStatus: ReviewStatus; correctedAt: string | null; projectLabel: string;
};
export type LinhaNova = { linha: LabResultRow; rotuloDoPapel: string };
export type PlanoDeRegravacao = {
  gravar: LabResultRow[]; apagar: string[]; avisos: string[];
  preservadas: number; substituidas: number;
};
export function planejarRegravacao(existentes: LinhaExistente[], novas: LinhaNova[]): PlanoDeRegravacao;
export function codigosLocaisDe(nova: LinhaNova): Set<string>;
```

Regras, em ordem:
1. **Mesma linha, conferida:** existe linha com o mesmo `id` e
   `reviewStatus = CONFIRMADO_PELO_USUARIO` → a nova leva `value`,
   `valueQualifier`, `unit`, `reviewStatus` da existente. Se o valor lido agora
   (ou o qualificador) difere, aviso: *"Você conferiu "{rótulo}" no papel. A
   leitura nova trouxe outro valor, e mantivemos o que você conferiu."*
2. **Substituição (1 para 1):** nova de código de catálogo; existente de código
   local, mesmo momento (aparado), código ∈ `codigosLocaisDe(nova)`, id
   diferente. Só age quando a correspondência é **única nos dois sentidos** —
   uma antiga casada com duas novas (Neutrófilos % e absoluto têm sinônimos
   parecidos) não é apagada nem transfere nada. A antiga vai para `apagar`; se
   ela estava conferida e a nova não caiu na regra 1, a nova herda os quatro
   campos **e** `correctedAt`.
3. Existente que não caiu em 1 nem 2: intocada.

`codigosLocaisDe` = `localAnalyteCode` do rótulo do papel, e do `label`,
`projectLabel` e de cada sinônimo da entrada de catálogo (`findAnalyteByCode`).

### `resultWriteBuilder.ts`

`LabResultRow` ganha `correctedAt?: string`. O construtor escreve
`correctedAt: row.correctedAt` — `undefined` não menciona o campo (o
`updateExpressionBuilder` já distingue `undefined` de `null`), então nenhuma
gravação normal apaga a data de correção.

### `resultRepository.ts` (borda com AWS)

- `listarLinhasDoDocumento(ddb, tabela, documentId)`: `QueryCommand` no índice
  `labResultsByDocumentId` (nome confirmado no sandbox), paginado.
- `apagarLinhas(ddb, tabela, ids)`: `DeleteCommand` sequencial.

### `handler.ts`

Depois do porteiro (`separarLinhasGravaveis`): mapa `id → rótulo do papel`
(montado antes, a partir das linhas brutas), leitura das existentes, plano,
**grava as novas primeiro e só então apaga** as substituídas — uma falha no meio
deixa duplicado, nunca perdido. Log `regravacao` com `preservadas` e
`substituidas`, sem conteúdo.

### `backend.ts`

`dynamodb:Query` em `${labResultTable.tableArn}/index/*` para a extração. O
`grantReadWriteData` de uma tabela do Amplify não garante o índice.

---

## Bloco 2 — Apagar leva junto o que foi lido; a lista vem inteira (E3, E4)

### `src/services/examService.ts`

- `apagarLidoDoDocumento(documentId)`: pagina `listLabResultByDocumentId` e
  `listPrescriptionItemByDocumentId` pelo `nextToken`, apaga cada linha; erro de
  qualquer uma lança.
- `deleteExamDocument` passa a: (1) `apagarLidoDoDocumento`, (2) remover os
  arquivos, (3) apagar o documento, (4) invalidar o cache.

### `src/services/extractionService.ts`

`fetchExtractionState` segue o `nextToken`.

---

## Bloco 3 — O vocabulário da R1 no prompt (E7), medido

1. **Medição antes**, sem tocar em nada: `rodar-avaliacao.ts` ganha
   `--perguntas r1a,r1b,r1c` e `--repeticoes 3` (puro: `filtrarPerguntas`,
   testado). Nove turnos contra o modelo real.
2. `languageRules.ts` exporta `instrucaoDoTermoVetado(): string` — a instrução e
   a tabela de substituições do estudo, com a raiz **montada** (a mesma
   constante). É o único arquivo que conhece a raiz, e continua sendo.
3. `chatPrompt.ts` inclui a instrução.
4. **Medição depois**, mesmos nove turnos. Mantém se a reprovação por R1 na
   primeira geração cair; reverte e registra se não cair.

---

## Bloco 4 — O PDF grande é dividido (E5)

### Dependência: `pdf-lib`

Regra 3: preenche lacuna real (nenhuma biblioteca de PDF no projeto; a Lambda
não tem como partir um PDF sem uma). É a biblioteca de manipulação de PDF em JS
puro mais usada (MIT, sem binário nativo — o esbuild da Lambda a empacota como
qualquer módulo). A última versão é de 2022: a API usada aqui (`load`,
`create`, `copyPages`, `save`) é a mais estável dela. Entra como dependência da
raiz, que é de onde as Lambdas resolvem pacotes.

### Módulo novo: `extract-document-data/divisaoDoPdf.ts`

```ts
export type ParteDoPdf = { bytes: Uint8Array; primeiraPagina: number; ultimaPagina: number };
export async function dividirPdf(bytes: Uint8Array, teto: number):
  Promise<{ ok: true; partes: ParteDoPdf[] } | { ok: false; motivo: 'grande-demais' | 'leitura-falhou' }>;
```

Metades sucessivas: a faixa inteira cabe → uma parte; senão, divide ao meio e
repete. Uma página sozinha acima do teto → `grande-demais`. PDF que o `pdf-lib`
não abre (cifrado, corrompido) → `leitura-falhou`. Páginas numeradas a partir
de 1.

### Módulo novo: `extract-document-data/juntarPartes.ts` (puro)

```ts
export function juntarPartes(partes: Array<{ parte: { primeiraPagina: number; ultimaPagina: number }; saida: RequestExtractionResult }>):
  RequestExtractionResult & { avisosDaJuncao?: string[] };
```

Resultados em sequência, `sourcePage + primeiraPagina - 1` (nulo continua nulo);
avisos e itens de receita somados; laboratório da primeira parte que o trouxer;
consumo somado. Parte com falha → aviso *"As páginas X a Y não puderam ser
lidas. Tente ler o documento de novo."* Todas com falha → a falha da primeira.

### `formatoDoArquivo.ts`

`TETO_PDF_DIVIDIDO_BYTES = 10 * 1024 * 1024` (o teto do aplicativo) e
`pdfDivisivel(bytes)`. `avaliarArquivo` **não muda** — o anexo do chat usa a
mesma função e continua cabendo num bloco só.

### `handler.ts`

PDF acima do teto do bloco e dentro do teto dividido → divide, lê parte a parte
(em sequência: o tempo de 600 s da Lambda comporta; o laudo de 20 páginas levou
111 s inteiro), junta.

---

## Bloco 5 — Várias folhas num documento (E6, Decisão O1)

### Schema

`MedicalDocument.extraPageKeys: a.string().array()` — chaves completas das
folhas 2 a N. Opcional; documento antigo não tem.

### Lambda

- `documentKey.ts`: `chavesDasFolhas(doc): string[] | null` — folha 1 pela regra
  de hoje; cada folha extra passa a mesma conferência de forma **e** está na
  mesma pasta da folha 1; no máximo `MAXIMO_DE_FOLHAS = 10`.
- `checksum.ts`: `somaDasFolhas(lista)` — uma folha → `fileChecksum` (ids de
  documento antigo não mudam); várias → soma das somas, em ordem.
- `bedrockClient.ts`: `ExtractionSource` de imagem passa a ter `folhas`; um bloco
  de imagem por folha, depois o pedido.
- `extractionPrompt.ts`: `buildUserAskDeFoto(tipo, quantidade)`; com mais de uma,
  diz que são folhas do mesmo documento, na ordem, e que `sourcePage` é o número
  da foto.
- `handler.ts`: lê todas; toda folha tem de ser imagem que cabe; PDF com folha
  extra → `formato-nao-suportado`.

### Aplicativo

- `AddExamScreen`: lista de folhas; quando a primeira é imagem, botão
  **"Fotografar outra folha"** (câmera) até 10; cada folha extra tem "remover".
- `examService.createExamDocument`: `folhasAdicionais`; cada uma é preparada,
  validada e enviada; `extraPageKeys` gravado.
- `deleteExamDocument`: remove todas as chaves.
- `DocumentDetailScreen`: com mais de uma folha, um botão "Abrir folha N" por
  folha (a mesma ação do "Baixar documento", com a chave da folha).
- Tipos e mapeamentos (`src/types/models.ts`, `useExamsData`, rota do detalhe)
  levam `s3Key` e `extraPageKeys`.

**Regra 1 e 8 da constituição:** o Canvas 3b mostra um card de arquivo único. A
lista de folhas reusa o mesmo card (um por folha) e o botão secundário do
design; a ambiguidade fica registrada em `tasks.md`.

---

## Bloco 6 — Encerramento

`limitacoes.md` (escopo, §2.3, §2.7, os dois achados), `decisoes.md` D47–D51,
`roadmap.md`, `notas.md`, comentário velho "79 analitos" no `handler.ts`,
Decisão K na spec do Bloco 10 aponta para cá.

## Ordem de execução

1 → 2 → 3 → 4 → 5 → 6. Deploy (schema novo no Bloco 5) e commit, só com pedido.

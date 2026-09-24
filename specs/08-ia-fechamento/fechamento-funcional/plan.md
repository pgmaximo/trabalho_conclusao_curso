# PLANO: Fechamento funcional do sistema de IA (Bloco 10)

Spec: `spec.md`, nesta pasta. Toda tarefa em TDD com falha confirmada; o que
passar de primeira é confirmado por mutação.

## Princípio de ordenação

**Primeiro o que protege o histórico, depois o que abre a porta, depois o que
mede.** A trava do gráfico (G10) vem antes da foto (G1) porque a foto é o
caminho em que o erro foi medido: abrir a porta antes da trava seria abrir para
o número errado.

A arquitetura segue uma regra só, e ela é de arquitetura limpa: **a decisão
pura mora em módulo sem SDK, testado; o SDK mora na borda, fino.** É o desenho
que o repositório já pratica (`documentText.ts` × `textractClient.ts`,
`escolhaDeFaixa.ts` × `handler.ts`) e que esta EPIC estende.

---

## Bloco 1 — O número do gráfico (G10)

### Módulo novo: `extract-document-data/valorDeGrafico.ts` (puro)

```ts
export function linhasLidasDeGrafico(
  avisos: string[],
  rotulos: { analyteLabel: string; projectLabel: string }[],
): Set<number>
```

Um aviso é "de gráfico" quando fala em gráfico/curva/histórico **e** em ler,
estimar ou extrair valor. O índice de uma linha entra no conjunto quando o
rótulo dela (o do papel ou o nosso) aparece nesse aviso — comparado sem acento e
sem caixa, porque o aviso é prosa do modelo e o rótulo é do laudo.

**Por que índice e não rótulo:** o mesmo analito pode aparecer duas vezes no
documento (D22, momentos de coleta). Devolver índices deixa quem chama rebaixar
exatamente as linhas certas.

### No `handler.ts`

Depois do `normalizeLabResult` e antes do porteiro: cada linha do conjunto sai
com `reviewStatus = 'PENDENTE_DE_REVISAO'`, e entra um aviso:
*"O valor de "{rótulo}" parece ter sido lido de um gráfico, e não de um número
impresso. Confira no papel antes de usar."* E um evento de log sem conteúdo
(`valor-de-grafico`, com a quantidade), como o `faixa-escolhida-pelo-modelo`.

### No prompt

Regra nova em `REGRAS DO LAUDO`:
*"Transcreva SOMENTE o numero impresso como resultado. NUNCA leia valor de
grafico, curva, barra ou historico -- esses numeros sao de outras datas ou sao
desenho. Se o resultado de um analito nao esta impresso neste documento, NAO crie
a linha."*

### Armadilha

O aviso pode nomear o analito pelo nome do papel ("HDL") e a linha ter o nosso
rótulo ("HDL") ou o do LOINC ("Cholesterol in HDL..."). Comparar pelos dois
rótulos da linha, e pelo menor dos dois não vazio, evita falso negativo. Falso
positivo aqui só custa uma revisão a mais — é o lado seguro.

---

## Bloco 2 — A rota pelos bytes, e a foto ao modelo (G1)

### Módulo novo: `extract-document-data/formatoDoArquivo.ts` (puro)

```ts
export type FormatoDoArquivo =
  | { tipo: 'pdf' }
  | { tipo: 'imagem'; formato: 'jpeg' | 'png' | 'webp' | 'gif' };
export function detectarFormato(bytes: Uint8Array): FormatoDoArquivo | null;
export const TETO_PDF_BYTES = 4_500_000;
export const TETO_IMAGEM_BYTES = 3_750_000;
```

Assinaturas: `%PDF-`; `FF D8 FF`; `89 50 4E 47 0D 0A 1A 0A`; `RIFF....WEBP`;
`GIF87a`/`GIF89a`. **O tipo declarado não é consultado.**

### `documentText.ts` → sai `chooseReadingPath`; sai `blocksToExtractedText`

As duas só existiam para o Textract. `ExtractedText` sai junto, e com ele o ramo
`texto` do `ExtractionSource`.

### `bedrockClient.ts`

`ExtractionSource` vira `{ kind: 'pdf'; bytes } | { kind: 'imagem'; formato; bytes }`.
O ramo de imagem monta `{ image: { format, source: { bytes } } }` seguido do
mesmo `guardContent` com o pedido. O prompt de imagem acrescenta:
*"O documento e uma FOTO ou imagem de uma pagina. Ela pode estar inclinada, com
sombra ou parte fora do quadro. O que nao estiver legivel, NAO transcreva:
registre em warnings."*

### `handler.ts`

Troca a escolha de rota: `detectarFormato(bytes)` → nulo falha com motivo
`formato-nao-suportado`; acima do teto falha com `grande-demais`; senão monta a
fonte. O ramo do Textract e a gravação do `ocr.txt` saem.

### Remoções

- `textractClient.ts`, `@aws-sdk/client-textract` do `package.json`.
- As quatro ações de Textract da extração e as duas do chat em `backend.ts`.
- `chaveDoTextoDoOcr` em `documentKey.ts`, se nada mais usar; `writeTextArtifact`
  em `s3Reader.ts`, idem.

**O campo `extractedTextKey` do modelo de dados fica** — ele é nulo desde a D19
no caminho do PDF, e remover campo de modelo é migração.

---

## Bloco 3 — O motivo da falha (G4)

### Módulo novo: `extract-document-data/motivoDeFalha.ts` (puro)

```ts
export type MotivoDeFalha =
  | 'formato-nao-suportado' | 'grande-demais' | 'ilegivel'
  | 'bloqueado-pelo-filtro' | 'arquivo-sem-chave' | 'leitura-falhou';
export const COPY_DA_FALHA: Record<MotivoDeFalha, string>;
export function copyDaFalha(motivo: MotivoDeFalha): string;
```

`requestExtraction` deixa de devolver `message` e passa a devolver `motivo`
(`bloqueado-pelo-filtro` ou `leitura-falhou`); a mensagem técnica vai ao log. O
`catch` do handler grava `leitura-falhou`. O `markFailed` recebe a copy, nunca
texto livre.

### Tela

`ExtractedResultsSection`, no bloco `FAILED`: mostra `state.errorMessage` quando
ele existe, e a frase genérica quando não (documento antigo). **Continua sem
mostrar texto técnico**, porque o campo passou a ser fechado na origem.

---

## Bloco 4 — A foto encolhe no aparelho (G2)

### Dependência

`npx expo install expo-image-manipulator` (do próprio Expo, já no Expo Go).

### Módulo novo: `src/services/imagemParaEnvio.ts`

Duas partes, separadas pelo mesmo motivo de sempre:

- **pura:** `dimensoesDeEnvio(largura, altura, maxLado = 2000)` e
  `ehImagem(nome)` / `nomeDeEnvio(nome)` (troca a extensão para `.jpg`);
- **borda:** `prepararImagemParaEnvio(uri)` chama o manipulador e devolve
  `{ uri, nome }` em JPEG 0,85.

### Onde entra

`uploadExamDocument` (tela de exames) e `uploadAnexoDoChat` (chat) chamam o
preparo antes do upload quando o arquivo é imagem. `ALLOWED_FILE_EXTENSIONS`
ganha `webp`, `heic` e `heif` — que saem convertidos em JPEG.

---

## Bloco 5 — O anexo de foto no chat (G3)

`AnexoLido` ganha `{ kind: 'imagem'; formato; bytes }` e perde `texto`.
`lerAnexo` usa `detectarFormato` e os mesmos tetos. `buildUserMessage` monta o
bloco de imagem e a mesma `NOTA_DO_ANEXO`.

---

## Bloco 6 — Censura por extenso (G5)

`numberParser.ts`: antes do sinal, reconhece as seis locuções (sem acento, sem
caixa, com espaço flexível) e as troca pelo sinal. Seis casos positivos, dois
negativos ("igual ou superior a", "entre").

---

## Bloco 7 — O vocabulário (G6)

Na ordem da TASK do estudo (V1–V7), com as recomendações da Decisão I:

1. **V1** — os três erros de documentação.
2. **V2** — o gerador ganha `TIME_ASPCT` (padrão `Pt`); regenerar e **provar por
   diff** que o CSV dos 79 não mudou.
3. **V3** — os alvos novos, por painel.
4. **V4/V5** — rodar, ler cada aviso, conferir cada linha nova.
5. **Catálogo** — `UNIDADE_CANONICA` e `MASSA_MOLAR` para os novos;
   `unitConverter` ganha as unidades novas (`s`, `mg/24h`, `mg/g`, `mL/min`,
   `U/mL`, `ug/L`, `pg/mL`, `nmol/L` já existe) e os apelidos do laudo (`seg`,
   `mg/24 h`).
6. **V6** — a varredura da D27.
7. **V7** — a documentação que cita contagem.

O teste de deriva (`catalogoNaoDeriva.test.ts`) é o critério de pronto: o
catálogo versionado é exatamente o que o gerador produz do extrato.

---

## Bloco 8 — A pipeline de avaliação (G7, G8)

### `scripts/avaliacao/` — três peças puras e duas bordas

| Arquivo | Papel |
|---|---|
| `bancoDePerguntas.ts` | as perguntas, cada uma com categoria e o que se espera mecanicamente (`deveCitar`, `deveRecusar`) |
| `eventos.ts` (puro) | lê as linhas de log capturadas e extrai reprovação por regra, costura, custo |
| `relatorio.ts` (puro) | monta o markdown da rodada |
| `rodar-avaliacao.ts` (borda) | chama `responder()` em processo, com as variáveis do sandbox, e grava o relatório |
| `planilhaT14.ts` (puro) + `gerar-planilha-t14.ts` (borda) | monta o CSV de conferência e conta as linhas automáticas erradas |

**Por que em processo e não pela URL da função:** a URL exige um token do Cognito
— uma senha. A chamada em processo exercita o mesmo `responder`, o mesmo modelo,
as mesmas tabelas e a mesma verificação; o que ela não exercita é a porta (auth,
limite de taxa), que já tem teste próprio.

**Rede:** o endpoint padrão do Bedrock em `us-east-1` é recusado pela rede desta
máquina (medido: conexão reiniciada), e o FIPS da mesma região responde. A
pipeline usa `AWS_USE_FIPS_ENDPOINT=true`, que o SDK lê do ambiente, sem mudar
uma linha do código da função.

---

## Bloco 9 — Encerramento acadêmico (G9)

Texto, não software. `estudos-ia/06-encerramento/limitacoes.md` e
`avaliacao-de-provedores.md`, reunindo o que está espalhado.

---

## Ordem de execução

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9, com `npm run validate` ao fim de cada bloco e
a remedição da foto (critério 23) depois do Bloco 2.

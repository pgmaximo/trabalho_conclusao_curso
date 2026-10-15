# PLANO: A função confere de quem é o arquivo

O `spec.md` diz **o que** e **por quê**. Este arquivo diz **como**, e onde estão
as armadilhas. Ele é hipótese até alguém executá-lo; o `tasks.md` registra o que
ele errar.

## Princípio de ordenação

**Primeiro o contrato, depois quem escreve, depois quem lê.** O nome do
metadado é a única coisa que os dois lados precisam combinar, e ele nasce num
módulo puro antes de qualquer um usá-lo. O envio vem antes da leitura porque uma
função que confere o metadado **antes** de o aplicativo gravá-lo recusaria todo
documento novo. É a mesma armadilha de ordem que vale para a publicação (ver
"Ordem de publicação").

---

## Bloco 1 — O contrato (`amplify/storage/metadadoDoDono.ts`)

Módulo **puro**, sem SDK, importável pelo aplicativo e pelas funções. Mora em
`amplify/storage/` porque é contrato do bucket, e não de uma função. Não confundir
com `amplify/storage/resource.ts`, que importa `@aws-amplify/backend` e **não**
pode ir para o bundle do aplicativo.

```ts
export const METADADO_DO_DONO = 'sub-de-quem-enviou';

export type ConferenciaDoDono = 'confere' | 'sem-metadado' | 'outro-dono' | 'sem-dono-esperado';

export function conferirDono(
  metadados: Record<string, string> | undefined,
  subEsperado: string | null,
): ConferenciaDoDono;
```

- `subEsperado` vazio ou nulo é recusa (`sem-dono-esperado`), e **não**
  "qualquer um serve". É o caso em que o `owner` da linha veio malformado.
- Comparação exata. Sem `trim`, sem caixa: o `sub` é UUID minúsculo dos dois
  lados, e normalizar aqui esconderia um erro de quem escreveu.

### Armadilha

O S3 guarda a chave de metadado **em minúsculas**. Um teste trava que a constante
é `^[a-z0-9-]+$`. Sem ele, um `subDeQuemEnviou` em *camelCase* passaria em todo
teste com dublê e falharia em todo documento real.

---

## Bloco 2 — Quem envia grava (`src/services/`)

| # | Arquivo | O que muda |
|---|---|---|
| 1 | `src/services/metadadoDeQuemEnvia.ts` (novo) | `metadadosDeQuemEnvia()` devolve `{ [METADADO_DO_DONO]: userId }`, com o `userId` de `getCurrentUser()` |
| 2 | `src/services/upload.ts` | `uploadData({ path, data, options: { metadata } })` |
| 3 | `src/services/chatAttachmentService.ts` | acrescenta `metadata` ao `options` que já tem `contentType` |

**Por que `getCurrentUser()` e não o `getUserId()` de `userSessionService`:** o
`getUserId` lê primeiro um cache do AsyncStorage. Um cache de outra sessão
gravaria o `sub` errado, e o documento da própria pessoa falharia. O
`getCurrentUser()` lê o token corrente. O `userId` dele é o `sub` do token, o
mesmo que o `owner` carrega antes do `::`.

**Módulo separado, e não dentro de `upload.ts`:** o anexo do chat não passa pelo
`uploadFileToS3` (ele monta o blob sozinho). Importar `upload.ts` só pelo
metadado traria o `expo-file-system` para o serviço do chat.

---

## Bloco 3 — A extração lê só o que é do dono

| # | Arquivo | O que muda |
|---|---|---|
| 1 | `documentKey.ts` | `subDoOwner(owner)`: a metade antes do `::`, ou `null` se não houver `::` ou se ela for vazia. **E o comentário errado sai** |
| 2 | `s3Reader.ts` | `readDocument` passa a devolver também `metadados: resposta.Metadata ?? {}` |
| 3 | `arquivoDoDono.ts` (novo) | `lerArquivoDoDono(bucket, key, subEsperado)`: lê, confere, devolve `{ ok: true, bytes }` ou `{ ok: false, motivo }`. Sem dono esperado, **nem lê** |
| 4 | `motivoDeFalha.ts` | motivo `arquivo-sem-dono`, com copy que diz o que fazer |
| 5 | `handler.ts` | troca `readDocument` por `lerArquivoDoDono`; recusa vira `markFailed` com a copy nova e um evento de log sem identificador de pessoa |

### O `subDoOwner` não repete o defeito de 2026-09-18

A linha que o `documentKey.ts` narra era `owner.split('::')[0]` guardada numa
variável chamada `identityId`. **A operação estava certa; o nome, não.** A metade
antes do `::` é o `sub`, e é o `sub` que se quer aqui. O teste usa o mesmo par
medido (`IDENTITY_ID` com região, `SUB` sem) e trava que `subDoOwner` devolve o
segundo e nunca o primeiro.

### Por que `lerArquivoDoDono` é um módulo, e não três linhas no handler

O `handler.ts` não tem suíte, e a EPIC de extração o deixou assim de propósito,
empurrando a lógica para módulos puros. A conferência é o conserto inteiro: se
ela morasse no handler, o conserto não teria teste. O módulo novo importa o
`s3Reader` e é testado com o `jest.mock` desse módulo, como o
`anexoPontual.test.ts` já faz.

### A ordem no handler

`chaveDoDocumento` → `lerArquivoDoDono` → `avaliarArquivo` → modelo. A chave
ausente continua sendo `arquivo-sem-chave`, e é conferida primeiro, porque sem
chave não há o que ler.

### Para o Bloco 11 (regravação)

Se a releitura de documento já lido passar a apagar ou substituir linhas, a
conferência de posse precisa ficar **antes** disso. Um documento antigo sem
metadado falha na releitura; a falha não pode custar as linhas que ele já tinha.
A tela de `FAILED` também esconde a seção de resultados, e isso precisa de
decisão lá.

---

## Bloco 4 — O chat lê só o anexo de quem pergunta

`anexoPontual.ts`:

- `_identity` vira `identity`, e `lerAnexo` chama
  `lerArquivoDoDono(bucket, key, identity.sub)`. Recusa é `null` (ausência),
  com log da recusa.
- `chaveDeAnexoValida` **fica**. Ela impede ler fora de `chat-attachments/`
  (de `medical-documents/`, inclusive), e isso a conferência de dono não faz:
  o arquivo do histórico da própria pessoa tem o metadado certo.
- O comentário errado sai.

### Armadilha

O `anexoPontual.test.ts` monta o dublê de `readDocument` **sem** metadado. Com o
conserto, todos os casos de leitura bem-sucedida passariam a devolver `null`.
O dublê padrão ganha o metadado da identidade de teste. Isso é ajuste de
**fixture**, e não de asserção: nenhum `expect` existente muda.

---

## Bloco 5 — A varredura

Um teste lê os `.ts` de `extract-document-data/` e `chat-assistant/` (fora de
`__tests__`) e trava que **só** `arquivoDoDono.ts` importa `readDocument`. É o que
impede um caminho novo de leitura, escrito daqui a três blocos, de pular a
conferência. O repositório já usa varredura assim (`catalogoNaoDeriva`,
`codigosLoincNaoDigitados`).

---

## Bloco 6 — Registro

- **D46** em `estudos-ia/00-visao/decisoes.md`: o mecanismo, as alternativas
  recusadas e o legado. É o lugar das decisões neste repositório;
  `03-esquemas/` guarda formato de dado, e o contrato aqui é um nome de
  metadado, que já está no `spec.md` §5.1 e no módulo que o define.
- Item no `04-implementacao/roteiro-de-conferencia.md` para o critério 14.

---

## Ordem de publicação

**Aplicativo e função sobem juntos**, e é assim que este projeto já publica
(Expo em desenvolvimento, sandbox). Se a função for publicada e o aplicativo
não, todo documento enviado pelo aplicativo **antigo** falha com
`arquivo-sem-dono`. Não é vazamento, é recusa, mas é visível. Nada aqui é
publicado sem pedido.

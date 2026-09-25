# TASKS: A função confere de quem é o arquivo

Acompanhamento. O porquê de cada item está na `spec.md`; o como, no `plan.md`.

**Toda tarefa desta lista segue o ciclo:** escrever o teste, rodar e **ver
falhar de verdade**, implementar, rodar e ver passar. "Nenhum teste encontrado"
não é falha confirmada. Teste que passa de primeira é confirmado por mutação.

## Estado

**Aberta em 2026-09-24**, no branch `seguranca/posse-do-arquivo-s3`, criado a
partir de `sistema_ia` (`9128524`). Na abertura, `npm run validate` estava verde
com **1410 testes em 122 suítes**.

---

## Bloco 1 — O contrato

- [x] Teste: a constante do metadado é minúscula, só `[a-z0-9-]`.
- [x] Teste: `conferirDono` devolve `confere`, `sem-metadado`, `outro-dono` e
      `sem-dono-esperado` nos quatro casos, e `sem-metadado` quando o mapa inteiro
      é `undefined`.
- [x] `amplify/storage/metadadoDoDono.ts`.

## Bloco 2 — Quem envia grava

- [x] Teste: `metadadosDeQuemEnvia()` usa o `userId` de `getCurrentUser()`.
- [x] Teste: `uploadFileToS3` passa o metadado ao `uploadData`, no ramo nativo
      **e** no web.
- [x] Teste: `uploadAnexoDoChat` passa o metadado **e** mantém o `contentType`.
- [x] `src/services/metadadoDeQuemEnvia.ts`, `upload.ts`,
      `chatAttachmentService.ts`.

## Bloco 3 — A extração

- [x] Teste: `subDoOwner` devolve o `sub`, **nunca** um identityId, e `null`
      para `owner` sem `::` ou com a metade vazia.
- [x] Teste: `lerArquivoDoDono` devolve os bytes quando o metadado confere.
- [x] Teste, **o achado**: a chave do laudo de B, lida para o dono A, é recusada
      como `outro-dono`.
- [x] Teste: objeto sem metadado é recusado como `sem-metadado`.
- [x] Teste: sem dono esperado, recusa **sem ler** o S3.
- [x] Teste: erro de leitura do S3 propaga (o handler o transforma em
      `leitura-falhou`).
- [x] Teste: o motivo `arquivo-sem-dono` existe, tem copy que pede o reenvio, e
      a copy é reconhecida por `ehCopyDeFalha`.
- [x] `documentKey.ts` (`subDoOwner` e o comentário), `s3Reader.ts`,
      `arquivoDoDono.ts`, `motivoDeFalha.ts`, `handler.ts`.

## Bloco 4 — O chat

- [x] Teste: anexo cujo metadado é de outro `sub` vira `null`, e os bytes não
      saem da função.
- [x] Teste: anexo sem metadado vira `null`.
- [x] Teste: o `sub` comparado é o de `identity`, o mesmo anexo lido por duas
      identidades dá resultados diferentes.
- [x] Fixture: o dublê padrão de `readDocument` ganha o metadado da identidade
      de teste. Nenhum `expect` existente muda.
- [x] `anexoPontual.ts` (a conferência e o comentário).

## Bloco 5 — A varredura

- [x] Teste: nas duas funções, só `arquivoDoDono.ts` importa `readDocument`.
      Confirmado por mutação (um import direto no handler reprova).

## Bloco 6 — Registro

- [x] D46 em `decisoes.md`.
- [x] Item no `roteiro-de-conferencia.md` para o critério 14.
- [x] `npm run validate` verde.

## Do usuário

- [ ] Publicar o sandbox (aplicativo e função juntos, `plan.md`, "Ordem de
      publicação").
- [ ] Critério 14: um laudo novo lido até `SUCCEEDED`, e o metadado visível no
      objeto. Passos em `roteiro-de-conferencia.md` §6.

---

## Execução (2026-09-24)

`npm run validate` verde com **1436 testes em 126 suítes**, contra 1410/122 na
abertura: **26 testes novos, 4 suítes novas** (`metadadoDoDono`,
`uploadComDono`, `arquivoDoDono`, `leituraSoPeloDono`). O lint tem os mesmos 11
avisos da abertura, nenhum em arquivo desta EPIC.

**Falha confirmada antes de implementar, por bloco.** Nos módulos novos, um
esboço que compila e se comporta errado foi escrito antes, para a falha ser de
asserção e não de "módulo não encontrado".

| Bloco | Falharam antes | Passaram de primeira, e o que foi feito |
|---|---|---|
| 1 | 5 de 6 | `confere` (o esboço sempre aceitava). Coberto pelas quatro recusas; a guarda de `sem-dono-esperado` foi confirmada por mutação |
| 2 | 5 de 8 | `continua devolvendo o caminho` e os dois do anexo que já existiam: regressão, comportamento anterior |
| 3 | 6 de 17 | `devolve os bytes` e `erro propaga`: **confirmados por mutação** (recusar sempre; engolir o erro). `nunca devolve um identityId`: é **guarda**, e não prova. Só reprova se `subDoOwner` inventar um identityId |
| 4 | 3 de 16 | os 13 que já existiam, com a fixture ajustada |
| 5 | 0 de 2 | **ver o primeiro defeito abaixo.** Confirmado por duas mutações (import direto no handler, import direto no `anexoPontual`) |

O `handler.ts` continua sem suíte, e a chamada de `lerArquivoDoDono` nele não é
testada por comportamento. Ela é travada pela varredura (o handler não tem outro
jeito de ler o bucket) e verificada pelo critério 14.

## O que o plano errou

1. **A varredura estava no bloco errado.** O plano a pôs no Bloco 5, depois dos
   blocos que removem os imports diretos, e por isso ela **não tinha como falhar
   antes**. No lugar certo, antes do Bloco 3, ela teria reprovado com
   `handler.ts` e `anexoPontual.ts`, que são exatamente as duas portas do achado.
   Compensado por mutação, mas o plano deveria pô-la primeiro.
2. **A fixture do chat não era só o dublê padrão.** O plano dizia "o dublê padrão
   ganha o metadado". Cinco casos sobrescrevem o dublê com o próprio
   `mockResolvedValue` (rota e teto), e sem o metadado passariam a testar a posse
   em vez da rota. Os cinco passam por um `comDono(...)`. Nenhum `expect` mudou.
3. **O branch de trabalho não estava onde o código estava.** A árvore de
   trabalho desta sessão estava em `main` (`62c1777`), que não tem `amplify/`, e
   sem `node_modules`. Criado `seguranca/posse-do-arquivo-s3` a partir de
   `sistema_ia` e ligado o `node_modules` do checkout principal por junção.
   `sistema_ia` no checkout principal tem uma alteração não commitada em
   `amplify/backend.ts` (Bloco 11), que **não** foi tocada. Esta EPIC não mexe
   nesse arquivo.

# E12 — Histórico de conversas: plano de execução

> **Para agentes:** sub-skill obrigatória: `superpowers:executing-plans` (ou `superpowers:subagent-driven-development`). Passos em checkbox (`- [ ]`). **Sem commit:** o projeto só faz commit quando o usuário pede (`PROMPT-PADRAO.md` §5, Fase 6). Branch único `sdd-10-finalizacao-codigo`, sem worktree.

**Objetivo:** excluir, reabrir e listar conversas leem até a última página; a gaveta diz quando não conseguiu excluir; o prompt diz que o assistente vê só a conversa aberta.

**Arquitetura:** as três leituras de `src/services/chatHistoryService.ts` passam por `src/services/todasAsPaginas.ts`, como a exclusão em cascata de documento (`examService.ts`, `apagarLidoDoDocumento`). A exclusão apaga mensagem a mensagem, em série, lança na primeira falha e só então apaga a conversa. A gaveta captura a falha e mostra `InlineError`. O prompt ganha um item na lista "Como você trabalha".

**Stack:** Expo / React Native, Amplify Gen 2 (`generateClient`), Jest (`jest-expo`), Testing Library.

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E12-historico-de-conversas/spec.md` (critérios CA-1 a CA-15).

## Restrições globais

- Sem mudança de schema, de `amplify/backend.ts`, de ferramenta do chat, de `mapaDoApp.ts` ou das regras de linguagem.
- `salvarTurno` e `criarConversa` não mudam: nunca lançam (H11).
- Mensagem de erro do serviço: `'Não foi possível excluir esta conversa.'` (via `backendError`).
- Texto da gaveta, exato: `'Não foi possível excluir esta conversa. Tente novamente.'`
- Textos, comentários e nomes de teste em pt-BR; cabeçalho "Resumo do arquivo" já existe nos arquivos tocados.
- Gate único: `npm run validate`.

## Foco de revisão

1. Página **vazia com `nextToken`** no meio da lista de mensagens (o filtro de dono do Amplify produz isso): a exclusão tem de seguir para a página seguinte, e não parar. Teste no T1.
2. Exceção lançada (rede) em `ChatMessage.delete`, e não só `errors`: a conversa não pode ser apagada. Teste no T1 (CA-3).
3. Tentar de novo depois de uma falha: a mensagem de erro some e, com sucesso, não volta. Teste no T3.
4. Abrir a confirmação de **outra** conversa depois de uma falha: o erro não pode aparecer embaixo da conversa errada. Teste no T3.
5. Varredura do prompt e da função: nenhum arquivo da função passa a citar `ChatMessage`/`ChatConversation` (a D12.1 depende disso). Teste no T4.

---

### Tarefa 1: excluir lê todas as páginas e para na primeira falha

**Arquivos:**
- Modificar: `src/services/chatHistoryService.ts` (`apagarConversa`, imports)
- Teste: `__tests__/chatPersistence.test.ts` (bloco "apagar significa sumir (D33)")

**Interfaces:**
- Consome: `todasAsPaginas<T>(buscar: (nextToken: string | null) => Promise<Pagina<T>>): Promise<T[]>`; `backendError(errors, friendlyMessage): BackendError`.
- Produz: `apagarConversa(conversationId: string): Promise<void>`, que agora **lança** em qualquer falha.

- [ ] **Passo 1: testes que falham** (no bloco existente, sem mudar os três testes atuais):
  - `'apaga as mensagens de TODAS as paginas, e so depois a conversa'`: `listChatMessageByConversationId` com `mockResolvedValueOnce` em 3 páginas: `{ data: [{id:'m-1'},{id:'m-2'}], nextToken: 't-2' }`, `{ data: [], nextToken: 't-3' }` (página vazia, foco 1), `{ data: [{id:'m-3'}], nextToken: null }`. Esperar `ChatMessage.delete` chamado com `m-1`, `m-2`, `m-3`; a 2ª e a 3ª leitura recebem `{ nextToken: 't-2' }` e `{ nextToken: 't-3' }` como segundo argumento; `ChatConversation.delete` chamado uma vez, depois do último `ChatMessage.delete` (ordem por `mock.invocationCallOrder`).
  - `'falha ao ler uma pagina NAO apaga nada'`: 1ª página com `nextToken`, 2ª com `errors: [{ message: 'x' }]`. `await expect(apagarConversa('c-1')).rejects.toThrow()`; `ChatMessage.delete` e `ChatConversation.delete` não chamados.
  - `it.each(['errors', 'excecao'])('falha ao apagar uma mensagem (%s) para ali e mantem a conversa')`: 3 mensagens numa página; a 2ª exclusão devolve `{ errors: [{ message: 'x' }] }` ou rejeita `new Error('rede')`. Lança; `ChatMessage.delete` chamado 2 vezes; `ChatConversation.delete` não chamado.
  - `'falha ao apagar a conversa lanca'`: `ChatConversation.delete` devolve `{ errors: [{ message: 'x' }] }`. `rejects.toThrow('Não foi possível excluir esta conversa.')`.
- [ ] **Passo 2:** `npx jest __tests__/chatPersistence.test.ts` → os quatro novos falham (uma página só; `errors` ignorado).
- [ ] **Passo 3: implementar.** `apagarConversa` lê com `todasAsPaginas((nextToken) => cliente().models.ChatMessage.listChatMessageByConversationId({ conversationId }, { nextToken }))`, apaga em `for ... of` checando `errors` (lança `backendError(errors, MSG_EXCLUSAO)`), depois apaga a conversa com a mesma checagem. `MSG_EXCLUSAO = 'Não foi possível excluir esta conversa.'`. Atualizar o comentário da função: lança na primeira falha, e a conversa só sai por último, então excluir de novo termina o serviço.
- [ ] **Passo 4:** mesmo comando → todos verdes, inclusive os três antigos (CA-5).

### Tarefa 2: reabrir e listar leem todas as páginas

**Arquivos:**
- Modificar: `src/services/chatHistoryService.ts` (`lerMensagens`, `listarConversas`)
- Teste: `__tests__/chatPersistence.test.ts` (bloco "listar as conversas" e bloco novo "reabrir uma conversa")

**Interfaces:**
- Consome: `todasAsPaginas` (T1 já importa).
- Produz: mesmas assinaturas e formas de retorno de hoje; agora lançam em `errors` de qualquer página.

- [ ] **Passo 1: testes que falham:**
  - `'reabrir traz as mensagens de todas as paginas, em ordem'`: 2 páginas (`nextToken: 't-2'`), mensagens com `createdAt` fora de ordem entre as páginas e uma com `citations` JSON. Esperar todos os ids em ordem de `createdAt` e a citação lida (CA-7).
  - `'reabrir com erro em uma pagina lanca'` (CA-8).
  - `'a gaveta mostra conversas da segunda pagina, mesmo com a primeira vazia'`: `ChatConversation.list` com `{ data: [], nextToken: 't-2' }` e depois `{ data: [a, b] }`; esperar os dois ids, mais recente primeiro, e a 2ª chamada com `{ nextToken: 't-2' }` (CA-9).
  - `'listar com erro em uma pagina lanca'` (CA-10).
- [ ] **Passo 2:** `npx jest __tests__/chatPersistence.test.ts` → os quatro falham.
- [ ] **Passo 3: implementar.** `lerMensagens` e `listarConversas` trocam a chamada única por `todasAsPaginas(...)` (`list({ nextToken })` na lista); o mapeamento e a ordenação ficam como estão.
- [ ] **Passo 4:** mesmo comando → verde. Depois `npx jest __tests__/chatbot-screen.test.tsx __tests__/chatComOrigem.test.tsx __tests__/acaoNoChat.test.tsx __tests__/anexoNoChat.test.tsx __tests__/nomesDosDestinos.test.tsx` → verde (CA-11).

### Tarefa 3: a gaveta diz que não conseguiu excluir

**Arquivos:**
- Modificar: `src/components/HistoryDrawer.tsx`
- Teste: `__tests__/gavetaDeHistorico.test.tsx` (bloco "apagar uma conversa")

**Interfaces:**
- Consome: `InlineError({ message }: { message: string })` de `@/components/InlineError`; `onDelete` continua `(id: string) => void | Promise<void>`.
- Produz: nada para outras tarefas.

- [ ] **Passo 1: testes que falham:**
  - `'se excluir falha, a gaveta diz e mantem a confirmacao aberta'`: `onDelete = jest.fn().mockRejectedValue(new Error('x'))`; confirmar; `await screen.findByText('Não foi possível excluir esta conversa. Tente novamente.')`; o painel (`/não pode ser desfeita/`) continua; o botão `'Excluir'` está ativo de novo.
  - `'tentar de novo com sucesso tira o aviso'`: `mockRejectedValueOnce` e depois `mockResolvedValueOnce(undefined)`; confirmar duas vezes; o aviso some (foco 3).
  - `'cancelar ou abrir outra conversa tira o aviso'`: após a falha, tocar `Cancelar` → aviso some; repetir a falha e tocar na lixeira da 2ª conversa → aviso não aparece (foco 4).
  - `'com sucesso, nenhum aviso de erro aparece'`.
- [ ] **Passo 2:** `npx jest __tests__/gavetaDeHistorico.test.tsx` → os testes de falha não acham o texto.
- [ ] **Passo 3: implementar.** Estado `erroAoExcluir: boolean`. `confirmarExclusao` limpa o erro antes de chamar, captura a rejeição e liga o erro; a função que abre ou fecha a confirmação (`setAConfirmar`) também limpa. O `InlineError` aparece logo acima do `DeleteConfirmPanel`, só para a conversa em `aConfirmar`. Comentário: por que o texto é fixo (a pessoa não precisa do motivo técnico; precisa saber que a conversa ainda está lá).
- [ ] **Passo 4:** mesmo comando → verde.

### Tarefa 4: o prompt diz que o assistente vê só esta conversa

**Arquivos:**
- Modificar: `amplify/functions/chat-assistant/chatPrompt.ts` (lista "Como você trabalha", depois do item do anexo)
- Teste: `amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts`, `amplify/functions/chat-assistant/__tests__/tools.test.ts`

**Interfaces:** nenhuma nova.

- [ ] **Passo 1: testes que falham.**
  - Em `chatPrompt.test.ts`, `describe('outras conversas (E12, D12.1)')`:
    - `'o prompt diz que o assistente ve so esta conversa e nao supoe o resto'`: `SYSTEM_PROMPT` contém `'Você vê só esta conversa'`, `'sem supor o que foi dito'` e `'tela Assistente'` (CA-12).
    - `'a resposta honesta passa pelas regras de linguagem'`: `checkLanguageRules('Não consigo ver outras conversas. Toque no relógio no alto desta tela para reabrir a de ontem. Se quiser, vejo agora o seu exame de sangue.', { questionKind, temOrigem: false })` é `{ ok: true }` para `'clinica'` e `'operacional'` (CA-13).
  - Em `tools.test.ts`, ao lado da varredura de escrita: `'nenhum arquivo da funcao le a conversa guardada (D12.1)'`: mesma varredura (fora `__tests__`), mais `amplify/backend.ts`, nenhum casa com `/ChatMessage|ChatConversation/`; `arquivos.length > 10` (CA-14). Este passa já no início: é trava contra regressão, e o passo 2 confere que ele **falha** se uma linha `// ChatMessage` for posta de propósito num arquivo da função (desfazer em seguida).
- [ ] **Passo 2:** `npx jest amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts` → o teste do prompt falha; o de linguagem passa ou falha (se falhar, o texto da resposta honesta é ajustado na spec, **não** a regra).
- [ ] **Passo 3: implementar.** Item novo, texto exato:

  ```
  - Você vê só esta conversa, e dela só as mensagens mais recentes. O que foi dito em outras conversas você não sabe: se a pessoa perguntar, diga que não consegue ver outras conversas, sem supor o que foi dito, e diga como reabri-las com o caminho da tela Assistente no mapa abaixo. Se ela quiser, busque o dado de novo com as ferramentas.
  ```

  O caminho vem do mapa, e não é repetido aqui: se o botão mudar, `mapaDoApp.test.ts` pega a mudança num lugar só.
- [ ] **Passo 4:** `npx jest amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts amplify/functions/chat-assistant/__tests__/tools.test.ts amplify/functions/chat-assistant/__tests__/mapaDoApp.test.ts` → verde.

### Tarefa 5: gate e documentação

- [ ] **Passo 1:** `npm run validate` → typecheck, typecheck:backend, lint e test:ci verdes. Colar o resumo (suítes e testes) em `tasks.md` (CA-15).
- [ ] **Passo 2:** marcar tarefas em `tasks.md`, atualizar `spec.md` (estado), READMEs de status e o PRD (12.2 descartado, 12.3 novo) na Fase 6.

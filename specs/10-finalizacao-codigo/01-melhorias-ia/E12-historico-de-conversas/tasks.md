# TASKS: E12 — Histórico de conversas: fechar o que a persistência não cobre

Passo a passo com teste antes da implementação: `docs/superpowers/plans/2026-10-20-e12-historico-de-conversas.md`. Esta lista é o acompanhamento.

## Estado

**Concluído em 2026-10-20** (entrega aprovada pelo usuário). T0 a T5 feitas; revisão com correções abaixo. **Pendente do usuário, fora do código:** a conferência no sandbox e no aparelho (seção no fim), que ele fará depois. Decisões D12.1 = A e D12.2 = A. Spec e plano aprovados em 2026-10-20.

`npm run validate`: linha de base 231 suítes / 3976 testes → 3995 depois de T5 → **231 suítes / 3998 testes** depois da revisão, exit 0; typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos, todos preexistentes em `src/`.

Branch: `sdd-10-finalizacao-codigo`, única para todo o SDD 10, no checkout principal, **sem worktree**. Commit só quando o usuário pedir. Alterações alheias ao épico: `metro.config.js`, `package.json`, `package-lock.json` (não tocadas pelo épico; a pedido do usuário, foram commitadas à parte em 2026-10-20, no commit `chore: atualiza dependencias e configuracao do metro`).

## Tarefas (ordem de execução)

- [x] **T0 — Linha de base.** `npm run validate` e `git status`, com o resultado anotado aqui. *Prova:* saída colada. **Feita em 2026-10-20:** exit 0; Jest **231 suítes / 3976 testes**; lint 0 erros e 12 avisos (preexistentes). `git status`: só os alheios e os docs do E12.
- [x] **T1 — Excluir lê todas as páginas e para na primeira falha.** `chatHistoryService.ts` (`apagarConversa`). Depende de: T0. *Prova:* `chatPersistence.test.ts` (3 páginas com uma vazia no meio; falha na leitura não apaga nada; falha por `errors` e por exceção na 2ª mensagem mantém a conversa; falha ao apagar a conversa lança; os três testes da D33 sem mudança) (CA-1 a CA-5). **Feita em 2026-10-20:** 5 testes; 4 vermelhos antes (uma página só; `errors` ignorado), o da exceção é guarda (verde desde o início: a rejeição já subia pelo `await`); 20 de 20 depois.
- [x] **T2 — Reabrir e listar leem todas as páginas.** `chatHistoryService.ts` (`lerMensagens`, `listarConversas`). Depende de: T1. *Prova:* `chatPersistence.test.ts` (2 páginas em ordem com citação; 1ª página da lista vazia com `nextToken`; `errors` lança nas duas); suítes de tela que mockam o serviço verdes (CA-7 a CA-11). **Feita em 2026-10-20:** 4 testes, vermelhos antes, verdes depois; com as 5 suítes de tela, 6 suítes / 75 testes verdes; typecheck limpo.
- [x] **T3 — A gaveta diz que não conseguiu excluir.** `HistoryDrawer.tsx`. Depende de: T0. *Prova:* `gavetaDeHistorico.test.tsx` (aviso e painel aberto na falha; some ao tentar de novo com sucesso, ao cancelar e ao abrir outra conversa; nenhum aviso no sucesso) (CA-6). **Feita em 2026-10-20:** 5 testes; 4 vermelhos antes (aviso inexistente), o do sucesso é guarda; verdes depois. Os avisos de `act(...)` de `chatbot-screen.test.tsx` já existiam na linha de base (28); a suíte da gaveta não gera nenhum.
- [x] **T4 — O prompt diz que o assistente vê só esta conversa.** `chatPrompt.ts`. Depende de: T0. *Prova:* `chatPrompt.test.ts` (trechos do item; resposta honesta aprovada pelas regras de linguagem nos dois tipos de pergunta); `tools.test.ts` (nenhum arquivo da função nem `backend.ts` cita `ChatMessage`/`ChatConversation`); `mapaDoApp.test.ts` verde (CA-12 a CA-14). **Feita em 2026-10-20:** 2 testes do prompt vermelhos antes, verdes depois; varredura verde desde o início (trava contra regressão) e conferida vermelha com uma linha `// ChatMessage` plantada de propósito, desfeita em seguida; 132 testes nas três suítes. **Ruling:** a frase honesta do CA-13 era reprovada pela R2 na pergunta clínica (falta encaminhamento); acrescentada "Para entender o resultado, converse com o seu médico." — a regra está certa e não muda, e a spec registra o ajuste — custo se errado: nenhum no código, só o texto de exemplo.
- [x] **T5 — Gate e documentação.** `npm run validate` verde, com a saída colada. Depende de: T1 a T4. *Prova:* saída do validate (CA-15). **Feita em 2026-10-20:** exit 0; **231 suítes / 3995 testes** (+19); typecheck e typecheck:backend limpos; lint 0 erros e 12 avisos preexistentes. Documentos de fechamento (READMEs, PRD) na Fase 6.

## Revisão (Fase 5, 2026-10-20)

Duas leituras independentes (um revisor com o código, a spec e o plano, sem as minhas conclusões, e `/code-review`), e `/simplify` em quatro ângulos. Cada correção de comportamento entrou com teste vermelho antes e verde depois.

**Corrigido**
- **Importante — aviso na conversa errada** (os dois revisores). Com uma exclusão em andamento, dava para abrir a confirmação de outra conversa, e o resultado da primeira caía nela (aviso de falha embaixo da conversa errada, ou o painel dela fechado sozinho). As lixeiras ficam travadas enquanto apaga, e a falha mora junto do id (`confirmacao: { id, falhou }`). Teste: "enquanto apaga, as lixeiras ficam travadas" (vermelho na 2ª versão; a 1ª passava sem a correção e foi reescrita para conferir a trava).
- **Importante — a frase nova do prompt contradizia a memória.** "O que foi dito em outras conversas você não sabe" convivia com o bloco de fatos que a pessoa pediu para lembrar, que nascem em outras conversas. A frase agora ressalva a memória. Teste por trecho.
- **Menor — aviso e confirmação sobreviviam a fechar e reabrir a gaveta** (o Modal não desmonta). Fechar limpa os dois, ajustado na renderização (o lint do React barra `setState` em efeito). Teste com `rerender`.
- **Menor — falha de leitura na exclusão saía com a mensagem genérica.** `todasAsPaginas` ganhou `mensagemDeFalha` opcional (os outros chamadores não mudam); a exclusão passa "Não foi possível excluir esta conversa.", como a spec §4.

**Simplificação (`/simplify`)**
- O estado da gaveta virou um só (`{ id, falhou } | null`), sem a função de troca nem o segundo setter; uma checagem só no JSX.
- As duas varreduras de `tools.test.ts` usam um auxiliar (`arquivosDaFuncao`).
- `limit: 1000` nas leituras paginadas: a lista de conversas varre a tabela inteira (sem índice por dono), e páginas maiores cortam as chamadas por volta de 10 vezes.

**Ruling (não corrigido, com motivo)**
- **Ler a lista inteira a cada turno salvo.** `useChatBot` relista a gaveta depois de cada turno (já era assim), e agora a leitura vai até o fim de uma tabela sem índice por dono: o custo cresce com o total de conversas de todos os usuários. A raiz é um índice por dono (mudança de schema, decisão própria, mesma dívida do R7). Atualizar a lista só em memória depois de salvar mexeria no `useChatBot`, fora do escopo. Custo se errado: latência e leitura a mais por turno, sem efeito na resposta (a releitura não bloqueia).
- **Exclusão em série.** Lotes em paralelo deixariam exclusões em voo depois da primeira falha; o plano escolheu série (mesmo desenho do documento). Custo se errado: exclusão de conversa muito longa demora alguns segundos.
- **Ler só o `id` antes de excluir** (`selectionSet`): exigiria uma segunda leitura para uma operação rara.
- **Reabrir conversa com falha não mostra nada na tela; retomar com falha esquece a conversa aberta.** Já era assim; o E12 só aumenta os casos (a H7 aceita). Fica para a Parte 2.
- **A varredura de `backend.ts` barra qualquer menção às tabelas de conversa**, não só uma concessão à função do chat. Hoje não há menção; uma Lambda futura legítima teria de ajustar o teste. Mantido: o falso positivo é barulhento e barato.
- **Dois textos de falha** (serviço e gaveta): é a convenção das outras exclusões (`HealthDashboardScreen`).
- `metro.config.js` (achado do `/code-review`): alheio ao épico, não tocado.

## Conferência no sandbox (pendente do usuário, fora do código)

1. Perguntas 1 a 3 da spec (§1) numa conversa nova: o assistente diz que não vê outras conversas, aponta o relógio no alto e não inventa.
2. Conversa com mais de uma página de mensagens (mais de 50 turnos, ou página menor no teste): reabrir mostra tudo; excluir e conferir no console do DynamoDB que nenhuma `ChatMessage` daquela conversa ficou.
3. Conta com muitas conversas, ou tabela com conversas de várias contas: a gaveta mostra todas as da pessoa.

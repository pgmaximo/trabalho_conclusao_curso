# Decisões do E12 — Histórico de conversas

Épico: [E12 no PRD](../prd.md) · Ordem de entrega: 12º · Duas decisões: D12.1 e D12.2 (nasceram no estudo [`estudos/E12-historico-de-conversas.md`](../estudos/E12-historico-de-conversas.md))

## O que o código faz hoje (verificado em 2026-10-20)

- A conversa é gravada pelo app (`chatHistoryService.ts`), com dono, e reaberta pela gaveta (`HistoryDrawer.tsx`). Apagar remove as duas tabelas (D33).
- O modelo vê só a conversa aberta, nas últimas 12 mensagens. A função não lê `ChatConversation` nem `ChatMessage`.
- `apagarConversa`, `lerMensagens` e `listarConversas` leem **uma página só**. Numa conversa longa, apagar deixa mensagens no banco; reabrir mostra só o começo; a gaveta pode esconder conversas.
- O prompt não diz que o assistente não vê outras conversas. O caminho até elas já está no mapa do app ("o relógio no alto abre as conversas antigas").

---

## D12.1 — O assistente deve ler outras conversas (12.2)?

**O que decidir:** se a pergunta "o que você me disse ontem sobre meu exame?" passa a ser respondida pelo assistente a partir da conversa antiga.

### Opção A — Não ler; dizer a verdade e apontar a gaveta *(recomendada)*

Uma frase no prompt diz que o assistente vê só a conversa aberta e aponta o caminho que o mapa do app já tem. A resposta passa a ser: "Não consigo ver outras conversas. Toque no relógio no alto desta tela para reabrir a de ontem." *(Corrigido depois da decisão: a primeira versão dizia que a gaveta precisava entrar no mapa; ela já estava.)*

**Benefícios**
- Nenhuma permissão nova, nenhuma ferramenta nova, nenhum texto antigo do modelo relido como fonte (mantém a D33 e a D34).
- A pessoa lê a resposta antiga com as citações de origem, que é mais confiável que um resumo dela.
- Para "lembre disso nas próximas conversas" já existe a memória (D34).

**Malefícios**
- Um toque a mais para a pessoa.

### Opção B — Ferramenta que lê só as perguntas antigas da pessoa

**Benefícios**
- Não relê texto gerado pelo modelo.

**Malefícios**
- Não responde a pergunta do 12.2, que é sobre a resposta do assistente.
- Varredura sem índice por dono (risco R7) e permissão nova sobre a tabela de mensagens.
- Texto antigo entra no contexto como dado e pode carregar instrução (injeção adiada).

### Opção C — Ferramenta que lê perguntas e respostas antigas

**Benefícios**
- Responde literalmente a pergunta do 12.2.

**Malefícios**
- Relê fala do modelo como registro: a "interpretação persistida" que a D33 e a D34 recusaram. Uma resposta antiga vira fonte sem citação de documento (R4).
- Todos os custos e riscos da opção B.

### Recomendação: **Opção A**

**Motivo:** o dado de saúde que a resposta antiga citou continua disponível pelas ferramentas, com origem. O que a conversa antiga acrescenta é a fala do modelo, e o projeto decidiu não tratá-la como fonte. Dizer a verdade e apontar o caminho custa uma frase.

**Efeito no PRD:** o 12.2 é descartado. O E12 passa a entregar a frase do prompt e as correções da D12.2.

**Decisão:** Opção A, não ler outras conversas; dizer a verdade e apontar a gaveta (2026-10-20).

---

## D12.2 — As leituras de uma página só (L1 a L3 do estudo)

**O que decidir:** se apagar, reabrir e listar passam a ler até a última página dentro deste épico.

### Opção A — Corrigir agora, com `todasAsPaginas` *(recomendada)*

As três leituras de `chatHistoryService.ts` passam por `src/services/todasAsPaginas.ts`, que já faz isso para exames e receitas. Apagar só remove a conversa depois de remover todas as mensagens; se uma página falhar, a conversa fica e o erro aparece.

**Benefícios**
- Fecha a quebra da promessa da D33 ("apagar significa sumir").
- Reaproveita código existente e testado; nenhuma dependência, nenhum schema novo.
- Pequeno: três funções e seus testes.

**Malefícios**
- Uma conversa ou gaveta muito grande faz mais de uma chamada (só quando há mais de uma página).

### Opção B — Registrar como dívida e encerrar o épico

**Benefícios**
- Nenhum código agora.

**Malefícios**
- A exclusão continua deixando dado de saúde no banco depois de a tela dizer que ele sumiu.

### Recomendação: **Opção A**

**Motivo:** é a única lacuna do levantamento que contraria uma decisão já tomada (D33), e o remédio já existe no projeto.

**Efeito no PRD:** o E12 ganha a tarefa 12.3, "leituras do histórico até a última página".

**Decisão:** Opção A, corrigir agora com `todasAsPaginas` (2026-10-20).

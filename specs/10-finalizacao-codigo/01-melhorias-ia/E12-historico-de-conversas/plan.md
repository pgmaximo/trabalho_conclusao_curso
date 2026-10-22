# PLAN: E12 — Histórico de conversas: fechar o que a persistência não cobre

Estado: **aprovado em 2026-10-20; executado, com os desvios da revisão em §8** · Data: 2026-10-20 · Spec: [`spec.md`](./spec.md) (aprovada em 2026-10-20) · Passo a passo: `docs/superpowers/plans/2026-10-20-e12-historico-de-conversas.md`

## 1. Desenho em uma frase

Três leituras do app passam a ir até a última página pelo módulo que já existe para isso, a exclusão para na primeira falha e só apaga a conversa por último, a gaveta diz quando não conseguiu, e o prompt ganha um item. Nada no backend muda.

## 2. Arquivos

| Arquivo | Muda o quê | Por que mora aqui |
|---|---|---|
| `src/services/chatHistoryService.ts` | `apagarConversa`, `lerMensagens`, `listarConversas` usam `todasAsPaginas`; a exclusão checa `errors` e lança `backendError` | O serviço é a única porta do app às duas tabelas (CLAUDE.md: telas e hooks não chamam `generateClient`). A regra "ler tudo antes de apagar o pai" fica junto da escrita que ela protege. |
| `src/components/HistoryDrawer.tsx` | captura a rejeição de `onDelete`, mostra `InlineError` acima do painel | A gaveta é dona do painel de confirmação e do estado "apagando"; o erro é o terceiro estado do mesmo painel. |
| `amplify/functions/chat-assistant/chatPrompt.ts` | um item na lista "Como você trabalha" | É onde o prompt diz de onde a resposta tira o que diz. |
| testes | `__tests__/chatPersistence.test.ts`, `__tests__/gavetaDeHistorico.test.tsx`, `chat-assistant/__tests__/chatPrompt.test.ts`, `chat-assistant/__tests__/tools.test.ts` | Os existentes de cada módulo; nenhuma suíte nova. |

**Não muda:** `useChatBot.ts` (as três chamadas já tratam erro: `recarregarConversas` e `abrirConversa` capturam; `retomarConversa` captura e esquece; `deleteConversation` deixa subir, e a gaveta passa a capturar), `todasAsPaginas.ts`, `mapaDoApp.ts`, schema, `backend.ts`, regras de linguagem.

## 3. Contratos

```ts
// chatHistoryService.ts — assinaturas iguais às de hoje
apagarConversa(conversationId: string): Promise<void>   // passa a lançar em qualquer falha
lerMensagens(conversationId: string): Promise<MensagemLida[]> // mesma forma; lança em `errors`
listarConversas(): Promise<ConversaSalva[]>              // mesma forma e ordem; lança em `errors`

// HistoryDrawer — props iguais; `onDelete` pode rejeitar
```

Mensagens: serviço `'Não foi possível excluir esta conversa.'`; gaveta, fixa, `'Não foi possível excluir esta conversa. Tente novamente.'`.

Item do prompt (texto exato no passo a passo, T4): o assistente vê só esta conversa e só as mensagens recentes; não sabe o que foi dito em outras; não supõe; aponta o caminho da tela Assistente no mapa; oferece buscar o dado de novo pelas ferramentas.

## 4. Decisões de desenho (e o que foi descartado)

- **`todasAsPaginas`, e não um laço novo.** Já é testado, já lança em `errors` de qualquer página, e é o que o Bloco 11 criou para o mesmo defeito em documentos. Um segundo laço seria a duplicação que a base mais evita.
- **Exclusão em série, e não em paralelo (`Promise.all`).** Em paralelo, uma falha no meio deixa outras exclusões em voo, e "parar na primeira falha" deixa de ser verdade. O precedente (`apagarLidoDoDocumento`) é em série. Custo: uma conversa de 100 mensagens faz 100 chamadas em sequência; é a mesma ordem de grandeza de hoje para uma página cheia, e excluir é raro.
- **Ler tudo antes de apagar a primeira mensagem.** Se a leitura de uma página falha, nada foi apagado, e a conversa fica inteira. Apagar página a página, à medida que lê, deixaria uma conversa pela metade quando a leitura falhasse.
- **O texto da gaveta é fixo.** A pessoa precisa saber que a conversa continua lá e que pode tentar de novo; o motivo técnico não ajuda. O texto do serviço ainda serve aos outros chamadores e ao console.
- **O caminho no prompt vem do mapa.** O item do prompt diz "o caminho da tela Assistente no mapa", sem repetir "relógio no alto". Se o botão mudar, `mapaDoApp.test.ts` pega num lugar só.
- **Descartado:** carregar a gaveta aos poucos (paginar na tela). A lista de uma pessoa é pequena; carregar tudo mantém o agrupamento por período simples e correto.
- **Descartado:** varrer e apagar mensagens órfãs antigas. Sem índice por dono, achá-las seria `Scan` da tabela inteira de todos os usuários, a partir do app. Fica como risco.

## 5. Constituição

- **Regra 3 (stack):** nenhuma dependência nova; reaproveita `todasAsPaginas`, `backendError` e `InlineError`.
- **Regra 5 (nada quebra):** sem schema novo. Para a pessoa com uma página de dados, as chamadas são as mesmas de hoje. A mudança de comportamento é a exclusão passar a lançar quando falha, e a tela passar a dizer isso; antes ela "funcionava" sem apagar.
- **Regra 1 (design):** a única peça visual nova é o `InlineError` que as telas de exclusão já usam (ex.: Dados do smartwatch). Registro pela regra 8: o Canvas não desenha o erro de exclusão da gaveta, e a interpretação mais coerente é o padrão das outras exclusões.
- **Regra 4 (IA):** a frase do prompt endurece, não afrouxa: proíbe supor o que foi dito.

## 6. Desempenho e custo

- App: leituras de várias páginas são sequenciais (o `nextToken` encadeia). Sem custo novo para quem tem uma página.
- Modelo: perto de 60 tokens a mais no prompt fixo, em todo turno. Nenhuma ferramenta, nenhuma iteração a mais.

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Mensagens órfãs de exclusões passadas continuam no banco | Fora de escopo (sem índice por dono); registrado na spec. A partir deste épico, não nascem novas. |
| A exclusão falha no meio e algumas mensagens já saíram | A conversa fica na gaveta; excluir de novo termina. O aviso diz para tentar de novo. |
| Uma gaveta muito grande demora a abrir | Improvável no uso real; se acontecer, a paginação na tela é decisão da Parte 2. |
| O modelo ignora a frase e inventa o que foi dito | Instrução, não trava de código; conferência no sandbox (spec §8). Um verificador para isso exigiria saber o que é "falar de outra conversa", que não se prova por léxico. |
| O tamanho real da página e o filtro de dono do Amplify divergem do simulado | Os testes simulam páginas vazias com `nextToken`, que é o pior caso; conferência no sandbox. |
| A gaveta é relistada a cada turno salvo, e a lista inteira é uma varredura da tabela de todos os usuários (achado da revisão) | `limit: 1000` por página. A raiz é um índice por dono (schema, decisão própria, junto do R7). |

## 8. O que mudou na revisão (2026-10-20)

Detalhe em `tasks.md`, seção Revisão. Desvios deste plano: a gaveta guarda a falha junto do id e trava as lixeiras durante a exclusão; fechar a gaveta limpa a confirmação; `todasAsPaginas` aceita a mensagem de falha; o item do prompt ressalva a memória; as leituras paginadas usam `limit: 1000`.

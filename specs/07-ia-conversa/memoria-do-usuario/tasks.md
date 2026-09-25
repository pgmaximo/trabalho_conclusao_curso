# TASKS: Memória do usuário (Bloco 7)

Passo a passo com teste antes da implementação e contratos de módulo:
`docs/superpowers/plans/2026-09-18-memoria-do-usuario.md`. Esta lista é o
acompanhamento.

## Estado

Aberto e entregue em 2026-09-18, no branch `sistema_ia`, depois da C8/C9
(`15d8f7c`). A analise de LGPD exigida pela D33 foi escrita ANTES de qualquer
linha de codigo: `estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`. A decisao
que ela produziu e a **D34**.

`npm run validate` verde com **1002 testes em 94 suites**, contra 939/91 ao fim
da M6 e 860/85 ao fim da C9. `react-doctor` 100/100 nos sete arquivos React
tocados -- depois de ele achar um defeito real, descrito no `notas.md`.

**O que continua aberto e de quem:** a medicao da memoria (com que frequencia o
modelo propoe, com que frequencia a proposta e descartada, com que frequencia a
pessoa confirma) anda junto com a C10, que e do usuario, e depende de chamada
real. A conferencia dos criterios de aceite um a um e da entrega e continua sem
ser feita, aqui como nas outras tres EPICs.

## A fundação

- [x] M1 — Dois models novos em `amplify/data/schemas/memory.ts`, compostos em `resource.ts`, com autorização por dono.
- [x] M1 — Nenhum campo de model existente é alterado — conferido por teste sobre o schema.
- [x] M1 — A função recebe permissão de **leitura** na tabela de fatos, e só de leitura.
- [x] M2 — Módulo puro `memoria/regras.ts`: lista fechada de tipos, teto de tamanho do fato, teto de fatos por pessoa. Sem nenhuma importação, para ser compartilhado entre a função e o aplicativo.
- [x] M2 — Tipo fora da lista fechada é recusado — teste por tipo inválido.
- [x] M2 — Texto acima do teto é recusado; texto vazio ou só espaço é recusado.

## O que não pode ser guardado

- [x] M3 — `memoria/propostaValida.ts`: a proposta passa por `checkLanguageRules` antes de existir.
- [x] M3 — Proposta com valor de medida é recusada — teste com número e unidade.
- [x] M3 — Proposta com diagnóstico, prognóstico ou risco é recusada.
- [x] M3 — Proposta com julgamento sobre a pessoa é recusada.
- [x] M3 — Proposta com condição, alergia ou medicamento é recusada — é registro, e tem formulário próprio.
- [x] M3 — Os padrões de recusa são testados **com acento**, porque `\b` sem a flag `u` não casa antes de `é`, `ã`, `ç`.
- [x] M3 — Nenhum padrão de recusa escreve o termo vetado.

## A proposta, do modelo até a tela

- [x] M4 — Campo **opcional** de proposta no envelope de resposta (`chatSchema.ts`), sem alterar `citationSchema`.
- [x] M4 — Resposta sem proposta continua válida — teste sobre o caminho antigo, que não pode mudar.
- [x] M4 — Instrução no `SYSTEM_PROMPT` sobre quando propor, e sobre o que nunca propor.
- [x] M5 — A proposta atravessa `verificacao.ts` e some quando recusada, **sem alterar a resposta entregue** — teste que prova as duas coisas na mesma execução.
- [x] M5 — Nenhum dos quatro caminhos da D31 muda de status por causa da proposta.
- [x] M5 — A proposta viaja no `ChatTurnResult` e chega ao aplicativo por `sendMessageWithSources`.

## A memória em uso

- [x] M6 — `memoria/leitura.ts` lê os fatos do dono por `lerDoDono`, e por nenhum outro caminho.
- [x] M6 — O bloco de memória entra no prompt de sistema **declarado** como preferência da pessoa, e dizendo que não é registro de saúde nem fonte de número — teste sobre o texto do bloco.
- [x] M6 — Sem fato nenhum, nenhum bloco é acrescentado ao prompt.
- [x] M6 — Com a memória desligada, os fatos não são lidos e nenhuma proposta é oferecida.

## A gravação, que é do aplicativo

- [x] M7 — `src/services/assistantMemoryService.ts`: gravar, listar, editar, apagar um, apagar todos, ler e escrever o interruptor.
- [x] M7 — O texto gravado é **exatamente** o texto que foi mostrado na confirmação — teste.
- [x] M7 — Gravar registra a data e a conversa de origem.
- [x] M7 — Editar registra a data da edição sem perder a data original.
- [x] M7 — Nenhuma escrita acontece sem passar pela validação da M2 e da M3.

## A tela e os direitos do titular

- [x] M8 — Cartão de proposta no chat, abaixo da bolha, com o texto exato e dois botões de mesmo peso.
- [x] M8 — `Agora não` não grava e não volta a propor o mesmo fato nesta conversa.
- [x] M8 — Depois de guardar, o cartão vira uma linha curta com atalho para a memória.
- [x] M9 — Tela `AssistantMemoryScreen` com lista, tipo, data, origem, editar e apagar.
- [x] M9 — Estado vazio explica o que é a memória — não é uma tela em branco.
- [x] M9 — Apagar pede confirmação em painel inline, nunca com alerta do sistema.
- [x] M9 — Apagar todos existe, separado da lista, com confirmação.
- [x] M9 — A tela não carrega aviso de encaminhamento, porque não mostra número de exame — decisão registrada na spec §5.2.
- [x] M10 — Interruptor da memória, com estado legível em texto.
- [x] M10 — Desligar **pergunta** se também apaga o que está guardado, com as duas saídas visíveis (art. 8º, §5 e art. 18, VI).
- [x] M11 — Porta de entrada na gaveta de histórico, ao lado do aviso de retenção.
- [x] M11 — O atalho para a conversa de origem some quando a conversa foi apagada, e o fato permanece.
- [x] M12 — Teto de fatos: atingido, o cartão diz que a memória está cheia e leva à tela. Nenhum fato antigo some sozinho.

## Correções achadas nesta EPIC (não são da memória)

- [x] X1 — A descrição de `consultar_exames` manda usar `consultar_analitos`, no plural; a tool registrada é `consultar_analito`, no singular. O modelo lê a descrição para escolher a tool, então o nome errado produz chamada a ferramenta inexistente. Corrigir e cobrir com teste de referência cruzada entre descrições e nomes registrados.
- [x] X2 — O teste "nenhuma tool importa comando de escrita" varre só `tools/`, enquanto o comentário de `amplify/data/schemas/chat.ts` promete que varre os arquivos da função. Ampliar a varredura para a função inteira, **antes** de esta EPIC acrescentar um diretório novo dentro dela.

## Encerramento

- [x] Nenhuma copy, teste, comentário ou prompt desta EPIC usa o termo vetado.
- [x] Nenhuma copy desta EPIC interpreta resultado de exame.
- [x] Critérios de aceite da `spec.md` conferidos um a um, em 2026-09-18: **22
      com teste, 3 sem teste, 0 não cumpridos, 2 não verificáveis sem chamada
      real**. A conferência achou duas afirmações falsas na própria spec, e as
      duas foram corrigidas nela: a metade sem teste do critério de `Agora não`
      (agora coberta em `__tests__/chatbot-screen.test.tsx`, e conferida por
      mutação), e a cláusula "coberto pelo teste já existente, que não é
      alterado" sobre a varredura de escrita — o teste FOI alterado, pela X2
      desta mesma EPIC.
- [x] `npm run validate` passa.

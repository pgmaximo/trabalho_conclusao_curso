# PLAN: Memória do usuário (Bloco 7)

Plano técnico completo (estrutura de arquivos, tarefas com teste antes da
implementação, contratos de módulo):
`docs/superpowers/plans/2026-09-18-memoria-do-usuario.md`.
Análise de LGPD, escrita antes desta EPIC existir:
`estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`.
Este arquivo registra as decisões exigidas pela constituição (regras 3, 5, 8).

## 1. Diagnóstico — estado atual vs. proposto

**Hoje o assistente não lembra de nada entre conversas.** Ele lê o dado
registrado a cada turno, pelas sete tools, e lê a janela da conversa atual. Se a
pessoa disser "responde mais curto", a conversa seguinte volta ao tamanho de
antes. A D33 fechou a conversa persistida (C8/C9) e, no mesmo texto, recusou ir
além: nenhum fato derivado pelo modelo.

**O proposto é uma terceira camada, pequena e cercada.** Fatos curtos,
confirmados um a um pela pessoa, lidos pela função no começo de cada turno e
injetados no prompt de sistema como contexto de forma.

| | Hoje | Proposto |
|---|---|---|
| Curto prazo | Janela de mensagens (C4) | Igual |
| Trabalho | Sete tools sobre o dado registrado (C2/C3) | Igual |
| Longo prazo | **Não existe** | `AssistantMemoryFact`, confirmado pela pessoa |
| Quem grava | O aplicativo, a conversa (C8) | O aplicativo, a conversa **e o fato** |
| A função escreve? | Não | **Continua não** |

**O que não muda, e a lista é a garantia de que a regra 5 está sendo cumprida:**
o laço de tools, as sete tools, `ownerScopedRead`, a verificação da D31, o
esquema de citação, o modo degradado, o guardrail, o rate limit e o contrato
somente leitura da função.

## 2. Novas dependências (regra 3 da constituição)

**Nenhuma.**

| Pacote | Escopo | Por quê | Alternativa considerada |
|---|---|---|---|
| — | — | Tudo o que a EPIC precisa já está instalado: `zod` para o campo novo do envelope, o cliente do Amplify para gravar, `@aws-sdk/lib-dynamodb` para ler | — |

## 3. Decisões de arquitetura (regra 5 — nunca efeito colateral)

- **A proposta viaja num campo OPCIONAL do envelope JSON que já existe, e não
  numa tool.** Duas razões. A primeira é a D9: tool que escreve quebraria o
  contrato somente leitura e o teste que o verifica. A segunda é conceitual —
  tool é coisa que o modelo decide chamar, e uma memória que o modelo decide
  quando consultar não é memória. Campo opcional também significa que **uma
  resposta sem proposta continua válida**: nada no caminho antigo muda.

- **Quem grava é o aplicativo, a partir de um toque.** Mesmo desenho da C8, e
  pela mesma razão: gravando pelo aplicativo, a autorização por dono é a do
  AppSync — a mesma que protege exame e consulta — e não uma regra que
  escrevemos. Aqui isso ganha uma segunda camada de valor, porque é também o
  consentimento do art. 11, I virando caminho de código.

- **A memória entra no prompt de sistema, sempre, declarada.** O bloco diz em
  palavras que aquilo é preferência que a pessoa pediu para ser lembrada, que
  não é registro de saúde e que não serve como fonte de número. Sem a
  declaração, "faço caminhada três vezes por semana" poderia ser citado como se
  fosse dado registrado.

- **A verificação da proposta é um caminho separado da verificação da
  resposta.** Reprovar a proposta descarta a proposta e entrega a resposta. Se
  fossem o mesmo caminho, uma proposta ruim derrubaria uma resposta boa — a
  EPIC nova quebrando a entregue.

- **Dois models novos, nenhum campo alterado.** `AssistantMemoryFact` e
  `AssistantMemorySetting`, em `amplify/data/schemas/memory.ts`. Nada é
  acrescentado a `UserProfile` nem a `ChatConversation`: campo novo em model
  existente para guardar preferência do assistente misturaria dois domínios, e
  o interruptor da memória não pertence ao perfil de saúde.

- **`AssistantMemorySetting` é uma linha por dono, e o código trata a ausência
  dela como "ligado".** Ausência significa que a pessoa nunca mexeu no
  interruptor; e mesmo "ligado" não grava nada sozinho, porque gravar depende de
  confirmação. O estado que a análise de LGPD chama de "desligado por padrão" é
  o **conjunto vazio de fatos**, que é o real: sem confirmação, não há dado.

- **A leitura dos fatos reusa `lerDoDono`, sem exceção.** A porta única de
  leitura por dono continua única. A memória não é tool, mas lê pela mesma
  função, e o teste que garante que nenhum dono vem do corpo continua cobrindo
  o caminho.

- **A varredura do teste somente leitura passa a cobrir a função inteira.** Ela
  cobria só `tools/`, enquanto o comentário de `amplify/data/schemas/chat.ts`
  prometia que varria "os arquivos dela". A EPIC acrescenta um diretório novo
  dentro da função, então a promessa precisa virar verdade antes de o diretório
  existir. Achado desta EPIC, corrigido nela.

- **Nenhum fato vira citação.** `citationSchema` não muda. Não existe
  `factId` em citação, e é por isso que um fato não consegue ser fonte de
  número nem por acidente: não há campo onde escrevê-lo.

## 4. Ambiguidades documentadas (regra 8)

- **Quantos fatos cabem.** Nem o pedido do usuário nem a análise de LGPD dão um
  número; o art. 6º, III pede "o mínimo necessário", que não é um número.
  Proposta: **20**. É mais do que uma pessoa costuma ter a dizer sobre a forma
  como quer ser atendida, e pouco o bastante para caber numa tela que ela leia
  inteira — e ler inteira é o direito do art. 18, II. Número no código, com
  nome, calibrado se a medição mostrar outra coisa.

- **Quanto cabe num fato.** Proposta: **140 caracteres**. Acima disso deixa de
  ser fato e vira resumo, que é a quarta memória, recusada na D34. Registrado
  porque é limite que veio de julgamento, não de artefato.

- **Quais tipos existem.** O Canvas não desenha memória, e a análise de LGPD só
  exige que a lista seja fechada. Proposta: quatro — `COMO_ME_CHAMAR`,
  `PREFERENCIA_DE_RESPOSTA`, `ROTINA`, `ACESSO_A_CUIDADO`. A fronteira que os
  define é: **cabe aqui o que muda a forma da resposta; não cabe o que muda o
  conteúdo factual sobre saúde**, porque isso tem formulário próprio.

- **O que fazer quando a pessoa relata uma condição.** Proposta: não guardar
  como fato, e a resposta pode apontar o perfil de saúde. Registrado como
  ambiguidade porque a alternativa — guardar, já que foi ela quem disse — é
  defensável e foi recusada por uma razão de arquitetura, não de lei: duas
  fontes de verdade sobre a mesma condição divergem, e a que o assistente lê a
  cada turno passaria a ser a que ninguém atualiza.

- **Se a proposta aparece em toda resposta ou só às vezes.** Proposta: **no
  máximo uma por turno, e só quando a pessoa afirmou algo sobre si**. Um cartão
  em toda resposta transforma consentimento em ruído, e ruído é clicado sem ler
  — que é o oposto do que o art. 11, I quer dizer com "destacado".

- **O que acontece com o fato quando a conversa de origem é apagada.**
  Proposta: o fato fica, e o atalho para a origem some. O fato é da pessoa, não
  da conversa. Registrado porque a alternativa (apagar em cascata) também é
  defensável e teria efeito surpreendente: apagar uma conversa mudaria o que o
  assistente lembra, sem que a tela de histórico diga isso.

## 5. Limites e custo

**O prompt cresce, e o crescimento tem teto.** Vinte fatos de até 140
caracteres são no máximo cerca de 2.800 caracteres, algo perto de 900 tokens de
entrada por turno, somados aos ~1.500 do prompt de sistema atual. É aumento
real e limitado por construção — o teto de fatos é o teto do custo.

**Nenhuma chamada nova ao modelo.** A proposta sai da mesma resposta, no mesmo
envelope. A verificação da proposta é determinística, em código, e não paga
inferência. Custo marginal de inferência por turno: apenas os tokens de entrada
acima.

**Uma leitura a mais no DynamoDB por turno**, pelo mesmo `ScanCommand` com
filtro por dono das outras sete. Tabela pequena por construção (teto de 20 por
pessoa).

**O que precisa ser medido junto com a C10:** com que frequência o modelo propõe
fato, com que frequência a proposta é descartada pela verificação e com que
frequência a pessoa confirma. As três juntas dizem se a memória está ajudando ou
pedindo atenção à toa. Sem isso, "a memória funciona" é impressão.

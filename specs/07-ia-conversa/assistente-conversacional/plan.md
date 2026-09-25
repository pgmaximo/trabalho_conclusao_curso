# PLAN: Assistente conversacional (Bloco 7)

Plano técnico completo (estrutura de arquivos, tarefas com teste antes da
implementação, código): `docs/superpowers/plans/2026-09-16-assistente-conversacional.md`.
Este arquivo registra as decisões exigidas pela constituição (regras 3, 5, 8).

## 1. Diagnóstico — estado atual vs. proposto

A tela 4a existe e funciona. O que ela não tem é IA: `aiAssistantService.ts`
devolve uma de quatro frases fixas depois de um atraso simulado, e o arquivo
diz isso em palavras, num aviso que separa a fronteira de propósito:

> a troca por uma IA real (provedor, custo por token, política de retenção de
> dados de saúde enviados a uma API de terceiros, base legal LGPD) é uma
> decisão maior que requer confirmação explícita.

**Esta EPIC é essa troca**, e três das quatro preocupações daquele aviso já
foram respondidas em outro lugar: o provedor é o Bedrock (D14), o custo por
token é medido no mesmo padrão da feature de wearable, e "API de terceiros"
deixou de ser o caso — o Bedrock roda na conta da AWS do próprio projeto, e os
dados não saem dela. **A quarta continua aberta e bloqueia parte da entrega:**
retenção de conversa é a tarefa 0.5 do roadmap, e a §2 da spec a isola.

O contrato `AiAssistantService` foi desenhado para que a troca fosse a
substituição de uma função, nunca uma refatoração de interface. Esta EPIC
comprova esse desenho ou o corrige.

## 2. Novas dependências (regra 3 da constituição)

| Pacote | Escopo | Por quê | Alternativa considerada |
|---|---|---|---|
| `@aws-sdk/client-bedrock-runtime` | devDep (backend) | Já é dependência da feature de wearable — reaproveitada | — |
| `aws-jwt-verify` | devDep (backend) | Verificar o token do Cognito dentro da função, que deixou de ser trabalho do AppSync (D12) | Assinar a requisição com as credenciais do conjunto de identidades: mais próximo do que o Amplify já faz, porém obriga o aplicativo a montar assinatura SigV4 à mão para um endereço que não é do AppSync |

**Nenhuma dependência nova no aplicativo.** A tela, o hook e as bolhas já
existem.

**Uma dependência nova no backend, e a justificativa é a D12.** Tirar o chat do
AppSync transfere a verificação de identidade para dentro da função. Escrever
verificação de token JWT à mão — buscar as chaves públicas, cachear, validar
assinatura, emissor, público e expiração — é exatamente o tipo de código de
segurança que não se escreve à mão quando existe a biblioteca oficial do
provedor. `aws-jwt-verify` é da AWS, é a indicada para este caso, e roda só no
backend.

**Recusado — cliente Anthropic para Bedrock.** Mesma razão registrada na EPIC de
extração: o repositório já tem `ConverseCommand` funcionando, e o
`guardrailConfig` é recurso do Bedrock exposto por essa via.

**Recusados — LangChain e LangGraph** (D20). Aqui a recusa é mais discutível do
que na extração, e o registro precisa ser honesto sobre isso: o laço de tools e
a persistência por identificador de linha seriam caso de uso real. Recusados
mesmo assim por três razões concretas — a camada de segurança se apoia em
`guardrailConfig` e `toolChoice` nativos do Bedrock, não existe checkpointer
oficial para DynamoDB, e a tela precisa de linhas de conversa que o cliente do
Amplify leia. O ganho seria organizacional; o custo seria três pacotes no pacote
da função e uma camada a mais entre o projeto e o comportamento que ele precisa
explicar no TCC.

## 3. Decisões de arquitetura (regra 5 — nunca efeito colateral)

- **Endereço direto da função, fora do AppSync (D12).** Primeiro do
  repositório. Esta EPIC herda as três consequências e as resolve: autenticação
  por verificação de token dentro da função, origem cruzada restrita, e limite
  de chamadas por dono.
- **Nenhuma tool escreve.** O laço é auditável porque o único efeito da conversa
  sobre o banco é a própria conversa (D9). Verificado por teste sobre a lista de
  tools registradas, não por revisão de código.
- **O dono vem do token, nunca do corpo da requisição.** É a regra de segurança
  mais importante desta EPIC: um identificador aceito do corpo transformaria o
  endereço direto numa porta para ler dado de saúde de outra pessoa.
- **A tela e o hook não mudam de forma.** `AiAssistantService` continua sendo o
  contrato. Se a implementação real exigir mudar a forma do contrato, isso é
  registrado como achado — significaria que o desenho da EPIC anterior não
  previu o que precisava prever.
- **A persistência é separável, e está separada.** Todo o resto funciona com a
  conversa em memória, como hoje. É o que permite construir e testar a função
  inteira enquanto a tarefa 0.5 não é respondida.
- **`ChatMessage` guarda as citações.** Sem isso, a promessa de "todo número tem
  origem" vale no momento da geração e evapora depois. Com isso, o usuário
  reabre o documento de origem semanas depois.
- **Uma nova geração, depois o dado sem prosa, depois o silêncio honesto**
  (D31). Quando a verificação de linguagem reprova: gerar de novo uma vez;
  falhando, mostrar o que as ferramentas devolveram num texto de modelo fixo;
  não havendo esse dado, indisponibilidade. Reescrever o trecho e exibir com
  aviso foram recusados, cada um com motivo, no estudo
  `estudos-ia/01-estudos/resposta-reprovada.md`.
- **A segunda geração reaproveita as mensagens acumuladas, inclusive os
  resultados das ferramentas.** Não é otimização: refazer o laço faria a segunda
  tentativa enxergar evidências possivelmente diferentes da primeira, quando o
  que se quer corrigir é só a redação. O ganho de custo — cerca de 55% de um
  turno em vez de 100%, com uma ida ao modelo em vez de duas — vem junto.
- **O modo degradado é responsabilidade de cada tool.** Cada uma sabe renderizar
  a própria saída em texto de modelo, ou declara que não sabe. Um despachante
  central com um `switch` por formato de tool divergiria do formato real assim
  que alguma tool mudasse, e divergiria em silêncio.
- **Teto de iterações no laço.** Um laço sem teto paga o modelo indefinidamente
  e, pior, pode apresentar uma resposta parcial como se fosse completa.

## 4. Ambiguidades documentadas (regra 8)

- **A D5 está como proposta, aguarda aceite, e esta EPIC não a aceita
  sozinha.** Persistir conversa sobre saúde é decisão do usuário e do
  orientador, com consequência de LGPD. A spec isola o que depende dela (§2), e
  a EPIC entrega tudo o que não depende.
- **Transmitir a resposta por eventos (D6) fica fora, e o motivo mudou.** A D6
  foi decidida quando entregar transmissão exigiria mecanismo adicional; a D12
  removeu esse obstáculo. Fica fora por escopo, não por impedimento, e isso
  precisa estar escrito para que a próxima pessoa não redescubra o argumento
  antigo.
- **Como agrupar o histórico na gaveta.** O Canvas sugere grupos ("Hoje",
  "Ontem", "Últimos 7 dias") sem os nomear com precisão. Proposta: esses três
  mais "Mais antigas". Registrado porque é copy visível e veio de interpretação,
  não do artefato.
- **O título de uma conversa.** Nem o Canvas nem os estudos dizem de onde ele
  sai. Proposta: as primeiras palavras da primeira mensagem do usuário,
  truncadas — **nunca gerado pelo modelo**, porque um título gerado é mais uma
  superfície de texto sobre saúde que precisaria passar pelas cinco camadas para
  render uma linha de lista.
- **Quantas mensagens do histórico entram no contexto.** Mandar a conversa
  inteira cresce sem limite e paga por isso a cada turno. Proposta: uma janela
  das mensagens mais recentes, com o número fixado no código e calibrado na
  tarefa de medição — número, não noção.
- **O que conta como pergunta clínica.** A R2 exige o encaminhamento em pergunta
  clínica e o dispensa em operacional, e quem classifica é quem chama o
  verificador. A classificação proposta é **pela tool usada**: se a resposta
  consultou analitos, exames ou perfil de saúde, é clínica; se consultou apenas
  consultas, medicamentos ou vacinas, é operacional. É uma aproximação, e
  registrá-la aqui é o que permite corrigi-la com medição em vez de com opinião.

## 5. Limites e custo

**Custo por conversa, e ele é diferente do custo por documento.** A extração
paga uma vez por arquivo; o chat paga por turno, e um turno com laço de tools
paga mais de uma vez. Três limites explícitos, todos números no código:

- **`maxTokens` explícito** na chamada. Em branco reserva a cota máxima do
  modelo e é a causa principal de estrangulamento sem motivo aparente.
- **Teto de iterações do laço de tools.** Atingir o teto é indisponibilidade
  honesta, nunca resposta parcial.
- **Janela de histórico.** Número fixo de mensagens recentes, não a conversa
  inteira.

**Teto de tempo da função** compatível com o laço mais longo previsto, e o
aplicativo com teto próprio — a tela nunca fica esperando para sempre.

**Limite de chamadas por dono**, que o AppSync resolvia sozinho e agora é
nosso. Sem ele, o endereço direto é uma conta de Bedrock aberta.

**Medição obrigatória:** custo por turno, número de iterações por turno, e
quantas respostas foram reprovadas pela verificação de linguagem na primeira
geração. O terceiro é o que calibra a §7 da spec.

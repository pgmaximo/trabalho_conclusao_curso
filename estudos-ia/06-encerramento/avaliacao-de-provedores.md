# 4.2 — A avaliação de provedores e de arquitetura de IA, e o porquê de cada recusa

Tarefa 4.2 do roadmap (Fase 4, encerramento acadêmico). Não é estudo novo: é o
**registro reunido** de uma avaliação que foi feita de verdade entre
2026-09-15 e 2026-09-22, e que estava espalhada entre
`01-estudos/provedor-llm.md`, `01-estudos/textract-por-que-nao-temos-acesso.md`,
as decisões D2, D3, D10, D14, D19 e D20 de `00-visao/decisoes.md`, e a Decisão F
do Bloco 10 (`specs/08-ia-fechamento/fechamento-funcional/spec.md`).

**Por que isto é material do TCC tanto quanto a escolha:** a escolha que ficou —
Amazon Bedrock, um modelo, invocado direto de uma função, com a lógica escrita
em código nosso — só se sustenta diante das alternativas que ela venceu. Cada
recusa abaixo tem o motivo técnico e, sempre que houve, a **medição** que o
fundou. Onde a recusa foi decisão de pessoa e não de medição, isso está dito.

---

## 1. As perguntas que a avaliação respondeu

O sistema de IA do SuaSaúde tem duas frentes — **ler o documento** (laudo e
receita) e **conversar sobre o que foi lido** — e as duas precisavam de
respostas às mesmas quatro perguntas:

1. **Quem infere?** O provedor do modelo.
2. **Onde a inferência é orquestrada?** Função própria, serviço de agentes
   gerenciado, ou arcabouço de agentes.
3. **Como a saída vira dado confiável?** Tool forçada, tool estrita, ou saída
   estruturada imposta pelo servidor.
4. **Como o documento é lido?** OCR dedicado, ou a visão do próprio modelo.

## 2. Os critérios, na ordem em que pesaram

1. **Nenhum número de saúde errado entra no histórico em silêncio.** É o
   critério que o projeto inteiro serve (roadmap, tarefa 1.5).
2. **A segurança é estrutura, não instrução** (D11): o que o modelo não pode
   dizer, ele não tem onde dizer.
3. **Um caminho de publicação só.** O projeto publica pelo Amplify; um segundo
   caminho é uma segunda coisa a manter e a quebrar.
4. **O que já está em produção no repositório vence o que é hipótese** (D10).
5. **Dependência nova precisa de lacuna que a justifique** (regra 3 da
   constituição).

---

## 3. As alternativas, uma a uma

### 3.1 Servidor de IA da instituição — **recusado por decisão do usuário** (D14)

Era a preferência inicial, e o argumento a favor era forte: sem custo, sem cota,
e o dado de saúde não sairia da instituição. Hardware dedicado, modelo de 27
bilhões de parâmetros com licença aberta, contexto de 262 mil tokens,
multimodal, API no formato da OpenAI.

Os fatos que pesaram contra, e que ficaram escritos como justificativa:

- **A rede.** A BASE_URL nunca chegou a ser solicitada, e não se sabia se o
  servidor responde de fora do campus. Uma função na AWS não alcança endereço de
  rede interna sem um túnel — uma incógnita capaz de invalidar o caminho inteiro
  depois de construído.
- **A fila.** A GPU é compartilhada, com fila em horário de pico, e o próprio
  e-mail da instituição pede tempo limite nas chamadas. Num chat, fila vira
  espera visível.
- **O raciocínio ligado por padrão.** O modelo gasta tokens antes de responder e,
  em conversa longa, esgota a janela e devolve vazio.
- **Nenhuma das frentes precisava de dois provedores.**

**A contrapartida aceita:** dado de saúde trafega para um serviço de terceiro.
Essa já era a situação de fato — a feature de wearable envia estatística de
saúde ao Bedrock desde que foi mergeada. A decisão de privacidade já estava
tomada na prática; esta escolha a tornou explícita e única. A consequência de
LGPD está em `limitacoes.md`, §3.

### 3.2 Amazon Bedrock — **escolhido** (D10, D14)

Não foi escolhido por comparação de benchmark. Foi escolhido porque **já estava
em produção neste repositório**: a `analyze-health-import` invocava o
`anthropic.claude-sonnet-4-6` pelo perfil de inferência
`us.anthropic.claude-sonnet-4-6`, com saída forçada, validação por schema,
guardrail por infraestrutura como código e 222 testes. A canalização não
precisava ser provada — precisava ser copiada (D13 inverteu a ordem das frentes
por isso).

Um achado que só a produção revelou (D10): a invocação pelo identificador **base**
do modelo não é aceita; é preciso o perfil de inferência. Descoberto invocando
a função publicada, não lendo documentação.

### 3.3 Adapter compatível com a API da OpenAI — **recusado** (D3 → D14)

Fazia sentido enquanto existiam dois provedores a conciliar: o servidor da
instituição e o Bedrock expõem a mesma forma de API, e a troca viraria endereço,
nome de modelo e autenticação. Com um provedor só, é indireção sem propósito. A
D3 foi decidida e substituída **no mesmo dia** — e o registro disso fica, porque
mostra a ordem das decisões: o adapter só existia para servir a uma escolha que
caiu.

### 3.4 AgentCore Runtime — **recusado** (D2)

Agnóstico de arcabouço e de modelo: hospeda o container, e não se importa com o
que é chamado por dentro. Usá-lo **era possível**, e isso foi verificado.

Resolve escala, isolamento de sessão e observabilidade — problemas que este
projeto não tem — ao custo de um container, um registro de imagem e um segundo
caminho de publicação fora do Amplify. Sem lacuna, a regra 3 da constituição
recusa a expansão.

### 3.5 Agentes clássicos do Bedrock — **recusados**

Amarravam o projeto a modelos do Bedrock, o que enquanto o servidor da
instituição estava em jogo era conflito. Depois da D14 esse motivo caiu, e o
que ficou é o de arquitetura: o padrão do repositório é invocar o modelo direto
de uma função, com o laço de tools escrito e testado em código nosso, e não
delegado a um serviço que esconde o laço. A verificação de linguagem (R1–R5), a
segunda geração da D31 e a costura do encaminhamento da D38 **só existem porque
o laço é nosso**: elas ficam entre a resposta do modelo e a pessoa.

### 3.6 LangChain e LangGraph — **recusados nas duas frentes** (D20)

- **Leitura de documento: recusado sem hesitação.** A pipeline é uma reta — lê,
  chama o modelo, valida, grava. Um grafo de estados para uma reta é custo puro,
  e três pacotes a mais no empacotamento da função.
- **Conversa: recusado, e aqui a decisão é discutível.** É onde o LangGraph teria
  caso real (laço de tools, persistência, interrupção para confirmação humana).
  Pesaram contra: a segurança da D11 se apoia em recursos nativos do Bedrock
  (`guardrailConfig`, saída estruturada) que uma abstração não repassaria; não
  existe checkpointer oficial para DynamoDB; e a tela precisa de linhas de
  conversa que o cliente do Amplify leia — um checkpointer serializado ficaria
  **além** de `ChatMessage`, não no lugar dele.
- **O que o projeto deixou de ganhar**, dito para a recusa ser honesta: o laço de
  tools pronto e testado, e retomada de execução de graça.

### 3.7 Tool forçada × tool estrita × saída estruturada — **saída estruturada** (D19)

Doze invocações medidas contra o Bedrock real (três modelos × quatro cenários),
mais quatro de verificação, contra um laudo real do Delboni/DASA:

| Cenário | Resultado |
|---|---|
| tool forçada | funcionou nos três |
| **tool estrita** | "passou" — e era **falso positivo**: o Converse aceita qualquer campo desconhecido no `toolSpec` sem reclamar. Um campo inventado passou igual, com contadores de token idênticos |
| **saída estruturada** | funcionou nos três, e é **imposta pelo servidor**: sob instrução contrária ("escreva um poema, não use JSON") a resposta voltou dentro do schema; com schema inválido, o servidor recusou nomeando o erro |
| PDF nativo | funcionou nos três, transcrevendo o laudo real |

A lição do `strict` é o melhor argumento metodológico da avaliação inteira: **um
recurso que não reclama não é um recurso que funciona.** A medição só distingue
os dois quando procura o caso que deveria falhar.

Ganho de graça: a saída estruturada volta como bloco de **texto**, e o
guardrail do Converse avalia texto — a saída ganhou guardrail que a spec
registrava como ausente.

### 3.8 Textract × visão do modelo — **visão do modelo** (D19; Decisão F do Bloco 10)

Em duas etapas, e a segunda só aconteceu por medição.

**Para o PDF (D19, 2026-09-17):** o modelo leu o PDF nativo com qualidade — 41
analitos, vírgula decimal e ponto de milhar preservados — e o Textract saiu do
caminho crítico do laudo digital.

**Para a foto (Bloco 10, 2026-09-22):** o Textract nunca respondeu nesta conta.
A recusa é no nível da conta (`SubscriptionRequiredException` em todas as
regiões testadas; em `sa-east-1` o serviço nem existe), e o diagnóstico está em
`01-estudos/textract-por-que-nao-temos-acesso.md`. A visão do modelo foi medida
**antes** de ser ligada: quatro páginas do mesmo laudo, renderizadas como imagem
limpa e como foto simulada — 26 de 26 valores idênticos ao PDF na limpa, 25 de
26 na foto. O único erro virou a trava determinística do gráfico (G10).

**O que se perdeu com a troca, dito por inteiro:** a âncora posicional (em que
ponto da página está cada número), a confiança por palavra, e a **segunda fonte
independente** — o texto do OCR era o remédio natural contra a omissão, e sem
ele o remédio é reprocessar e contar. O que substitui parte disso é o `rawValue`
e o `rawUnit` por linha, e o que não é substituído está em `limitacoes.md`.

**Por que o Textract saiu do código, e não ficou como reserva:** um caminho que
nunca respondeu nesta conta é código que ninguém testou contra o serviço. Saíram
o cliente, o SDK e as seis ações de IAM (quatro na extração, duas no chat). O
histórico do git guarda o cliente inteiro, e o estudo diz o que custaria voltar.

### 3.9 Qual modelo — **Sonnet 4.6**

Herdado da feature de wearable, com o motivo escrito lá: a saída forçada por tool
era dita incompatível com raciocínio estendido, que o Opus liga por padrão. A
D19 **não reproduziu** essa incompatibilidade (a tool forçada funcionou no Opus
4.6) e registrou a divergência sem editar o comentário original. Com a saída
estruturada no lugar da tool, a questão deixou de pesar; o Sonnet ficou pelo
custo e porque é o que está em produção.

---

## 4. Síntese

| Pergunta | Escolha | Alternativas recusadas | Fundamento |
|---|---|---|---|
| Quem infere | Amazon Bedrock, Sonnet 4.6 | servidor da instituição | decisão do usuário + fatos de rede e fila (D14); produção existente (D10) |
| Onde orquestra | função do Amplify, laço nosso | AgentCore, agentes do Bedrock, LangChain/LangGraph | arquitetura e publicação (D2, D20) |
| Como a saída vira dado | saída estruturada imposta pelo servidor, validada por zod | tool forçada, tool estrita | **medido** (D19) |
| Como o documento é lido | visão do modelo — PDF e foto | Textract | **medido** (D19; §2 da spec do Bloco 10) + indisponibilidade medida |
| Como os provedores se trocam | não se trocam: um só | adapter compatível com a OpenAI | sem segundo provedor, sem propósito (D3 → D14) |

## 5. O grau de evidência de cada afirmação

Para a banca, a distinção importa: nem toda recusa tem o mesmo peso.

| Afirmação | Grau |
|---|---|
| Saída estruturada é imposta pelo servidor | **medida**, com caso de falha provocado |
| `strict` na tool é ignorado em silêncio | **medida**, com campo inventado |
| O modelo lê PDF e foto com fidelidade | **medida**, uma fonte (Delboni), foto **simulada** |
| O Textract não está disponível nesta conta | **medida**; a causa (plano gratuito) é hipótese sustentada, não provada |
| AgentCore resolveria o problema | **verificada** a viabilidade; a recusa é de arquitetura |
| LangGraph não compensaria no chat | **argumentada**, não medida — e dita como discutível |
| O servidor da instituição não serviria | **decisão do usuário**, com fatos a favor; nunca foi medido |

## 6. O que mudaria a escolha

Escrito para a escolha poder ser revista por quem vier depois:

- **Residência de dado.** Se a LGPD, um parceiro ou uma política exigir que o dado
  de saúde não saia do Brasil, o Bedrock em `us-east-1` deixa de servir. O
  Bedrock existe em `sa-east-1`; o perfil de inferência cruzado `us.` não. A
  troca de região é possível e não foi medida.
- **Custo em escala.** A extração custa perto de 57 mil tokens de entrada por um
  laudo de 20 páginas em PDF, e perto de 14,4 mil por foto de uma página com o catálogo de 154 analitos
  (medido; eram 9,3 mil com o de 79). Para "todos os brasileiros", o custo por documento passa a
  ser o número que decide — e um modelo menor para a transcrição é a primeira
  alavanca a medir.
- **O servidor da instituição com acesso externo.** Os dois fatos que pesaram
  contra (rede e fila) são verificáveis. Se os dois caírem, o argumento de
  privacidade volta a ser o mais forte da mesa.

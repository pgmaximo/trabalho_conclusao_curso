# Estudo — provedor de inferência

**Encerrado em 2026-09-15. Decisão: Amazon Bedrock, sem alternativa.**

Este documento deixou de ser um estudo aberto e virou registro de uma avaliação
concluída. Mantido porque a comparação entre as opções é material do TCC, e
porque a razão de recusar cada uma vale mais que a escolha em si.

## A escolha

Amazon Bedrock, seguindo exatamente o caminho que a feature de wearable do
Arturo já percorreu neste repositório: `anthropic.claude-sonnet-4-6` invocado
pelo identificador de perfil de inferência `us.anthropic.claude-sonnet-4-6`,
saída forçada por tool, validação por zod, guardrail criado por infraestrutura
como código.

Não há segundo provedor, não há adapter de troca, não há variável de ambiente
decidindo entre dois caminhos. Uma canalização só, a mesma das duas frentes, a
mesma que já está em produção.

## O que foi recusado

### Servidor de IA da instituição

Foi a preferência inicial, e o argumento a favor era forte: sem custo, sem cota,
e sem que dado de saúde saísse da instituição. Hardware dedicado, modelo de 27
bilhões de parâmetros com licença aberta, contexto nativo de 262 mil tokens,
multimodal, e API na mesma forma da OpenAI.

Recusado por decisão do usuário. Os fatos que pesavam contra, e que continuam
valendo como justificativa escrita:

- **A BASE_URL nunca chegou a ser solicitada**, e não se sabia se o servidor
  responde de fora do campus. Uma função na AWS não alcança endereço de rede
  interna sem um túnel. Era uma incógnita capaz de invalidar o caminho inteiro
  depois de ele estar construído.
- **A GPU é compartilhada, com fila em horário de pico.** O próprio e-mail da
  instituição pede que se defina tempo limite nas chamadas e que a validação do
  projeto não fique para o fim. Num chat, fila vira espera visível.
- **O modelo ativa raciocínio por padrão e no nível mais alto**, gasta muitos
  tokens antes de responder, e em conversa longa isso esgota a janela de
  contexto e devolve resposta vazia. Pior: a saída forçada por tool, que é como
  se obriga JSON válido, é incompatível com raciocínio estendido — foi
  exatamente por isso que a feature de wearable escolheu Sonnet em vez de Opus.
  A mesma armadilha estaria do outro lado.
- **Nenhuma das duas frentes precisava de um segundo provedor para existir.**
  Manter dois caminhos custa manutenção permanente em troca de uma
  independência que o projeto não estava usando.

A contrapartida aceita com a recusa: dado de saúde trafega para um serviço de
terceiro. Essa já era a situação de fato do projeto antes desta decisão — a
feature de wearable envia estatística de saúde ao Bedrock desde que foi
mergeada. A decisão de privacidade, portanto, já estava tomada na prática; esta
escolha apenas a torna explícita e única.

### AgentCore da AWS

O AgentCore Runtime é agnóstico de arcabouço e de modelo: hospeda o container,
faz uma requisição ao endereço de invocação, e não se importa com o modelo
chamado por dentro. Usá-lo **era possível**, e isso foi verificado.

Recusado porque resolve escala, isolamento de sessão e observabilidade —
problemas que este projeto não tem — ao custo de um container, um registro de
imagem e um segundo caminho de publicação fora do Amplify. A regra 3 da
constituição pede justificativa para expandir a pilha, e não havia lacuna que
justificasse.

### Agentes clássicos do Bedrock

Amarrariam o projeto a modelos do próprio Bedrock. Enquanto o servidor da
instituição estava em jogo, isso era um conflito com o objetivo; hoje já não é.
Continuam recusados por outro motivo: o padrão do repositório é invocar o modelo
direto de uma função, com a lógica de tools escrita e testada em código nosso, e
não delegada a um serviço que esconde o laço.

### Adapter compatível com a API da OpenAI

Fazia sentido enquanto existiam dois provedores a conciliar. Com um provedor só,
é indireção sem propósito. A função usa o SDK nativo do Bedrock, como a
`analyze-health-import` já usa.

## O que sobra a verificar

- [ ] Como o guardrail existente se comporta com entrada livre do usuário no
      chat, que o fluxo de importação não tem
- [ ] Tempo real de um laço de tools, para dimensionar o teto de iterações
- [ ] Custo por conversa e por documento extraído

## Fontes consultadas durante a avaliação

- [Amazon Bedrock AgentCore is now generally available](https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-bedrock-agentcore-available)
- [Host Strands Agents with OpenAI models on Amazon Bedrock AgentCore Runtime](https://thecraftman.medium.com/host-strands-agents-with-openai-models-on-amazon-bedrock-agentcore-runtime-28b5be795781)
- [Inference using Chat Completions API — Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-chat-completions-mantle.html)
- [API compatibility — Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/models-api-compatibility.html)

import { a } from '@aws-amplify/backend';

/**
 * Resumo do arquivo:
 * A memória de longo prazo do assistente: frases curtas que a pessoa confirmou
 * que quer que ele lembre de uma conversa para a outra. Este arquivo existe
 * porque a **D34** foi decidida, e a D34 só pôde ser decidida porque a análise
 * de LGPD (`estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`) foi escrita
 * antes — condição que a D33 deixou por escrito.
 *
 * A BASE LEGAL É O ART. 11, I DA LGPD: consentimento específico e destacado.
 * O art. 11 é exaustivo para dado sensível, e a hipótese de tutela da saúde
 * (inciso II, "f") vale só para procedimento de profissional ou serviço de
 * saúde, que este aplicativo não é. "Específico" significa **por fato** — e é
 * por isso que não existe aqui nenhum campo que permita gravar em lote.
 *
 * QUEM ESCREVE AQUI É O APLICATIVO, a partir de um toque da pessoa, nunca a
 * função do chat. A função continua somente leitura por contrato, e a varredura
 * que garante isso passou a cobrir a função inteira justamente por causa desta
 * EPIC. Preservar essa fronteira é preservar a D9 inteira: a IA de comunicação
 * não grava, porque quem grava é quem confirmou.
 *
 * O QUE NÃO ESTÁ AQUI, e cada ausência é decisão da D34:
 * - Nenhum campo de valor, unidade ou identificador de exame. Número vem de
 *   ferramenta, com documento de origem (R4); número guardado como fato seria
 *   número sem origem, relido como verdade.
 * - Nenhum prazo de expiração e nenhuma marcação lógica de apagado. Mesma razão
 *   da D33: "apagado" não pode significar duas coisas ao mesmo tempo.
 * - Nenhum campo de resumo de conversa. É a quarta memória, recusada na D34
 *   porque ninguém confirma um resumo frase a frase.
 */
export const assistantMemorySchema = {
  AssistantMemoryFact: a
    .model({
      // O texto literal, como foi mostrado na confirmação. Mostrar um texto e
      // gravar outro esvaziaria o consentimento do art. 11, I.
      text: a.string().required(),
      // Um dos quatro tipos da lista fechada. É `a.string()` e não `a.enum()`
      // pela mesma razão registrada em `chat.ts` para `ruleCheckStatus`:
      // acrescentar um tipo é decisão de produto, e não deveria exigir migração
      // de schema. A lista fechada mora em
      // `amplify/functions/chat-assistant/memoria/regras.ts`, onde ela tem
      // teste — e onde o aplicativo e a função leem a MESMA lista.
      kind: a.string().required(),
      // De qual conversa o fato veio, para o art. 6º, VI (transparência).
      // OPCIONAL de propósito: a pessoa pode ter apagado aquela conversa (D33),
      // e o fato continua sendo dela. O atalho some; o fato fica.
      sourceConversationId: a.string(),
      confirmedAt: a.datetime().required(),
      // Preenchido só quando a pessoa corrige o texto — art. 18, III. A data
      // original é preservada, porque as duas contam coisas diferentes.
      editedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  /**
   * Uma linha por pessoa. A ausência dela significa que ninguém mexeu no
   * interruptor, e o código trata isso como ligado — o que não grava nada
   * sozinho, porque gravar depende de confirmação. O estado que a análise de
   * LGPD chama de "desligado por padrão" é o conjunto vazio de fatos, que é o
   * real: sem confirmação, não há dado.
   *
   * Desligar interrompe o tratamento dali para frente (art. 18, IX) e NÃO
   * apaga: eliminação é o art. 18, VI e é outra decisão, que a tela pergunta em
   * vez de tomar pela pessoa.
   */
  AssistantMemorySetting: a
    .model({
      enabled: a.boolean().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.owner()]),
};

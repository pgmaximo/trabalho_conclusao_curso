import { a } from '@aws-amplify/backend';

/**
 * Resumo do arquivo:
 * A conversa com o assistente, persistida. Este arquivo só existe porque a
 * tarefa 0.5 do roadmap foi respondida — ela virou a **D33**, e a D5 passou de
 * proposta a aceita no mesmo dia.
 *
 * A POLÍTICA DE RETENÇÃO, em uma linha, porque ela é comportamento e não
 * cortesia: **sem prazo de expiração, exclusão imediata e real na mão da
 * pessoa.** É por isso que não há TTL nem campo `deletedAt` aqui — os dois
 * seriam a implementação das opções que a D33 recusou.
 *
 * O que NÃO está aqui, e a ausência é decisão: nenhum campo guarda fato sobre
 * a pessoa derivado pelo modelo. O que o assistente sabe do usuário vem das
 * tools, a cada turno, do dado que ela mesma registrou. Memória de fatos é
 * EPIC própria (`specs/07-ia-conversa/memoria-do-usuario/`).
 *
 * QUEM ESCREVE AQUI É O APLICATIVO, nunca a função do chat. A função é somente
 * leitura por contrato, e há um teste que varre os arquivos dela procurando
 * comando de escrita. Gravando pelo aplicativo, a autorização por dono é a do
 * AppSync — a mesma que protege exame, consulta e medicamento — e não uma
 * regra que escrevemos.
 */
export const chatSchema = {
  ChatConversation: a
    .model({
      // As primeiras palavras da primeira mensagem do usuário, truncadas.
      // NUNCA gerado pelo modelo: um título gerado é mais uma superfície de
      // texto sobre saúde, que precisaria passar pelas cinco camadas de regra
      // de linguagem para render uma linha de lista.
      title: a.string().required(),
      startedAt: a.datetime().required(),
      lastMessageAt: a.datetime(),
      messageCount: a.integer(),
    })
    .authorization((allow) => [allow.owner()]),

  ChatMessage: a
    .model({
      conversationId: a.string().required(),
      role: a.enum(['USER', 'ASSISTANT']),
      content: a.string().required(),
      // JSON serializado à mão, pelo mesmo motivo registrado em
      // `health-import.ts`: não há precedente neste repositório de `a.json()`
      // lido pelo cliente do Amplify sem tratamento extra, e a citação precisa
      // voltar exatamente como foi guardada para o atalho ao documento
      // continuar funcionando semanas depois.
      citations: a.string(),
      // Qual dos QUATRO caminhos da D31 aconteceu: APROVADA,
      // APROVADA_NA_SEGUNDA, DEGRADADA ou INDISPONIVEL. É o dado que calibra a
      // seção 7 da spec — sem ele, "com que frequência a verificação reprova"
      // seria uma impressão. Guardado como texto, e não como enum, porque a
      // C10 pode precisar acrescentar um caminho sem migrar schema.
      ruleCheckStatus: a.string(),
      modelId: a.string(),
      inputTokens: a.integer(),
      outputTokens: a.integer(),
    })
    // "Todas as mensagens desta conversa". Sem o índice, abrir uma conversa
    // faria varredura da tabela inteira.
    //
    // SEM CHAVE DE ORDENAÇÃO, e isso é limite da ferramenta e não escolha: o
    // plano trazia `.sortKeys(['createdAt'])`, e `createdAt` é gerenciado pelo
    // Amplify — ele não entra na lista de campos que o índice aceita, e o
    // arquivo não compila. A ordenação é feita em memória, pelo `createdAt` que
    // vem em cada item; numa conversa, que tem dezenas de mensagens e não
    // milhares, isso não pesa.
    .secondaryIndexes((index) => [index('conversationId')])
    .authorization((allow) => [allow.owner()]),
};

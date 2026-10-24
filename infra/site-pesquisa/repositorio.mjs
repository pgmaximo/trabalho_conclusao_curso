/**
 * Resumo do arquivo:
 * Conversa com a tabela DynamoDB da pesquisa da feira. A Lambda
 * (`index.mjs`) so conhece o contrato `{ gravarResposta, gravarClique,
 * listar }`; aqui ficam os detalhes do DynamoDB, atras de um `cliente` pequeno
 * (`atualizar`, `gravar`, `varrer`) que os testes trocam por um falso.
 *
 * `criadoEm` entra com `if_not_exists`: a mesma resposta e regravada a cada
 * tela, e a hora de criacao nao pode mudar a cada regravacao.
 */

export function criarRepositorio(cliente, tabela) {
  return {
    async gravarResposta(item) {
      await cliente.atualizar({
        TableName: tabela,
        Key: { id: item.id },
        UpdateExpression:
          'SET criadoEm = if_not_exists(criadoEm, :criadoEm), atualizadoEm = :atualizadoEm, ' +
          'tipo = :tipo, versaoDoFormulario = :versao, etapa = :etapa, concluido = :concluido, ' +
          'respostas = :respostas',
        ExpressionAttributeValues: {
          ':criadoEm': item.criadoEm,
          ':atualizadoEm': item.atualizadoEm,
          ':tipo': item.tipo,
          ':versao': item.versaoDoFormulario,
          ':etapa': item.etapa,
          ':concluido': item.concluido,
          ':respostas': item.respostas,
        },
      });
    },

    async gravarClique(item) {
      await cliente.gravar({ TableName: tabela, Item: item });
    },

    /** Le a tabela inteira, pagina por pagina. E pequena: so as respostas da feira. */
    async listar() {
      const itens = [];
      let proxima;
      do {
        const pagina = await cliente.varrer({ TableName: tabela, ExclusiveStartKey: proxima });
        itens.push(...(pagina.Items ?? []));
        proxima = pagina.LastEvaluatedKey;
      } while (proxima);
      return itens;
    },
  };
}

/**
 * O cliente de verdade, com o SDK v3 que o runtime nodejs20.x da Lambda ja traz.
 * Importado so aqui dentro, para os testes e o gerador de paginas nunca o carregarem.
 */
export async function criarClienteReal() {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, UpdateCommand, PutCommand, ScanCommand } = await import(
    '@aws-sdk/lib-dynamodb'
  );
  const documento = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  return {
    atualizar: (params) => documento.send(new UpdateCommand(params)),
    gravar: (params) => documento.send(new PutCommand(params)),
    varrer: (params) => documento.send(new ScanCommand(params)),
  };
}

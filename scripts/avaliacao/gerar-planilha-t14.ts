/**
 * Resumo do arquivo:
 * Monta a planilha de conferencia da T14 de UM documento lido (G8, Bloco 10).
 *
 *   AWS_REGION=us-east-1 npx tsx scripts/avaliacao/gerar-planilha-t14.ts \
 *     --tabela LabResult-<id>-NONE --documento <id> --saida <arquivo.csv>
 *
 * E depois de preenchida, com o papel na mao:
 *
 *   npx tsx scripts/avaliacao/gerar-planilha-t14.ts --contar <arquivo.csv>
 *
 * A planilha tem dado de saude de uma pessoa, e por isso a `--saida` deve ser
 * FORA do repositorio. O que entra no repositorio e so a contagem.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { contarConferencia, lerPlanilha, montarPlanilha, type LinhaLida } from './planilhaT14';

function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const contar = argumento('contar');
  if (contar) {
    console.log(JSON.stringify(contarConferencia(lerPlanilha(readFileSync(contar, 'utf8'))), null, 2));
    return;
  }

  const tabela = argumento('tabela');
  const documento = argumento('documento');
  const saida = argumento('saida');
  if (!tabela || !documento || !saida) {
    throw new Error('Uso: --tabela <LabResult-...> --documento <id> --saida <arquivo.csv>  |  --contar <arquivo.csv>');
  }

  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const linhas: LinhaLida[] = [];
  let chave: Record<string, unknown> | undefined;
  do {
    const pagina = await ddb.send(
      new ScanCommand({
        TableName: tabela,
        FilterExpression: 'documentId = :d',
        ExpressionAttributeValues: { ':d': documento },
        ExclusiveStartKey: chave,
      }),
    );
    for (const item of pagina.Items ?? []) linhas.push(item as LinhaLida);
    chave = pagina.LastEvaluatedKey;
  } while (chave);

  writeFileSync(saida, montarPlanilha(linhas), 'utf8');
  console.log(`${linhas.length} linhas na planilha ${saida}`);
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});

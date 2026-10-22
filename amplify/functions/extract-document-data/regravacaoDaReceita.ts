/**
 * Resumo do arquivo:
 * Releitura de receita (risco 1 do E4): o que a leitura anterior gravou e a
 * leitura nova nao, sai.
 *
 * O id do item inclui o nome e a dose como o modelo os leu
 * (`prescriptionItemId`). Sem esta limpeza, uma releitura que le a dose de
 * outro jeito, ou que nao acha mais um remedio, deixava a linha velha ao lado
 * da nova -- e o chat a listava como se estivesse na receita.
 *
 * Mesmo principio da regravacao dos resultados (`regravacao.ts`, Bloco 11): o
 * que a pessoa CONFERIU fica, e o handler grava os novos antes de apagar os
 * velhos. Hoje nenhuma tela confere item de receita; a regra ja protege o dia
 * em que uma conferir.
 *
 * Nada sai quando a leitura nova pode estar incompleta (revisao): um PDF
 * dividido em que alguma parte falhou nao viu as paginas que faltaram, e
 * apagar os itens delas perderia remedio que esta no papel; e uma leitura sem
 * item de receita nao substitui nada (como o NO_RESULTS). So sai linha do dono
 * do documento: o indice e por `documentId`, e qualquer pessoa pode gravar um
 * item com o `documentId` de outra.
 *
 * Modulo PURO.
 */
export type ItemExistente = { id: string; reviewStatus?: string | null; owner?: string | null };

export function itensDaReceitaParaApagar(
  existentes: ItemExistente[],
  gravados: Set<string>,
  leitura: { owner: string; leituraCompleta: boolean },
): string[] {
  if (!leitura.leituraCompleta || gravados.size === 0) return [];
  return existentes
    .filter(
      (item) =>
        item.owner === leitura.owner && !gravados.has(item.id) && item.reviewStatus !== 'CONFIRMADO_PELO_USUARIO',
    )
    .map((item) => item.id);
}

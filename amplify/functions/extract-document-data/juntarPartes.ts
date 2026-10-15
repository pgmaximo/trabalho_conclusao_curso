/**
 * Resumo do arquivo:
 * As leituras das partes de um PDF dividido viram UMA leitura (Bloco 11, E5).
 *
 * Cada parte foi uma chamada completa ao modelo, com a mesma instrucao e o
 * mesmo schema de um PDF pequeno (Decisao N1). O que muda ao juntar:
 *
 * - a PAGINA: o modelo numera a partir de 1 dentro de cada parte, e a pessoa
 *   confere pela pagina do documento inteiro;
 * - os AVISOS: ganham as paginas a que se referem, pelo mesmo motivo;
 * - a FALHA de uma parte: nao derruba as outras. O que foi lido entra, e o aviso
 *   diz quais paginas ficaram de fora. Todas falhando, a falha e a da primeira.
 *
 * Nada aqui decide sobre colisao entre linhas de partes diferentes -- o mesmo
 * analito no mesmo momento, lido em duas partes, e o caso que o porteiro da
 * gravacao (`separarLinhasGravaveis`) ja manda para revisao.
 *
 * Modulo PURO: sem AWS (o tipo importado de bedrockClient e apagado na
 * compilacao).
 */
import type { RequestExtractionResult } from './bedrockClient';
import type { RawExtraction } from './extractionSchema';

export type LeituraDaParte = {
  primeiraPagina: number;
  ultimaPagina: number;
  saida: RequestExtractionResult;
};

function paginas(primeira: number, ultima: number): string {
  return primeira === ultima ? `Página ${primeira}` : `Páginas ${primeira} a ${ultima}`;
}

function avisoDeParteQueFalhou(primeira: number, ultima: number): string {
  return primeira === ultima
    ? `A página ${primeira} não pôde ser lida. Tente ler o documento de novo.`
    : `As páginas ${primeira} a ${ultima} não puderam ser lidas. Tente ler o documento de novo.`;
}

export function juntarPartes(partes: LeituraDaParte[]): RequestExtractionResult {
  // Uma parte so e o PDF que coube: passa como veio, sem prefixo nem conta.
  if (partes.length === 1) return partes[0].saida;

  const lidas = partes.filter(
    (p): p is LeituraDaParte & { saida: Extract<RequestExtractionResult, { ok: true }> } => p.saida.ok,
  );
  if (lidas.length === 0) {
    const primeira = partes[0]?.saida;
    return primeira && !primeira.ok ? primeira : { ok: false, motivo: 'leitura-falhou' };
  }

  const result: RawExtraction = {
    // O tipo e do DOCUMENTO, e todas as partes sao do mesmo: vale o da primeira lida.
    documentKind: lidas[0].saida.result.documentKind,
    labResults: [],
    prescriptionItems: [],
    warnings: [],
  };
  const usage = { input: 0, output: 0 };

  for (const parte of partes) {
    if (!parte.saida.ok) {
      result.warnings.push(avisoDeParteQueFalhou(parte.primeiraPagina, parte.ultimaPagina));
      continue;
    }
    const { result: lida, usage: gasto } = parte.saida;
    const deslocamento = parte.primeiraPagina - 1;

    result.labResults.push(
      ...lida.labResults.map((l) => ({
        ...l,
        sourcePage: l.sourcePage === null ? null : l.sourcePage + deslocamento,
      })),
    );
    result.prescriptionItems.push(...lida.prescriptionItems);
    result.warnings.push(
      ...lida.warnings.map((w) => `${paginas(parte.primeiraPagina, parte.ultimaPagina)}: ${w}`),
    );
    if (!result.laboratorio && lida.laboratorio) result.laboratorio = lida.laboratorio;

    usage.input += gasto.input;
    usage.output += gasto.output;
  }

  return { ok: true, result, usage };
}

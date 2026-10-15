/**
 * Resumo do arquivo:
 * Numero e data do banco -> texto em pt-BR, para o texto de modelo fixo do
 * modo degradado.
 *
 * ESTE ARQUIVO NAO IMPORTA NADA, e isso e estrutural: ele e usado pelo
 * montador do modo degradado E pelo renderizador de uma tool, e as tools sao
 * importadas pelo montador. Deixar os formatadores no montador fechava um
 * ciclo de importacao -- o registro de tools chegava a ser lido antes de
 * existir, e `CHAT_TOOLS` vinha com buracos.
 */

/** Acima disto, casas decimais viram ruido de leitura, nao informacao. */
const CASAS_MAXIMAS = 8;

/**
 * Numero do banco -> texto em pt-BR.
 *
 * A regra que importa: arredondamento NUNCA pode transformar uma medida em
 * zero. Um TSH de 0,004 exibido como "0" e um numero errado -- e num texto que
 * a pessoa pode levar a uma consulta.
 *
 * Duplica `src/utils/decimalDisplay.ts` de proposito: a Lambda nao importa de
 * `src/`, e um teste em cada lado e o que impede as duas de divergirem em
 * silencio. `toLocaleString` fica fora nos dois, por motivos diferentes -- la,
 * o suporte a locale do Hermes varia por plataforma; aqui, `maximumFractionDigits`
 * e exatamente o que arredondaria 0,004 para zero.
 */
export function formatarDecimal(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  if (valor === 0) return '0';

  const abs = Math.abs(valor);
  const casas =
    abs >= 10 ? 1 : abs >= 1 ? 2 : Math.min(CASAS_MAXIMAS, Math.ceil(-Math.log10(abs)) + 2);

  const texto = valor.toFixed(casas);
  // Corta zeros a direita SO depois da virgula -- cortar sem essa condicao
  // transformaria 100 em 1.
  const limpo = texto.includes('.') ? texto.replace(/0+$/, '').replace(/\.$/, '') : texto;
  return limpo.replace('.', ',');
}

/** AAAA-MM-DD -> DD/MM/AAAA. Data que nao esta nesse formato volta como veio:
 *  inventar uma data seria pior do que mostrar a que o banco tem. */
export function formatarData(iso: string | null): string {
  if (!iso) return 'sem data';
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

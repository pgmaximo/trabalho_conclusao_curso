/**
 * Resumo do arquivo:
 * Numero do banco -> texto na tela, em pt-BR.
 *
 * NAO usa toLocaleString: o suporte a locale do Hermes varia por plataforma e
 * versao, e um numero de exame formatado de um jeito no Android e de outro no
 * iOS e um defeito silencioso. Aqui a regra e explicita e testada.
 *
 * A regra que importa: arredondamento NUNCA pode transformar uma medida em
 * zero. Um TSH de 0,004 exibido como "0" e um numero errado na tela.
 */

/** Acima disto, casas decimais viram ruido de leitura, nao informacao. */
const CASAS_MAXIMAS = 8;

export function formatarDecimal(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  if (valor === 0) return '0';

  const abs = Math.abs(valor);

  // Quanto menor o numero, mais casas ele precisa para nao sumir. O +2 garante
  // dois digitos significativos mesmo em 0,00012.
  const casas =
    abs >= 10 ? 1 : abs >= 1 ? 2 : Math.min(CASAS_MAXIMAS, Math.ceil(-Math.log10(abs)) + 2);

  const texto = valor.toFixed(casas);

  // Corta zeros a direita SO depois da virgula -- cortar sem essa condicao
  // transformaria 100 em 1.
  const limpo = texto.includes('.') ? texto.replace(/0+$/, '').replace(/\.$/, '') : texto;

  return limpo.replace('.', ',');
}

/**
 * A faixa do laboratorio, como o laudo a escreve. Devolve nulo quando nao ha
 * faixa nenhuma -- laudo sem faixa de referencia e comum e nao e defeito, e
 * uma faixa inventada seria pior do que faixa nenhuma.
 */
export function formatarFaixa(baixa: number | null, alta: number | null): string | null {
  if (baixa === null && alta === null) return null;
  if (baixa !== null && alta !== null) return `${formatarDecimal(baixa)} a ${formatarDecimal(alta)}`;
  if (baixa !== null) return `acima de ${formatarDecimal(baixa)}`;
  return `até ${formatarDecimal(alta)}`;
}

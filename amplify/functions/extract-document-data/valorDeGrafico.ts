/**
 * Resumo do arquivo:
 * Acha as linhas cujo valor o modelo DECLAROU ter lido de um grafico, e nao de
 * um numero impresso.
 *
 * O achado que o originou foi medido em 2026-09-22 (G10 do Bloco 10): a pagina
 * 11 do laudo do Delboni nao imprime o HDL -- ele esta no pe da pagina 10 --, e
 * traz um grafico de historico com os pontos de 2020 e de 2025. Vendo so aquela
 * folha, que e o que uma foto entrega, o modelo estimou o valor pelo grafico. Na
 * imagem desfocada leu 80 em vez de 62, com confianca 0,95. A linha entraria
 * como automatica.
 *
 * Um numero de grafico e desenho, e metade dos pontos de um grafico de historico
 * sao de OUTRA DATA. Nao existe confianca que torne isso transcricao.
 *
 * Diferente de `escolhaDeFaixa.ts`, que so CONTA, este modulo REBAIXA: la o
 * dano era uma faixa escolhida, que a tela mostra como do laboratorio; aqui e um
 * numero errado entrando no historico. O lado seguro do erro e uma revisao a
 * mais, e e para esse lado que as comparacoes abaixo pendem.
 *
 * Modulo PURO: sem AWS, sem I/O. Quem rebaixa a linha e escreve o log e o
 * handler.
 */

/** Tira acento e caixa: o aviso e prosa do modelo, o rotulo e do laudo, e os
 *  dois nao combinam grafia. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const FALA_DE_GRAFICO = /\b(grafico|curva)s?\b/;

/** O verbo de LEITURA. So mencionar que o laudo tem grafico e descricao; o que
 *  importa e o modelo dizer que tirou um valor dali. */
const LEU_VALOR = /\b(lid[oa]s?|estimad[oa]s?|extraid[oa]s?|obtid[oa]s?|inferid[oa]s?|a partir d)/;

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** O nome inteiro, delimitado por algo que nao e letra nem digito. Sem isto,
 *  "Ferro" casaria dentro de "Ferritina". */
function nomeado(aviso: string, nome: string): boolean {
  const alvo = normalizar(nome).trim();
  if (alvo.length < 2) return false;
  return new RegExp(`(^|[^a-z0-9])${escapar(alvo)}([^a-z0-9]|$)`).test(aviso);
}

/**
 * Os indices das linhas lidas de grafico.
 *
 * `nomesPorLinha[i]` sao todos os nomes da linha i -- o do papel e o nosso --,
 * porque o aviso nomeia o analito do jeito que o laudo escreve, e o nosso rotulo
 * pode ser outro ("25-OH-Vitamina D" no papel, "Vitamina D (25-OH)" aqui).
 *
 * Indice, e nao nome: o mesmo analito pode aparecer duas vezes no documento
 * (D22). Quando o aviso nao diz qual das duas veio do grafico, as duas vao.
 */
/**
 * A segunda forma do mesmo defeito, medida na remedicao de 2026-09-22: o modelo
 * nao fala em grafico, mas DIZ que o numero nao esta impresso -- "nao esta
 * claramente impresso; lido a partir do contexto" -- e cria a linha mesmo
 * assim. Na foto da pagina 11 o numero criado foi 40, tirado de "Superior a 40"
 * da tabela de referencia. Se nao esta impresso, nao e transcricao.
 */
const NAO_IMPRESSO =
  /\bnao (esta|estava|foi|e) (\w+ )?impress[oa]|\blid[oa] (a partir )?do contexto|\binferid[oa]/;

function avisoDeValorNaoTranscrito(aviso: string): boolean {
  return (FALA_DE_GRAFICO.test(aviso) && LEU_VALOR.test(aviso)) || NAO_IMPRESSO.test(aviso);
}

export function linhasLidasDeGrafico(avisos: string[], nomesPorLinha: string[][]): Set<number> {
  const avisosDeGrafico = avisos.map(normalizar).filter(avisoDeValorNaoTranscrito);

  const achadas = new Set<number>();
  if (avisosDeGrafico.length === 0) return achadas;

  nomesPorLinha.forEach((nomes, indice) => {
    if (avisosDeGrafico.some((aviso) => nomes.some((nome) => nomeado(aviso, nome)))) {
      achadas.add(indice);
    }
  });
  return achadas;
}

/** O minimo que a trava precisa saber de uma linha. Generico para o handler
 *  passar a linha normalizada inteira e receber de volta a mesma forma. */
type LinhaRebaixavel = {
  projectLabel: string;
  value: number | null;
  valueQualifier: '<' | '>' | null;
  reviewStatus: string;
};

/**
 * Aplica a trava: a linha lida de grafico perde o VALOR e vai para revisao.
 *
 * O valor sai, e nao so o status muda, pela D29: numero sem leitura segura e
 * ausente, nunca um chute -- e um numero estimado de um desenho e o chute mais
 * perigoso que existe, porque vem com cara de medido. O `rawValue` fica, e e
 * ele que a pessoa ve na revisao ao lado do papel.
 *
 * A FAIXA fica. Ela veio da tabela impressa, e o defeito medido foi no valor.
 */
export function rebaixarLidasDeGrafico<T extends LinhaRebaixavel>(
  linhas: T[],
  nomesPorLinha: string[][],
  avisosDoModelo: string[],
): { linhas: T[]; avisos: string[]; quantidade: number } {
  // O nosso rotulo entra junto dos nomes que quem chama passou. Medido: o papel
  // escreve "HDL - Colesterol" e o aviso do modelo escreve so "HDL" -- quem
  // casa e o rotulo do projeto, nao o do laudo.
  const nomes = linhas.map((linha, i) => [...(nomesPorLinha[i] ?? []), linha.projectLabel]);
  const achadas = linhasLidasDeGrafico(avisosDoModelo, nomes);
  if (achadas.size === 0) return { linhas, avisos: [], quantidade: 0 };

  const avisos: string[] = [];
  const saida = linhas.map((linha, indice) => {
    if (!achadas.has(indice)) return linha;
    avisos.push(
      `O valor de "${linha.projectLabel}" parece ter sido lido de um gráfico, e não de um número impresso. Confira no papel antes de usar.`,
    );
    return {
      ...linha,
      value: null,
      valueQualifier: null,
      reviewStatus: 'PENDENTE_DE_REVISAO',
    };
  });
  return { linhas: saida, avisos, quantidade: achadas.size };
}

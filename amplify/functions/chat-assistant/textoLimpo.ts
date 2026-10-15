/**
 * Resumo do arquivo:
 * Tira a marcacao do texto que o modelo escreveu. Modulo PURO, sem import
 * nenhum -- mesma forma do `memoria/regras.ts` e do `numberParser.ts`.
 *
 * POR QUE REMOVER E NAO REPROVAR: descartar uma resposta correta por causa de
 * tres asteriscos seria repetir o erro da R2 que esta EPIC esta consertando.
 * A marcacao e ruido de formato, nao conteudo errado.
 *
 * POR QUE NAO RENDERIZAR: um renderizador de markdown dentro de uma resposta de
 * modelo abre superficie de LINK -- `[texto](url)` viraria algo clicavel, num
 * texto que o modelo escreveu. Este aplicativo nao precisa dessa porta, e a
 * copy dele inteira ja e sobria.
 *
 * QUANDO RODAR: ANTES da verificacao, sempre. Rodando depois, `v**eto**`
 * passaria pela R1 partido ao meio e voltaria inteiro na tela. Ha teste sobre
 * a ordem em `verificacao.test.ts`.
 */

/**
 * Faixas de emoji e simbolos decorativos. Escritas por ponto de codigo, e nao
 * coladas como caracteres, para o arquivo continuar legivel em editor que nao
 * tenha a fonte.
 */
const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F2FF}\u{200D}]/gu;

/**
 * O asterisco so e marcacao quando ABRE e FECHA em volta de texto. Sem esta
 * exigencia, `10*3/uL` -- que e como o UCUM escreve potencia, e que a lista de
 * unidades da R4 conhece -- perderia o asterisco e viraria outra unidade.
 */
const NEGRITO = /(\*\*|__)(?=\S)([\s\S]*?\S)\1/g;
const ITALICO = /(?<![\w*])(\*|_)(?=\S)([^*_\n]*?\S)\1(?![\w*])/g;

/** `[texto](endereco)` vira so o texto. O endereco some de proposito. */
const LINK = /\[([^\]\n]*)\]\((?:[^)\n]*)\)/g;

/** Titulo de markdown no comeco da linha. */
const TITULO = /^[ \t]*#{1,6}[ \t]+/gm;

/** Marcador de lista no comeco da linha -- `- `, `* `, `+ `. */
const MARCADOR = /^[ \t]*[-*+][ \t]+/gm;

/** Cerca de codigo, que as vezes sobra quando o modelo embrulha a resposta. */
const CERCA = /^[ \t]*```[a-z]*[ \t]*$/gim;

export function limparFormatacao(texto: string): string {
  return texto
    .replace(CERCA, '')
    .replace(LINK, '$1')
    .replace(NEGRITO, '$2')
    .replace(ITALICO, '$2')
    .replace(TITULO, '')
    .replace(MARCADOR, '')
    .replace(EMOJI, '')
    // Dois espacos seguidos viram um -- sobra de onde a marcacao saiu.
    .replace(/[ \t]{2,}/g, ' ')
    // Espaco antes de pontuacao, pela mesma razao.
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .split('\n')
    .map((linha) => linha.trim())
    .join('\n')
    .trim();
}

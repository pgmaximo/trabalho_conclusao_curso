/**
 * Resumo do arquivo:
 * Conferencias do implantador da pesquisa (`scripts/implantar-pesquisa.mjs`)
 * que nao precisam de rede, para poderem ser testadas.
 *
 * `diferencasDasStacks` e a trava de "nada do que ja funciona pode quebrar":
 * o implantador fotografa o estado das stacks `amplify-*` (backend do app em
 * producao e sandbox) antes e depois de criar a stack da pesquisa, e esta
 * funcao diz o que mudou. A stack nova nao toca nessas, entao o esperado e
 * uma lista vazia.
 */

/**
 * @param {Record<string, string>} antes nome da stack -> estado
 * @param {Record<string, string>} depois nome da stack -> estado
 * @returns {string[]} uma frase por diferenca; vazia se nada mudou
 */
export function diferencasDasStacks(antes, depois) {
  const frases = [];
  for (const [nome, estado] of Object.entries(antes)) {
    if (!(nome in depois)) frases.push(`${nome}: sumiu (estava ${estado})`);
    else if (depois[nome] !== estado) frases.push(`${nome}: ${estado} passou a ${depois[nome]}`);
  }
  for (const [nome, estado] of Object.entries(depois)) {
    if (!(nome in antes)) frases.push(`${nome}: apareceu (${estado})`);
  }
  return frases;
}

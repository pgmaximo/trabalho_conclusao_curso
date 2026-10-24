/**
 * Resumo do arquivo:
 * A logica da pesquisa de opiniao da feira que nao depende de tela: o que
 * acontece a cada toque, quando da para avancar e o que vai para a Lambda.
 * Funcoes puras sobre `{ tela, respostas }`, que nunca alteram o que recebem.
 * A pagina (`scripts/site-publico/cliente/opiniao.js`) so desenha o estado e
 * chama estas funcoes. Sem imports, para ir como esta no zip do site (`js/fluxo.js`).
 *
 * `tela` e o indice da pergunta que esta na tela. Quando passa da ultima,
 * `tela === total` e a pesquisa esta concluida.
 */

export function estadoInicial() {
  return { tela: 0, respostas: {} };
}

function comResposta(estado, id, valor) {
  const respostas = Object.assign({}, estado.respostas);
  if (valor === undefined) delete respostas[id];
  else respostas[id] = valor;
  return { tela: estado.tela, respostas };
}

/**
 * Um toque numa opcao. Em escolha unica troca a resposta; em multipla marca ou
 * desmarca, com as regras da pergunta: uma opcao exclusiva ("Nenhuma delas")
 * desmarca as outras e e desmarcada por qualquer outra, e `max` limita quantas
 * ficam marcadas (o toque a mais e ignorado, mas a exclusiva sempre vale).
 */
export function escolher(estado, pergunta, codigo) {
  if (pergunta.tipo === 'unica') return comResposta(estado, pergunta.id, codigo);

  const atuais = estado.respostas[pergunta.id] || [];
  const exclusivas = pergunta.exclusivas || [];
  if (atuais.indexOf(codigo) >= 0) {
    const sobra = atuais.filter((c) => c !== codigo);
    return comResposta(estado, pergunta.id, sobra.length > 0 ? sobra : undefined);
  }
  if (exclusivas.indexOf(codigo) >= 0) return comResposta(estado, pergunta.id, [codigo]);

  const semExclusivas = atuais.filter((c) => exclusivas.indexOf(c) < 0);
  if (pergunta.max && semExclusivas.length >= pergunta.max) return estado;
  return comResposta(estado, pergunta.id, semExclusivas.concat(codigo));
}

/** O texto livre. Vazio apaga a chave; o que passa do limite da pergunta e cortado. */
export function digitar(estado, pergunta, texto) {
  const valor = pergunta.max ? texto.slice(0, pergunta.max) : texto;
  return comResposta(estado, pergunta.id, valor === '' ? undefined : valor);
}

/** O comentario e opcional; as outras perguntas pedem pelo menos uma resposta. */
export function podeAvancar(estado, pergunta) {
  if (pergunta.tipo === 'texto') return true;
  return estado.respostas[pergunta.id] !== undefined;
}

export function avancar(estado, total) {
  return { tela: Math.min(estado.tela + 1, total), respostas: estado.respostas };
}

export function voltar(estado) {
  return { tela: Math.max(estado.tela - 1, 0), respostas: estado.respostas };
}

/**
 * O corpo do envio, sempre com TODAS as respostas ate agora: assim reenviar e
 * seguro (a Lambda atualiza a mesma resposta pelo `id`) e uma tela que falhou
 * em salvar e recuperada pela seguinte. `site` e o campo isca da Lambda.
 */
export function montarEnvio(estado, id, total) {
  return {
    acao: 'salvar',
    id,
    etapa: estado.tela,
    concluido: estado.tela >= total,
    respostas: estado.respostas,
    site: '',
  };
}

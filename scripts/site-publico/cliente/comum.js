/**
 * Resumo do arquivo:
 * Trecho do navegador compartilhado pelas paginas do site da feira. Vai no zip
 * como `js/comum.js` e e carregado como modulo pelas outras (`baixar.js`,
 * `opiniao.js`, `resultados.js`). As funcoes puras (`ehIphone`, `montarPedido`)
 * sao testadas em __tests__/siteCliente.test.ts; o resto mexe em DOM e rede e
 * e conferido no navegador.
 *
 * Nada aqui guarda cookie nem identifica a pessoa: o unico dado que sai do
 * aparelho e o que a pesquisa pergunta e a origem do clique em "Baixar o app".
 */

/** iPad novo se apresenta como Mac, mas tem tela de toque; Mac de verdade nao tem. */
export function ehIphone({ userAgent = '', plataforma = '', toquesSimultaneos = 0 } = {}) {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return plataforma === 'MacIntel' && toquesSimultaneos > 1;
}

/**
 * O corpo vai como texto simples de proposito: assim o navegador nao faz o
 * pedido de verificacao (preflight) antes de cada envio, uma coisa a menos para
 * dar errado numa rede ruim de feira. A Lambda le o JSON de qualquer jeito.
 * Com a chave do painel entra o cabecalho `x-chave`, e ai o preflight acontece
 * (a Function URL responde a ele).
 */
export function montarPedido(corpo, { chave } = {}) {
  const headers = { 'content-type': 'text/plain;charset=UTF-8' };
  if (chave) headers['x-chave'] = chave;
  return { method: 'POST', headers, body: JSON.stringify(corpo), keepalive: true };
}

/** O endereco da Function URL que o gerador deixou numa `<meta>` da pagina. */
export function enderecoDaPesquisa(documento = document) {
  return documento.querySelector('meta[name="pesquisa-endpoint"]')?.content ?? '';
}

/** Envia e devolve o JSON da resposta; lanca erro se a rede ou a Lambda falharem. */
export async function enviar(corpo, opcoes) {
  const endereco = enderecoDaPesquisa();
  if (!endereco) throw new Error('A pesquisa nao esta configurada nesta pagina.');
  const resposta = await fetch(endereco, montarPedido(corpo, opcoes));
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

/** Conta o clique em "Baixar o app". Nunca atrapalha o download, falhe ou nao. */
export function registrarClique(origem) {
  enviar({ acao: 'clique', origem }).catch(() => undefined);
}

/**
 * Liga o contador de cliques a todo botao `data-baixar="inicio|fim"` e, no
 * iPhone, troca o botao por um aviso (o app so instala em Android). Se a
 * deteccao errar, o pior caso e a pessoa ainda poder baixar, entao ela nunca
 * bloqueia o que nao tem certeza.
 */
export function prepararBotoesDeDownload(raiz = document) {
  const iphone = ehIphone({
    userAgent: navigator.userAgent,
    plataforma: navigator.platform,
    toquesSimultaneos: navigator.maxTouchPoints,
  });
  for (const botao of raiz.querySelectorAll('a[data-baixar]')) {
    if (iphone) {
      botao.setAttribute('aria-disabled', 'true');
      botao.removeAttribute('href');
    } else {
      botao.addEventListener('click', () => registrarClique(botao.dataset.baixar));
    }
  }
  if (iphone) {
    for (const aviso of raiz.querySelectorAll('.aviso-iphone')) aviso.hidden = false;
  }
}

/**
 * Cria um elemento sem nunca interpretar texto como HTML: os filhos entram por
 * `append` (texto vira texto) e as propriedades por `setAttribute`. E assim que
 * as paginas mostram qualquer coisa que veio de um visitante.
 */
export function el(tag, propriedades = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(propriedades)) {
    if (nome === 'class') elemento.className = valor;
    else if (nome.startsWith('on')) elemento.addEventListener(nome.slice(2), valor);
    else if (valor === true) elemento.setAttribute(nome, '');
    else if (valor !== false && valor != null) elemento.setAttribute(nome, valor);
  }
  for (const filho of filhos.flat()) if (filho != null) elemento.append(filho);
  return elemento;
}

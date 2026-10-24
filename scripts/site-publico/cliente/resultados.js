/**
 * Resumo do arquivo:
 * Script de `resultados.html`, o painel do grupo: pede a senha, busca as
 * respostas na Lambda (`listar`) e desenha totais, barras, o cruzamento idade e
 * interesse e os comentarios. As contas estao em `agregar.js` (testadas em
 * __tests__/pesquisaAgregar.test.ts); aqui so ha DOM e rede.
 *
 * Regras que importam:
 * - A senha so existe no cabecalho `x-chave` e no `sessionStorage` desta aba.
 *   Nunca no armazenamento que sobrevive a aba, nunca na URL, nunca no codigo.
 * - Nada que veio de um visitante (o comentario!) e interpretado como HTML:
 *   tudo entra por `el`, que usa `append` e `setAttribute`.
 * - Sempre o numero absoluto ao lado do percentual, e o percentual sem casas.
 */
import { el, enviar } from './comum.js';
// `agregar.js` e `pesquisa.js` so existem no zip do site: sao `infra/site-pesquisa/agregar.mjs` e
// `pesquisa.mjs` publicados como `.js` (ver `ativos.mjs`). O teste sitePublicoOpiniao confere
// que cada import daqui resolve la.
/* eslint-disable import/no-unresolved */
import { agregar, paraCsv } from './agregar.js';
import { PERGUNTAS } from './pesquisa.js';
/* eslint-enable import/no-unresolved */

const CHAVE_DO_ARMAZEM = 'suasaude-chave';
// Marca de ordem de bytes: sem ela o Excel le o CSV em UTF-8 como se fosse outra codificacao e estraga os acentos.
const BOM = String.fromCharCode(0xfeff);
const MENSAGEM_DE_SENHA = 'Senha incorreta.';
const MENSAGEM_DE_REDE = 'Não foi possível carregar os resultados. Confira a internet e tente de novo.';

const porId = (id) => document.getElementById(id);
const entrada = porId('entrada');
const painel = porId('painel');
const conteudo = porId('conteudo');
const campoDaChave = porId('chave');
const erroDaEntrada = porId('erro-entrada');
const botaoEntrar = porId('entrar');

let chaveAtual = '';
let itens = [];

// --- Senha guardada so nesta aba ----------------------------------------------------

function lerChave() {
  try {
    return window.sessionStorage.getItem(CHAVE_DO_ARMAZEM) ?? '';
  } catch {
    return '';
  }
}

function guardarChave(chave) {
  try {
    window.sessionStorage.setItem(CHAVE_DO_ARMAZEM, chave);
  } catch {
    // Sem armazenamento (aba privada): o painel funciona, so pede a senha a cada recarga.
  }
}

function esquecerChave() {
  try {
    window.sessionStorage.removeItem(CHAVE_DO_ARMAZEM);
  } catch {
    // Nada a esquecer.
  }
}

// --- Telas ---------------------------------------------------------------------------

function mostrarEntrada(mensagem) {
  painel.hidden = true;
  entrada.hidden = false;
  erroDaEntrada.hidden = !mensagem;
  erroDaEntrada.textContent = mensagem ?? '';
}

function mostrarPainel() {
  entrada.hidden = true;
  erroDaEntrada.hidden = true;
  painel.hidden = false;
  desenhar();
}

// --- Desenho -------------------------------------------------------------------------

const percentual = (n, base) => (base > 0 ? Math.round((n / base) * 100) : 0);
const pessoas = (n) => `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`;

function total(numero, rotulo) {
  return el('div', { class: 'total' }, el('strong', {}, String(numero)), el('span', {}, rotulo));
}

function linhaDeBarra(rotulo, n, base) {
  const fatia = percentual(n, base);
  return el(
    'div',
    { class: 'linha-barra' },
    el('span', { class: 'rotulo' }, rotulo),
    el('span', { class: 'numero' }, `${n} (${fatia}%)`),
    el('div', { class: 'barra', style: `width:${fatia}%` }),
  );
}

function secaoDaPergunta(pergunta, agregado) {
  const contagens = (pergunta.tipo === 'multipla' ? agregado.multiplas : agregado.unicas)[pergunta.id] ?? {};
  const base = agregado.bases[pergunta.id] ?? 0;
  let opcoes = pergunta.opcoes;
  // Qual funcionalidade chama mais atencao e o que o grupo quer ver primeiro.
  if (pergunta.id === 'chamaram_atencao') {
    opcoes = [...opcoes].sort((a, b) => (contagens[b.codigo] ?? 0) - (contagens[a.codigo] ?? 0));
  }
  return el(
    'section',
    { class: 'painel-secao' },
    el('h2', {}, pergunta.titulo),
    el('p', { class: 'base' }, `${pessoas(base)} ${base === 1 ? 'respondeu' : 'responderam'}`),
    ...opcoes.map((opcao) => linhaDeBarra(opcao.texto, contagens[opcao.codigo] ?? 0, base)),
  );
}

function secaoDoCruzamento(agregado) {
  const idade = PERGUNTAS.find((p) => p.id === 'idade');
  const faixas = idade.opcoes.filter((opcao) => agregado.porIdade[opcao.codigo]);
  const corpo = faixas.map((opcao) => {
    const { total: quantas, usariaAlto } = agregado.porIdade[opcao.codigo];
    return el(
      'tr',
      {},
      el('td', {}, opcao.texto),
      el('td', {}, pessoas(quantas)),
      el('td', {}, `${usariaAlto} (${percentual(usariaAlto, quantas)}%)`),
    );
  });
  return el(
    'section',
    { class: 'painel-secao' },
    el('h2', {}, 'Idade e interesse'),
    el('p', { class: 'base' }, 'Entre quem respondeu a idade e se usaria. Interesse alto é Usaria ou Usaria muito.'),
    el(
      'table',
      { class: 'cruzamento' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Faixa'), el('th', {}, 'Pessoas'), el('th', {}, 'Interesse alto'))),
      el('tbody', {}, ...corpo),
    ),
  );
}

function secaoDosComentarios(agregado) {
  const lista = agregado.comentarios.length
    ? agregado.comentarios.map((texto) => el('p', { class: 'comentario' }, texto))
    : [el('p', { class: 'base' }, 'Ainda não há comentários.')];
  return el('section', { class: 'painel-secao' }, el('h2', {}, 'O que faltou ou o que mudariam'), ...lista);
}

function desenhar() {
  const agregado = agregar(itens);
  const secoes = [
    el(
      'div',
      { class: 'totais' },
      total(agregado.respondentes, 'Respostas'),
      total(agregado.concluidas, 'Concluídas'),
      total(agregado.cliques.inicio, 'Baixar (início)'),
      total(agregado.cliques.fim, 'Baixar (fim)'),
    ),
  ];
  for (const pergunta of PERGUNTAS) {
    if (pergunta.tipo === 'texto') continue;
    secoes.push(secaoDaPergunta(pergunta, agregado));
    if (pergunta.id === 'idade') secoes.push(secaoDoCruzamento(agregado));
  }
  secoes.push(secaoDosComentarios(agregado));
  conteudo.replaceChildren(...secoes);
}

// --- Carregar -------------------------------------------------------------------------

async function carregar(chave) {
  botaoEntrar.setAttribute('aria-disabled', 'true');
  try {
    const resposta = await enviar({ acao: 'listar' }, { chave });
    itens = Array.isArray(resposta.itens) ? resposta.itens : [];
    chaveAtual = chave;
    guardarChave(chave);
    mostrarPainel();
  } catch (erro) {
    if (erro.message === 'HTTP 401') {
      esquecerChave();
      mostrarEntrada(MENSAGEM_DE_SENHA);
    } else {
      mostrarEntrada(MENSAGEM_DE_REDE);
    }
  } finally {
    botaoEntrar.removeAttribute('aria-disabled');
  }
}

function baixarCsv() {
  const arquivo = new Blob([BOM, paraCsv(itens, PERGUNTAS)], { type: 'text/csv;charset=utf-8' });
  const endereco = URL.createObjectURL(arquivo);
  const link = el('a', { href: endereco, download: 'respostas-suasaude.csv' });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(endereco);
}

porId('formulario-entrada').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const chave = campoDaChave.value;
  if (chave !== '') carregar(chave);
});
porId('atualizar').addEventListener('click', () => carregar(chaveAtual));
porId('baixar-csv').addEventListener('click', baixarCsv);
porId('sair').addEventListener('click', () => {
  esquecerChave();
  chaveAtual = '';
  itens = [];
  campoDaChave.value = '';
  conteudo.replaceChildren();
  mostrarEntrada('');
});

// Quem recarrega a aba entra direto, se a senha desta aba ainda valer.
const guardada = lerChave();
if (guardada !== '') carregar(guardada);

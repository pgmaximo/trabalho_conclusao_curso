/**
 * Resumo do arquivo:
 * Script de `opiniao.html`: desenha uma pergunta por tela e envia as respostas
 * para a Lambda a cada tela. A logica de cada toque esta em `fluxo.js` (testada
 * em __tests__/pesquisaFluxo.test.ts) e as perguntas em `pesquisa.js`; aqui so
 * ha DOM e rede, e isso e conferido no navegador.
 *
 * Regras que importam:
 * - Nunca monta HTML a partir de texto: tudo entra por `append` e `setAttribute`.
 * - Os envios vao em fila, um por vez, para uma tela antiga nunca chegar depois
 *   de uma nova e desfazer o progresso. Cada envio leva TODAS as respostas.
 * - Falha de envio nunca perde resposta: o estado fica na tela e no
 *   `sessionStorage`, e "Tentar de novo" reenvia.
 */
import { el, enviar, prepararBotoesDeDownload } from './comum.js';
// `fluxo.js` e `pesquisa.js` so existem no zip do site: sao `infra/site-pesquisa/fluxo.mjs` e
// `pesquisa.mjs` publicados como `.js` (ver `ativos.mjs`). O teste sitePublicoOpiniao confere
// que cada import daqui resolve la.
/* eslint-disable import/no-unresolved */
import { avancar, digitar, escolher, estadoInicial, montarEnvio, podeAvancar, voltar } from './fluxo.js';
import { PERGUNTAS } from './pesquisa.js';
/* eslint-enable import/no-unresolved */

const TOTAL = PERGUNTAS.length;
const CHAVE_DO_ARMAZEM = 'suasaude-pesquisa';
const ATRASO_DO_AVANCO_MS = 250;

const porId = (id) => document.getElementById(id);
const abertura = porId('abertura');
const pesquisa = porId('pesquisa');
const fim = porId('fim');
const barra = porId('barra');
const barraAcessivel = barra.parentElement;
const textoDoProgresso = porId('progresso-texto');
const areaDaPergunta = porId('pergunta');
const caixaDeErro = porId('erro');

// --- Identidade da resposta e estado, guardados so nesta aba ---------------------

function novoId() {
  if (window.crypto.randomUUID) return window.crypto.randomUUID();
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function lerDoArmazem() {
  try {
    const salvo = JSON.parse(window.sessionStorage.getItem(CHAVE_DO_ARMAZEM) ?? 'null');
    const valido =
      salvo &&
      typeof salvo.id === 'string' &&
      Number.isInteger(salvo.estado?.tela) &&
      salvo.estado.tela >= 0 &&
      salvo.estado.tela <= TOTAL &&
      typeof salvo.estado.respostas === 'object';
    return valido ? salvo : null;
  } catch {
    return null;
  }
}

function guardarNoArmazem() {
  try {
    window.sessionStorage.setItem(CHAVE_DO_ARMAZEM, JSON.stringify({ id, estado }));
  } catch {
    // Navegador sem armazenamento (aba privada): a pesquisa funciona do mesmo jeito.
  }
}

const recuperado = lerDoArmazem();
const id = recuperado?.id ?? novoId();
let estado = recuperado?.estado ?? estadoInicial();

// --- Envio em fila ----------------------------------------------------------------

let fila = Promise.resolve();
let falhouNaUltima = false;

/** Resolve `true` se salvou. Mostra o aviso de erro se nao salvou. */
function enfileirarEnvio(alvo) {
  const corpo = montarEnvio(alvo, id, TOTAL);
  const envio = fila.then(() => enviar(corpo)).then(
    () => {
      caixaDeErro.hidden = true;
      return true;
    },
    () => {
      caixaDeErro.hidden = false;
      return false;
    },
  );
  fila = envio;
  return envio;
}

// --- Desenho ------------------------------------------------------------------------

function valoresDe(pergunta) {
  const valor = estado.respostas[pergunta.id];
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function atualizarProgresso() {
  const atual = Math.min(estado.tela, TOTAL);
  barra.style.width = `${(atual / TOTAL) * 100}%`;
  barraAcessivel.setAttribute('aria-valuenow', String(atual));
  textoDoProgresso.textContent = estado.tela < TOTAL ? `${estado.tela + 1} de ${TOTAL}` : '';
}

let tokenDoAvanco = 0;

function desenharPergunta(animar) {
  tokenDoAvanco += 1;
  caixaDeErro.hidden = true;
  falhouNaUltima = false;
  atualizarProgresso();

  const pergunta = PERGUNTAS[estado.tela];
  const exclusivas = pergunta.exclusivas ?? [];
  const entradas = [];

  const sincronizar = () => {
    const marcadas = valoresDe(pergunta);
    const lotado =
      pergunta.max && marcadas.filter((codigo) => !exclusivas.includes(codigo)).length >= pergunta.max;
    for (const { input, rotulo, codigo } of entradas) {
      const marcada = marcadas.includes(codigo);
      const bloqueada = Boolean(lotado) && !marcada && !exclusivas.includes(codigo);
      input.checked = marcada;
      input.disabled = bloqueada;
      rotulo.classList.toggle('marcada', marcada);
      rotulo.classList.toggle('bloqueada', bloqueada);
    }
    botaoAvancar.setAttribute('aria-disabled', String(!podeAvancar(estado, pergunta)));
  };

  const legenda = el('legend', { tabindex: '-1' }, pergunta.titulo);
  const conjunto = el('fieldset', {}, legenda);
  if (pergunta.apoio) conjunto.append(el('p', { class: 'apoio' }, pergunta.apoio));

  const ultima = estado.tela === TOTAL - 1;
  const botaoAvancar = el(
    'button',
    { class: 'botao', type: 'button', onclick: () => irParaProxima() },
    ultima ? 'Enviar respostas' : 'Continuar',
  );

  if (pergunta.tipo === 'texto') {
    const campo = el('textarea', {
      rows: '4',
      maxlength: String(pergunta.max),
      'aria-labelledby': 'rotulo-do-texto',
      oninput: () => {
        estado = digitar(estado, pergunta, campo.value);
        contador.textContent = `${campo.value.length} de ${pergunta.max}`;
        guardarNoArmazem();
      },
    });
    campo.value = estado.respostas[pergunta.id] ?? '';
    legenda.id = 'rotulo-do-texto';
    const contador = el('p', { class: 'contador' }, `${campo.value.length} de ${pergunta.max}`);
    conjunto.append(campo, contador);
  } else {
    for (const opcao of pergunta.opcoes) {
      const input = el('input', {
        type: pergunta.tipo === 'unica' ? 'radio' : 'checkbox',
        name: pergunta.id,
        value: opcao.codigo,
        onclick: () => {
          estado = escolher(estado, pergunta, opcao.codigo);
          guardarNoArmazem();
          sincronizar();
          if (pergunta.tipo === 'unica') {
            const deste = tokenDoAvanco;
            window.setTimeout(() => {
              if (deste === tokenDoAvanco) irParaProxima();
            }, ATRASO_DO_AVANCO_MS);
          }
        },
      });
      const rotulo = el('label', { class: 'opcao' }, input, el('span', {}, opcao.texto));
      entradas.push({ input, rotulo, codigo: opcao.codigo });
      conjunto.append(rotulo);
    }
  }

  const botaoVoltar =
    estado.tela > 0
      ? el(
          'button',
          {
            class: 'botao botao-sec',
            type: 'button',
            onclick: () => {
              estado = voltar(estado);
              guardarNoArmazem();
              desenharPergunta(true);
            },
          },
          'Voltar',
        )
      : null;
  conjunto.append(el('div', { class: 'navegacao' }, botaoVoltar, botaoAvancar));

  areaDaPergunta.replaceChildren(conjunto);
  sincronizar();
  if (animar) {
    areaDaPergunta.classList.remove('entra');
    void areaDaPergunta.offsetWidth;
    areaDaPergunta.classList.add('entra');
  }
  legenda.focus();
}

function mostrarFim() {
  atualizarProgresso();
  abertura.hidden = true;
  pesquisa.hidden = true;
  fim.hidden = false;
  porId('titulo-do-fim').focus();
}

async function irParaProxima() {
  const pergunta = PERGUNTAS[estado.tela];
  if (!pergunta || !podeAvancar(estado, pergunta)) return;
  tokenDoAvanco += 1;
  const proximo = avancar(estado, TOTAL);

  if (proximo.tela >= TOTAL) {
    // A ultima tela so conclui se salvar: senao a pessoa acharia que respondeu.
    const salvou = await enfileirarEnvio(proximo);
    falhouNaUltima = !salvou;
    if (!salvou) return;
    estado = proximo;
    guardarNoArmazem();
    mostrarFim();
    return;
  }

  estado = proximo;
  guardarNoArmazem();
  desenharPergunta(true);
  enfileirarEnvio(estado);
}

porId('tentar-de-novo').addEventListener('click', () => {
  if (falhouNaUltima) irParaProxima();
  else enfileirarEnvio(estado);
});

porId('comecar').addEventListener('click', () => {
  abertura.hidden = true;
  pesquisa.hidden = false;
  desenharPergunta(false);
});

// --- Inicio: quem recarrega a aba volta para onde estava --------------------------------

prepararBotoesDeDownload(document);

if (estado.tela >= TOTAL) {
  mostrarFim();
} else if (estado.tela > 0 || Object.keys(estado.respostas).length > 0) {
  abertura.hidden = true;
  pesquisa.hidden = false;
  desenharPergunta(false);
}

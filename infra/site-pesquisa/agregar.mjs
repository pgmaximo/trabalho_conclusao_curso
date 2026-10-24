/**
 * Resumo do arquivo:
 * As contas do painel de resultados (`resultados.html`) e o CSV da pesquisa da
 * feira. Funcoes puras sobre os itens que a Lambda devolve em `listar`: o painel
 * e o script `pesquisa:exportar` so desenham o que elas devolvem. Sem imports,
 * para ir como esta no zip do site (`js/agregar.js`).
 *
 * Os itens vem de um banco que qualquer visitante alimenta (pela Lambda, que
 * valida), entao aqui nada e suposto: item torto e pulado, nunca derruba o painel.
 * Os mapas de contagem nao tem prototipo, para uma chave estranha nao virar `__proto__`.
 */

const USARIA_ALTO = ['usaria', 'usaria_muito'];
const ORIGENS_DE_CLIQUE = ['inicio', 'fim'];
const COLUNAS_FIXAS = ['Resposta', 'Início', 'Última atualização', 'Telas respondidas', 'Concluída'];

const ehObjeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);

function contar(mapas, pergunta, codigo) {
  if (!mapas[pergunta]) mapas[pergunta] = Object.create(null);
  mapas[pergunta][codigo] = (mapas[pergunta][codigo] || 0) + 1;
}

/**
 * @param {unknown[]} itens
 * @returns {{ respondentes: number, concluidas: number,
 *   unicas: Record<string, Record<string, number>>, multiplas: Record<string, Record<string, number>>,
 *   bases: Record<string, number>, porIdade: Record<string, { total: number, usariaAlto: number }>,
 *   comentarios: string[], cliques: { inicio: number, fim: number } }}
 */
export function agregar(itens) {
  const resultado = {
    respondentes: 0,
    concluidas: 0,
    unicas: Object.create(null),
    multiplas: Object.create(null),
    bases: Object.create(null),
    porIdade: Object.create(null),
    comentarios: [],
    cliques: { inicio: 0, fim: 0 },
  };
  const comentarios = [];

  for (const item of itens) {
    if (!ehObjeto(item)) continue;

    if (item.tipo === 'clique') {
      if (ORIGENS_DE_CLIQUE.indexOf(item.origem) >= 0) resultado.cliques[item.origem] += 1;
      continue;
    }
    if (item.tipo !== 'resposta') continue;

    resultado.respondentes += 1;
    if (item.concluido === true) resultado.concluidas += 1;
    const respostas = ehObjeto(item.respostas) ? item.respostas : {};

    for (const pergunta of Object.keys(respostas)) {
      const valor = respostas[pergunta];
      if (pergunta === 'comentario') {
        if (typeof valor === 'string' && valor.trim() !== '') {
          comentarios.push({ texto: valor, quando: typeof item.atualizadoEm === 'string' ? item.atualizadoEm : '' });
        }
        continue;
      }
      if (typeof valor === 'string') contar(resultado.unicas, pergunta, valor);
      else if (Array.isArray(valor)) valor.forEach((codigo) => contar(resultado.multiplas, pergunta, String(codigo)));
      else continue;
      resultado.bases[pergunta] = (resultado.bases[pergunta] || 0) + 1;
    }

    if (typeof respostas.idade === 'string' && typeof respostas.usaria === 'string') {
      const faixa = resultado.porIdade[respostas.idade] || { total: 0, usariaAlto: 0 };
      faixa.total += 1;
      if (USARIA_ALTO.indexOf(respostas.usaria) >= 0) faixa.usariaAlto += 1;
      resultado.porIdade[respostas.idade] = faixa;
    }
  }

  comentarios.sort((a, b) => (a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : 0));
  resultado.comentarios = comentarios.map((c) => c.texto);
  return resultado;
}

/**
 * Uma celula de CSV (RFC 4180). Texto que a planilha leria como formula
 * (`=`, `+`, `-`, `@`) ganha um apostrofo na frente: o comentario livre vem de
 * qualquer visitante e o grupo abre o arquivo no Excel.
 */
function celula(valor) {
  let texto = String(valor === undefined || valor === null ? '' : valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function textoDaResposta(pergunta, valor) {
  if (valor === undefined) return '';
  if (pergunta.tipo === 'texto') return String(valor);
  const rotulo = (codigo) => {
    const opcao = (pergunta.opcoes || []).find((o) => o.codigo === codigo);
    return opcao ? opcao.texto : String(codigo);
  };
  return Array.isArray(valor) ? valor.map(rotulo).join('; ') : rotulo(valor);
}

/**
 * O CSV com uma linha por resposta (cliques ficam de fora), da mais antiga a
 * mais nova. Mostra o texto das opcoes, nao o codigo, porque quem le e o grupo.
 * Quem grava o arquivo acrescenta o BOM (`﻿`) para o Excel ler os acentos.
 * @param {unknown[]} itens
 * @param {{ id: string, titulo: string, tipo: string, opcoes?: { codigo: string, texto: string }[] }[]} perguntas
 */
export function paraCsv(itens, perguntas) {
  const respostas = itens
    .filter((item) => ehObjeto(item) && item.tipo === 'resposta')
    .sort((a, b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')));
  const linhas = [[...COLUNAS_FIXAS, ...perguntas.map((p) => p.titulo)]];
  for (const item of respostas) {
    const dados = ehObjeto(item.respostas) ? item.respostas : {};
    linhas.push([
      item.id,
      item.criadoEm,
      item.atualizadoEm,
      item.etapa,
      item.concluido === true ? 'sim' : 'não',
      ...perguntas.map((p) => textoDaResposta(p, dados[p.id])),
    ]);
  }
  return `${linhas.map((linha) => linha.map(celula).join(',')).join('\r\n')}\r\n`;
}

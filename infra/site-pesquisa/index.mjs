/**
 * Resumo do arquivo:
 * A Lambda da pesquisa de opiniao da feira, atras de uma Function URL publica.
 * Tres acoes, todas por POST com corpo JSON:
 *   - `salvar`: grava ou atualiza a resposta de um `id` (a mesma resposta e
 *     regravada a cada tela);
 *   - `clique`: conta um clique em "Baixar o app", com a origem (inicio ou fim);
 *   - `listar`: devolve tudo, so com a senha do grupo no cabecalho `x-chave`.
 *
 * Privacidade: a pesquisa e anonima. Esta funcao nao grava nem registra nos
 * logs o IP, os cabecalhos ou o corpo do pedido. O unico `console` abaixo
 * escreve uma frase fixa quando o DynamoDB falha.
 *
 * O CORS e da Function URL (infra/site-pesquisa/template.json), nao daqui:
 * cabecalhos duplicados fariam o navegador recusar a resposta.
 */
import { Buffer } from 'node:buffer';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import { criarClienteReal, criarRepositorio } from './repositorio.mjs';
import { VERSAO_DO_FORMULARIO, validarEnvio } from './pesquisa.mjs';

const LIMITE_DO_CORPO = 16 * 1024;
const ORIGENS_DE_CLIQUE = ['inicio', 'fim'];

function resposta(statusCode, corpo) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    body: JSON.stringify(corpo),
  };
}

/** @returns {{ ok: true, valor: Record<string, unknown> } | { ok: false, erro: string }} */
function lerCorpo(evento) {
  const bruto = evento?.body;
  if (typeof bruto !== 'string' || bruto === '') return { ok: false, erro: 'Corpo ausente.' };
  if (bruto.length > LIMITE_DO_CORPO * 2) return { ok: false, erro: 'Corpo grande demais.' };
  const texto = evento.isBase64Encoded ? Buffer.from(bruto, 'base64').toString('utf8') : bruto;
  if (texto.length > LIMITE_DO_CORPO) return { ok: false, erro: 'Corpo grande demais.' };
  try {
    const valor = JSON.parse(texto);
    if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
      return { ok: false, erro: 'O corpo precisa ser um objeto JSON.' };
    }
    return { ok: true, valor };
  } catch {
    return { ok: false, erro: 'JSON inválido.' };
  }
}

/** Compara as senhas em tempo constante (os dois lados passam por SHA-256 para terem o mesmo tamanho). */
function chaveConfere(recebida, esperada) {
  if (typeof recebida !== 'string' || esperada === '') return false;
  const a = createHash('sha256').update(recebida).digest();
  const b = createHash('sha256').update(esperada).digest();
  return timingSafeEqual(a, b);
}

/**
 * @param {{ repositorio: { gravarResposta(item: object): Promise<void>, gravarClique(item: object): Promise<void>, listar(): Promise<object[]> },
 *           senha: string, agora: () => Date, novoId: () => string }} deps
 */
export function criarHandler({ repositorio, senha, agora, novoId }) {
  return async function tratar(evento) {
    try {
      if (evento?.requestContext?.http?.method !== 'POST') return resposta(405, { erro: 'Use POST.' });

      const lido = lerCorpo(evento);
      if (!lido.ok) return resposta(400, { erro: lido.erro });
      const corpo = lido.valor;

      if (corpo.acao === 'salvar') {
        // Campo isca: pessoa nenhuma o ve, robo preenche. Responde como se tivesse gravado.
        if (typeof corpo.site === 'string' && corpo.site !== '') return resposta(200, { ok: true });
        const envio = validarEnvio(corpo);
        if (!envio.ok) return resposta(400, { erro: envio.erro });
        const agoraIso = agora().toISOString();
        await repositorio.gravarResposta({
          id: envio.valor.id,
          tipo: 'resposta',
          versaoDoFormulario: VERSAO_DO_FORMULARIO,
          criadoEm: agoraIso,
          atualizadoEm: agoraIso,
          etapa: envio.valor.etapa,
          concluido: envio.valor.concluido,
          respostas: envio.valor.respostas,
        });
        return resposta(200, { ok: true });
      }

      if (corpo.acao === 'clique') {
        if (!ORIGENS_DE_CLIQUE.includes(corpo.origem)) return resposta(400, { erro: 'origem inválida' });
        await repositorio.gravarClique({
          id: `clique-${novoId()}`,
          tipo: 'clique',
          origem: corpo.origem,
          criadoEm: agora().toISOString(),
        });
        return resposta(200, { ok: true });
      }

      if (corpo.acao === 'listar') {
        if (!chaveConfere(evento.headers?.['x-chave'], senha)) return resposta(401, { erro: 'Chave inválida.' });
        return resposta(200, { itens: await repositorio.listar() });
      }

      return resposta(404, { erro: 'Ação desconhecida.' });
    } catch (erro) {
      // So o nome do erro: o pedido (corpo, cabecalhos, IP) nunca vai para o log.
      console.error(`pesquisa: falha ao acessar o DynamoDB (${erro?.name ?? 'erro'})`);
      return resposta(500, { erro: 'Não foi possível concluir. Tente de novo.' });
    }
  };
}

let tratarDeVerdade;

/** O ponto de entrada da Lambda (`Handler: index.handler`). */
export async function handler(evento) {
  try {
    tratarDeVerdade ??= criarHandler({
      repositorio: criarRepositorio(await criarClienteReal(), process.env.TABELA),
      senha: process.env.CHAVE_RESULTADOS ?? '',
      agora: () => new Date(),
      novoId: () => randomUUID(),
    });
  } catch (erro) {
    console.error(`pesquisa: falha ao iniciar (${erro?.name ?? 'erro'})`);
    return resposta(500, { erro: 'Não foi possível concluir. Tente de novo.' });
  }
  return tratarDeVerdade(evento);
}

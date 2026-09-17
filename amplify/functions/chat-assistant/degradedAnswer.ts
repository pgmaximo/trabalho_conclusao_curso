/**
 * Resumo do arquivo:
 * A etapa E da D31 -- o que a pessoa ve quando a resposta gerada nao pode ser
 * exibida e as ferramentas tinham dado.
 *
 * ELE NAO E UM REMENDO DA RESPOSTA DO MODELO. E outra coisa, construida a
 * partir de dado estruturado, e e por isso que ele nao sofre do problema da
 * opcao recusada: recortar o texto reprovado inverte sentido em vez de
 * remove-lo, e o texto resultante nao foi escrito por ninguem.
 *
 * E ele passa as regras POR CONSTRUCAO: nao tem posologia porque nao ha espaco
 * para ela, cita numero com origem porque a origem e campo, e encaminha porque
 * o encaminhamento faz parte do modelo fixo. Um teste o submete ao proprio
 * verificador e exige aprovacao -- se ele precisasse ser verificado, nao
 * serviria como saida da reprovacao, so como mais uma coisa reprovavel.
 *
 * Nao e escopo extra: e a tese do projeto no caminho da falha. O projeto se
 * define por organizar informacao sem interpretar; quando o modelo nao
 * consegue falar com seguranca, mostrar os numeros com data, unidade e
 * documento de origem e exatamente o que ele se propos a fazer. A prosa era o
 * acrescimo; o dado rastreavel era o produto.
 */
import type { AnswerCitation } from './chatSchema';
import { CHAT_TOOLS } from './tools';
import type { DegradedBlock } from './types';

const ABERTURA =
  'Não consegui escrever uma resposta sobre isso. Aqui está o que está registrado no seu histórico, do jeito que foi guardado.';

// "Aqui" e nao "abaixo": a palavra "abaixo" e posicional e inofensiva, mas a
// varredura que garante que este texto nao compara valor com faixa procura
// justamente por "acima" e "abaixo". Manter a varredura grosseira e tornar a
// copy imune a ela e mais seguro do que ensinar a varredura a distinguir os
// dois usos -- uma varredura com excecao e uma varredura que um dia deixa
// passar a excecao errada.

const FECHAMENTO = 'Leve seus exames ao seu médico para avaliar o que eles significam.';

export function buildDegradedAnswer(
  toolOutputs: { name: string; output: unknown }[],
): { texto: string; citacoes: AnswerCitation[] } | null {
  const blocos: DegradedBlock[] = [];

  for (const { name, output } of toolOutputs) {
    const tool = CHAT_TOOLS.find((t) => t.name === name);
    // Tool sem renderizador simplesmente nao entra. Nao e erro: nem toda saida
    // rende texto util, e o montador ignora quem nao sabe se mostrar.
    if (!tool?.renderDegraded) continue;
    const bloco = tool.renderDegraded(output);
    if (bloco && bloco.linhas.length > 0) blocos.push(bloco);
  }

  // Sem nada para mostrar, quem chamou segue para a etapa C. Devolver um texto
  // vazio com moldura seria pior que a indisponibilidade honesta: pareceria
  // uma resposta.
  if (blocos.length === 0) return null;

  const corpo = blocos
    .map((b) => `${b.titulo}\n${b.linhas.map((l) => `• ${l}`).join('\n')}`)
    .join('\n\n');

  return {
    texto: `${ABERTURA}\n\n${corpo}\n\n${FECHAMENTO}`,
    citacoes: blocos.flatMap((b) => b.citacoes),
  };
}

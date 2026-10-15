/**
 * Resumo do arquivo:
 * O encaminhamento a um profissional de saude, escrito pelo APLICATIVO.
 *
 * Por que ele saiu das maos do modelo (decisoes A2 e C3 do Bloco 9):
 *
 * 1. A R2 e a unica das cinco regras cuja violacao e a AUSENCIA de um texto
 *    fixo. Nas outras quatro, o problema esta no que foi dito, e gerar de novo
 *    faz sentido. Aqui o aplicativo SABE qual e a frase que falta -- e mesmo
 *    assim descartava a resposta inteira. Foram 2 de 2 reprovacoes medidas em
 *    producao, as duas falso positivo, e uma delas custou a resposta a pessoa.
 *
 * 2. Enquanto o encaminhamento fosse prosa gerada, ele carregava o que prosa
 *    gerada carrega. Na conversa real ele veio assim: "se tiver algum valor
 *    que te preocupa... o especialista que solicitou o exame" -- um convite a
 *    julgar, e dois fatos que o aplicativo nao sabe (que houve um pedido, e
 *    que quem pediu era especialista).
 *
 * O que isto MUDA na garantia: ela deixa de ser probabilistica -- o modelo
 * lembra ou nao -- e passa a ser deterministica. Isso e mais forte do que
 * existia, e nao mais fraco: quando o modelo esquecia, a pessoa nao recebia
 * nem o encaminhamento nem a resposta.
 *
 * O que isto NAO muda: a costura vale SO para a R2, e so quando ela e a UNICA
 * violacao. Com qualquer outra regra junto, o caminho continua A -> E -> C
 * (D31). O que a R3 reprova continua sendo reprovado.
 *
 * Modulo PURO, de proposito: quem decide quando costurar e a verificacao.
 */
import { temEncaminhamento } from '../ai-language-rules/languageRules';

/**
 * A frase. Escrita uma vez, revisada por uma pessoa, e provada por teste
 * contra as cinco regras.
 *
 * Cada palavra dela e uma recusa:
 * - "profissional de saude", e nao "seu medico": o aplicativo nao sabe se a
 *   pessoa tem um;
 * - "o que isso significa para voce", e nao "se algo esta alterado": nao
 *   sugere que exista algo errado ali;
 * - sem mencao a quem pediu o exame, porque o aplicativo nao sabe que houve
 *   um pedido.
 *
 * A repeticao entre turnos e o preco, e e um preco assumido: a copy inteira
 * deste aplicativo e sobria por decisao.
 */
export const TEXTO_DE_ENCAMINHAMENTO =
  'Para avaliar o que isso significa para você, procure um profissional de saúde.';

export type Costura = {
  texto: string;
  /** Houve costura? Sobe para o log: sem esse numero, ninguem sabe mais se o
   *  modelo obedece a instrucao de nao escrever o encaminhamento sozinho. */
  costurado: boolean;
};

/**
 * Acrescenta o encaminhamento ao FIM, quando ele falta.
 *
 * Nunca no meio: costurar no meio exigiria entender a estrutura do texto, e
 * quem entende texto e o modelo -- esta camada existe por ser deterministica.
 *
 * E nunca em cima de um encaminhamento que ja existe: duas frases dizendo a
 * mesma coisa sao o rodape mecanico que o estudo de linguagem manda evitar. O
 * reconhecedor e o MESMO da R2, importado e nao reescrito -- dois
 * reconhecedores divergiriam em silencio, e a divergencia apareceria como uma
 * resposta costurada que a R2 continua reprovando.
 */
export function costurar(texto: string): Costura {
  if (temEncaminhamento(texto)) return { texto, costurado: false };

  const base = texto.trimEnd();
  return {
    texto: base === '' ? TEXTO_DE_ENCAMINHAMENTO : `${base} ${TEXTO_DE_ENCAMINHAMENTO}`,
    costurado: true,
  };
}

/**
 * Resumo do arquivo:
 * Da acao que o modelo propos a acao que pode virar cartao (E11). Modulo puro.
 *
 * A REGRA CENTRAL: cada campo tem de estar no que a PESSOA escreveu nesta
 * conversa. O PRD (11.2) pede que os campos saiam da fala dela, nunca de
 * ferramenta nem de documento; pedir isso so no prompt seria confiar que o
 * modelo lembra. Aqui vira conferencia: o nome do exame que veio da receita,
 * a dose que veio do cadastro, o medico que estava no PDF anexado -- nenhum
 * deles esta na fala, e nenhum passa.
 *
 * "Fala da pessoa" sao a mensagem do turno e as mensagens `role: 'user'` do
 * historico. A conversa natural se divide ("marca o retorno" / "que dia?" /
 * "dia 30"); o anexo, as respostas do assistente e as saidas de ferramenta
 * ficam de fora porque nenhum deles e a pessoa falando.
 *
 * CAMPO QUE NAO PASSA SOME, e a proposta segue com o resto. A recusa e
 * silenciosa, como a da memoria: a pessoa nao pediu cartao nenhum, e um campo
 * vazio no formulario ela preenche.
 */
import { lerAcaoProposta, type AcaoProposta } from '../../acoes-propostas-shared/camposDaAcao';
import type { AcaoBruta } from '../chatSchema';
import { semAcento } from '../formatoPtBr';
import { nomeSemPosologia } from '../tools/nomeSemPosologia';
import { resolverData, resolverHora } from './expressaoDeData';

export type ContextoDaAcao = {
  /** A mensagem do turno e as mensagens da pessoa no historico: valem para
   *  nome, profissional e endereco. */
  falasDaPessoa: string[];
  /**
   * So a mensagem do turno: vale para data e hora (revisao do E11, achado 5).
   * O historico nao tem data, e "amanha" dito numa conversa de segunda e
   * retomada na quinta seria resolvido contra quinta.
   */
  falaDoTurno: string;
  /** AAAA-MM-DD no fuso do app, lido uma vez por turno. */
  hoje: string;
};

/**
 * A comparacao ignora caixa, acento, pontuacao e espaco ("Dra. Ana" casa com
 * "dra ana"), e casa PALAVRA inteira: os espacos nas pontas impedem que "ana"
 * case dentro de "banana".
 */
function criarConferencia(falas: string[]) {
  const normalizadas = falas.map((f) => ` ${semAcento(f)} `);
  return (campo: string | undefined): string | undefined => {
    if (campo === undefined) return undefined;
    const alvo = semAcento(campo);
    if (alvo === '') return undefined;
    return normalizadas.some((f) => f.includes(` ${alvo} `)) ? campo : undefined;
  };
}

/**
 * "Exame" e "cirurgia" mudam o selo na Agenda, e so entram quando a palavra
 * esta NO PROPRIO NOME do compromisso ("exame de sangue") -- ou, sem nome, na
 * mensagem do turno ("marca a cirurgia dia 30"). Solta na conversa ela nao
 * basta: "marca a consulta pra ver o resultado do exame" e uma consulta
 * (revisao do E11). Consulta e o que o formulario ja marca, e nao precisa vir
 * do modelo.
 */
function tipoDito(tipo: AcaoBruta['tipoDeCompromisso'], nome: string | undefined, falaDoTurno: string) {
  const palavra = tipo === 'EXAME' ? 'exame' : tipo === 'CIRURGIA' ? 'cirurgia' : undefined;
  if (!palavra) return undefined;
  const onde = nome ?? falaDoTurno;
  return criarConferencia([onde])(palavra) ? tipo : undefined;
}

function definido<T>(valor: T | null | undefined): T | undefined {
  return valor ?? undefined;
}

export function validarAcao(bruta: AcaoBruta, contexto: ContextoDaAcao): AcaoProposta | undefined {
  const dito = criarConferencia(contexto.falasDaPessoa);
  const ditoAgora = criarConferencia([contexto.falaDoTurno]);

  if (bruta.tipo === 'ABRIR_NOVO_LEMBRETE') {
    // O nome e conferido COMO DITO e cortado depois: "vitamina d 2000 ui" esta
    // na fala, e e o corte que tira a dose (D11.3 = A).
    const nome = dito(bruta.nome);
    const horarios = (bruta.horarios ?? [])
      .map((h) => (ditoAgora(h) !== undefined ? resolverHora(h) : null))
      .filter((h): h is string => h !== null);
    return lerAcaoProposta({
      tipo: bruta.tipo,
      campos: { name: nome !== undefined ? nomeSemPosologia(nome) : undefined, times: horarios },
    });
  }

  const quando = ditoAgora(bruta.quando);
  const hora = ditoAgora(bruta.hora);
  const nome = dito(bruta.nome);
  return lerAcaoProposta({
    tipo: bruta.tipo,
    campos: {
      appointmentName: nome,
      professionalName: dito(bruta.profissional),
      address: dito(bruta.endereco),
      appointmentType: tipoDito(bruta.tipoDeCompromisso, nome, contexto.falaDoTurno),
      scheduledDate: quando !== undefined ? definido(resolverData(quando, contexto.hoje)) : undefined,
      scheduledTime: hora !== undefined ? definido(resolverHora(hora)) : undefined,
    },
  });
}

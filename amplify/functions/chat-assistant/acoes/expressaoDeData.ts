/**
 * Resumo do arquivo:
 * A gramatica FECHADA que transforma a expressao que a pessoa usou ("sexta",
 * "dia 30", "2 da tarde") em data e hora (E11, D11.4 = A). Modulo puro: o
 * "hoje" entra por parametro, lido uma vez por turno em `verificacao.ts`, e
 * nada aqui le o relogio.
 *
 * POR QUE FECHADA: o modelo so copia a expressao; a conta de calendario e do
 * codigo, onde ela e testada. O que a gramatica nao conhece ("semana que vem",
 * "fim do mes") devolve `null`, e o formulario abre com o campo vazio -- a
 * pessoa escolhe no calendario. Data errada num compromisso de saude e pior
 * que data vazia.
 *
 * A expressao inteira tem de casar (padroes com `^...$`): "sexta de manha"
 * nao vira a sexta com a manha descartada em silencio.
 */
import { dataIsoValida } from '../../acoes-propostas-shared/camposDaAcao';
import { semAcento } from '../formatoPtBr';

const DIA_EM_MS = 24 * 60 * 60 * 1000;

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const RELATIVOS: Record<string, number> = { hoje: 0, amanha: 1, 'depois de amanha': 2 };

function paraUtc(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function paraIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function somarDias(iso: string, dias: number): string {
  return paraIso(new Date(paraUtc(iso).getTime() + dias * DIA_EM_MS));
}

function montarIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** O proximo dia da semana DEPOIS de hoje: "terca" dito na terca e a da semana
 *  que vem, porque quem quer hoje diz "hoje". */
function proximoDiaDaSemana(alvo: number, hoje: string): string {
  const atual = paraUtc(hoje).getUTCDay();
  const distancia = (alvo - atual + 7) % 7 || 7;
  return somarDias(hoje, distancia);
}

/** O proximo dia N a partir de hoje, INCLUINDO hoje; o mes sem dia N e pulado
 *  ("dia 31" em novembro e 31 de dezembro). Doze meses bastam: todo dia ate 31
 *  aparece num ano. */
function proximoDiaDoMes(dia: number, hoje: string): string | null {
  if (dia < 1 || dia > 31) return null;
  const [ano, mes] = hoje.split('-').map(Number);
  for (let passo = 0; passo < 12; passo += 1) {
    const indice = mes - 1 + passo;
    const candidato = montarIso(ano + Math.floor(indice / 12), (indice % 12) + 1, dia);
    if (dataIsoValida(candidato) && candidato >= hoje) return candidato;
  }
  return null;
}

/** dd/mm sem ano: o deste ano, ou o do ano que vem se este ja passou. */
function diaEMes(dia: number, mes: number, hoje: string): string | null {
  const ano = Number(hoje.slice(0, 4));
  const desteAno = montarIso(ano, mes, dia);
  if (!dataIsoValida(desteAno)) return null;
  return desteAno >= hoje ? desteAno : montarIso(ano + 1, mes, dia);
}

function interpretarData(texto: string, hoje: string): string | null {
  if (texto in RELATIVOS) return somarDias(hoje, RELATIVOS[texto]);

  const semana = /^(domingo|segunda|terca|quarta|quinta|sexta|sabado)( feira)?$/.exec(texto);
  if (semana) return proximoDiaDaSemana(DIAS_DA_SEMANA.indexOf(semana[1]), hoje);

  const diaN = /^dia (\d{1,2})$/.exec(texto);
  if (diaN) return proximoDiaDoMes(Number(diaN[1]), hoje);

  // `semAcento` troca a barra por espaco: "30/10" chega como "30 10".
  const curta = /^(\d{1,2}) (\d{1,2})$/.exec(texto);
  if (curta) return diaEMes(Number(curta[1]), Number(curta[2]), hoje);

  const completa = /^(\d{1,2}) (\d{1,2}) (\d{4})$/.exec(texto);
  if (completa) {
    const iso = montarIso(Number(completa[3]), Number(completa[2]), Number(completa[1]));
    return dataIsoValida(iso) ? iso : null;
  }

  return null;
}

/**
 * A data em AAAA-MM-DD, ou `null` fora da gramatica, para data que nao existe
 * e para data antes de hoje: um compromisso novo no passado e engano de quem
 * falou ou de quem leu, e o formulario vazio obriga a escolher de novo.
 */
export function resolverData(expressao: string, hoje: string): string | null {
  const data = interpretarData(semAcento(expressao), hoje);
  return data !== null && data >= hoje ? data : null;
}

function montarHora(hora: number, minuto: number): string | null {
  if (hora > 23 || minuto > 59) return null;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

/**
 * A hora do relogio com o periodo dito: "2 da tarde" e 14h, "8 da noite" e
 * 20h, "12 da noite" e meia-noite, e "15 da tarde" ja vem em 24 horas. Periodo
 * que contradiz a hora ("13 da manha", "8 da tarde", "2 da noite") devolve
 * `null` (revisao do E11): e engano de quem falou ou de quem copiou, e hora
 * errada num compromisso e pior que hora vazia.
 */
function comPeriodo(hora: number, periodo: string): number | null {
  if (periodo === 'manha') return hora >= 1 && hora <= 11 ? hora : null;
  if (periodo === 'tarde') {
    if (hora >= 1 && hora <= 6) return hora + 12;
    return hora === 12 || (hora >= 13 && hora <= 18) ? hora : null;
  }
  if (hora === 12) return 0;
  if (hora >= 6 && hora <= 11) return hora + 12;
  return hora >= 18 && hora <= 23 ? hora : null;
}

/** A hora em hh:mm, ou `null` fora da gramatica ("de manha" nao e uma hora). */
export function resolverHora(expressao: string): string | null {
  const texto = semAcento(expressao);

  const comH = /^(?:as )?(\d{1,2})h(\d{2})?$/.exec(texto);
  if (comH) return montarHora(Number(comH[1]), Number(comH[2] ?? 0));

  // "14:30" chega como "14 30".
  const comDoisPontos = /^(?:as )?(\d{1,2}) (\d{2})$/.exec(texto);
  if (comDoisPontos) return montarHora(Number(comDoisPontos[1]), Number(comDoisPontos[2]));

  const periodo = /^(?:as )?(\d{1,2}) da (manha|tarde|noite)$/.exec(texto);
  if (periodo) {
    const hora = comPeriodo(Number(periodo[1]), periodo[2]);
    return hora === null ? null : montarHora(hora, 0);
  }

  const soAs = /^as (\d{1,2})$/.exec(texto);
  if (soAs) return montarHora(Number(soAs[1]), 0);

  return null;
}

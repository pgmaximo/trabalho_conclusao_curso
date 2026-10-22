/**
 * Resumo do arquivo:
 * O texto do bloco de data do turno (E1). Ele vai num SEGUNDO bloco de
 * `system`, depois das instrucoes (D1.1): assim a data e instrucao de
 * sistema, o usuario nao a sobrescreve escrevendo "hoje e outro dia", e ela
 * nao passa pelo guardrail do texto de fora.
 *
 * O fuso vem de `formatoPtBr.ts` (D1.2, ver `partesEmSaoPaulo`). O instante
 * entra por parametro: quem chama decide quando ler o relogio.
 */
import { partesEmSaoPaulo } from './formatoPtBr';

export const DIA_DA_SEMANA: Record<string, string> = {
  Sun: 'domingo',
  Mon: 'segunda-feira',
  Tue: 'terça-feira',
  Wed: 'quarta-feira',
  Thu: 'quinta-feira',
  Fri: 'sexta-feira',
  Sat: 'sábado',
};

export function montarContextoDeHoje(instante: Date): string {
  const { diaDaSemana, dia, mes, ano, hora, minuto } = partesEmSaoPaulo(instante);
  return (
    'Data e hora deste turno, informadas pelo aplicativo: ' +
    `hoje é ${DIA_DA_SEMANA[diaDaSemana]}, ${dia}/${mes}/${ano}, ` +
    `e agora são ${hora}h${minuto} no horário de Brasília.`
  );
}

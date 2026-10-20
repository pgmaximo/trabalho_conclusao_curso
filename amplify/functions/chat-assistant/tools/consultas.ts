/**
 * As consultas, exames e cirurgias agendados. E a tool de pergunta operacional
 * -- "quando e minha proxima consulta" -- e e por ela que a classificacao da
 * C5 sabe que aquele turno NAO precisa repetir o encaminhamento (R2).
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import { momentoEmSaoPaulo } from '../formatoPtBr';
import type { DegradedBlock, ContextoDoTurno } from '../types';
import { observacaoComTeto } from './observacao';
import { lerDoDono, texto, type LinhaDoBanco } from './ownerScopedRead';
import type { ChatTool } from './tipos';

export type ConsultaParaOModelo = {
  tipo: string | null;
  nome: string | null;
  profissional: string | null;
  quando: string | null;
  endereco: string | null;
  observacoes: string | null;
  observacoesCortadas: boolean;
};

/**
 * Teto de cada lista (E5). Com a observacao, uma consulta pode custar perto de
 * 110 tokens, e quem usa a Agenda ha anos acumula centenas de passadas. As
 * futuras guardam as mais proximas e as passadas, as mais recentes: sao as que
 * a pessoa pergunta. O que fica de fora e CONTADO em `omitidas` -- sem a
 * contagem, a resposta trataria a lista como completa.
 */
export const MAX_CONSULTAS_POR_LISTA = 20;

/** O texto da agenda vazia, um so para esta ferramenta e o panorama (E10). */
export const SEM_CONSULTAS = 'O usuário não tem nenhuma consulta registrada no aplicativo.';

/**
 * As consultas do dono separadas em futuras e passadas, em ordem crescente e
 * SEM teto (o teto e da ferramenta). Exportada para o panorama do E10 dizer a
 * mesma proxima consulta que `consultar_consultas`.
 *
 * O corte usa o relogio da funcao. "Proxima consulta" e uma pergunta sobre o
 * agora, e devolver as duas listas separadas evita que o modelo precise
 * comparar datas ele mesmo -- comparacao de data por modelo erra.
 *
 * O "agora" e a hora de Brasilia (E1, achado A1; com o UTC, a consulta das
 * proximas 3 horas saia como passada). Registro so com data vale 00h00, como
 * `parseScheduledAt` da Agenda: o chat nao da outra resposta sobre o mesmo
 * registro.
 */
export function separarConsultas(
  linhas: LinhaDoBanco[],
  agora: string,
): { futuras: ConsultaParaOModelo[]; passadas: ConsultaParaOModelo[] } {
  const todas: ConsultaParaOModelo[] = linhas
    .map((c) => ({
      tipo: texto(c.appointmentType),
      nome: texto(c.appointmentName),
      profissional: texto(c.professionalName),
      quando: texto(c.scheduledAt),
      endereco: texto(c.address),
      ...observacaoComTeto(c.observations),
    }))
    .sort((a, b) => (a.quando ?? '').localeCompare(b.quando ?? ''));
  return {
    futuras: todas.filter((c) => (c.quando ?? '') >= agora),
    passadas: todas.filter((c) => (c.quando ?? '') < agora),
  };
}

export const consultasTool: ChatTool = {
  name: 'consultar_consultas',
  description:
    'Lista as consultas, exames e cirurgias que o usuário agendou no aplicativo, com data, profissional, endereço e o que ele anotou, separando as futuras das passadas. NÃO marca, NÃO altera e NÃO cancela agendamento nenhum.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const linhas = await lerDoDono(process.env.APPOINTMENT_TABLE_NAME, identity, contexto?.leituras);

    const separadas = separarConsultas(linhas, momentoEmSaoPaulo(new Date()));
    const futuras = separadas.futuras.slice(0, MAX_CONSULTAS_POR_LISTA);
    // Ordem crescente: o fim da lista e o mais recente, e a consulta sem data
    // (texto vazio) fica no comeco -- e a primeira a sair pelo teto.
    const passadas = separadas.passadas.slice(-MAX_CONSULTAS_POR_LISTA);

    return {
      disponivel: linhas.length > 0,
      futuras,
      passadas,
      proxima: futuras[0] ?? null,
      omitidas: linhas.length - futuras.length - passadas.length,
      ...(linhas.length === 0
        ? { explicacao: SEM_CONSULTAS }
        : {}),
    };
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as { futuras?: ConsultaParaOModelo[] };
    if (!saida?.futuras?.length) return null;
    return {
      titulo: 'Próximos agendamentos',
      linhas: saida.futuras.map((c) =>
        [c.nome, c.quando, c.profissional]
          .filter((parte): parte is string => Boolean(parte))
          .join(' · '),
      ),
      citacoes: [],
    };
  },
};

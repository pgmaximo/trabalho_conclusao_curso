/**
 * As consultas, exames e cirurgias agendados. E a tool de pergunta operacional
 * -- "quando e minha proxima consulta" -- e e por ela que a classificacao da
 * C5 sabe que aquele turno NAO precisa repetir o encaminhamento (R2).
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock } from '../types';
import { lerDoDono, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

type ConsultaParaOModelo = {
  tipo: string | null;
  nome: string | null;
  profissional: string | null;
  quando: string | null;
  endereco: string | null;
};

export const consultasTool: ChatTool = {
  name: 'consultar_consultas',
  description:
    'Lista as consultas, exames e cirurgias que o usuário agendou no aplicativo, com data, profissional e endereço, separando as futuras das passadas. NÃO marca, NÃO altera e NÃO cancela agendamento nenhum.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity) {
    const linhas = await lerDoDono(process.env.APPOINTMENT_TABLE_NAME, identity);

    const todas: ConsultaParaOModelo[] = linhas
      .map((c) => ({
        tipo: texto(c.appointmentType),
        nome: texto(c.appointmentName),
        profissional: texto(c.professionalName),
        quando: texto(c.scheduledAt),
        endereco: texto(c.address),
      }))
      .sort((a, b) => (a.quando ?? '').localeCompare(b.quando ?? ''));

    // O corte usa o relogio da funcao. "Proxima consulta" e uma pergunta sobre
    // o agora, e devolver as duas listas separadas evita que o modelo precise
    // comparar datas ele mesmo -- comparacao de data por modelo erra.
    const agora = new Date().toISOString();
    const futuras = todas.filter((c) => (c.quando ?? '') >= agora);
    const passadas = todas.filter((c) => (c.quando ?? '') < agora);

    return {
      disponivel: todas.length > 0,
      futuras,
      passadas,
      proxima: futuras[0] ?? null,
      ...(todas.length === 0
        ? { explicacao: 'O usuário não tem nenhuma consulta registrada no aplicativo.' }
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

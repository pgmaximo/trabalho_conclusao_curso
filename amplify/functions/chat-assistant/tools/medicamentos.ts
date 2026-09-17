/**
 * Os medicamentos que a pessoa cadastrou. Ela devolve o que ESTA REGISTRADO,
 * literalmente: nome, dose como foi digitada, horarios e periodo.
 *
 * O CUIDADO DESTA TOOL E DE SAIDA, NAO DE ENTRADA. Devolver posologia ao
 * modelo e legitimo -- e o dado da pessoa, e ela pode perguntar por ele. O que
 * nao pode e a RESPOSTA indicar quantidade, dose ou mudanca, e quem barra isso
 * e a verificacao de linguagem da C5, sobre o texto gerado. Esconder o dado
 * aqui nao protegeria nada e faria o aplicativo mentir sobre o que ele guarda.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock } from '../types';
import { lerDoDono, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

type MedicamentoParaOModelo = {
  nome: string | null;
  doseRegistrada: string | null;
  horarios: string[];
  inicio: string | null;
  termino: string | null;
  ativo: boolean;
};

export const medicamentosTool: ChatTool = {
  name: 'consultar_medicamentos',
  description:
    'Lista os medicamentos que o próprio usuário cadastrou no aplicativo, exatamente como ele os registrou: nome, dose digitada, horários e período. NÃO prescreve, NÃO sugere dose, NÃO altera cadastro e NÃO diz se um medicamento é adequado.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity) {
    const linhas = await lerDoDono(process.env.MEDICINE_TABLE_NAME, identity);

    const medicamentos: MedicamentoParaOModelo[] = linhas.map((m) => ({
      nome: texto(m.name),
      doseRegistrada: texto(m.dosage),
      horarios: Array.isArray(m.times) ? m.times.map(String) : [],
      inicio: texto(m.startDate),
      termino: texto(m.endDate),
      ativo: m.active !== false,
    }));

    return {
      disponivel: medicamentos.length > 0,
      emUso: medicamentos.filter((m) => m.ativo),
      encerrados: medicamentos.filter((m) => !m.ativo),
      ...(medicamentos.length === 0
        ? { explicacao: 'O usuário não cadastrou nenhum medicamento no aplicativo.' }
        : {}),
    };
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as { emUso?: MedicamentoParaOModelo[] };
    if (!saida?.emUso?.length) return null;
    return {
      titulo: 'Medicamentos que você cadastrou',
      // A dose cadastrada fica de FORA do modo degradado, e isto e a
      // diferenca entre as duas superficies: a tool pode devolve-la ao
      // modelo, porque e o dado da pessoa, mas o texto de modelo fixo precisa
      // passar as regras POR CONSTRUCAO -- e "500 mg" numa linha de texto e
      // exatamente o que a R3 reprova, sem ter como saber que ali e um
      // cadastro e nao uma indicacao. Quem quer ver a dose abre a tela de
      // medicamentos, que e a tela dela.
      linhas: saida.emUso
        .map((m) => [m.nome, m.horarios.join(', ')].filter((p): p is string => Boolean(p)).join(' · '))
        .filter((l) => l !== ''),
      citacoes: [],
    };
  },
};

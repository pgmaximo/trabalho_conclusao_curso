/**
 * Resumo do arquivo:
 * `consultar_panorama` (E10, 10.1): o resumo geral do que a pessoa registrou.
 * Esta parte so le; a saida e montada em `panoramaSaida.ts`.
 *
 * As seis leituras vao juntas (`Promise.all`): uma nao depende da outra, e em
 * sequencia o panorama custaria seis idas ao banco em fila. E todas passam
 * pelo registro do turno, entao a ferramenta do assunto chamada depois -- "e
 * quais sao os remedios?" -- nao le a mesma tabela de novo.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno } from '../types';
import { lerDoDonoComCorte } from './ownerScopedRead';
import { montarPanorama, renderizarPanorama } from './panoramaSaida';
import type { ChatTool } from './tipos';

export const panoramaTool: ChatTool = {
  name: 'consultar_panorama',
  description:
    'Resumo geral do que o usuário registrou no aplicativo: quantos documentos, remédios em uso, a próxima consulta, a última vacina e até quando vão os dados de wearable, só com contagens e datas. NÃO traz valores de exame, nomes de remédio nem doses (use a ferramenta de cada assunto), NÃO avalia a saúde e NÃO grava.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const ler = (tabela: string | undefined) => lerDoDonoComCorte(tabela, identity, contexto?.leituras);
    const leituras = await Promise.all([
      ler(process.env.MEDICAL_DOCUMENT_TABLE_NAME),
      ler(process.env.LAB_RESULT_TABLE_NAME),
      ler(process.env.MEDICINE_TABLE_NAME),
      ler(process.env.APPOINTMENT_TABLE_NAME),
      ler(process.env.VACCINE_DOSE_TABLE_NAME),
      ler(process.env.HEALTH_IMPORT_TABLE_NAME),
    ]);
    const [documentos, resultados, medicamentos, consultas, vacinas, importacoes] = leituras.map((l) => l.linhas);
    const panorama = montarPanorama(
      { documentos, resultados, medicamentos, consultas, vacinas, importacoes },
      new Date(),
    );
    // So aparece quando aconteceu (D10.4): uma tabela parou no teto de leitura,
    // e as contagens sao "pelo menos". Ausente, nao gasta contexto.
    return leituras.some((l) => l.incompleta) ? { ...panorama, leituraIncompleta: true } : panorama;
  },
  renderDegraded: renderizarPanorama,
};

/**
 * Os documentos que a pessoa guardou. Esta tool responde "que exames eu tenho",
 * e nao "quanto deu" -- os valores sao da tool de analitos, que carrega faixa,
 * unidade e origem de cada numero.
 *
 * A separacao nao e organizacional: uma tool so, devolvendo documento e valor
 * juntos, faria o modelo citar numero sem receber a exclusao que a EPIC de
 * serie definiu para linha pendente e valor censurado.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock } from '../types';
import { lerDoDono, maisRecentePrimeiro, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

/** Quantos documentos vao para o modelo. O resto fica de fora, e a saida diz
 *  quantos ficaram -- omitir a contagem faria a resposta parecer completa. */
const MAX_DOCUMENTOS = 30;

type DocumentoParaOModelo = {
  documentId: string;
  titulo: string | null;
  tipo: string | null;
  dataDoDocumento: string | null;
  laboratorio: string | null;
};

export const examesTool: ChatTool = {
  name: 'consultar_exames',
  description:
    'Lista os documentos médicos que o usuário guardou no aplicativo: título, tipo, data e laboratório. Use para saber QUE exames existem. NÃO traz os valores dos resultados (use consultar_analitos para isso), NÃO grava e NÃO interpreta.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity) {
    const linhas = await lerDoDono(process.env.MEDICAL_DOCUMENT_TABLE_NAME, identity);
    const ordenados = maisRecentePrimeiro(linhas, 'documentDate');

    const documentos: DocumentoParaOModelo[] = ordenados.slice(0, MAX_DOCUMENTOS).map((d) => ({
      documentId: String(d.id ?? ''),
      titulo: texto(d.title),
      tipo: texto(d.documentType),
      dataDoDocumento: texto(d.documentDate),
      laboratorio: texto(d.laboratory),
    }));

    return {
      disponivel: documentos.length > 0,
      total: linhas.length,
      mostrados: documentos.length,
      documentos,
      ...(documentos.length === 0
        ? { explicacao: 'O usuário ainda não guardou nenhum documento médico no aplicativo.' }
        : {}),
    };
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as { documentos?: DocumentoParaOModelo[] };
    if (!saida?.documentos?.length) return null;
    return {
      titulo: 'Documentos guardados',
      linhas: saida.documentos.map((d) => ({
        texto: [d.titulo ?? 'Documento sem título', d.dataDoDocumento, d.laboratorio]
          .filter((parte): parte is string => Boolean(parte))
          .join(' · '),
        documentId: d.documentId,
      })),
    };
  },
};

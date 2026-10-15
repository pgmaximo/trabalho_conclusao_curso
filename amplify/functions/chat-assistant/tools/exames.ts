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

/**
 * OS NOMES AQUI SAO OS DO SCHEMA, e nao os que dariam jeito. A versao anterior
 * lia `title` e `laboratory`: o primeiro se chama `documentName` e o segundo
 * NAO EXISTE em `MedicalDocument`. Como `texto()` devolve nulo para o que nao e
 * string, os dois sumiam sem erro e sem log -- e a conversa listava "Documento
 * sem titulo" para um exame que a tela mostrava com nome.
 *
 * `laboratorio` saiu do tipo em vez de virar um campo sempre nulo: um campo que
 * nunca tem valor e pior que um campo ausente, porque a descricao da tool
 * promete ao modelo um dado que ele nunca vai receber.
 */
type DocumentoParaOModelo = {
  documentId: string;
  titulo: string | null;
  tipo: string | null;
  /** A data do FORMULARIO. E a que a pessoa digitou, e ela vem preenchida com
   *  hoje -- entao um laudo antigo digitalizado hoje entra com a data de hoje. */
  dataDoDocumento: string | null;
  /** A faixa de datas de COLETA das linhas deste documento, lida do laudo.
   *  Nula quando o documento nao tem linha com data. */
  coletadoEntre: { primeira: string; ultima: string } | null;
  /** Como esta escrito no papel. Nulo quando o laudo nao deixou claro. */
  laboratorio: string | null;
};

export const examesTool: ChatTool = {
  name: 'consultar_exames',
  description:
    'Lista os documentos médicos que o usuário guardou no aplicativo: nome, tipo, data de registro, laboratório que emitiu o laudo e a faixa de datas em que ele foi coletado. Use para saber QUE exames existem. NÃO traz os valores dos resultados (use consultar_analito para isso), NÃO grava e NÃO interpreta.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity) {
    const linhas = await lerDoDono(process.env.MEDICAL_DOCUMENT_TABLE_NAME, identity);
    const ordenados = maisRecentePrimeiro(linhas, 'documentDate');

    // As datas de COLETA vem das linhas de resultado, e nao do documento: o
    // documento so conhece a data do formulario. Sem isto, o assistente dizia
    // que o exame era de setembro de 2026 e, dois turnos depois, que o valor
    // era de outubro de 2025 -- as duas certas, e juntas mentindo (U16).
    const resultados = await lerDoDono(process.env.LAB_RESULT_TABLE_NAME, identity);
    const coletasPorDocumento = new Map<string, string[]>();
    for (const r of resultados) {
      const data = texto(r.collectedAt);
      const doc = String(r.documentId ?? '');
      if (!data || !doc) continue;
      coletasPorDocumento.set(doc, [...(coletasPorDocumento.get(doc) ?? []), data]);
    }

    const documentos: DocumentoParaOModelo[] = ordenados.slice(0, MAX_DOCUMENTOS).map((d) => {
      const id = String(d.id ?? '');
      const datas = (coletasPorDocumento.get(id) ?? []).sort();
      return {
        documentId: id,
        titulo: texto(d.documentName),
        tipo: texto(d.documentType),
        dataDoDocumento: texto(d.documentDate),
        coletadoEntre:
          datas.length > 0 ? { primeira: datas[0], ultima: datas[datas.length - 1] } : null,
        laboratorio: texto(d.laboratorio),
      };
    });

    return {
      disponivel: documentos.length > 0,
      total: linhas.length,
      mostrados: documentos.length,
      documentos,
      // Dito uma vez, e nao por documento: o modelo precisa saber a diferenca
      // entre as duas datas, e repetir isso em cada linha so gastaria prompt.
      explicacaoDaData:
        'coletadoEntre vem do laudo e diz quando o exame foi COLETADO. dataDoDocumento é a data de REGISTRO, digitada no formulário, e pode não ser a do exame. Ao falar de quando, prefira coletadoEntre; use dataDoDocumento só quando coletadoEntre for nulo, e aí diga que é a data de registro.',
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
      linhas: saida.documentos.map((d) =>
        [d.titulo ?? 'Documento sem título', d.coletadoEntre?.primeira ?? d.dataDoDocumento, d.laboratorio]
          .filter((parte): parte is string => Boolean(parte))
          .join(' · '),
      ),
      // Sem citacao: um documento na lista nao e um numero citado, e citacao
      // aponta para a LINHA de onde um valor saiu.
      citacoes: [],
    };
  },
};

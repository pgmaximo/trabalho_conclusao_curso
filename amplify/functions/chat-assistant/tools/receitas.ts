/**
 * Resumo do arquivo:
 * A ferramenta `consultar_receitas` (E4, 4.1): o que as receitas guardadas
 * traziam, pelos nomes dos remedios que a leitura automatica tirou da foto.
 *
 * Este arquivo so le e entrega: os documentos pela porta do dono, os itens de
 * cada receita pelo indice `documentId` (uma consulta por receita, todas
 * juntas). O que vai ao modelo -- e, sobretudo, o que NAO vai (a posologia,
 * D4.2) -- e decidido em `receitasSaida.ts`.
 *
 * Um item de receita nunca vira medicamento cadastrado nem lembrete: o chat so
 * le, e a spec da extracao proibe essa passagem (acao de risco alto).
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno } from '../types';
import { lerDoDono, lerDoDonoPorIndice } from './ownerScopedRead';
import { blocoDegradadoDeReceitas, escolherReceitas, montarSaidaDeReceitas } from './receitasSaida';
import type { ChatTool } from './tipos';

export const receitasTool: ChatTool = {
  name: 'consultar_receitas',
  description:
    'Lista as receitas que o usuário guardou e os nomes dos remédios lidos automaticamente do arquivo de cada uma, com a situação da leitura. Use para saber O QUE A RECEITA TRAZIA. NÃO traz dose, frequência nem duração (estão escritos na receita), NÃO é a lista de remédios que a pessoa cadastrou (use consultar_medicamentos), NÃO grava e NÃO interpreta.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const documentos = await lerDoDono(process.env.MEDICAL_DOCUMENT_TABLE_NAME, identity, contexto?.leituras);
    const { escolhidas, omitidas } = escolherReceitas(documentos);
    // Uma consulta que falha marca SO a sua receita (risco 4 do E4): derrubar a
    // ferramenta esconderia as outras. A receita sai com `itensIndisponiveis`,
    // e nao vazia -- vazia pareceria completa.
    const leituras = await Promise.allSettled(
      escolhidas.map((doc) => lerDoDonoPorIndice('ITENS_POR_RECEITA', String(doc.id), undefined, identity)),
    );
    const itensPorReceita = leituras.map((l) => {
      if (l.status === 'fulfilled') return l.value;
      console.error('Falha ao ler os itens de uma receita:', l.reason);
      return null;
    });
    return montarSaidaDeReceitas(escolhidas, itensPorReceita, omitidas, new Date());
  },
  renderDegraded: blocoDegradadoDeReceitas,
};

/**
 * Resumo do arquivo:
 * O que tem DENTRO de um exame. A tool que faltava.
 *
 * Ela nasce de uma medicao, e nao de um pedido: em 2026-09-18 a primeira
 * pessoa a conversar com o assistente perguntou "como ficou o meu ultimo exame
 * de sangue feito?", e o aplicativo -- com 46 valores daquele laudo guardados
 * -- respondeu pedindo que ela enumerasse os analitos um a um.
 *
 * O TRIO, e a diferenca entre eles e a razao de serem tres:
 *   consultar_exames     -> QUE documentos eu tenho (nome, tipo, data)
 *   consultar_resultados -> O QUE TEM DENTRO deles   (este arquivo)
 *   consultar_analito    -> COMO UM analito evoluiu ao longo do tempo
 *
 * As regras de exclusao NAO sao escritas aqui: vem de `linhasDeResultado.ts`,
 * compartilhado com a tool de analito. Duas copias divergiriam em silencio, e a
 * divergencia apareceria para a pessoa como o mesmo exame contado de dois
 * jeitos -- um na tela de serie, outro na conversa.
 */
import { z } from 'zod';

import { unidadeLegivel } from '../../extract-document-data/unidadeLegivel';
import { formatarData, formatarDecimal } from '../formatoPtBr';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock } from '../types';
import {
  comoEstavaNoPapel,
  comoLinha,
  motivoDeExclusaoPontual,
  MOTIVOS_DE_EXCLUSAO,
  type LinhaDeResultado,
} from './linhasDeResultado';
import { lerDoDono } from './ownerScopedRead';
import type { ChatTool } from './tipos';

/**
 * Teto de linhas. Um laudo de rotina brasileiro traz de 20 a 50 analitos e cabe
 * inteiro; um painel enorme nao cabe, e a saida DIZ quantos ficaram de fora.
 * Omitir a contagem faria a resposta parecer completa.
 */
const MAX_RESULTADOS = 60;

const entrada = z
  .object({
    documentId: z
      .string()
      .optional()
      .describe('Opcional. O documento cujos valores devem ser listados.'),
  })
  .strict();

const AUSENTE =
  'O usuário não tem nenhum resultado de exame registrado no aplicativo com valor acompanhável.';

/** Momento vazio e momento ausente sao o MESMO grupo. */
function chaveDoMomento(momento: string | null): string {
  return (momento ?? '').trim();
}

/**
 * Sem documento dito, a pergunta e "como estou hoje": vale a coleta mais
 * RECENTE de cada analito. Por analito E por momento, porque glicose em jejum e
 * de 120 minutos sao condicoes que nao se comparam (D22) -- junta-las faria uma
 * sumir da lista sem ninguem notar.
 */
function maisRecentePorAnalito(linhas: LinhaDeResultado[]): LinhaDeResultado[] {
  const porChave = new Map<string, LinhaDeResultado>();
  for (const l of linhas) {
    const chave = `${l.analyteCode}|${chaveDoMomento(l.collectionMoment)}`;
    const atual = porChave.get(chave);
    if (!atual || (l.collectedAt ?? '') > (atual.collectedAt ?? '')) porChave.set(chave, l);
  }
  return [...porChave.values()];
}

export const resultadosTool: ChatTool = {
  name: 'consultar_resultados',
  description:
    'Lista os valores dos exames que o usuário tem guardados: analito, valor, unidade, data da coleta, faixa do laboratório e documento de origem. Use quando ele perguntar o que tem em um exame, ou como está de modo geral, SEM nomear um analito. Sem argumento, traz a coleta mais recente de cada analito; com documentId, traz os valores daquele documento. Para a evolução de UM analito ao longo do tempo, use consultar_analito. NÃO grava nada e NÃO interpreta o resultado.',
  inputSchema: entrada,
  readOnly: true,

  async run(input: unknown, identity: ChatIdentity) {
    const pedido = input as z.infer<typeof entrada>;
    const todas = (await lerDoDono(process.env.LAB_RESULT_TABLE_NAME, identity)).map(comoLinha);

    const doEscopo = pedido.documentId
      ? todas.filter((l) => l.documentId === pedido.documentId)
      : maisRecentePorAnalito(todas);

    if (doEscopo.length === 0) {
      return { disponivel: false, total: 0, mostrados: 0, explicacao: AUSENTE };
    }

    const comValor: LinhaDeResultado[] = [];
    const naoComparaveis: { id: string; analito: string | null; comoEstavaNoPapel: string | null; motivo: string; documentoId: string }[] =
      [];

    for (const l of doEscopo) {
      const motivo = motivoDeExclusaoPontual(l);
      if (motivo === null) comValor.push(l);
      // Contadas e explicadas, nunca omitidas: o modelo precisa saber que
      // existem para poder mencionar, e a R5 manda dizer o que nao se sabe.
      else
        naoComparaveis.push({
          id: l.id,
          analito: l.projectLabel,
          comoEstavaNoPapel: comoEstavaNoPapel(l),
          motivo: MOTIVOS_DE_EXCLUSAO[motivo],
          documentoId: l.documentId,
        });
    }

    // O corte e pela ordem do analito, e nao por relevancia de painel: escolher
    // "o que importa mais" seria interpretacao clinica disfarcada de engenharia.
    const ordenadas = comValor.sort((a, b) =>
      (a.projectLabel ?? '').localeCompare(b.projectLabel ?? '', 'pt-BR'),
    );
    const mostradas = ordenadas.slice(0, MAX_RESULTADOS);

    return {
      disponivel: true,
      documentId: pedido.documentId ?? null,
      total: doEscopo.length,
      mostrados: mostradas.length,
      resultados: mostradas.map((l) => ({
        id: l.id,
        analito: l.projectLabel,
        nomeOficial: l.analyteLabel,
        valor: l.value,
        // Legivel ja na saida (Bloco 10): o modelo repete a unidade como a
        // recebe, e "10*3/uL" e token interno, nao o que o laudo escreve.
        unidade: unidadeLegivel(l.unit),
        dataDaColeta: l.collectedAt,
        momento: chaveDoMomento(l.collectionMoment) === '' ? null : l.collectionMoment,
        // O que estava no papel, ao lado do numero lido: e o que permite a
        // pessoa conferir sem abrir o documento.
        comoEstavaNoPapel: comoEstavaNoPapel(l),
        faixaDoLaboratorio: {
          minimo: l.referenceLow,
          maximo: l.referenceHigh,
          // A faixa que o laudo escreveu em tabela, quando nao ha dois numeros
          // (Bloco 9). Ela vem na unidade do PAPEL e nunca foi convertida --
          // o modelo a repassa como esta, e nao escolhe linha dentro dela.
          comoOLaudoEscreveu: l.rawReferenceText,
        },
        documentoId: l.documentId,
      })),
      naoComparaveis,
    };
  },

  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as {
      resultados?: {
        id: string;
        analito: string | null;
        valor: number | null;
        unidade: string | null;
        dataDaColeta: string | null;
        documentoId: string;
      }[];
    };
    if (!saida?.resultados?.length) return null;
    return {
      titulo: 'Resultados guardados',
      // Como o laudo escreve (Bloco 10): virgula decimal, unidade legivel, data
      // brasileira. Antes saia "0.033 10*3/uL · 2025-10-04" -- e o valor zero
      // sumia, porque `filter(Boolean)` descartava o 0.
      linhas: saida.resultados.map((r) =>
        [
          r.analito ?? 'sem nome',
          r.valor === null ? '' : `${formatarDecimal(r.valor)} ${unidadeLegivel(r.unidade)}`.trim(),
          r.dataDaColeta ? formatarData(r.dataDaColeta) : '',
        ]
          .filter((parte) => parte !== '')
          .join(' · '),
      ),
      // No degradado o numero sai do BANCO e nao do modelo, entao a origem e a
      // propria linha -- e ela vai junto, para a R4 continuar satisfeita.
      citacoes: saida.resultados.map((r) => ({
        resultId: r.id,
        documentId: r.documentoId,
        collectedAt: r.dataDaColeta ?? '',
      })),
    };
  },
};

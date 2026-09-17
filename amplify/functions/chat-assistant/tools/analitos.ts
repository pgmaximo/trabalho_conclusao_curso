/**
 * Resumo do arquivo:
 * A tool que faz a Fase 1 valer a pena. Ela devolve a serie de um analito com
 * data, unidade e DOCUMENTO DE ORIGEM de cada valor -- e o documento de origem
 * nao e enfeite: e o que torna a R4 ("nenhum numero sem origem") possivel de
 * cumprir. Sem ele, o modelo teria numeros soltos e nenhum jeito de dizer de
 * onde vieram.
 *
 * Ela aplica as MESMAS exclusoes da EPIC de serie por analito, e por uma razao
 * mais forte: um numero duvidoso citado numa conversa soa mais definitivo do
 * que o mesmo numero num grafico. Texto carrega autoridade que ponto nao
 * carrega.
 *
 * As cinco exclusoes ficam em `MOTIVOS_DE_EXCLUSAO`, exportado, e um teste
 * compara essa lista com a da EPIC de serie. O plano aplicava TRES das cinco
 * -- faltavam "sem data" e "unidade divergente", e a segunda e a perigosa: sem
 * ela o modelo compararia ng/mL com nmol/L como se fosse a mesma escala.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import { ANALYTE_CATALOG, findAnalyteByCode } from '../../extract-document-data/analyteCatalog';
import type { DegradedBlock } from '../types';
import { lerDoDono, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

/**
 * Os mesmos cinco motivos da EPIC de serie (`src/services/analyteSeries.ts`),
 * com o texto que o modelo le. Exportado para que um teste possa comparar as
 * duas listas: se a tela passar a excluir por um motivo que a conversa nao
 * conhece, a conversa citaria um numero que a tela esconde.
 */
export const MOTIVOS_DE_EXCLUSAO = {
  'pendente-de-revisao': 'aguarda conferência do usuário',
  'sem-valor': 'não pôde ser lido com segurança',
  'limite-de-deteccao': 'o laboratório informou um limite, não uma medida',
  'unidade-divergente': 'está em outra unidade de medida',
  'sem-data': 'está sem a data da coleta',
} as const;

export type MotivoDeExclusao = keyof typeof MOTIVOS_DE_EXCLUSAO;

type LinhaDeResultado = {
  id: string;
  documentId: string;
  analyteCode: string;
  projectLabel: string | null;
  analyteLabel: string | null;
  value: number | null;
  valueQualifier: string | null;
  unit: string | null;
  rawValue: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  collectedAt: string | null;
  collectionMoment: string | null;
  reviewStatus: string | null;
};

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function comoLinha(bruta: Record<string, unknown>): LinhaDeResultado {
  return {
    id: String(bruta.id ?? ''),
    documentId: String(bruta.documentId ?? ''),
    analyteCode: String(bruta.analyteCode ?? ''),
    projectLabel: texto(bruta.projectLabel),
    analyteLabel: texto(bruta.analyteLabel),
    value: numero(bruta.value),
    valueQualifier: texto(bruta.valueQualifier),
    unit: texto(bruta.unit),
    rawValue: texto(bruta.rawValue),
    referenceLow: numero(bruta.referenceLow),
    referenceHigh: numero(bruta.referenceHigh),
    collectedAt: texto(bruta.collectedAt),
    collectionMoment: texto(bruta.collectionMoment),
    reviewStatus: texto(bruta.reviewStatus),
  };
}

/**
 * A unidade da serie e a da coleta COMPARAVEL mais ANTIGA -- a mesma regra da
 * EPIC de serie, e pela mesma razao: a unidade da serie e a lingua que ela
 * sempre falou, e uma coleta nova em outra unidade e a anomalia. O contrario
 * faria uma unica coleta nova expulsar o historico inteiro.
 */
function unidadeDaSerie(linhas: LinhaDeResultado[]): string {
  const comparaveis = linhas
    .filter((l) => l.unit && l.value !== null && l.reviewStatus !== 'PENDENTE_DE_REVISAO')
    .sort((a, b) => (a.collectedAt ?? '9999').localeCompare(b.collectedAt ?? '9999'));
  return comparaveis[0]?.unit ?? linhas[0]?.unit ?? '';
}

/** A ORDEM e a mesma da EPIC de serie, e cada degrau dela e uma decisao. */
function motivoDaExclusao(linha: LinhaDeResultado, unidade: string): MotivoDeExclusao | null {
  if (linha.reviewStatus === 'PENDENTE_DE_REVISAO') return 'pendente-de-revisao';
  if (linha.value === null) return 'sem-valor';
  if (linha.valueQualifier) return 'limite-de-deteccao';
  if (linha.unit !== unidade) return 'unidade-divergente';
  if (!linha.collectedAt) return 'sem-data';
  return null;
}

/** Momento vazio e momento ausente sao o MESMO grupo. */
function chaveDoMomento(momento: string | null): string {
  return (momento ?? '').trim();
}

function semAcento(texto_: string): string {
  return texto_
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * O modelo NAO digita codigo LOINC. Ele manda `termo` em portugues -- que e
 * como o usuario fala e como o laudo escreve -- e esta funcao resolve para o
 * codigo. Pedir codigo ao modelo seria pedir exatamente o que a D27 proibe de
 * uma pessoa.
 *
 * Duas fontes, nesta ordem: o catalogo gerado (que traz os sinonimos em pt-BR
 * do proprio LOINC, D26) e, depois, o HISTORICO da pessoa -- porque com a D32
 * parte das linhas tem codigo local, derivado do rotulo, e nenhum codigo local
 * esta no catalogo. Sem a segunda fonte, a conversa nao alcancaria justamente
 * o que a tela de serie ja mostra.
 */
function resolverPeloCatalogo(termo: string): string | null {
  const alvo = semAcento(termo);
  if (alvo === '') return null;
  const achado = ANALYTE_CATALOG.find(
    (a) =>
      semAcento(a.projectLabel).includes(alvo) ||
      a.synonyms.some((s) => semAcento(s).includes(alvo)),
  );
  return achado?.code ?? null;
}

function resolverPeloHistorico(termo: string, linhas: LinhaDeResultado[]): string | null {
  const alvo = semAcento(termo);
  if (alvo === '') return null;
  const achado = linhas.find(
    (l) =>
      (l.projectLabel && semAcento(l.projectLabel).includes(alvo)) ||
      (l.analyteLabel && semAcento(l.analyteLabel).includes(alvo)) ||
      semAcento(l.analyteCode).includes(alvo),
  );
  return achado?.analyteCode ?? null;
}

const AUSENTE_NO_CATALOGO =
  'Não encontrei esse exame entre os resultados que o usuário tem registrados.';

const entrada = z
  .object({ analyteCode: z.string().optional(), termo: z.string().optional() })
  .strict();

export const analitosTool: ChatTool = {
  name: 'consultar_analito',
  description:
    'Consulta o histórico de um resultado de exame do usuário (ex.: vitamina D, glicose, hemoglobina). Aceita o nome em português, sem código. Devolve cada coleta com valor, unidade, data e o documento de origem, e lista separadamente o que não pôde ser comparado. NÃO grava nada, NÃO interpreta o resultado e NÃO diz se o valor está alto ou baixo.',
  inputSchema: entrada,
  readOnly: true,

  async run(input: unknown, identity: ChatIdentity) {
    const pedido = input as z.infer<typeof entrada>;

    // As linhas do dono vem primeiro, e nao depois de resolver o codigo: o
    // historico e a segunda fonte da busca por termo (codigo local, D32), e
    // sem ele um analito que a tela mostra ficaria invisivel a conversa.
    const linhas = (await lerDoDono(process.env.LAB_RESULT_TABLE_NAME, identity)).map(comoLinha);

    const codigo =
      (pedido.analyteCode ? pedido.analyteCode : null) ??
      (pedido.termo ? (resolverPeloCatalogo(pedido.termo) ?? resolverPeloHistorico(pedido.termo, linhas)) : null);

    if (!codigo) {
      return { disponivel: false, explicacao: AUSENTE_NO_CATALOGO };
    }

    const doAnalito = linhas.filter((l) => l.analyteCode === codigo);
    const doCatalogo = findAnalyteByCode(codigo);
    const nome = doCatalogo?.projectLabel ?? doAnalito[0]?.projectLabel ?? codigo;

    if (doAnalito.length === 0) {
      return {
        disponivel: false,
        analyteCode: codigo,
        nome,
        explicacao: 'O usuário não tem nenhum resultado registrado deste exame.',
      };
    }

    // Uma serie por momento da coleta (D22): glicose em jejum e de 120 minutos
    // sao condicoes que nao se comparam, e junta-las faria o modelo descrever
    // uma serra que nao existe.
    const grupos = new Map<string, LinhaDeResultado[]>();
    for (const l of doAnalito) {
      const chave = chaveDoMomento(l.collectionMoment);
      grupos.set(chave, [...(grupos.get(chave) ?? []), l]);
    }

    const series = [...grupos.entries()].map(([chave, doGrupo]) => {
      const unidade = unidadeDaSerie(doGrupo);
      const comparaveis: LinhaDeResultado[] = [];
      const naoComparaveis: { id: string; dataDaColeta: string | null; documentoId: string; motivo: string }[] = [];

      for (const l of doGrupo) {
        const motivo = motivoDaExclusao(l, unidade);
        if (motivo === null) comparaveis.push(l);
        // Contadas e explicadas, nunca omitidas -- o modelo precisa saber que
        // existem para poder mencionar, e a R5 manda ele dizer o que nao sabe.
        else
          naoComparaveis.push({
            id: l.id,
            dataDaColeta: l.collectedAt,
            documentoId: l.documentId,
            motivo: MOTIVOS_DE_EXCLUSAO[motivo],
          });
      }

      return {
        momento: chave === '' ? null : chave,
        unidade,
        coletas: comparaveis
          .sort((a, b) => (a.collectedAt ?? '').localeCompare(b.collectedAt ?? ''))
          .map((l) => ({
            id: l.id,
            valor: l.value,
            unidade: l.unit,
            dataDaColeta: l.collectedAt,
            // O que estava no papel, ao lado do numero lido -- e o que permite
            // a pessoa conferir sem abrir o documento.
            comoEstavaNoPapel: l.rawValue,
            faixaDoLaboratorio: { minimo: l.referenceLow, maximo: l.referenceHigh },
            documentoId: l.documentId,
          })),
        naoComparaveis,
      };
    });

    return {
      disponivel: true,
      analyteCode: codigo,
      nome,
      nomeOficial: doCatalogo?.label ?? doAnalito[0]?.analyteLabel ?? null,
      series,
    };
  },

  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as {
      disponivel?: boolean;
      nome?: string;
      series?: {
        momento: string | null;
        coletas: { dataDaColeta: string | null; valor: number | null; unidade: string | null; documentoId: string }[];
      }[];
    };
    if (!saida?.disponivel || !saida.series?.length) return null;

    const linhas = saida.series.flatMap((s) =>
      s.coletas.map((c) => ({
        // Data, valor, unidade e origem. Nenhuma palavra sobre o que o numero
        // significa: e o texto de modelo fixo do modo degradado, e ele passa
        // as regras por construcao porque nao tem onde uma opiniao caberia.
        texto: [
          c.dataDaColeta ?? 'sem data',
          `${c.valor ?? '—'} ${c.unidade ?? ''}`.trim(),
          s.momento ? `(${s.momento})` : null,
        ]
          .filter((parte): parte is string => Boolean(parte))
          .join(' · '),
        documentId: c.documentoId,
      })),
    );

    return linhas.length > 0 ? { titulo: saida.nome ?? 'Seus resultados', linhas } : null;
  },
};

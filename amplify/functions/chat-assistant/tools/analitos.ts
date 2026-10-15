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
import { unidadeLegivel } from '../../extract-document-data/unidadeLegivel';
import { formatarData, formatarDecimal } from '../formatoPtBr';
import { lerDoDono, texto } from './ownerScopedRead';
import {
  comoEstavaNoPapel,
  comoLinha,
  motivoDaExclusao,
  unidadeDaSerie,
  MOTIVOS_DE_EXCLUSAO,
  type LinhaDeResultado,
} from './linhasDeResultado';
import type { ChatTool } from './tipos';

/**
 * Os mesmos cinco motivos da EPIC de serie (`src/services/analyteSeries.ts`),
 * com o texto que o modelo le. Exportado para que um teste possa comparar as
 * duas listas: se a tela passar a excluir por um motivo que a conversa nao
 * conhece, a conversa citaria um numero que a tela esconde.
 */
// Os tipos e as regras de exclusao foram EXTRAIDOS para `linhasDeResultado.ts`
// em 2026-09-19 (U5): `consultar_resultados` precisa das mesmas, e duas copias
// divergiriam em silencio. Reexportados aqui porque quem ja importava daqui
// continua valendo.
export {
  MOTIVOS_DE_EXCLUSAO,
  motivoDaExclusao,
  unidadeDaSerie,
  type LinhaDeResultado,
  type MotivoDeExclusao,
} from './linhasDeResultado';

/** Momento vazio e momento ausente sao o MESMO grupo. */
function chaveDoMomento(momento: string | null): string {
  return (momento ?? '').trim();
}

function semAcento(texto_: string): string {
  return texto_
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Pontuacao vira espaco (Bloco 10): o sinonimo oficial do LDL e
    // "Colesterol.LDL", e quem pergunta escreve "colesterol LDL". Sem isto, o
    // termo casava com "colesterol" -- o total -- e a pessoa ouvia sobre o exame
    // errado.
    .replace(/[^a-z0-9]+/g, ' ')
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
/**
 * Quao bem um nome casa com o termo, ou null se nao casa. Menor e melhor.
 *
 * Os DOIS sentidos contam, e isso e do Bloco 10: a rodada automatica da L7
 * perguntou "meu colesterol LDL esta bom?" e ouviu que nao havia LDL
 * registrado. Havia. A busca so testava "o nome CONTEM o termo", e "colesterol
 * LDL" nao esta contido em "LDL".
 *
 * A ordem existe porque os dois sentidos juntos casam demais:
 *   0. nome igual ao termo;
 *   1. o nome contem o termo -- o nome MAIS CURTO vence ("vitamina D" e a 25-OH,
 *      e nao a 1,25-di-hidroxivitamina D);
 *   2. o termo contem o nome -- o nome MAIS LONGO vence ("hemoglobina glicada"
 *      e a glicada, e nao a hemoglobina). Nome de menos de 3 letras nao entra
 *      aqui: "D" esta dentro de quase tudo.
 */
function afinidade(nome: string, alvo: string): number | null {
  const n = semAcento(nome);
  if (n === '') return null;
  if (n === alvo) return 0;
  if (n.includes(alvo)) return 1_000 + n.length;
  if (n.length >= 3 && alvo.includes(n)) return 100_000 - n.length;
  return null;
}

function melhor<T>(itens: T[], nomesDe: (item: T) => (string | null | undefined)[], termo: string): T | null {
  const alvo = semAcento(termo);
  if (alvo === '') return null;
  let achado: T | null = null;
  let nota = Infinity;
  for (const item of itens) {
    for (const nome of nomesDe(item)) {
      const a = nome ? afinidade(nome, alvo) : null;
      if (a !== null && a < nota) {
        nota = a;
        achado = item;
      }
    }
  }
  return achado;
}

function resolverPeloCatalogo(termo: string): string | null {
  return melhor(ANALYTE_CATALOG, (a) => [a.projectLabel, ...a.synonyms], termo)?.code ?? null;
}

function resolverPeloHistorico(termo: string, linhas: LinhaDeResultado[]): string | null {
  return melhor(linhas, (l) => [l.projectLabel, l.analyteLabel, l.analyteCode], termo)?.analyteCode ?? null;
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

    // O catalogo vem primeiro -- MAS so vence se a pessoa tiver linha com o
    // codigo dele. A razao e a ampliacao do Bloco 10: analitos que eram de
    // codigo local (D32) passaram a ter codigo LOINC, e as linhas gravadas
    // ANTES continuam com o local. Sem esta regra, "zinco" resolveria para o
    // codigo novo, que ninguem tem, e o zinco que a tela mostra ficaria
    // invisivel a conversa.
    const temLinha = (c: string) => linhas.some((l) => l.analyteCode === c);
    const peloCatalogo = pedido.termo ? resolverPeloCatalogo(pedido.termo) : null;
    const peloHistorico = pedido.termo ? resolverPeloHistorico(pedido.termo, linhas) : null;
    const codigo =
      (pedido.analyteCode ? pedido.analyteCode : null) ??
      (peloCatalogo && temLinha(peloCatalogo) ? peloCatalogo : (peloHistorico ?? peloCatalogo));

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
        // A comparacao acima usa o token; o que sai para o modelo e o legivel.
        unidade: unidadeLegivel(unidade),
        coletas: comparaveis
          .sort((a, b) => (a.collectedAt ?? '').localeCompare(b.collectedAt ?? ''))
          .map((l) => ({
            id: l.id,
            valor: l.value,
            unidade: unidadeLegivel(l.unit),
            dataDaColeta: l.collectedAt,
            // O que estava no papel, ao lado do numero lido -- e o que permite
            // a pessoa conferir sem abrir o documento.
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
        unidade: string;
        coletas: {
          id: string;
          valor: number | null;
          unidade: string | null;
          dataDaColeta: string | null;
          documentoId: string;
        }[];
      }[];
    };
    if (!saida?.disponivel || !saida.series?.length) return null;

    const coletas = saida.series.flatMap((s) =>
      s.coletas.map((c) => ({ ...c, momento: s.momento })),
    );
    if (coletas.length === 0) return null;

    return {
      titulo: saida.nome ?? 'Seus resultados',
      // Data, valor, unidade e momento. NENHUMA comparacao com a faixa: dizer
      // "dentro" ou "acima" seria leitura clinica, e e justamente por nao
      // interpretar que este texto e seguro sem passar por verificacao.
      linhas: coletas.map((c) =>
        [
          formatarData(c.dataDaColeta),
          `${formatarDecimal(c.valor)} ${unidadeLegivel(c.unidade)}`.trim(),
          c.momento ? `(${c.momento})` : null,
        ]
          .filter((parte): parte is string => Boolean(parte))
          .join(' — '),
      ),
      citacoes: coletas.map((c) => ({
        resultId: c.id,
        documentId: c.documentoId,
        collectedAt: c.dataDaColeta ?? '',
      })),
    };
  },
};

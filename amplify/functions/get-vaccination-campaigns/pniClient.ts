/**
 * Resumo do arquivo:
 * Cliente HTTP para o dataset público de doses aplicadas do PNI/RNDS
 * (apidadosabertos.saude.gov.br — Ministério da Saúde, sem autenticação).
 *
 * Duas limitações verificadas ao vivo durante a pesquisa desta feature (ver
 * specs da campanha) definem este cliente:
 *  1. Os filtros documentados na query string (UF, vacina, etc.) são
 *     ignorados pelo servidor — testado com `sigla_uf_estabelecimento=SP` e o
 *     retorno trouxe outras UFs misturadas. Só `limit`/`offset` funcionam de
 *     fato.
 *  2. `limit` é travado em 1000 pelo servidor (valores maiores são truncados
 *     silenciosamente) e o dataset tem dezenas de milhões de linhas por ano.
 *
 * Por isso este cliente faz AMOSTRAGEM: consulta um conjunto fixo de offsets
 * espalhados ao longo do dataset (não o dataset inteiro) e devolve os
 * registros crus para o agregador (campaignAggregator.ts) filtrar
 * client-side por UF/janela de data. O resultado é estatisticamente uma
 * amostra, não um censo — a UI precisa deixar isso explícito (nunca
 * apresentar como contagem oficial/total).
 */

const PNI_API_BASE = 'https://apidadosabertos.saude.gov.br/vacinacao';
const PAGE_LIMIT = 1000;

export type PniDoseRecordRaw = {
  data_vacina?: string;
  sigla_uf_estabelecimento?: string;
  codigo_municipio_estabelecimento?: string;
};

/**
 * Offsets de sondagem, espalhados para cobrir meses diferentes do ano (o
 * dataset é aproximadamente cronológico por offset — verificado: offset 0
 * concentrava jun/2026, offset 20_000_000 concentrava ago/2026). Cada offset
 * sondado traz `PAGES_PER_OFFSET` páginas consecutivas (não só 1) para dar
 * volume suficiente de amostra por ponto.
 */
const PROBE_OFFSETS = [0, 2_000_000, 5_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000, 30_000_000];
const PAGES_PER_OFFSET = 2;

async function fetchPage(ano: number, offset: number): Promise<PniDoseRecordRaw[]> {
  const url = `${PNI_API_BASE}/doses-aplicadas-pni-${ano}?limit=${PAGE_LIMIT}&offset=${offset}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao consultar doses aplicadas do PNI ${ano} (status ${response.status}).`);
  }

  const body = (await response.json()) as { doses_aplicadas_pni?: PniDoseRecordRaw[] };
  return body.doses_aplicadas_pni ?? [];
}

/**
 * Busca uma amostra de registros de doses aplicadas do ano informado,
 * varrendo os offsets de PROBE_OFFSETS. Páginas vazias (fim do dataset) são
 * ignoradas silenciosamente — não é erro, é apenas um offset além do fim.
 */
export async function fetchPniSample(ano: number): Promise<PniDoseRecordRaw[]> {
  const allRecords: PniDoseRecordRaw[] = [];

  for (const baseOffset of PROBE_OFFSETS) {
    for (let page = 0; page < PAGES_PER_OFFSET; page += 1) {
      const offset = baseOffset + page * PAGE_LIMIT;
      try {
        const records = await fetchPage(ano, offset);
        if (records.length === 0) {
          break; // fim do dataset neste offset-base — não adianta continuar aqui
        }
        allRecords.push(...records);
      } catch {
        // Uma falha pontual de rede em um offset não deve derrubar a amostra
        // inteira — os demais offsets ainda contribuem dados válidos.
        break;
      }
    }
  }

  return allRecords;
}

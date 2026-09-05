/**
 * Resumo do arquivo:
 * Agregação pura (sem I/O) dos registros crus do PNI (pniClient.ts) cruzados
 * com as janelas de campanha (campaignCalendar.ts). Separado do handler para
 * ser testável sem mockar `fetch` — mesmo racional de uspstfFilter.ts na
 * feature de Prevenção.
 *
 * Importante: como não há de-para público e confiável entre `codigo_vacina`
 * e o nome da vacina (ver src/data/pniVaccineCodes.ts), `dosesNoPeriodo` conta
 * TODOS os registros de doses aplicadas na amostra dentro da janela/UF da
 * campanha — não apenas doses da vacina específica da campanha. Isto é
 * intencional e vai refletido no texto da UI ("atividade de vacinação
 * registrada no período", nunca "N doses desta vacina").
 */
import type { CampanhaDefinicao } from './campaignCalendar';
import type { PniDoseRecordRaw } from './pniClient';

export type CampanhaAgregada = {
  id: string;
  nome: string;
  ativa: boolean;
  janelaInicio: string;
  janelaFim: string;
  dosesNoPeriodo: number | null; // null = amostra não cobriu o período (sem dado apurável)
  ufReferencia: string | null;
  fonteUrl: string;
};

function extractDateOnly(dataVacina: string | undefined): string | null {
  if (!dataVacina) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(dataVacina);
  return match ? match[1] : null;
}

/** Maior `data_vacina` observada na amostra inteira — usado como aviso de atualidade. */
export function computeDataAsOf(records: PniDoseRecordRaw[]): string | null {
  let max: string | null = null;
  for (const record of records) {
    const date = extractDateOnly(record.data_vacina);
    if (date && (!max || date > max)) {
      max = date;
    }
  }
  return max;
}

/**
 * Agrega a contagem de doses da amostra dentro da janela de cada campanha
 * ativa, opcionalmente restrita a uma UF. Campanhas cuja janela a amostra não
 * cobre (nenhum registro na faixa de datas) retornam `dosesNoPeriodo: null`
 * em vez de 0 — 0 sugeriria "nenhuma dose aplicada", quando na verdade
 * significa "a amostra não alcançou esse período".
 */
export function aggregateCampanhas(
  campanhasAtivas: CampanhaDefinicao[],
  records: PniDoseRecordRaw[],
  uf: string | null,
): CampanhaAgregada[] {
  return campanhasAtivas.map((campanha) => {
    let count = 0;
    let sampleReachedWindow = false;

    for (const record of records) {
      const date = extractDateOnly(record.data_vacina);
      if (!date) continue;

      if (date >= campanha.janelaInicio && date <= campanha.janelaFim) {
        sampleReachedWindow = true;
        if (!uf || record.sigla_uf_estabelecimento === uf) {
          count += 1;
        }
      }
    }

    return {
      id: campanha.id,
      nome: campanha.nome,
      ativa: true,
      janelaInicio: campanha.janelaInicio,
      janelaFim: campanha.janelaFim,
      dosesNoPeriodo: sampleReachedWindow ? count : null,
      ufReferencia: uf,
      fonteUrl: campanha.fonteUrl,
    };
  });
}

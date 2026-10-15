import type { CanonicalMetric } from './metricCatalog';

/**
 * Converte uma string/numero bruto em number, tratando os formatos vistos no
 * export real: vazio, "-", ponto decimal, virgula decimal (locale pt-BR).
 * Nunca lanca -- retorna null para qualquer coisa nao numerica.
 */
export function toNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-') return null;

  // Virgula decimal (ex.: "72,5") -- so tratada como decimal quando nao ha
  // ponto na string (senao seria um separador de milhar tipo "1.234,5", caso
  // que nao apareceu no export real e nao vale a complexidade de tratar).
  const normalized = trimmed.includes(',') && !trimmed.includes('.') ? trimmed.replace(',', '.') : trimmed;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Aplica o fator de conversao de unidade da metrica (ex.: metros -> km). */
export function convertToCanonicalUnit(value: number, metric: CanonicalMetric): number {
  return metric.unitFactor ? value * metric.unitFactor : value;
}

/**
 * Extrai a data-calendario (YYYY-MM-DD) diretamente de uma string de
 * timestamp LOCAL do Samsung Health ("2023-06-02 17:24:05.687"), sem
 * nenhuma conversao de fuso horario.
 *
 * Por que sem conversao: a string ja representa o horario de parede local
 * por natureza -- e por isso que ela vem sempre pareada com uma coluna
 * `time_offset` separada (ex.: "UTC-0300"). O offset so importaria se
 * precisassemos comparar instantes absolutos entre fusos diferentes; a
 * agregacao diaria (o que interessa aqui) so precisa da data-calendario, que
 * ja esta certa na propria string.
 */
export function extractDateKeyFromLocalString(raw: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
  return match ? match[1] : null;
}

/**
 * Offset padrao (UTC-3, Brasilia) usado SOMENTE quando a fonte fornece
 * apenas epoch (ms) sem nenhuma string local pareada -- caso da HRV, cujos
 * JSONs (`jsons/com.samsung.health.hrv/*.json`) trazem so `start_time` em
 * epoch ms, sem coluna de offset. Aproximacao documentada (plan.md secao
 * 3.2): pode errar a data-calendario por ate algumas horas perto da meia-
 * noite para quem usa o app fora do fuso de Brasilia.
 */
export const DEFAULT_TZ_OFFSET_MINUTES = -180;

/** Converte um epoch (ms) para data-calendario usando um offset de fuso em minutos. */
export function epochMsToDateKey(epochMs: number, offsetMinutes: number = DEFAULT_TZ_OFFSET_MINUTES): string {
  const shifted = new Date(epochMs + offsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Faz o parsing de uma string de timestamp LOCAL do Samsung
 * ("YYYY-MM-DD HH:mm:ss.SSS") para um Date "ingenuo" (tratado como se fosse
 * UTC) -- usado apenas para calcular DURACOES (diferenca entre duas
 * timestamps da MESMA linha/sessao, que compartilham o mesmo offset, entao o
 * erro de fuso se cancela na subtracao). Nunca usar o Date retornado aqui
 * como instante absoluto real.
 */
export function parseLocalTimestampAsNaiveDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const isoLike = trimmed.replace(' ', 'T') + 'Z';
  const date = new Date(isoLike);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "UTC-0300" -> -180 (minutos). Retorna null se o formato nao for reconhecido. */
export function parseOffsetString(offset: string | null | undefined): number | null {
  if (!offset) return null;
  const match = /^UTC([+-])(\d{2})(\d{2})$/.exec(offset.trim());
  if (!match) return null;

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return sign * (hours * 60 + minutes);
}

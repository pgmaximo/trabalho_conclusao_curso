export type DataExportResult = 'unavailable';

/**
 * Exportação de dados é um requisito de portabilidade da LGPD (constituição §4),
 * não apenas uma preferência de UI. Nenhum mecanismo real de geração/entrega de
 * exportação existe ainda — este serviço documenta a pendência de forma explícita
 * em vez de deixá-la ausente silenciosamente.
 */
export async function requestDataExport(): Promise<DataExportResult> {
  return 'unavailable';
}

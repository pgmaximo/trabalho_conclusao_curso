// Identifica o TIPO real de um arquivo do Samsung Health pela primeira
// linha (metadado), nunca pelo nome do arquivo -- descoberto lendo o export
// real do usuario: `com.samsung.shealth.stress*.csv` tambem casa com
// `stress.histogram`, e `exercise*.csv` casa com
// `exercise.periodization_training_schedule`. So a linha 1 e confiavel.

export type SourceFormat = 'samsung-csv' | 'generic-csv' | 'json' | 'unknown';

/**
 * A linha 1 de um CSV do Samsung Health e sempre
 * `<tipo.completo>,<versao>,<n>` -- nunca o cabecalho real (que e a linha 2).
 */
export function isSamsungMetadataLine(line: string): boolean {
  return /^com\.samsung\.[a-zA-Z0-9_.]+,\d+,\d+\s*$/.test(line.trim());
}

/**
 * Extrai o tipo declarado (ex.: "com.samsung.shealth.stress") da linha 1.
 * Retorna null se a linha nao for um metadado Samsung reconhecido.
 */
export function detectSamsungType(line1: string): string | null {
  if (!isSamsungMetadataLine(line1)) return null;
  return line1.trim().split(',')[0];
}

/**
 * Sniff de formato pelo conteudo (nunca so pela extensao): 'samsung-csv' tem
 * a linha de metadado na linha 1 (cabecalho real na linha 2); 'generic-csv'
 * comeca direto pelo cabecalho (formato de exportadores terceiros como
 * Health Auto Export); 'json' comeca por `{` ou `[`.
 */
export function detectFormat(fileName: string, head: string): SourceFormat {
  const firstLine = head.split(/\r?\n/, 1)[0] ?? '';
  const trimmedHead = head.trimStart();

  if (detectSamsungType(firstLine)) {
    return 'samsung-csv';
  }

  if (trimmedHead.startsWith('{') || trimmedHead.startsWith('[')) {
    return 'json';
  }

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.json')) return 'json';
  if (lowerName.endsWith('.csv') || firstLine.includes(',') || firstLine.includes(';')) {
    return 'generic-csv';
  }

  return 'unknown';
}

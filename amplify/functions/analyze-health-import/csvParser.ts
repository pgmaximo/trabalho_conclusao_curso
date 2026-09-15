// Parser CSV defensivo. Cobre as particularidades confirmadas no export real
// do Samsung Health (ver plan.md secao 3.3) e o formato RFC 4180 padrao
// (aspas, delimitador/quebra de linha dentro de campo) que exportadores tipo
// Health Auto Export podem usar.

/** Remove o BOM UTF-8 (﻿) do inicio do texto, se presente. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Detecta o delimitador pela linha de cabecalho. Prefere `;` quando presente
 * (locale pt-BR pode usar virgula como separador decimal, o que exige `;`
 * como delimitador de campo para nao corromper a linha), senao `\t`, senao
 * `,` como padrao.
 */
export function detectDelimiter(headerLine: string): ',' | ';' | '\t' {
  if (headerLine.includes(';')) return ';';
  if (headerLine.includes('\t') && !headerLine.includes(',')) return '\t';
  return ',';
}

/**
 * Faz o parsing de uma linha CSV respeitando aspas (RFC 4180): um campo entre
 * aspas pode conter o delimitador, quebras de linha, e aspas escapadas (`""`).
 * Retorna os campos SEM as aspas envolventes.
 *
 * Nao usa split() ingenuo porque campos como "Sao Paulo, SP" (com o
 * delimitador dentro de aspas) quebrariam a contagem de colunas.
 */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++; // pula a segunda aspa do par escapado
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  /** Metadado da linha 1, quando skipLeadingMetadataLine=true e a linha existe. */
  metadataLine: string | null;
  /** Linhas ignoradas por estarem vazias ou terem numero de campos anomalo. */
  skippedLineCount: number;
};

export type ParseCsvOptions = {
  /** true para arquivos Samsung (linha 1 = metadado, linha 2 = cabecalho real). */
  skipLeadingMetadataLine?: boolean;
};

/**
 * Faz o parsing de um CSV completo (ja lido em memoria como string) em
 * headers + rows. Cada linha do Samsung Health termina com uma virgula
 * sobrando (um campo vazio extra) -- por isso NUNCA validamos
 * `headers.length === row.length`; so truncamos/preenchemos silenciosamente
 * quando o numero de campos diverge, contabilizando o quanto isso aconteceu.
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): ParsedCsv {
  const normalized = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  let cursor = 0;
  let metadataLine: string | null = null;

  if (options.skipLeadingMetadataLine && lines.length > 0) {
    metadataLine = lines[0] ?? null;
    cursor = 1;
  }

  // Pula linhas vazias antes do cabecalho (arquivo com quebra de linha extra).
  while (cursor < lines.length && lines[cursor]?.trim() === '') {
    cursor++;
  }

  const headerLine = lines[cursor] ?? '';
  const delimiter = detectDelimiter(headerLine);
  const headers = splitCsvLine(headerLine, delimiter).map((h) => h.trim());
  cursor++;

  const rows: string[][] = [];
  let skippedLineCount = 0;

  for (; cursor < lines.length; cursor++) {
    const line = lines[cursor];
    if (line === undefined || line.trim() === '') continue;

    const fields = splitCsvLine(line, delimiter);

    // A virgula sobrando no fim de toda linha de dado do Samsung produz um
    // campo vazio extra (headers.length + 1 campos) -- descartamos esse
    // ultimo campo vazio sem contar como anomalia. Qualquer outra divergencia
    // de contagem e contabilizada como linha "torta", mas ainda assim
    // aproveitada (truncada/preenchida) em vez de descartada inteira.
    let normalizedFields = fields;
    if (fields.length === headers.length + 1 && fields[fields.length - 1] === '') {
      normalizedFields = fields.slice(0, -1);
    } else if (fields.length !== headers.length) {
      skippedLineCount++;
      if (fields.length > headers.length) {
        normalizedFields = fields.slice(0, headers.length);
      } else {
        normalizedFields = [...fields, ...Array(headers.length - fields.length).fill('')];
      }
    }

    rows.push(normalizedFields);
  }

  return { headers, rows, metadataLine, skippedLineCount };
}

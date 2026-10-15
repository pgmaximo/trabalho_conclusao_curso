import { unzipSync } from 'fflate';

export type ArchiveEntry = {
  name: string;
  data: Uint8Array;
};

export type UnzipResult = {
  csvEntries: ArchiveEntry[];
  /** So os JSONs de jsons/com.samsung.health.hrv/ -- a unica pasta de jsons/ que mantemos. */
  hrvJsonEntries: ArchiveEntry[];
  /** Quantas entradas foram rejeitadas pelo filtro (tamanho ou fora da allowlist). */
  skippedCount: number;
  totalBytes: number;
};

/** Tamanho maximo de uma entrada individual inflada. */
export const MAX_ENTRY_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Corte de zip bomb: 120MB contando SO o que passou pelo filtro (nunca o
 * total bruto do ZIP) -- um export real do Samsung Health infla ~5,6x sem
 * nada de malicioso (ver plan.md secao 3.6), entao um corte sobre o total
 * bruto abortaria exports legitimos.
 */
export const MAX_TOTAL_ACCEPTED_BYTES = 120 * 1024 * 1024;

/**
 * Decide se uma entrada do ZIP deve ser descompactada -- ALLOWLIST, nunca
 * denylist (prova real: `jsons/com.samsung.shealth.step_daily_trend/` sozinha
 * tem 41MB de puro `[{},{},...}]`, e "ler tudo que sobrou" gastaria essa
 * memoria toda para nao extrair nenhum dado util).
 *
 * Aceita: (1) qualquer `.csv` fora de `jsons/` e `files/` (os ~14 CSVs de
 * raiz que o catalogo usa -- o filtro por NOME e so um pre-filtro grosseiro,
 * a identificacao precisa do tipo acontece depois, pelo CONTEUDO, via
 * fileSniffer.detectSamsungType); (2) os JSONs de
 * `jsons/com.samsung.health.hrv/` (a unica pasta de jsons/ com dado que o
 * catalogo usa, ver plan.md secao 0.2). Rejeita todo o resto: as demais
 * pastas de `jsons/`, `files/`, `__MACOSX/`, `.DS_Store`, diretorios, e
 * qualquer entrada individual acima de MAX_ENTRY_SIZE_BYTES.
 */
export function shouldExtractEntry(path: string, originalSize: number): boolean {
  if (originalSize <= 0 || originalSize > MAX_ENTRY_SIZE_BYTES) return false;

  const normalized = path.replace(/\\/g, '/');
  if (normalized.endsWith('/')) return false; // marcador de diretorio

  const isRootCsv = normalized.endsWith('.csv') && !normalized.includes('/jsons/') && !normalized.includes('/files/');
  if (isRootCsv) return true;

  return /\/jsons\/com\.samsung\.health\.hrv\/[^/]+\.json$/.test(normalized);
}

/**
 * Descompacta o ZIP do export, aplicando a allowlist de `shouldExtractEntry`
 * mais o corte de total acumulado -- ambos aplicados DENTRO do filter do
 * fflate, entao os bytes rejeitados nunca chegam a ser inflados.
 */
export function unzipHealthExport(zipBytes: Uint8Array): UnzipResult {
  let acceptedTotal = 0;
  let skippedCount = 0;

  const files = unzipSync(zipBytes, {
    filter(file) {
      if (!shouldExtractEntry(file.name, file.originalSize)) {
        skippedCount++;
        return false;
      }
      if (acceptedTotal + file.originalSize > MAX_TOTAL_ACCEPTED_BYTES) {
        skippedCount++;
        return false;
      }
      acceptedTotal += file.originalSize;
      return true;
    },
  });

  const csvEntries: ArchiveEntry[] = [];
  const hrvJsonEntries: ArchiveEntry[] = [];

  for (const [name, data] of Object.entries(files)) {
    const normalized = name.replace(/\\/g, '/');
    if (normalized.endsWith('.csv')) {
      csvEntries.push({ name, data });
    } else if (normalized.endsWith('.json')) {
      hrvJsonEntries.push({ name, data });
    }
  }

  return { csvEntries, hrvJsonEntries, skippedCount, totalBytes: acceptedTotal };
}

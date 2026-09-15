import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { markFailed, markReady, readImport } from './importRepository';
import { readObjectBuffer, writeJsonArtifact } from './s3Reader';
import { unzipHealthExport } from './archiveReader';
import { detectSamsungType } from './fileSniffer';
import { type ParsedCsv, parseCsv } from './csvParser';
import { extractSamples } from './sampleExtractor';
import { extractHrvSamples } from './hrvExtractor';
import { findColumnByNormalizedName, SLEEP_STAGE_SAMSUNG_TYPE } from './columnMapper';
import { aggregateDaily, dedupeByDevice, type Sample, sleepStagesFromSegments, type SleepStageSegment } from './dailyAggregator';
import { applySanityRanges, checkCrossFieldConsistency, filterSamplesByRange } from './sanity';
import { buildAnalysisSummary } from './summaryBuilder';
import { applyOutputGuardrail, requestInsights } from './bedrockClient';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const textDecoder = new TextDecoder('utf-8');

type InvokeEvent = {
  importId?: string;
};

// Sucesso = pelo menos uma metrica com 7 dias ou mais (plan.md secao 3.4) --
// tudo que nao atingir isso vira aviso em "o que nao conseguimos ler" em vez
// de virar um grafico vazio.
const MIN_DAYS_FOR_SUCCESS = 7;

function basename(path: string): string {
  return path.split('/').pop() ?? path;
}

/**
 * `health-imports/<identityId>/<importId>/<arquivo>` -- extrai o segmento de
 * identityId de uma fileKey ja validada por start-health-analysis, para que
 * o result.json gravado por esta Lambda fique acessivel ao mesmo usuario
 * dono da importacao (a policy de Storage so libera leitura sob o proprio
 * identityId -- ver amplify/storage/resource.ts). Retorna null se por algum
 * motivo a chave nao tiver o formato esperado (nesse caso o handler
 * simplesmente NAO grava o artefato de depuracao, sem falhar a analise).
 */
function extractIdentityId(fileKey: string): string | null {
  const parts = fileKey.split('/');
  return parts.length >= 4 && parts[0] === 'health-imports' ? (parts[1] ?? null) : null;
}

/** Extrai segmentos de sleep_stage.csv (start_time/end_time/stage/sleep_id) linha a linha. */
function extractSleepStageSegments(parsed: ParsedCsv): { segments: SleepStageSegment[]; rowsWithoutTimestamp: number } {
  const { headers, rows } = parsed;
  const sleepIdIndex = findColumnByNormalizedName(headers, 'sleep_id');
  const startIndex = findColumnByNormalizedName(headers, 'start_time');
  const endIndex = findColumnByNormalizedName(headers, 'end_time');
  const stageIndex = findColumnByNormalizedName(headers, 'stage');
  const deviceIndex = findColumnByNormalizedName(headers, 'deviceuuid');

  if (sleepIdIndex === null || startIndex === null || endIndex === null || stageIndex === null) {
    return { segments: [], rowsWithoutTimestamp: rows.length };
  }

  const segments: SleepStageSegment[] = [];
  let rowsWithoutTimestamp = 0;

  for (const row of rows) {
    const sleepId = row[sleepIdIndex];
    const startTime = row[startIndex];
    const endTime = row[endIndex];
    const stageCode = row[stageIndex];

    if (!sleepId || !startTime || !endTime || !stageCode) {
      rowsWithoutTimestamp++;
      continue;
    }

    segments.push({
      sleepId,
      startTime,
      endTime,
      stageCode,
      deviceId: deviceIndex !== null ? row[deviceIndex] || null : null,
    });
  }

  return { segments, rowsWithoutTimestamp };
}

/** Processa um CSV (Samsung ou nao) ja em memoria, acumulando Samples e avisos em pt-BR. */
function processCsvEntry(name: string, text: string, allSamples: Sample[], warnings: string[]): void {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const samsungType = detectSamsungType(firstLine);

  if (!samsungType) {
    // Cobre tanto CSV genuinamente irreconhecivel quanto exports que ainda
    // nao suportamos (ex.: bloco Apple/HAE, nao verificado contra um export
    // real -- ver plan.md secao 3.2) -- nunca falha a importacao inteira por
    // causa de UM arquivo.
    warnings.push(`Não foi possível identificar o tipo do arquivo "${basename(name)}" — hoje só oferecemos suporte a exports do Samsung Health.`);
    return;
  }

  const parsed = parseCsv(text, { skipLeadingMetadataLine: true });

  if (samsungType === SLEEP_STAGE_SAMSUNG_TYPE) {
    const { segments, rowsWithoutTimestamp } = extractSleepStageSegments(parsed);
    allSamples.push(...sleepStagesFromSegments(segments));
    if (rowsWithoutTimestamp > 0) {
      warnings.push(`${rowsWithoutTimestamp} linha(s) de estágios de sono em "${basename(name)}" não puderam ser lidas.`);
    }
    return;
  }

  const result = extractSamples(parsed, samsungType);
  allSamples.push(...result.samples);

  if (result.unmappedColumnCount > 0) {
    warnings.push(`${result.unmappedColumnCount} coluna(s) não reconhecidas em "${basename(name)}" foram ignoradas.`);
  }
  if (result.rowsWithoutTimestamp > 0) {
    warnings.push(`${result.rowsWithoutTimestamp} linha(s) de "${basename(name)}" não tinham data legível e foram ignoradas.`);
  }
  if (parsed.skippedLineCount > 0) {
    warnings.push(`${parsed.skippedLineCount} linha(s) de "${basename(name)}" tinham formato inesperado e foram ajustadas.`);
  }
}

function processHrvJsonEntry(name: string, text: string, allSamples: Sample[], warnings: string[]): void {
  try {
    const json = JSON.parse(text);
    allSamples.push(...extractHrvSamples(json));
  } catch {
    // 4800+ arquivos pequenos de HRV -- um aviso por arquivo malformado seria
    // ruido puro; a perda de alguns pontos de HRV nao compromete a analise.
    console.warn(`JSON de HRV invalido, ignorado: ${basename(name)}`);
  }
}

/**
 * Orquestra o pipeline completo: le os arquivos do S3, descompacta ZIPs com
 * a allowlist, faz o parsing defensivo de cada CSV/JSON reconhecido,
 * consolida em series diarias, valida sanidade, monta o resumo estatistico e
 * pede a analise ao Bedrock.
 *
 * NUNCA lanca: o corpo inteiro fica em try/catch e qualquer falha vira
 * markFailed -- o invoke assincrono que chama esta funcao tem
 * retryAttempts:0 configurado (amplify/backend.ts) como segunda camada de
 * defesa, mas esta e a que realmente evita pagar o Bedrock em dobro.
 */
export async function handler(event: InvokeEvent): Promise<void> {
  const tableName = process.env.HEALTH_IMPORT_TABLE_NAME;
  const bucketName = process.env.HEALTH_BUCKET_NAME;
  const modelId = process.env.BEDROCK_MODEL_ID;
  const guardrailId = process.env.BEDROCK_GUARDRAIL_ID;
  const guardrailVersion = process.env.BEDROCK_GUARDRAIL_VERSION;
  const importId = event.importId;

  if (!importId) {
    console.error('Evento invalido: importId ausente.', event);
    return;
  }

  if (!tableName || !bucketName || !modelId || !guardrailId || !guardrailVersion) {
    console.error('Variaveis de ambiente ausentes.', {
      hasTableName: !!tableName,
      hasBucketName: !!bucketName,
      hasModelId: !!modelId,
      hasGuardrailId: !!guardrailId,
      hasGuardrailVersion: !!guardrailVersion,
    });
    return;
  }

  try {
    const row = await readImport(ddbClient, tableName, importId);
    if (!row) {
      console.error(`Importacao ${importId} nao encontrada.`);
      return;
    }

    const fileKeys = row.fileKeys ?? [];
    const warnings: string[] = [];
    const allSamples: Sample[] = [];

    for (const fileKey of fileKeys) {
      let buffer: Buffer;
      try {
        buffer = await readObjectBuffer(bucketName, fileKey);
      } catch {
        warnings.push(`Não foi possível ler o arquivo "${basename(fileKey)}".`);
        continue;
      }

      const lowerKey = fileKey.toLowerCase();

      if (lowerKey.endsWith('.zip')) {
        const unzipResult = unzipHealthExport(new Uint8Array(buffer));
        // Contagem tecnica de entradas filtradas (ex.: pastas de sensor cru
        // que descartamos de proposito) -- so log, nao vira aviso pro
        // usuario, que nao teria como agir sobre isso.
        console.log(`ZIP ${basename(fileKey)}: ${unzipResult.csvEntries.length} CSV(s) e ${unzipResult.hrvJsonEntries.length} JSON(s) de HRV extraidos; ${unzipResult.skippedCount} entrada(s) fora da allowlist ignoradas.`);

        for (const entry of unzipResult.csvEntries) {
          processCsvEntry(entry.name, textDecoder.decode(entry.data), allSamples, warnings);
        }
        for (const entry of unzipResult.hrvJsonEntries) {
          processHrvJsonEntry(entry.name, textDecoder.decode(entry.data), allSamples, warnings);
        }
      } else if (lowerKey.endsWith('.json')) {
        processHrvJsonEntry(fileKey, textDecoder.decode(buffer), allSamples, warnings);
      } else {
        processCsvEntry(fileKey, textDecoder.decode(buffer), allSamples, warnings);
      }
    }

    const { samples: sanitizedSamples, warnings: rangeSampleWarnings } = filterSamplesByRange(allSamples);
    const deduped = dedupeByDevice(sanitizedSamples);

    let series = aggregateDaily(deduped);
    const rangeResult = applySanityRanges(series);
    series = rangeResult.series;
    const crossFieldResult = checkCrossFieldConsistency(series);
    series = crossFieldResult.series;

    const allWarningMessages = [
      ...warnings,
      ...rangeSampleWarnings.map((w) => w.message),
      ...rangeResult.warnings.map((w) => w.message),
      ...crossFieldResult.warnings.map((w) => w.message),
    ];

    const metricsWithEnoughData = Object.values(series).filter((points) => (points?.length ?? 0) >= MIN_DAYS_FOR_SUCCESS);
    if (metricsWithEnoughData.length === 0) {
      await markFailed(
        ddbClient,
        tableName,
        importId,
        'Não encontramos nenhuma métrica com pelo menos 7 dias de dados legíveis nos arquivos enviados. Verifique se os arquivos exportados são do Samsung Health e tente novamente.',
      );
      return;
    }

    const summary = buildAnalysisSummary(series, allWarningMessages);

    const bedrockOutcome = await requestInsights(summary, { modelId, guardrailId, guardrailVersion });
    if (!bedrockOutcome.ok) {
      await markFailed(ddbClient, tableName, importId, bedrockOutcome.message);
      return;
    }

    const guardrailResult = await applyOutputGuardrail(bedrockOutcome.result.insights, guardrailId, guardrailVersion);
    if (guardrailResult.blocked) {
      await markFailed(
        ddbClient,
        tableName,
        importId,
        'A análise gerada não pôde ser exibida por questões de segurança de conteúdo. Tente novamente.',
      );
      return;
    }

    const identityId = fileKeys[0] ? extractIdentityId(fileKeys[0]) : null;
    let resultArtifactKey: string | null = null;

    if (identityId) {
      resultArtifactKey = `health-imports/${identityId}/${importId}/result.json`;
      try {
        await writeJsonArtifact(bucketName, resultArtifactKey, {
          series,
          summary,
          insights: bedrockOutcome.result.insights,
        });
      } catch (error) {
        // O artefato de depuracao e um "nice to have" (LGPD/reanalise/debug)
        // -- uma falha ao grava-lo NAO deve derrubar a analise, que ja tem
        // tudo que o usuario precisa em metricsJson/insightsJson.
        console.error('Falha ao gravar result.json (nao fatal):', error);
        resultArtifactKey = null;
      }
    }

    await markReady(ddbClient, tableName, importId, {
      periodStart: summary.periodStart || null,
      periodEnd: summary.periodEnd || null,
      dayCount: summary.dayCount,
      metricsJson: JSON.stringify(summary),
      insightsJson: JSON.stringify(bedrockOutcome.result.insights),
      resultArtifactKey: resultArtifactKey ?? '',
      warnings: allWarningMessages,
      modelId: bedrockOutcome.result.modelId,
      inputTokens: bedrockOutcome.result.inputTokens,
      outputTokens: bedrockOutcome.result.outputTokens,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao processar a importação.';
    console.error(`Falha ao processar importacao ${importId}:`, error);

    try {
      await markFailed(ddbClient, tableName, importId, message);
    } catch (markFailedError) {
      console.error(`Falha ao marcar importacao ${importId} como FAILED:`, markFailedError);
    }
  }
}

import { strToU8, zipSync } from 'fflate';
import { handler } from '../handler';
import { markFailed, markReady, readImport } from '../importRepository';
import { readObjectBuffer } from '../s3Reader';
import { applyOutputGuardrail, requestInsights } from '../bedrockClient';

jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: jest.fn() }));
jest.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: jest.fn() } }));
jest.mock('../importRepository', () => ({
  readImport: jest.fn(),
  markReady: jest.fn(),
  markFailed: jest.fn(),
}));
jest.mock('../s3Reader', () => ({
  readObjectBuffer: jest.fn(),
  writeJsonArtifact: jest.fn(),
}));
jest.mock('../bedrockClient', () => ({
  requestInsights: jest.fn(),
  applyOutputGuardrail: jest.fn(),
}));

const FILE_KEY = 'health-imports/us-east-1:abc/imp-1/0-apple_health_export.zip';

function heartRateLine(day: number, value: number): string {
  const date = `2026-04-${String(day).padStart(2, '0')} 08:00:00 -0300`;
  return ` <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Watch" unit="count/min" creationDate="${date}" startDate="${date}" endDate="${date}" value="${value}"/>`;
}

describe('handler com export do app Saude', () => {
  beforeAll(() => {
    process.env.HEALTH_IMPORT_TABLE_NAME = 'tabela';
    process.env.HEALTH_BUCKET_NAME = 'bucket';
    process.env.BEDROCK_MODEL_ID = 'modelo';
    process.env.BEDROCK_GUARDRAIL_ID = 'guardrail';
    process.env.BEDROCK_GUARDRAIL_VERSION = '1';
  });

  it('chega ao READY com centenas de milhares de amostras (export real tem ~670 mil)', async () => {
    // 70 mil leituras de FC viram 210 mil amostras (media, minima e maxima):
    // acima do limite de argumentos de um push(...array).
    const lines = Array.from({ length: 70_000 }, (_, i) => heartRateLine((i % 10) + 1, 60 + (i % 40)));
    const zip = zipSync({ 'apple_health_export/export.xml': strToU8(`<HealthData>\n${lines.join('\n')}\n</HealthData>\n`) });

    jest.mocked(readImport).mockResolvedValue({ id: 'imp-1', fileKeys: [FILE_KEY] } as never);
    jest.mocked(readObjectBuffer).mockResolvedValue(Buffer.from(zip));
    jest.mocked(requestInsights).mockResolvedValue({
      ok: true,
      result: { insights: {}, modelId: 'modelo', inputTokens: 1, outputTokens: 1 },
    } as never);
    jest.mocked(applyOutputGuardrail).mockResolvedValue({ blocked: false });

    await handler({ importId: 'imp-1' });

    expect(markFailed).not.toHaveBeenCalled();
    expect(markReady).toHaveBeenCalledTimes(1);
  }, 30_000);
});

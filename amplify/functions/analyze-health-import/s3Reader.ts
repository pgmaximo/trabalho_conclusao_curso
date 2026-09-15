import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import * as readline from 'node:readline';

const s3Client = new S3Client({});

/**
 * Le um objeto do S3 inteiro como Buffer -- so para arquivos que sabemos ser
 * pequenos (o proprio ZIP, ja limitado a 100MB no cliente/Lambda A). NUNCA
 * usar para os CSVs individuais dentro do ZIP (alguns passam de 15MB) --
 * para esses, usar readLinesFromBuffer depois de descompactar em memoria via
 * archiveReader, que ja e a unica forma de ler dentro de um ZIP sem
 * reimplementar streaming de zip.
 */
export async function readObjectBuffer(bucket: string, key: string): Promise<Buffer> {
  const result = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

/**
 * Le um objeto de texto do S3 linha a linha via streaming (node:readline),
 * nunca materializando o arquivo inteiro como string -- decisivo para os
 * CSVs de ate ~18MB do export real (tracker_heart_rate, sleep_stage).
 */
export async function* readObjectLines(bucket: string, key: string): AsyncGenerator<string> {
  const result = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = result.Body as Readable;

  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    yield line;
  }
}

/** Grava um valor como JSON no S3 -- usado para o artefato de depuracao result.json. */
export async function writeJsonArtifact(bucket: string, key: string, value: unknown): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(value),
      ContentType: 'application/json',
    }),
  );
}

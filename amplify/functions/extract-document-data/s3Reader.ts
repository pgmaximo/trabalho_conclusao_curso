/**
 * Resumo do arquivo:
 * Baixa o arquivo do documento do bucket.
 *
 * O `contentType` continua devolvido, mas NAO decide mais a rota (Bloco 10):
 * medido, ele sai da extensao do nome, e o nome e escolhido pela pessoa. Quem
 * decide e a assinatura dos bytes, em `formatoDoArquivo.ts`.
 */
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ maxAttempts: 3 });

export type LoadedDocument = { bytes: Uint8Array; contentType: string };

export async function readDocument(bucket: string, key: string): Promise<LoadedDocument> {
  const resposta = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!resposta.Body) throw new Error(`Objeto vazio no S3: ${key}`);
  const bytes = await resposta.Body.transformToByteArray();
  return { bytes, contentType: resposta.ContentType ?? '' };
}

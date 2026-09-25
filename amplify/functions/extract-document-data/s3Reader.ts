/**
 * Resumo do arquivo:
 * Baixa o arquivo do documento do bucket.
 *
 * O `contentType` continua devolvido, mas NAO decide mais a rota (Bloco 10):
 * medido, ele sai da extensao do nome, e o nome e escolhido pela pessoa. Quem
 * decide e a assinatura dos bytes, em `formatoDoArquivo.ts`.
 *
 * Os `metadados` voltam na mesma resposta do `GetObject`, sem chamada a mais, e
 * sao o que `arquivoDoDono.ts` confere antes de os bytes seguirem (D46). Por
 * isso ninguem alem de `arquivoDoDono.ts` chama este leitor -- ha teste de
 * varredura para isso.
 */
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ maxAttempts: 3 });

export type LoadedDocument = {
  bytes: Uint8Array;
  contentType: string;
  /** Metadado de objeto, com as chaves em minusculas e sem `x-amz-meta-`. */
  metadados: Record<string, string>;
};

export async function readDocument(bucket: string, key: string): Promise<LoadedDocument> {
  const resposta = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!resposta.Body) throw new Error(`Objeto vazio no S3: ${key}`);
  const bytes = await resposta.Body.transformToByteArray();
  return { bytes, contentType: resposta.ContentType ?? '', metadados: resposta.Metadata ?? {} };
}

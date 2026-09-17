/**
 * Resumo do arquivo:
 * Baixa o arquivo do documento do bucket e devolve os bytes junto do tipo de
 * conteudo, que e o que decide a rota de leitura (ver textractClient.ts).
 *
 * O tipo vem do METADADO do objeto, nunca da extensao do nome: o nome do
 * arquivo e escolhido pelo usuario e pode mentir, e ler um arquivo pelo nome
 * errado e o tipo de engano que produz leitura plausivel de coisa errada.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ maxAttempts: 3 });

export type LoadedDocument = { bytes: Uint8Array; contentType: string };

export async function readDocument(bucket: string, key: string): Promise<LoadedDocument> {
  const resposta = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!resposta.Body) throw new Error(`Objeto vazio no S3: ${key}`);
  const bytes = await resposta.Body.transformToByteArray();
  return { bytes, contentType: resposta.ContentType ?? '' };
}

/**
 * Grava o texto do OCR de volta no bucket. E rastreabilidade, nao resultado:
 * quem chama trata falha aqui como nao fatal.
 *
 * ATENCAO: no caminho de PDF nativo (D19) NAO EXISTE texto de OCR para
 * gravar, porque nao ha OCR. `extractedTextKey` fica vazio nesse caminho, e a
 * rastreabilidade passa a ser `rawValue` e `rawUnit` por linha, que e o que
 * permite auditar de onde veio cada numero.
 */
export async function writeTextArtifact(
  bucket: string,
  key: string,
  text: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: text,
      ContentType: 'text/plain; charset=utf-8',
    }),
  );
}

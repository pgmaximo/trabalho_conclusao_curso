/**
 * Resumo do arquivo:
 * Leitura do conteudo do documento. Duas rotas, e qual delas vale foi MEDIDO
 * na tarefa 1 (D19), nao suposto:
 *
 *   - PDF  -> direto ao modelo, pelo bloco de documento do Converse. Medido
 *             contra laudo real: 41 analitos, virgula decimal e ponto de
 *             milhar preservados, sem OCR no caminho.
 *   - resto -> Textract, que e o que o bloco de documento nao aceita.
 *
 * ATENCAO: o modelo e bom transcritor e mau inventariante. Quatro execucoes
 * sobre o mesmo laudo com temperature 0 devolveram 47, 47, 42 e 47 linhas --
 * nenhum numero errado, mas cobertura instavel. Ver
 * estudos-ia/01-estudos/leitura-de-documento.md. Quem chama precisa expor a
 * contagem e permitir reprocessar; a idempotencia da tarefa 6 faz a segunda
 * passagem somar o que faltou em vez de duplicar o que ja existe.
 */
import {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  type Block,
} from '@aws-sdk/client-textract';

import { blocksToExtractedText, chooseReadingPath, type ExtractedText } from './documentText';

export type { ExtractedText, ReadingPath } from './documentText';
export { blocksToExtractedText, chooseReadingPath } from './documentText';

const textract = new TextractClient({ maxAttempts: 5, retryMode: 'adaptive' });

const ESPERA_INICIAL_MS = 2_000;
const ESPERA_MAXIMA_MS = 15_000;
const TETO_DE_ESPERA_MS = 5 * 60 * 1_000; // cabe dentro dos 10 min da Lambda

export async function extractText(
  bucket: string,
  key: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<ExtractedText> {
  // Imagem sempre cabe na chamada sincrona e responde em segundos.
  if (chooseReadingPath(contentType) === 'textract-sincrono') {
    const resposta = await textract.send(
      new DetectDocumentTextCommand({ Document: { Bytes: bytes } }),
    );
    return blocksToExtractedText(resposta.Blocks ?? []);
  }
  return blocksToExtractedText(await detectarPdfAssincrono(bucket, key));
}

/**
 * Caminho assincrono do Textract. NAO e o caminho normal desta pipeline desde
 * a D19 -- o PDF vai direto ao modelo. Ele fica porque continua sendo a unica
 * forma de ler um PDF escaneado de varias paginas se a leitura por modelo
 * falhar, e porque as operacoes SINCRONAS do Textract processam uma pagina so.
 */
async function detectarPdfAssincrono(bucket: string, key: string): Promise<Block[]> {
  const inicio = await textract.send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
    }),
  );
  const jobId = inicio.JobId;
  if (!jobId) throw new Error('Textract nao devolveu identificador de trabalho.');

  const comecou = Date.now();
  let espera = ESPERA_INICIAL_MS;

  for (;;) {
    await new Promise((r) => setTimeout(r, espera));
    const parcial = await textract.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));

    if (parcial.JobStatus === 'SUCCEEDED') {
      // A primeira resposta ja traz blocos; o resto vem paginado. Sem paginar
      // ate o fim, um laudo longo perde as paginas de tras SEM levantar erro
      // -- e as de tras sao onde ficam os analitos menos comuns.
      const blocos: Block[] = [...(parcial.Blocks ?? [])];
      let cursor = parcial.NextToken;
      while (cursor) {
        const pagina = await textract.send(
          new GetDocumentTextDetectionCommand({ JobId: jobId, NextToken: cursor }),
        );
        blocos.push(...(pagina.Blocks ?? []));
        cursor = pagina.NextToken;
      }
      return blocos;
    }
    if (parcial.JobStatus === 'FAILED') {
      throw new Error(`Textract recusou o documento: ${parcial.StatusMessage ?? 'sem detalhe'}`);
    }
    // Teto de cinco minutos, metade do teto da funcao, deixando espaco para a
    // chamada ao modelo e a tentativa de reparo.
    if (Date.now() - comecou > TETO_DE_ESPERA_MS) {
      throw new Error('Textract passou do tempo previsto para este documento.');
    }
    // A espera cresce: consultar de meio em meio segundo um trabalho de um
    // minuto e chamada desperdicada e conta para o limite do servico.
    espera = Math.min(espera * 2, ESPERA_MAXIMA_MS);
  }
}

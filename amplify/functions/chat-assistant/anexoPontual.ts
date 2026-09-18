/**
 * Resumo do arquivo:
 * O anexo pontual (D15). Ele NAO extrai, NAO normaliza e NAO grava: le o
 * documento e entrega o conteudo ao modelo NAQUELA conversa.
 *
 * E a diferenca entre "me explica este papel aqui", que e o chat, e "quero que
 * este exame faca parte do meu historico", que e a tela de exames. As duas
 * portas continuam existindo, e o botao que leva a `/add-exam` nao some.
 *
 * A ROTA e a mesma da Fase 1, e ela e CONSULTADA aqui em vez de presumida:
 *
 *   - PDF   -> os bytes vao direto ao modelo (D19). Sem OCR no caminho.
 *   - resto -> `extractText`, que para estes tipos usa o Textract SINCRONO.
 *
 * Presumir custou caro uma vez. Chamar `extractText` para tudo mandava o PDF
 * para o caminho ASSINCRONO do Textract -- o oposto da D19, e uma chamada que
 * a politica do `chatAssistantLambda` recusa de proposito, porque o teto de
 * cinco minutos daquele caminho nao cabe dentro de um turno de conversa.
 *
 * REUSA `extract-document-data`, e isso e verificado por teste. Uma segunda
 * implementacao de leitura divergiria da primeira em silencio, e a divergencia
 * apareceria para a pessoa como o mesmo papel lido de dois jeitos.
 */
import { chooseReadingPath } from '../extract-document-data/documentText';
import { readDocument } from '../extract-document-data/s3Reader';
import { extractText } from '../extract-document-data/textractClient';

import type { ChatIdentity } from './auth';
import type { AnexoLido } from './types';

/**
 * Teto do texto que entra na conversa. Um laudo de dez paginas cabe folgado;
 * o teto existe para que um documento enorme nao consuma a janela inteira do
 * modelo e empurre para fora o historico e os resultados das ferramentas.
 */
const MAX_CARACTERES = 20_000;

/**
 * Teto dos bytes do PDF, que e o limite do bloco de documento do Converse.
 * Passar disso nao e "quase funciona": o servico recusa a requisicao inteira,
 * e com ela a pergunta da pessoa.
 */
export const MAX_BYTES_PDF = 4_500_000;

/**
 * A pasta do anexo carrega o identityId de quem subiu, e a chave precisa
 * comecar por ela. Sem essa conferencia, uma chave arbitraria no corpo da
 * requisicao leria o arquivo de outra pessoa -- a mesma classe de falha que o
 * `auth.ts` fecha para o dono dos dados.
 *
 * O identityId NAO e o `owner`: ele e o identificador do Cognito Identity Pool
 * que o Amplify Storage usa nos caminhos. Como a funcao so tem o `sub`, a
 * conferencia possivel aqui e de FORMA -- o prefixo certo e um unico segmento
 * de pasta -- e o fechamento de verdade e a politica do bucket, que so concede
 * leitura sob `chat-attachments/`.
 */
const PREFIXO = 'chat-attachments/';

export function chaveDeAnexoValida(key: string): boolean {
  if (!key.startsWith(PREFIXO)) return false;
  const resto = key.slice(PREFIXO.length);
  const partes = resto.split('/');
  // Exatamente `chat-attachments/{identityId}/{arquivo}`, sem subir de pasta.
  return partes.length === 2 && partes[0] !== '' && partes[1] !== '' && !resto.includes('..');
}

export type AnexoDoChat = { key: string };

/**
 * Le o anexo e devolve o que vai para a conversa. NUNCA lanca: um anexo
 * ilegivel nao pode derrubar o turno -- a pergunta da pessoa continua valendo
 * sem ele, e o modelo responde com o que tiver.
 */
export async function lerAnexo(
  anexo: AnexoDoChat | null | undefined,
  _identity: ChatIdentity,
): Promise<AnexoLido | null> {
  if (!anexo?.key || !chaveDeAnexoValida(anexo.key)) return null;

  const bucket = process.env.HEALTH_BUCKET_NAME;
  if (!bucket) return null;

  try {
    const { bytes, contentType } = await readDocument(bucket, anexo.key);

    if (chooseReadingPath(contentType) === 'modelo-direto') {
      // Grande demais e AUSENCIA, e nao motivo para cair no OCR: o caminho
      // assincrono esta fora por politica e por tempo, e o sincrono le uma
      // pagina so -- devolveria a primeira folha como se fosse o laudo.
      if (bytes.byteLength > MAX_BYTES_PDF) {
        console.error('Anexo da conversa maior que o bloco de documento aceita:', bytes.byteLength);
        return null;
      }
      return { kind: 'pdf', bytes };
    }

    const ocr = await extractText(bucket, anexo.key, contentType, bytes);
    const texto = ocr.fullText.trim();
    return texto === '' ? null : { kind: 'texto', texto: texto.slice(0, MAX_CARACTERES) };
  } catch (erro) {
    console.error('Nao foi possivel ler o anexo da conversa:', erro);
    return null;
  }
}

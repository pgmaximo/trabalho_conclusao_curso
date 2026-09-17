/**
 * Resumo do arquivo:
 * O anexo pontual (D15). Ele NAO extrai, NAO normaliza e NAO grava: passa o
 * documento pelo OCR da Fase 1 e entrega o texto ao modelo NAQUELA conversa.
 *
 * E a diferenca entre "me explica este papel aqui", que e o chat, e "quero que
 * este exame faca parte do meu historico", que e a tela de exames. As duas
 * portas continuam existindo, e o botao que leva a `/add-exam` nao some.
 *
 * REUSA `extract-document-data/textractClient`, e isso e verificado por teste.
 * Uma segunda implementacao de OCR divergiria da primeira em silencio, e a
 * divergencia apareceria para a pessoa como o mesmo papel lido de dois jeitos.
 */
import { readDocument } from '../extract-document-data/s3Reader';
import { extractText } from '../extract-document-data/textractClient';

import type { ChatIdentity } from './auth';

/**
 * Teto do texto que entra na conversa. Um laudo de dez paginas cabe folgado;
 * o teto existe para que um PDF enorme nao consuma a janela inteira do modelo
 * e empurre para fora o historico e os resultados das ferramentas.
 */
const MAX_CARACTERES = 20_000;

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
 * Le o anexo e devolve o texto. NUNCA lanca: um anexo ilegivel nao pode
 * derrubar o turno -- a pergunta da pessoa continua valendo sem ele, e o
 * modelo responde com o que tiver.
 */
export async function textoDoAnexo(
  anexo: AnexoDoChat | null | undefined,
  _identity: ChatIdentity,
): Promise<string | null> {
  if (!anexo?.key || !chaveDeAnexoValida(anexo.key)) return null;

  const bucket = process.env.HEALTH_BUCKET_NAME;
  if (!bucket) return null;

  try {
    const { bytes, contentType } = await readDocument(bucket, anexo.key);
    const ocr = await extractText(bucket, anexo.key, contentType, bytes);
    const texto = ocr.fullText.trim();
    return texto === '' ? null : texto.slice(0, MAX_CARACTERES);
  } catch (erro) {
    console.error('Nao foi possivel ler o anexo da conversa:', erro);
    return null;
  }
}

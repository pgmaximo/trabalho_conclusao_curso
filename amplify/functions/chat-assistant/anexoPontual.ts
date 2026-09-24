/**
 * Resumo do arquivo:
 * O anexo pontual (D15). Ele NAO extrai, NAO normaliza e NAO grava: le o
 * documento e entrega o conteudo ao modelo NAQUELA conversa.
 *
 * E a diferenca entre "me explica este papel aqui", que e o chat, e "quero que
 * este exame faca parte do meu historico", que e a tela de exames. As duas
 * portas continuam existindo, e o botao que leva a `/add-exam` nao some.
 *
 * A ROTA e a mesma da Fase 1, e ela sai dos BYTES (Bloco 10):
 *
 *   - PDF    -> bloco de documento (D19).
 *   - imagem -> bloco de imagem. Ate o Bloco 10 a foto ia ao Textract, que a
 *               conta recusa no nivel da conta; o anexo voltava `null` e sumia
 *               da conversa sem aviso. A visao do modelo foi medida antes de
 *               ser ligada (spec do Bloco 10, secao 2).
 *   - resto  -> ausencia. O modelo nunca recebe bytes de formato desconhecido.
 *
 * REUSA a decisao de formato de `extract-document-data`, e isso e verificado
 * por teste. Uma segunda
 * implementacao de leitura divergiria da primeira em silencio, e a divergencia
 * apareceria para a pessoa como o mesmo papel lido de dois jeitos.
 */
import { avaliarArquivo } from '../extract-document-data/formatoDoArquivo';
import { readDocument } from '../extract-document-data/s3Reader';

import type { ChatIdentity } from './auth';
import type { AnexoLido } from './types';

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
    const { bytes } = await readDocument(bucket, anexo.key);

    // Formato e tamanho saem da MESMA funcao que decide a extracao. Grande
    // demais e ausencia, e nao motivo para derrubar a pergunta.
    const arquivo = avaliarArquivo(bytes);
    if (!arquivo.ok) {
      console.error('Anexo da conversa recusado antes do modelo:', arquivo.motivo);
      return null;
    }
    return arquivo.formato.tipo === 'pdf'
      ? { kind: 'pdf', bytes }
      : { kind: 'imagem', formato: arquivo.formato.formato, bytes };
  } catch (erro) {
    console.error('Nao foi possivel ler o anexo da conversa:', erro);
    return null;
  }
}

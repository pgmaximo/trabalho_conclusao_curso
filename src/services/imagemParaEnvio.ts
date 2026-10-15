/**
 * Resumo do arquivo:
 * Prepara a foto antes de subir: reduz a 2000 px no maior lado e converte em
 * JPEG 0,85 (G2 do Bloco 10, Decisoes G e H).
 *
 * Por que existe: o bloco de imagem do Converse aceita ate 3,75 MB, e a foto de
 * 12 MP que a camera entrega com `quality: 0.8` fica tipicamente entre 2 e 5 MB.
 * Sem este passo, metade das fotos de laudo seria recusada pelo servico -- e a
 * pessoa gastaria dado movel subindo um arquivo que nunca seria lido.
 *
 * Por que JPEG SEMPRE, mesmo quando a imagem ja cabe: HEIC do iPhone nao e um
 * formato que o bloco de imagem aceita, e o PNG de uma pagina de laudo fica
 * maior que o JPEG equivalente sem ganhar legibilidade.
 *
 * O arquivo guardado E o preparado: a foto e o documento da pessoa, e 2000 px
 * foi escolhido para ela conseguir le-la depois, nao so o modelo (Decisao H).
 *
 * As partes puras (`ladoDeRedimensionamento`, `ehImagem`, `nomeDeEnvio`) ficam
 * separadas da borda (`prepararArquivoParaEnvio`) pelo mesmo motivo de sempre:
 * decisao testada sem o modulo nativo.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

export const LADO_MAXIMO = 2000;
export const QUALIDADE_JPEG = 0.85;

export type ArquivoParaEnvio = { filePath: string; fileName: string; fileSize: number };

const EXTENSOES_DE_IMAGEM = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

function extensao(nome: string): string | null {
  const ponto = nome.lastIndexOf('.');
  return ponto > 0 ? nome.slice(ponto + 1).toLowerCase() : null;
}

export function ehImagem(nome: string): boolean {
  const ext = extensao(nome);
  return ext !== null && EXTENSOES_DE_IMAGEM.has(ext);
}

/** O arquivo enviado e JPEG, entao o nome termina em `.jpg`. O backend decide
 *  pelos bytes, mas o nome ainda e o que a pessoa ve na lista de documentos. */
export function nomeDeEnvio(nome: string): string {
  const ponto = nome.lastIndexOf('.');
  return `${ponto > 0 ? nome.slice(0, ponto) : nome}.jpg`;
}

/**
 * Qual lado reduzir, ou nulo se a imagem ja cabe. So UM lado vai ao
 * manipulador: ele preserva a proporcao sozinho, e passar os dois deformaria a
 * pagina. Nunca amplia -- ampliar nao acrescenta nitidez e so aumenta o arquivo.
 */
export function ladoDeRedimensionamento(
  largura: number,
  altura: number,
  maximo = LADO_MAXIMO,
): { width: number } | { height: number } | null {
  if (Math.max(largura, altura) <= maximo) return null;
  return largura >= altura ? { width: maximo } : { height: maximo };
}

export async function prepararArquivoParaEnvio(
  arquivo: ArquivoParaEnvio,
): Promise<ArquivoParaEnvio> {
  if (!ehImagem(arquivo.fileName)) return arquivo;

  const contexto = ImageManipulator.manipulate(arquivo.filePath);
  const original = await contexto.renderAsync();
  const lado = ladoDeRedimensionamento(original.width, original.height);

  const pronta = lado ? await contexto.resize(lado).renderAsync() : original;
  const salvo = await pronta.saveAsync({ compress: QUALIDADE_JPEG, format: SaveFormat.JPEG });

  return {
    filePath: salvo.uri,
    fileName: nomeDeEnvio(arquivo.fileName),
    // O tamanho validado e o do arquivo que SOBE. Uma foto de 12 MB que vira
    // 500 KB nao pode ser recusada pelo teto de 10 MB do formulario.
    fileSize: new File(salvo.uri).size,
  };
}

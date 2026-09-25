/**
 * Resumo do arquivo:
 * Qual formato este arquivo E, lido da assinatura dos bytes -- e se ele cabe no
 * bloco do Converse que vai carrega-lo.
 *
 * Substitui a escolha de rota pelo `ContentType` (a antiga `chooseReadingPath`).
 * O `ContentType` do objeto sai da EXTENSAO do nome -- medido em 2026-09-22: o
 * Amplify Storage o infere pela extensao da chave quando o upload nao informa --,
 * e o nome e escolhido pela pessoa. A assinatura nao depende de ninguem.
 *
 * Quatro formatos de imagem e nenhum outro, porque sao os quatro que o
 * `ImageBlock` do Converse aceita. HEIC, TIFF e BMP nao chegam ao modelo: o
 * aplicativo converte a foto em JPEG antes de subir (Decisao G), e o que
 * escapar disso e recusado aqui com motivo, SEM chamar o modelo.
 *
 * Modulo PURO: sem AWS, sem I/O.
 */

export type FormatoDeImagem = 'jpeg' | 'png' | 'webp' | 'gif';

export type FormatoDoArquivo = { tipo: 'pdf' } | { tipo: 'imagem'; formato: FormatoDeImagem };

/** Teto do bloco de documento do Converse. Passar dele nao e "quase funciona":
 *  o servico recusa a requisicao inteira. */
export const TETO_PDF_BYTES = 4_500_000;

/** Teto do bloco de imagem do Converse (3,75 MB). A foto que o aplicativo
 *  encolhe fica tipicamente entre 300 e 700 KB -- este teto e a segunda
 *  camada, para o arquivo que chegou por outro caminho. */
export const TETO_IMAGEM_BYTES = 3_750_000;

function comecaCom(bytes: Uint8Array, assinatura: number[], deslocamento = 0): boolean {
  if (bytes.length < deslocamento + assinatura.length) return false;
  return assinatura.every((b, i) => bytes[deslocamento + i] === b);
}

const ascii = (texto: string): number[] => [...texto].map((c) => c.charCodeAt(0));

export function detectarFormato(bytes: Uint8Array): FormatoDoArquivo | null {
  if (comecaCom(bytes, ascii('%PDF-'))) return { tipo: 'pdf' };
  if (comecaCom(bytes, [0xff, 0xd8, 0xff])) return { tipo: 'imagem', formato: 'jpeg' };
  if (comecaCom(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { tipo: 'imagem', formato: 'png' };
  }
  // RIFF e um envelope: WAV e AVI tambem comecam assim. O que diz WebP e o
  // tipo nos bytes 8 a 11.
  if (comecaCom(bytes, ascii('RIFF')) && comecaCom(bytes, ascii('WEBP'), 8)) {
    return { tipo: 'imagem', formato: 'webp' };
  }
  if (comecaCom(bytes, ascii('GIF87a')) || comecaCom(bytes, ascii('GIF89a'))) {
    return { tipo: 'imagem', formato: 'gif' };
  }
  return null;
}

export type AvaliacaoDoArquivo =
  | { ok: true; formato: FormatoDoArquivo }
  | { ok: false; motivo: 'formato-nao-suportado' | 'grande-demais' };

/**
 * A decisao inteira antes de qualquer chamada ao modelo: que formato e, e se
 * cabe. Recusar aqui custa zero token; deixar o Converse recusar custa a
 * chamada e devolve uma mensagem em ingles.
 */
export function avaliarArquivo(bytes: Uint8Array): AvaliacaoDoArquivo {
  const formato = detectarFormato(bytes);
  if (!formato) return { ok: false, motivo: 'formato-nao-suportado' };
  const teto = formato.tipo === 'pdf' ? TETO_PDF_BYTES : TETO_IMAGEM_BYTES;
  if (bytes.byteLength > teto) return { ok: false, motivo: 'grande-demais' };
  return { ok: true, formato };
}

/**
 * O teto do PDF que a EXTRACAO aceita dividindo em partes (Bloco 11, E5). E o
 * teto do aplicativo (`MAX_FILE_SIZE_BYTES` em examService): o PDF entre 4,5 e
 * 10 MB subia e falhava aqui. Acima disto nem o aplicativo deixa subir.
 */
export const TETO_PDF_DIVIDIDO_BYTES = 10 * 1024 * 1024;

/**
 * O PDF que nao cabe num bloco, e cabe dividido. `avaliarArquivo` continua
 * dizendo "grande demais" para ele de proposito: o anexo do chat usa a mesma
 * funcao e manda o arquivo num bloco so.
 */
export function pdfDivisivel(bytes: Uint8Array): boolean {
  return detectarFormato(bytes)?.tipo === 'pdf' && bytes.byteLength <= TETO_PDF_DIVIDIDO_BYTES;
}

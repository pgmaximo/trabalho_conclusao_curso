/**
 * G1 -- a rota de leitura decidida pelos BYTES.
 *
 * Ate o Bloco 10 a rota saia do `ContentType` do objeto, e o `ContentType` sai
 * da EXTENSAO do nome (medido: o Amplify Storage o infere pela extensao da
 * chave quando o upload nao informa). O nome e escolhido pela pessoa. Um `.jpg`
 * que e PNG chegaria ao Bedrock declarado como JPEG, e a recusa por formato
 * divergente pareceria defeito do sistema.
 *
 * A assinatura do arquivo nao depende de ninguem.
 */
import {
  TETO_IMAGEM_BYTES,
  TETO_PDF_BYTES,
  TETO_PDF_DIVIDIDO_BYTES,
  pdfDivisivel,
  avaliarArquivo,
  detectarFormato,
} from '../formatoDoArquivo';

const bytes = (...valores: number[]) => new Uint8Array([...valores, 0, 0, 0, 0, 0, 0, 0, 0]);
const ascii = (texto: string) => [...texto].map((c) => c.charCodeAt(0));

const PDF = bytes(...ascii('%PDF-1.7'));
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = bytes(...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBP'));
const GIF = bytes(...ascii('GIF89a'));

describe('detectarFormato', () => {
  it('reconhece PDF', () => {
    expect(detectarFormato(PDF)).toEqual({ tipo: 'pdf' });
  });

  it('reconhece as quatro imagens que o bloco de imagem do Converse aceita', () => {
    expect(detectarFormato(JPEG)).toEqual({ tipo: 'imagem', formato: 'jpeg' });
    expect(detectarFormato(PNG)).toEqual({ tipo: 'imagem', formato: 'png' });
    expect(detectarFormato(WEBP)).toEqual({ tipo: 'imagem', formato: 'webp' });
    expect(detectarFormato(GIF)).toEqual({ tipo: 'imagem', formato: 'gif' });
  });

  it('RIFF que nao e WebP nao e imagem -- WAV e AVI tambem comecam com RIFF', () => {
    const wav = bytes(...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WAVE'));
    expect(detectarFormato(wav)).toBeNull();
  });

  it('devolve nulo para o que nao e PDF nem imagem suportada', () => {
    // HEIC chega aqui so se o aplicativo falhar em converter -- e nesse caso a
    // resposta certa e recusar com motivo, nao mandar ao modelo.
    const heic = bytes(0x00, 0x00, 0x00, 0x18, ...ascii('ftypheic'));
    expect(detectarFormato(heic)).toBeNull();
    expect(detectarFormato(bytes(...ascii('PK')))).toBeNull(); // zip, docx
    expect(detectarFormato(new Uint8Array())).toBeNull();
  });
});

describe('avaliarArquivo', () => {
  it('o formato vem dos bytes: um PNG chamado de JPEG e lido como PNG', () => {
    // A funcao nem recebe o tipo declarado. Nao ha como ele vencer.
    expect(avaliarArquivo(PNG)).toEqual({ ok: true, formato: { tipo: 'imagem', formato: 'png' } });
  });

  it('recusa formato nao suportado com o motivo, sem chamar ninguem', () => {
    expect(avaliarArquivo(bytes(...ascii('PK')))).toEqual({
      ok: false,
      motivo: 'formato-nao-suportado',
    });
  });

  it('recusa imagem acima do teto do bloco de imagem', () => {
    const grande = new Uint8Array(TETO_IMAGEM_BYTES + 1);
    grande.set([0xff, 0xd8, 0xff]);
    expect(avaliarArquivo(grande)).toEqual({ ok: false, motivo: 'grande-demais' });
  });

  it('aceita imagem exatamente no teto', () => {
    const noTeto = new Uint8Array(TETO_IMAGEM_BYTES);
    noTeto.set([0xff, 0xd8, 0xff]);
    expect(avaliarArquivo(noTeto).ok).toBe(true);
  });

  it('o teto do PDF e outro, e maior', () => {
    // O PDF entre os dois tetos passa; a imagem do mesmo tamanho nao.
    const tamanho = TETO_IMAGEM_BYTES + 10;
    expect(tamanho).toBeLessThan(TETO_PDF_BYTES);
    const pdf = new Uint8Array(tamanho);
    pdf.set(ascii('%PDF-'));
    expect(avaliarArquivo(pdf).ok).toBe(true);

    const pdfGrande = new Uint8Array(TETO_PDF_BYTES + 1);
    pdfGrande.set(ascii('%PDF-'));
    expect(avaliarArquivo(pdfGrande)).toEqual({ ok: false, motivo: 'grande-demais' });
  });
});

describe('pdfDivisivel -- o PDF grande demais para um bloco, que cabe dividido (Bloco 11)', () => {
  const pdfDe = (tamanho: number) => {
    const b = new Uint8Array(tamanho);
    b.set(ascii('%PDF-'));
    return b;
  };

  it('o teto dividido e o do aplicativo, e maior que o do bloco', () => {
    expect(TETO_PDF_DIVIDIDO_BYTES).toBe(10 * 1024 * 1024);
    expect(TETO_PDF_DIVIDIDO_BYTES).toBeGreaterThan(TETO_PDF_BYTES);
  });

  it('PDF entre os dois tetos e divisivel', () => {
    expect(pdfDivisivel(pdfDe(TETO_PDF_BYTES + 1))).toBe(true);
    expect(pdfDivisivel(pdfDe(TETO_PDF_DIVIDIDO_BYTES))).toBe(true);
  });

  it('acima do teto do aplicativo, nao', () => {
    expect(pdfDivisivel(pdfDe(TETO_PDF_DIVIDIDO_BYTES + 1))).toBe(false);
  });

  it('imagem grande nao e PDF, e nao se divide', () => {
    const imagem = new Uint8Array(TETO_PDF_BYTES + 1);
    imagem.set([0xff, 0xd8, 0xff]);
    expect(pdfDivisivel(imagem)).toBe(false);
  });

  it('avaliarArquivo NAO muda: o anexo do chat continua cabendo num bloco so', () => {
    expect(avaliarArquivo(pdfDe(TETO_PDF_BYTES + 1))).toEqual({ ok: false, motivo: 'grande-demais' });
  });
});

/**
 * Bloco 11 -- o PDF grande e dividido (E5, Decisao N1).
 *
 * O bloco de documento do Converse aceita ate 4,5 MB, e o aplicativo aceita
 * ate 10 MB. O PDF digitalizado de 3 a 6 paginas passa do primeiro com
 * frequencia, e falhava no servidor com "grande demais".
 *
 * Os PDFs destes testes sao GERADOS aqui, com paginas de tamanhos conhecidos,
 * e o teto e pequeno de proposito: o que se testa e a regra de divisao, que
 * nao depende de quantos megabytes sao.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { dividirPdf } from '../divisaoDoPdf';

/** Um PDF com uma pagina por item; cada item diz quantas linhas de texto a
 *  pagina leva -- e o que controla o tamanho dela. */
async function pdfCom(linhasPorPagina: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  linhasPorPagina.forEach((linhas, i) => {
    const pagina = doc.addPage([595, 842]);
    pagina.drawText(`Pagina ${i + 1}`, { x: 40, y: 800, size: 14, font: fonte });
    for (let l = 0; l < linhas; l++) {
      pagina.drawText(`Linha ${l} da pagina ${i + 1} com algum texto para ocupar espaco`, {
        x: 40,
        y: 780 - (l % 70) * 11,
        size: 8,
        font: fonte,
      });
    }
  });
  return doc.save();
}

async function paginasDe(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe('dividirPdf', () => {
  it('PDF que cabe sai inteiro, numa parte so, com os MESMOS bytes', async () => {
    const pdf = await pdfCom([5, 5, 5]);
    const r = await dividirPdf(pdf, pdf.byteLength + 1);
    expect(r).toEqual({ ok: true, partes: [{ bytes: pdf, primeiraPagina: 1, ultimaPagina: 3 }] });
  });

  it('PDF que nao cabe e dividido em partes que cabem, contiguas e em ordem', async () => {
    const pdf = await pdfCom([200, 200, 200, 200, 200, 200]);
    const teto = Math.ceil(pdf.byteLength / 2);
    const r = await dividirPdf(pdf, teto);
    if (!r.ok) throw new Error('esperava divisao');

    expect(r.partes.length).toBeGreaterThan(1);
    let proxima = 1;
    for (const parte of r.partes) {
      expect(parte.bytes.byteLength).toBeLessThanOrEqual(teto);
      expect(parte.primeiraPagina).toBe(proxima);
      expect(await paginasDe(parte.bytes)).toBe(parte.ultimaPagina - parte.primeiraPagina + 1);
      proxima = parte.ultimaPagina + 1;
    }
    expect(proxima).toBe(7);
  });

  it('pagina pesada fica sozinha, e as leves se juntam', async () => {
    // Uma pagina de digitalizacao no meio de paginas de texto. O teto e o da
    // pesada com uma folga menor que uma pagina leve: ela nao cabe com vizinha
    // nenhuma, e as leves cabem juntas. A primeira versao deste teste dava
    // folga de 3 KB -- o PDF inteiro cabia, nada era dividido, e a assercao
    // passava sem testar coisa alguma.
    const pdf = await pdfCom([2, 2, 2, 600, 2, 2]);
    const soAPesada = await pdfCom([600]);
    const teto = soAPesada.byteLength + 100;
    expect(pdf.byteLength).toBeGreaterThan(teto);

    const r = await dividirPdf(pdf, teto);
    if (!r.ok) throw new Error('esperava divisao');
    expect(r.partes.map((p) => [p.primeiraPagina, p.ultimaPagina])).toEqual([
      [1, 3],
      [4, 4],
      [5, 6],
    ]);
  });

  it('uma pagina sozinha acima do teto e grande demais -- nao ha como ler por este caminho', async () => {
    const pdf = await pdfCom([400, 1]);
    const r = await dividirPdf(pdf, 2000);
    expect(r).toEqual({ ok: false, motivo: 'grande-demais' });
  });

  it('PDF que nao abre e leitura-falhou, e nao excecao', async () => {
    const lixo = new TextEncoder().encode('%PDF-1.7\nisto nao e um pdf de verdade');
    const r = await dividirPdf(lixo, 10);
    expect(r).toEqual({ ok: false, motivo: 'leitura-falhou' });
  });
});

/**
 * Resumo do arquivo:
 * Divide um PDF grande demais para o bloco de documento do Converse em partes
 * de paginas CONTIGUAS que caibam (Bloco 11, E5, Decisao N1).
 *
 * Metades sucessivas: a faixa inteira cabe, vira uma parte; nao cabe, divide ao
 * meio e tenta cada metade. Parte o menor numero de vezes que o tamanho
 * permite, e uma pagina pesada (a digitalizada no meio de paginas de texto) nao
 * obriga a picotar as leves uma a uma.
 *
 * Por que partes contiguas, e nao "o maior pacote que couber": o modelo le cada
 * parte sozinho, e o resultado de uma pagina costuma depender da vizinha (o
 * cabecalho de coleta esta na primeira folha, o valor na segunda). Manter as
 * paginas em ordem e juntas o quanto der e o que menos quebra esse contexto.
 *
 * Sem AWS: so `pdf-lib`, que e JavaScript puro (plan.md, regra 3).
 */
import { PDFDocument } from 'pdf-lib';

/** Paginas numeradas a partir de 1, como o `sourcePage` do schema. */
export type ParteDoPdf = { bytes: Uint8Array; primeiraPagina: number; ultimaPagina: number };

export type DivisaoDoPdf =
  | { ok: true; partes: ParteDoPdf[] }
  | { ok: false; motivo: 'grande-demais' | 'leitura-falhou' };

const GRANDE_DEMAIS = Symbol('grande-demais');

/** A faixa [inicio, fim] (base 0, inclusiva) como um PDF proprio. */
async function faixaComoPdf(origem: PDFDocument, inicio: number, fim: number): Promise<Uint8Array> {
  const destino = await PDFDocument.create();
  const indices = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  for (const pagina of await destino.copyPages(origem, indices)) destino.addPage(pagina);
  return destino.save();
}

async function dividirFaixa(
  origem: PDFDocument,
  inicio: number,
  fim: number,
  teto: number,
): Promise<ParteDoPdf[] | typeof GRANDE_DEMAIS> {
  const bytes = await faixaComoPdf(origem, inicio, fim);
  if (bytes.byteLength <= teto) {
    return [{ bytes, primeiraPagina: inicio + 1, ultimaPagina: fim + 1 }];
  }
  // Uma pagina sozinha que nao cabe nao tem como ser lida por este caminho.
  if (inicio === fim) return GRANDE_DEMAIS;

  const meio = Math.floor((inicio + fim) / 2);
  const esquerda = await dividirFaixa(origem, inicio, meio, teto);
  if (esquerda === GRANDE_DEMAIS) return GRANDE_DEMAIS;
  const direita = await dividirFaixa(origem, meio + 1, fim, teto);
  if (direita === GRANDE_DEMAIS) return GRANDE_DEMAIS;
  return [...esquerda, ...direita];
}

/**
 * As metades nao sabem onde a pagina pesada esta: [4..6] vira [4..5] e [6], e
 * se a 4 for a pesada, a 5 fica sozinha ao lado de uma 6 com que caberia
 * (medido no teste). Uma passada juntando vizinhas enquanto couberem desfaz
 * isso -- cada parte a menos e uma chamada ao modelo a menos, e mais contexto
 * dentro de cada uma.
 */
async function juntarVizinhas(
  origem: PDFDocument,
  partes: ParteDoPdf[],
  teto: number,
): Promise<ParteDoPdf[]> {
  const juntas: ParteDoPdf[] = [];
  for (const parte of partes) {
    const anterior = juntas[juntas.length - 1];
    if (anterior) {
      const bytes = await faixaComoPdf(origem, anterior.primeiraPagina - 1, parte.ultimaPagina - 1);
      if (bytes.byteLength <= teto) {
        juntas[juntas.length - 1] = {
          bytes,
          primeiraPagina: anterior.primeiraPagina,
          ultimaPagina: parte.ultimaPagina,
        };
        continue;
      }
    }
    juntas.push(parte);
  }
  return juntas;
}

export async function dividirPdf(bytes: Uint8Array, teto: number): Promise<DivisaoDoPdf> {
  let origem: PDFDocument;
  let total: number;
  try {
    // `ignoreEncryption`: PDF com senha de DONO (so impede editar) e comum em
    // laudo, e abre para leitura. O que nao abrir de jeito nenhum cai no catch.
    origem = await PDFDocument.load(bytes, { ignoreEncryption: true });
    // DENTRO do try: o pdf-lib "abre" um arquivo quebrado sem reclamar, e so
    // falha quando alguem pede as paginas (medido no teste do PDF de lixo).
    total = origem.getPageCount();
  } catch {
    return { ok: false, motivo: 'leitura-falhou' };
  }
  if (total === 0) return { ok: false, motivo: 'leitura-falhou' };

  // O que ja cabe vai como veio: regravar pelo pdf-lib mudaria os bytes sem
  // necessidade, e os bytes originais sao os que a soma do arquivo descreve.
  if (bytes.byteLength <= teto) {
    return { ok: true, partes: [{ bytes, primeiraPagina: 1, ultimaPagina: total }] };
  }

  try {
    const partes = await dividirFaixa(origem, 0, total - 1, teto);
    if (partes === GRANDE_DEMAIS) return { ok: false, motivo: 'grande-demais' };
    return { ok: true, partes: await juntarVizinhas(origem, partes, teto) };
  } catch {
    return { ok: false, motivo: 'leitura-falhou' };
  }
}

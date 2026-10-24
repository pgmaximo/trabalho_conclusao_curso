/**
 * Resumo do arquivo:
 * O criador de .zip sem dependencia (scripts/site-publico/zip.mjs). Ele monta o
 * pacote do site para o Amplify e o pacote de codigo da Lambda da pesquisa.
 * Nao ha biblioteca de zip no projeto, entao o teste le o formato na mao: se o
 * leitor abaixo reabre o arquivo com nomes, bytes e CRC certos, o Amplify e a
 * Lambda tambem abrem.
 */
import { criarZip } from '../scripts/site-publico/zip.mjs';

type Entrada = { nome: string; dados: Buffer; crc: number; versaoFeitaPor: number; flags: number; atributos: number };

function lerZip(zip: Buffer): Entrada[] {
  const fim = zip.length - 22;
  expect(zip.readUInt32LE(fim)).toBe(0x06054b50);
  const total = zip.readUInt16LE(fim + 10);
  let posicao = zip.readUInt32LE(fim + 16);
  const entradas: Entrada[] = [];
  for (let i = 0; i < total; i += 1) {
    expect(zip.readUInt32LE(posicao)).toBe(0x02014b50);
    const tamanho = zip.readUInt32LE(posicao + 24);
    const tamanhoDoNome = zip.readUInt16LE(posicao + 28);
    const tamanhoDoExtra = zip.readUInt16LE(posicao + 30);
    const tamanhoDoComentario = zip.readUInt16LE(posicao + 32);
    const local = zip.readUInt32LE(posicao + 42);
    expect(zip.readUInt32LE(local)).toBe(0x04034b50);
    const inicioDosDados = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    entradas.push({
      nome: zip.toString('utf8', posicao + 46, posicao + 46 + tamanhoDoNome),
      dados: zip.subarray(inicioDosDados, inicioDosDados + tamanho),
      crc: zip.readUInt32LE(posicao + 16),
      versaoFeitaPor: zip.readUInt16LE(posicao + 4),
      flags: zip.readUInt16LE(posicao + 8),
      atributos: zip.readUInt32LE(posicao + 38),
    });
    posicao += 46 + tamanhoDoNome + tamanhoDoExtra + tamanhoDoComentario;
  }
  return entradas;
}

describe('criarZip', () => {
  const todosOsBytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  const zip = criarZip({
    'index.html': Buffer.from('<p>oi</p>', 'utf8'),
    'fonts/Plex-400.ttf': todosOsBytes,
    'ação.txt': Buffer.from('123456789', 'utf8'),
  });
  const entradas = lerZip(zip);

  it('reabre com os nomes e os bytes intactos, inclusive nome com acento', () => {
    expect(entradas.map((e) => e.nome)).toEqual(['index.html', 'fonts/Plex-400.ttf', 'ação.txt']);
    expect(entradas[0].dados.toString('utf8')).toBe('<p>oi</p>');
    expect(Buffer.compare(entradas[1].dados, todosOsBytes)).toBe(0);
  });

  it('grava o CRC-32 certo (vetor classico: "123456789" vale 0xCBF43926)', () => {
    expect(entradas[2].crc).toBe(0xcbf43926);
  });

  it('marca os nomes como UTF-8', () => {
    for (const e of entradas) expect(e.flags & 0x0800).toBe(0x0800);
  });

  it('marca os arquivos como Unix com permissao 644, para a Lambda conseguir le-los', () => {
    for (const e of entradas) {
      expect(e.versaoFeitaPor >> 8).toBe(3);
      expect(e.atributos >>> 16).toBe(0o100644);
    }
  });
});

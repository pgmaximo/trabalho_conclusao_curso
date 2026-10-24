/**
 * Resumo do arquivo:
 * Criador de .zip sem dependencia (metodo "stored", sem compressao). Serve ao
 * publicador do site (`scripts/publicar-site-publico.mjs`) e ao implantador da
 * pesquisa (`scripts/implantar-pesquisa.mjs`).
 *
 * O Amplify so aceita o deploy manual em .zip, e a Lambda so aceita codigo em
 * .zip. Os pacotes somam poucos KB (ou alguns MB de fonte e imagem), e um zip
 * sem compressao evita depender de `tar`/`zip` -- que no Git Bash do Windows e
 * o GNU tar, incapaz de gerar zip.
 *
 * Cada arquivo vai marcado como criado em Unix com permissao 644: sem isso o
 * zip diz "criado no DOS" e a extracao em Linux fica sem permissao de leitura
 * definida.
 */
import { Buffer } from 'node:buffer';

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(dados) {
  let c = 0xffffffff;
  for (const byte of dados) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const VERSAO_FEITA_NO_UNIX = (3 << 8) | 20;
const ARQUIVO_COMUM_644 = (0o100644 << 16) >>> 0;

/**
 * @param {Record<string, Buffer>} arquivos nome dentro do zip -> conteudo
 * @returns {Buffer}
 */
export function criarZip(arquivos) {
  const locais = [];
  const centrais = [];
  let deslocamento = 0;
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const nomeEmBytes = Buffer.from(nome, 'utf8');
    const crc = crc32(conteudo);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versao necessaria
    local.writeUInt16LE(0x0800, 6); // nome em UTF-8
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(conteudo.length, 18);
    local.writeUInt32LE(conteudo.length, 22);
    local.writeUInt16LE(nomeEmBytes.length, 26);
    locais.push(local, nomeEmBytes, conteudo);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(VERSAO_FEITA_NO_UNIX, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(conteudo.length, 20);
    central.writeUInt32LE(conteudo.length, 24);
    central.writeUInt16LE(nomeEmBytes.length, 28);
    central.writeUInt32LE(ARQUIVO_COMUM_644, 38);
    central.writeUInt32LE(deslocamento, 42);
    centrais.push(central, nomeEmBytes);

    deslocamento += local.length + nomeEmBytes.length + conteudo.length;
  }
  const diretorio = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(Object.keys(arquivos).length, 8);
  fim.writeUInt16LE(Object.keys(arquivos).length, 10);
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(deslocamento, 16);
  return Buffer.concat([...locais, diretorio, fim]);
}

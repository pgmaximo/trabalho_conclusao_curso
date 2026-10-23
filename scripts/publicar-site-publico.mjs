#!/usr/bin/env node
/**
 * Resumo do arquivo:
 * Publica as paginas publicas do SuaSaude (inicio, Politica de Privacidade e
 * Termos de Uso) no Amplify Hosting, no app `suasaude-site` -- separado do app
 * do backend de proposito, para um deploy de pagina nunca tocar no backend.
 *
 * Os enderecos estao cadastrados na tela de Branding do Google Auth Platform
 * (login com Google). Mudar o nome de um arquivo quebra o cadastro.
 *
 * Rode de novo sempre que `src/data/termosEPrivacidade.ts` mudar:
 *   npm run site:publicar
 *
 * Roda com tsx (ver package.json) porque importa os dados direto do .ts.
 */
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANAL_DE_PRIVACIDADE,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
} from '../src/data/termosEPrivacidade.ts';
import { gerarPaginas } from './site-publico/paginas.mjs';

const APP_ID = 'd3fx6eabnu0fdd';
const BRANCH = 'main';
const REGIAO = 'us-east-1';
const ENDERECO = `https://${BRANCH}.${APP_ID}.amplifyapp.com`;

// O APK que `baixar.html` entrega -- a pagina do QR code impresso. A cada APK
// novo do EAS, troque o link (o "apk" do `eas build:view <id> --json`) e o
// tamanho, e rode `npm run site:publicar`: o QR code continua o mesmo.
const APK = {
  url: 'https://expo.dev/artifacts/eas/B57LY2e8t2FZ5xxPmbH97obBIkMNJ5VAMPrhCwiW36Y.apk',
  tamanhoEmMb: 113,
};

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, '.amplify', 'site-publico');

function parar(mensagem) {
  console.error(`\n[site:publicar] ${mensagem}`);
  process.exit(1);
}

function aws(args) {
  const r = spawnSync('aws', [...args, '--region', REGIAO, '--output', 'json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) parar(`Falhou: aws ${args.join(' ')}\n${r.stderr}`);
  return JSON.parse(r.stdout || '{}');
}

// --- ZIP sem dependencia (metodo "stored", sem compressao) -----------------
// O Amplify so aceita o deploy manual em .zip. As paginas somam poucos KB, e
// um zip sem compressao evita depender de `tar`/`zip` -- que no Git Bash do
// Windows e o GNU tar, incapaz de gerar zip.
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

function criarZip(arquivos) {
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
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(conteudo.length, 20);
    central.writeUInt32LE(conteudo.length, 24);
    central.writeUInt16LE(nomeEmBytes.length, 28);
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

// --- Gerar ------------------------------------------------------------------
const paginas = gerarPaginas({
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
  apk: APK,
});

const arquivos = {
  ...Object.fromEntries(Object.entries(paginas).map(([nome, html]) => [nome, Buffer.from(html, 'utf8')])),
  'favicon.png': readFileSync(path.join(RAIZ, 'assets', 'favicon.png')),
};

mkdirSync(PASTA, { recursive: true });
for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(path.join(PASTA, nome), conteudo);
console.log(`[site:publicar] Paginas geradas em ${PASTA} (${Object.keys(arquivos).join(', ')}).`);

// --- Publicar -----------------------------------------------------------------
const { jobId, zipUploadUrl } = aws(['amplify', 'create-deployment', '--app-id', APP_ID, '--branch-name', BRANCH]);

const envio = await fetch(zipUploadUrl, { method: 'PUT', body: criarZip(arquivos) });
if (!envio.ok) parar(`O envio do zip falhou: HTTP ${envio.status}.`);

aws(['amplify', 'start-deployment', '--app-id', APP_ID, '--branch-name', BRANCH, '--job-id', jobId]);

let estado = 'PENDING';
for (let tentativa = 0; tentativa < 60 && !['SUCCEED', 'FAILED', 'CANCELLED'].includes(estado); tentativa += 1) {
  await new Promise((pronto) => setTimeout(pronto, 5000));
  estado = aws(['amplify', 'get-job', '--app-id', APP_ID, '--branch-name', BRANCH, '--job-id', jobId]).job.summary
    .status;
}
if (estado !== 'SUCCEED') parar(`O deploy terminou em ${estado} (job ${jobId}).`);

console.log(`
[site:publicar] Publicado:
  Pagina inicial:          ${ENDERECO}/
  Politica de Privacidade: ${ENDERECO}/privacidade.html
  Termos de Uso:           ${ENDERECO}/termos.html
  Download do app (QR):    ${ENDERECO}/baixar.html`);

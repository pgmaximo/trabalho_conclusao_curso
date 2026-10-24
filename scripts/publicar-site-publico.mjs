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
import { criarZip } from './site-publico/zip.mjs';

const APP_ID = 'd3fx6eabnu0fdd';
const BRANCH = 'main';
const REGIAO = 'us-east-1';
const ENDERECO = `https://${BRANCH}.${APP_ID}.amplifyapp.com`;

// O APK que `baixar.html` entrega -- a pagina do QR code impresso. A cada APK
// novo do EAS, troque o link (o "apk" do `eas build:view <id> --json`) e o
// tamanho, e rode `npm run site:publicar`: o QR code continua o mesmo.
const APK = {
  url: 'https://expo.dev/artifacts/eas/1gY7jGhsM_LmKL10LpbGIrI2twTaNbi4ZFztNE8JPzc.apk',
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

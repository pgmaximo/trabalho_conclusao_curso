#!/usr/bin/env node
/**
 * Resumo do arquivo:
 * Publica o site publico do SuaSaude no Amplify Hosting, no app `suasaude-site`
 * -- separado do app do backend de proposito, para um deploy de pagina nunca
 * tocar no backend. O site tem: inicio, Politica de Privacidade, Termos de Uso,
 * a pagina de download do APK (o QR code da feira), a pesquisa de opiniao e o
 * painel do grupo, mais as fontes, o logo, o print do app e os scripts que as
 * paginas carregam (a lista esta em `site-publico/ativos.mjs`).
 *
 * Os enderecos dos documentos estao cadastrados na tela de Branding do Google
 * Auth Platform (login com Google). Mudar o nome de um arquivo quebra o cadastro.
 *
 * Rode de novo sempre que `src/data/termosEPrivacidade.ts` mudar:
 *   npm run site:publicar
 *
 * A pesquisa grava na stack `suasaude-pesquisa` (`npm run pesquisa:implantar`):
 * o endereco da Function URL vem da saida dela. Sem a stack, as paginas da
 * pesquisa e do painel ficam FORA do site, porque uma pesquisa que nao grava, na
 * pagina de um QR code impresso, e pior que nenhuma pesquisa.
 *
 * `--so-gerar` monta as paginas e o zip e para antes de publicar (so le da AWS).
 *
 * Roda com tsx (ver package.json) porque importa os dados direto do .ts.
 */
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  CANAL_DE_PRIVACIDADE,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
} from '../src/data/termosEPrivacidade.ts';
import { ATIVOS } from './site-publico/ativos.mjs';
import { gerarPaginas } from './site-publico/paginas.mjs';
import { criarZip } from './site-publico/zip.mjs';

const APP_ID = 'd3fx6eabnu0fdd';
const BRANCH = 'main';
const REGIAO = 'us-east-1';
const ENDERECO = `https://${BRANCH}.${APP_ID}.amplifyapp.com`;
const STACK_DA_PESQUISA = 'suasaude-pesquisa';
const SO_GERAR = process.argv.includes('--so-gerar');

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

/** O endereco da Function URL da pesquisa, ou `null` se a stack ainda nao existe. */
function enderecoDaPesquisa() {
  const r = spawnSync(
    'aws',
    [
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      STACK_DA_PESQUISA,
      '--query',
      "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue",
      '--region',
      REGIAO,
      '--output',
      'json',
    ],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) return null;
  return JSON.parse(r.stdout || '[]')[0] ?? null;
}

// --- Gerar ------------------------------------------------------------------
const endpoint = enderecoDaPesquisa();
if (!endpoint) {
  console.warn(
    `[site:publicar] AVISO: a stack ${STACK_DA_PESQUISA} nao existe. O site vai sem a pesquisa e sem o painel.\n` +
      '  Rode `npm run pesquisa:implantar` primeiro se a pesquisa deve ir ao ar.',
  );
}

const paginas = gerarPaginas({
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
  apk: APK,
  ...(endpoint && { pesquisa: { endpoint } }),
});

const arquivos = {
  ...Object.fromEntries(Object.entries(paginas).map(([nome, html]) => [nome, Buffer.from(html, 'utf8')])),
  ...Object.fromEntries(Object.entries(ATIVOS).map(([nome, origem]) => [nome, readFileSync(path.join(RAIZ, origem))])),
};

for (const [nome, conteudo] of Object.entries(arquivos)) {
  const destino = path.join(PASTA, nome);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, conteudo);
}
const zip = criarZip(arquivos);
console.log(
  `[site:publicar] ${Object.keys(arquivos).length} arquivos em ${PASTA}, zip de ${(zip.length / 1024).toFixed(0)} KB:\n  ` +
    Object.keys(arquivos).join('\n  '),
);
if (SO_GERAR) {
  console.log('[site:publicar] --so-gerar: parei antes de publicar.');
  process.exit(0);
}

// --- Publicar -----------------------------------------------------------------
const { jobId, zipUploadUrl } = aws(['amplify', 'create-deployment', '--app-id', APP_ID, '--branch-name', BRANCH]);

const envio = await fetch(zipUploadUrl, { method: 'PUT', body: zip });
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
  Download do app (QR):    ${ENDERECO}/baixar.html${
    endpoint
      ? `
  Pesquisa de opiniao:     ${ENDERECO}/opiniao.html
  Painel do grupo:         ${ENDERECO}/resultados.html`
      : ''
  }`);

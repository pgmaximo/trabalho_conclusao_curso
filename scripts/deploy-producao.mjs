#!/usr/bin/env node
/**
 * Resumo do arquivo:
 * Publica o backend de PRODUCAO. E a unica forma de publica-lo: os sandboxes
 * continuam com `npx ampx sandbox`, e este script e o que garante que a
 * producao sai sempre do mesmo jeito.
 *
 * O que ele faz, nesta ordem, e para no primeiro problema:
 *   1. confere que o codigo e exatamente o `main` publicado no GitHub (branch
 *      certo, nada por commitar, nada por puxar ou empurrar) e que as
 *      credenciais sao da conta certa;
 *   2. roda `npm run validate`;
 *   3. publica com `ampx pipeline-deploy`, com o login com Google ligado
 *      (SUASAUDE_LOGIN_GOOGLE, ver amplify/auth/resource.ts) -- publicar sem
 *      ele tiraria o Google da producao;
 *   4. copia o outputs da producao para `amplify_outputs.production.json`, que o
 *      hook do EAS (scripts/usar-outputs-de-producao.mjs) poe no APK.
 *
 * Uso:
 *   npm run deploy:prod
 *
 * Requer Node 20 e as credenciais AWS da conta abaixo no perfil padrao.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ID = 'd1wsv2b9ntb67b';
const BRANCH = 'main';
const CONTA = '370586504317';
const REGIAO = 'us-east-1';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA_DOS_OUTPUTS = path.join(RAIZ, '.amplify', 'producao');
const OUTPUTS_DE_PRODUCAO = 'amplify_outputs.production.json';

const AMBIENTE_AWS = { AWS_REGION: REGIAO };

function parar(mensagem) {
  console.error(`\n[deploy:prod] ${mensagem}`);
  process.exit(1);
}

/** Roda um comando na raiz do projeto. Sem `capturar`, a saida vai direto ao
 *  terminal -- o deploy leva minutos, e quem roda precisa ver o progresso. */
function rodar(comando, args, { env = {}, capturar = false } = {}) {
  const resultado = spawnSync(comando, args, {
    cwd: RAIZ,
    env: { ...process.env, ...env },
    stdio: capturar ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    // npm e npx sao .cmd no Windows, e so o shell os encontra.
    shell: process.platform === 'win32',
  });
  if (resultado.status !== 0) parar(`Falhou: ${comando} ${args.join(' ')}`);
  return (resultado.stdout ?? '').trim();
}

if (APP_ID.startsWith('PREENCHER')) {
  parar('APP_ID ainda nao foi preenchido neste script.');
}

// 1. O que vai para a producao e o `main` do GitHub, e mais nada.
const branchAtual = rodar('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capturar: true });
if (branchAtual !== BRANCH) parar(`Troque para o branch ${BRANCH} (agora: ${branchAtual}).`);

if (rodar('git', ['status', '--porcelain'], { capturar: true }) !== '') {
  parar('Ha mudancas nao commitadas. Commite ou descarte antes de publicar.');
}

rodar('git', ['fetch', 'origin', BRANCH]);
const local = rodar('git', ['rev-parse', 'HEAD'], { capturar: true });
const remoto = rodar('git', ['rev-parse', `origin/${BRANCH}`], { capturar: true });
if (local !== remoto) {
  parar(`O ${BRANCH} local e o origin/${BRANCH} divergem. Faca pull/push antes de publicar.`);
}

const conta = rodar('aws', ['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'], {
  capturar: true,
});
if (conta !== CONTA) parar(`As credenciais sao da conta ${conta}, e a producao esta na ${CONTA}.`);

// 2. Nada que reprova a validacao chega a producao.
rodar('npm', ['run', 'validate']);

// 3. A publicacao.
console.log(`\n[deploy:prod] Publicando ${BRANCH} no app ${APP_ID}. Leva de 15 a 25 minutos.\n`);
rodar(
  'npx',
  [
    'ampx', 'pipeline-deploy', '--branch', BRANCH, '--app-id', APP_ID,
    // SEM isto o pipeline-deploy grava o outputs da producao por cima do
    // `amplify_outputs.json` da raiz -- o do sandbox, que e versionado. Foi o
    // que aconteceu no primeiro deploy (2026-10-18).
    '--outputs-out-dir', PASTA_DOS_OUTPUTS,
  ],
  {
    // CI=1: o pipeline-deploy recusa rodar fora de uma esteira de CI sem ele.
    env: { ...AMBIENTE_AWS, CI: '1', SUASAUDE_LOGIN_GOOGLE: '1' },
  },
);

// 4. O outputs da producao, para o APK.
copyFileSync(path.join(PASTA_DOS_OUTPUTS, 'amplify_outputs.json'), path.join(RAIZ, OUTPUTS_DE_PRODUCAO));

const mudou = rodar('git', ['status', '--porcelain', OUTPUTS_DE_PRODUCAO], { capturar: true }) !== '';
console.log(
  mudou
    ? `\n[deploy:prod] Publicado. ${OUTPUTS_DE_PRODUCAO} mudou: commite e envie, e gere um APK novo.`
    : `\n[deploy:prod] Publicado. ${OUTPUTS_DE_PRODUCAO} nao mudou: o APK atual continua valendo.`,
);

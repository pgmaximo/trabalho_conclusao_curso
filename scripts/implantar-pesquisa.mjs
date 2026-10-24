#!/usr/bin/env node
/**
 * Resumo do arquivo:
 * Implanta a pesquisa de opiniao da feira na AWS: cria ou atualiza a stack
 * `suasaude-pesquisa` (tabela DynamoDB + Lambda com Function URL, em
 * `infra/site-pesquisa/template.json`) e sobe o codigo da Lambda.
 *
 *   PESQUISA_SENHA=<senha do painel> npm run pesquisa:implantar
 *
 * A stack e SEPARADA do backend do app de proposito. Este script nunca toca em
 * `amplify/`, nunca roda `ampx` e nunca altera uma stack `amplify-*`. Para
 * provar isso, ele fotografa as stacks `amplify-*` e os dois user pools do app
 * (producao e sandbox) antes e depois, e FALHA se algo mudou.
 *
 * A senha do painel nunca vai para a linha de comando nem para um arquivo do
 * repositorio: entra pela variavel `PESQUISA_SENHA`, passa por um arquivo
 * temporario (apagado no fim) e vira o parametro `NoEcho` da stack.
 *
 * Depois, rode `npm run site:publicar`: o publicador le o endereco da Function
 * URL da saida desta stack.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { diferencasDasStacks } from './pesquisa/conferencias.mjs';
import { criarZip } from './site-publico/zip.mjs';

const CONTA = '370586504317';
const REGIAO = 'us-east-1';
const STACK = 'suasaude-pesquisa';
// Producao (backend do app, branch main) e sandbox. A pesquisa nao usa nenhum dos dois.
const USER_POOLS = ['us-east-1_7NZ46CF7S', 'us-east-1_CFEpevMNE'];
const ARQUIVOS_DA_LAMBDA = ['index.mjs', 'pesquisa.mjs', 'repositorio.mjs'];

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA_DA_PESQUISA = path.join(RAIZ, 'infra', 'site-pesquisa');

function parar(mensagem) {
  console.error(`\n[pesquisa:implantar] ${mensagem}`);
  process.exit(1);
}

/** Chama a AWS CLI. Com `tolerar`, um erro cujo texto casa com ele devolve `null` em vez de parar. */
function aws(args, { tolerar } = {}) {
  const r = spawnSync('aws', [...args, '--region', REGIAO, '--output', 'json'], { encoding: 'utf8' });
  if (r.error) parar(`Nao consegui executar a AWS CLI: ${r.error.message}`);
  if (r.status !== 0) {
    if (tolerar?.test(r.stderr)) return null;
    parar(`Falhou: aws ${args.join(' ')}\n${r.stderr}`);
  }
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}

const comoArquivoDaCli = (prefixo, caminho) => `${prefixo}://${caminho.replaceAll('\\', '/')}`;

function fotografarStacksDoAmplify() {
  const linhas = aws([
    'cloudformation',
    'list-stacks',
    '--query',
    "StackSummaries[?starts_with(StackName, 'amplify-') && StackStatus != 'DELETE_COMPLETE'].[StackName,StackStatus]",
  ]);
  return Object.fromEntries(linhas);
}

function conferirUserPools() {
  for (const id of USER_POOLS) {
    const achado = aws(['cognito-idp', 'describe-user-pool', '--user-pool-id', id, '--query', 'UserPool.Id']);
    if (achado !== id) parar(`O user pool ${id} nao respondeu como esperado.`);
  }
}

/** Espera a stack e, se falhar, mostra o motivo que o CloudFormation deu. */
function esperarStack(espera) {
  const r = spawnSync('aws', ['cloudformation', 'wait', espera, '--stack-name', STACK, '--region', REGIAO], {
    encoding: 'utf8',
  });
  if (r.status === 0) return;
  const motivos = aws([
    'cloudformation',
    'describe-stack-events',
    '--stack-name',
    STACK,
    '--query',
    "StackEvents[?contains(ResourceStatus, 'FAILED')].[LogicalResourceId,ResourceStatusReason]",
  ]);
  parar(
    `A stack nao chegou ao estado esperado (${espera}).\n${motivos.map((m) => `  ${m[0]}: ${m[1]}`).join('\n')}\n` +
      `Se a criacao falhou, a stack fica em ROLLBACK_COMPLETE: apague com\n` +
      `  aws cloudformation delete-stack --stack-name ${STACK} --region ${REGIAO}\n` +
      `e rode de novo. A tabela de respostas tem DeletionPolicy Retain, entao nenhuma resposta e perdida.`,
  );
}

// --- Conferencias antes de tocar em qualquer coisa -----------------------------
const senha = process.env.PESQUISA_SENHA;
if (!senha) {
  parar('Defina a senha do painel na variavel PESQUISA_SENHA (ela nao e gravada em arquivo nenhum).');
}
if (senha.length < 8) parar('A senha do painel precisa ter pelo menos 8 caracteres.');

const conta = aws(['sts', 'get-caller-identity']).Account;
if (conta !== CONTA) parar(`Conta AWS inesperada: ${conta}. Esperava ${CONTA}.`);

const antes = fotografarStacksDoAmplify();
conferirUserPools();
console.log(`[pesquisa:implantar] Antes: ${Object.keys(antes).length} stacks amplify-* e os 2 user pools respondendo.`);

// --- Stack e codigo ---------------------------------------------------------------
const pasta = mkdtempSync(path.join(os.tmpdir(), 'pesquisa-'));
let saidas;
try {
  const arquivoDeParametros = path.join(pasta, 'parametros.json');
  writeFileSync(arquivoDeParametros, JSON.stringify([{ ParameterKey: 'ChaveResultados', ParameterValue: senha }]), {
    mode: 0o600,
  });

  const base = [
    '--stack-name',
    STACK,
    '--template-body',
    comoArquivoDaCli('file', path.join(PASTA_DA_PESQUISA, 'template.json')),
    '--parameters',
    comoArquivoDaCli('file', arquivoDeParametros),
    '--capabilities',
    'CAPABILITY_IAM',
  ];

  const jaExiste = aws(['cloudformation', 'describe-stacks', '--stack-name', STACK], { tolerar: /does not exist/ });
  if (jaExiste === null) {
    console.log('[pesquisa:implantar] Criando a stack...');
    aws(['cloudformation', 'create-stack', ...base]);
    esperarStack('stack-create-complete');
  } else {
    console.log('[pesquisa:implantar] Atualizando a stack...');
    const resultado = aws(['cloudformation', 'update-stack', ...base], { tolerar: /No updates are to be performed/ });
    if (resultado !== null) esperarStack('stack-update-complete');
  }

  const lista = aws(['cloudformation', 'describe-stacks', '--stack-name', STACK, '--query', 'Stacks[0].Outputs']);
  saidas = Object.fromEntries(lista.map((s) => [s.OutputKey, s.OutputValue]));

  // O template traz so um marcador no lugar do codigo; o de verdade sobe aqui, e
  // sobe SEMPRE, porque uma atualizacao da stack devolve o marcador.
  const zip = criarZip(
    Object.fromEntries(ARQUIVOS_DA_LAMBDA.map((nome) => [nome, readFileSync(path.join(PASTA_DA_PESQUISA, nome))])),
  );
  const arquivoDoZip = path.join(pasta, 'codigo.zip');
  writeFileSync(arquivoDoZip, zip);
  console.log(`[pesquisa:implantar] Subindo o codigo da Lambda (${ARQUIVOS_DA_LAMBDA.join(', ')}).`);
  aws([
    'lambda',
    'update-function-code',
    '--function-name',
    saidas.NomeDaFuncao,
    '--zip-file',
    comoArquivoDaCli('fileb', arquivoDoZip),
  ]);
  const espera = spawnSync(
    'aws',
    ['lambda', 'wait', 'function-updated', '--function-name', saidas.NomeDaFuncao, '--region', REGIAO],
    { encoding: 'utf8' },
  );
  if (espera.status !== 0) parar(`A Lambda nao ficou pronta:\n${espera.stderr}`);
} finally {
  rmSync(pasta, { recursive: true, force: true });
}

// --- "Tudo continua funcionando" ----------------------------------------------------
const diferencas = diferencasDasStacks(antes, fotografarStacksDoAmplify());
if (diferencas.length > 0) {
  parar(`Alguma stack amplify-* mudou durante a implantacao. Confira antes de seguir:\n  ${diferencas.join('\n  ')}`);
}
conferirUserPools();

console.log(`
[pesquisa:implantar] Pronto.
  Stack:           ${STACK}
  Tabela:          ${saidas.NomeDaTabela}
  Function URL:    ${saidas.FunctionUrl}
  Conferencia:     as ${Object.keys(antes).length} stacks amplify-* e os 2 user pools estao como estavam.

Proximo passo: npm run site:publicar`);

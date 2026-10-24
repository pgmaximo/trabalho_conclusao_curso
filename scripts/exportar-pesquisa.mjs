#!/usr/bin/env node
/**
 * Resumo do arquivo:
 * Baixa as respostas da pesquisa da feira e grava um CSV na pasta atual, para o
 * grupo abrir no Excel. E a alternativa de linha de comando ao botao "Baixar
 * CSV" do painel (`resultados.html`): usa a mesma rota `listar` da Lambda e a
 * mesma funcao `paraCsv`, entao o arquivo e identico.
 *
 *   PESQUISA_SENHA=<senha do painel> npm run pesquisa:exportar
 *
 * O endereco da Function URL vem da saida da stack `suasaude-pesquisa`
 * (criada por `npm run pesquisa:implantar`). A senha nao e gravada em lugar nenhum.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { paraCsv } from '../infra/site-pesquisa/agregar.mjs';
import { PERGUNTAS } from '../infra/site-pesquisa/pesquisa.mjs';

const STACK = 'suasaude-pesquisa';
const REGIAO = 'us-east-1';
const BOM = String.fromCharCode(0xfeff);

function parar(mensagem) {
  console.error(`\n[pesquisa:exportar] ${mensagem}`);
  process.exit(1);
}

const senha = process.env.PESQUISA_SENHA;
if (!senha) parar('Defina a senha do painel na variavel PESQUISA_SENHA.');

const saidas = spawnSync(
  'aws',
  [
    'cloudformation',
    'describe-stacks',
    '--stack-name',
    STACK,
    '--query',
    "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue",
    '--region',
    REGIAO,
    '--output',
    'json',
  ],
  { encoding: 'utf8' },
);
if (saidas.status !== 0) parar(`Nao consegui ler a stack ${STACK}. A pesquisa ja foi implantada?\n${saidas.stderr}`);
const endereco = JSON.parse(saidas.stdout)[0];
if (!endereco) parar(`A stack ${STACK} nao tem a saida FunctionUrl.`);

const resposta = await fetch(endereco, {
  method: 'POST',
  headers: { 'content-type': 'text/plain;charset=UTF-8', 'x-chave': senha },
  body: JSON.stringify({ acao: 'listar' }),
});
if (resposta.status === 401) parar('Senha incorreta.');
if (!resposta.ok) parar(`A Lambda respondeu HTTP ${resposta.status}.`);

const { itens } = await resposta.json();
const arquivo = path.resolve(`pesquisa-respostas-${new Date().toISOString().slice(0, 10)}.csv`);
writeFileSync(arquivo, BOM + paraCsv(itens, PERGUNTAS), 'utf8');
const quantas = itens.filter((item) => item.tipo === 'resposta').length;
console.log(`[pesquisa:exportar] ${quantas} respostas gravadas em ${arquivo}`);

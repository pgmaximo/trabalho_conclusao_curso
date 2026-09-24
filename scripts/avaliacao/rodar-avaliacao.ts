/**
 * Resumo do arquivo:
 * A rodada automatica da L7 (G7, Bloco 10): faz as perguntas do banco ao
 * assistente REAL e grava o relatorio.
 *
 *   AWS_REGION=us-east-1 npx tsx scripts/avaliacao/rodar-avaliacao.ts \
 *     --owner "<sub>::<sub>" --documento <id do laudo de teste> \
 *     --saida estudos-ia/04-implementacao/avaliacoes/<data>-rodada-automatica.md
 *
 * EM PROCESSO, e nao pela URL da funcao: a URL exige um token do Cognito, e
 * token exige senha. A chamada em processo exercita o MESMO `responder` que o
 * handler chama -- mesmo modelo, mesmo prompt, mesma verificacao, mesmas
 * tabelas. O que ela nao exercita e a porta (autenticacao e limite de taxa),
 * que tem teste proprio em `chat-assistant/__tests__/handler.test.ts`.
 *
 * A configuracao (tabelas, modelo, guardrail) e LIDA da funcao publicada, e
 * nao copiada para ca: uma rodada contra valores digitados mediria um sistema
 * que nao e o que esta no ar.
 *
 * SOMENTE LEITURA. O `responder` nao grava nada (D34) -- a proposta de memoria
 * volta como texto, e quem grava e a pessoa, no aplicativo.
 *
 * Rede: se o endpoint padrao do Bedrock for recusado pela rede local (medido
 * nesta maquina em 2026-09-22), `AWS_USE_FIPS_ENDPOINT=true` usa o endpoint
 * FIPS da mesma regiao, sem mudar uma linha do codigo da funcao.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { GetFunctionConfigurationCommand, LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';

import { BANCO_DE_PERGUNTAS } from './bancoDePerguntas';
import { lerEventos } from './eventos';
import { conferirExpectativas, montarRelatorio, type ResultadoDaPergunta } from './relatorio';

function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function configuracaoDaFuncao(): Promise<Record<string, string>> {
  const lambda = new LambdaClient({});
  let marcador: string | undefined;
  do {
    const pagina = await lambda.send(new ListFunctionsCommand({ Marker: marcador }));
    const chat = pagina.Functions?.find((f) => f.FunctionName?.toLowerCase().includes('chatassistant'));
    if (chat?.FunctionName) {
      const conf = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: chat.FunctionName }));
      return conf.Environment?.Variables ?? {};
    }
    marcador = pagina.NextMarker;
  } while (marcador);
  throw new Error('Funcao do chat nao encontrada nesta conta e regiao.');
}

async function main(): Promise<void> {
  const owner = argumento('owner');
  const documentoDeTeste = argumento('documento');
  const saida = argumento('saida');
  if (!owner || !saida) {
    throw new Error('Uso: --owner "<sub>::<sub>" --saida <arquivo.md> [--documento <id>]');
  }

  Object.assign(process.env, await configuracaoDaFuncao());

  // Importado DEPOIS do ambiente: o cliente do Bedrock e as tools leem
  // `process.env` e o endpoint na criacao.
  const { responder } = await import('../../amplify/functions/chat-assistant/verificacao');

  const [sub, username] = owner.split('::');
  const identity = { sub: sub ?? owner, username: username ?? sub ?? owner, owner };

  const resultados: ResultadoDaPergunta[] = [];
  for (const p of BANCO_DE_PERGUNTAS) {
    // O console do turno e capturado inteiro: e dele que saem as metricas,
    // exatamente como sairiam do CloudWatch.
    const linhas: string[] = [];
    const info = console.info;
    const erro = console.error;
    console.info = (...a: unknown[]) => linhas.push(a.map(String).join(' '));
    console.error = (...a: unknown[]) => linhas.push(a.map(String).join(' '));

    const inicio = Date.now();
    let turno;
    try {
      turno = await responder({ message: p.pergunta, history: [] }, { identity });
    } finally {
      console.info = info;
      console.error = erro;
    }
    const ms = Date.now() - inicio;

    const resultado: ResultadoDaPergunta = {
      id: p.id,
      categoria: p.categoria,
      pergunta: p.pergunta,
      status: turno.ruleCheckStatus,
      texto: turno.answer,
      citacoes: turno.citations.length,
      citouDocumentos: [...new Set(turno.citations.map((c) => c.documentId))],
      eventos: lerEventos(linhas),
      ms,
      expectativas: [],
    };
    resultado.expectativas = conferirExpectativas(p.espera, resultado, { documentoDeTeste });
    resultados.push(resultado);
    console.log(`${p.id} ${resultado.status} ${ms}ms ${resultado.expectativas.map((e) => (e.ok ? 'ok' : 'FALHOU')).join(' ')}`);
  }

  const data = new Date().toISOString().slice(0, 10);
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(
    saida,
    montarRelatorio(resultados, { data, modelo: process.env.BEDROCK_MODEL_ID ?? '?', documentoDeTeste }),
    'utf8',
  );
  writeFileSync(saida.replace(/\.md$/, '.json'), JSON.stringify(resultados, null, 2), 'utf8');
  console.log(`Relatorio gravado em ${saida}`);
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});

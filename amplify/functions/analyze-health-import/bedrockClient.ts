import {
  ApplyGuardrailCommand,
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { toStructuredOutputSchema } from '../extract-document-data/extractionSchema';
import { SYSTEM_PROMPT, buildUserText } from './insightPrompt';
import { insightsSchema, parseInsights, type Insights } from './insightSchema';
import type { AnalysisSummary } from './summaryBuilder';

const client = new BedrockRuntimeClient({ maxAttempts: 5, retryMode: 'adaptive' });

// maxTokens SEMPRE explicito -- deixar em branco reserva a cota maxima do
// modelo e e a causa numero 1 de ThrottlingException "do nada" (ver skill
// amazon-bedrock, referencia model-invocation.md).
//
// 3000 tokens (estimativa original) se provou baixo demais na pratica: com
// os limites de caracteres de insightSchema.ts no maximo (4 pontosDeAtencao
// com descricao de 700 chars, 3 padroes, 4 sugestoes, etc.) o JSON de saida
// pode passar de ~16 mil caracteres so de conteudo, sem contar a sobrecarga
// de sintaxe do JSON e os nomes de campo repetidos por item -- perto de
// 4500-5000 tokens so de texto, antes da tool call terminar. Descoberto ao
// analisar o export real do usuario (7,7 anos de historico): o Converse
// cortava a resposta ANTES do ultimo campo ("limitacoes") ser emitido,
// stopReason "max_tokens", e a resposta parcial falhava a validacao com
// "limitacoes: Invalid input: expected string, received undefined" -- nao um
// problema de formato, e sim de espaco. 7000 da uma folga confortavel sobre
// o pior caso mesmo depois de FIELD_LIMITS.pergunta e .limitacoes terem
// subido de novo (ver insightSchema.ts). Custo de subir a cota e desprezivel
// (poucos centavos de dolar por analise no pior caso, ver plan.md secao 12).
//
// 24000 com o Claude Sonnet 5.5: o thinking, que fica ligado, divide este teto
// com o JSON.
const MAX_OUTPUT_TOKENS = 24000;

// Esforco `low`, explicito (o padrao do Sonnet 5.5 e `high`): a tarefa e
// sumarizar estatisticas ja pre-computadas, nao raciocinar. Sem `temperature`:
// o Sonnet 5.5 recusa valor fora do padrao (400).
const ESFORCO = 'low';

export type BedrockOptions = {
  modelId: string;
  guardrailId: string;
  guardrailVersion: string;
};

export type BedrockAnalysisResult = {
  insights: Insights;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
};

export type BedrockAnalysisOutcome = { ok: true; result: BedrockAnalysisResult } | { ok: false; message: string };

async function callConverse(userText: string, options: BedrockOptions): Promise<ConverseCommandOutput> {
  return client.send(
    new ConverseCommand({
      modelId: options.modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          // O bloco de dados fica dentro de guardContent (nao o system
          // prompt) para que o filtro PROMPT_ATTACK do Guardrail avalie
          // exatamente o conteudo derivado dos arquivos do usuario -- ver
          // plan.md secao 2.6.
          content: [{ guardContent: { text: { text: userText } } }],
        },
      ],
      inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS },
      // Saida estruturada imposta pelo servidor, como na extracao (D19). Era
      // tool forcada (`toolChoice`), que o Sonnet 5.5 recusa (400). O schema
      // sai do MESMO objeto zod que valida a resposta.
      additionalModelRequestFields: {
        output_config: {
          effort: ESFORCO,
          format: { type: 'json_schema', schema: toStructuredOutputSchema(insightsSchema) },
        },
      },
      guardrailConfig: {
        guardrailIdentifier: options.guardrailId,
        guardrailVersion: options.guardrailVersion,
        // trace: 'enabled' exporia o texto original que disparou um filtro
        // (PII, conteudo) na propria resposta da API -- risco de
        // conformidade. Nunca ligar em producao.
        trace: 'disabled',
      },
    }),
  );
}

/** O JSON da analise, do bloco de texto. Texto que nao e JSON vira nulo: e
 *  falha de formato, e o reparo cuida dela. */
function readOutput(response: ConverseCommandOutput): unknown | null {
  const texto = response.output?.message?.content?.find((block) => block.text)?.text;
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/**
 * Pede ao Bedrock a analise estruturada do resumo estatistico. Faz UMA
 * tentativa de reparo se a primeira resposta nao validar contra
 * insightSchema.ts (ex.: campo faltando) -- se a segunda tambem falhar,
 * devolve um erro em vez de inventar um insight.
 */
export async function requestInsights(
  summary: AnalysisSummary,
  options: BedrockOptions,
): Promise<BedrockAnalysisOutcome> {
  const userText = buildUserText(summary);

  let response: ConverseCommandOutput;
  try {
    response = await callConverse(userText, options);
  } catch (error) {
    return { ok: false, message: describeError(error, 'Erro ao chamar o Bedrock') };
  }

  let inputTokens = response.usage?.inputTokens ?? 0;
  let outputTokens = response.usage?.outputTokens ?? 0;
  let parsed = parseInsights(readOutput(response));

  if (!parsed.ok) {
    // stopReason "max_tokens" nao e um problema de FORMATO (a mensagem do
    // zod, tipo "limitacoes: Invalid input: expected string, received
    // undefined", so descreve o sintoma) -- e a resposta ter sido cortada no
    // meio. Pedir para "preencher todos os campos" de novo tende a repetir o
    // mesmo estouro; pedir objetividade e o que realmente ataca a causa.
    const repairText =
      response.stopReason === 'max_tokens'
        ? `${userText}\n\nSua resposta anterior foi cortada por ultrapassar o limite de tamanho antes de terminar. Responda de novo, sendo bem mais direto em cada campo de texto (principalmente "descricao", "evidencia", "acao" e "porque"), mas SEM pular nenhum campo obrigatorio -- garanta que "limitacoes" seja preenchido por ultimo, mesmo que curto.`
        : `${userText}\n\nSua resposta anterior teve um problema de formato (${parsed.message}). Responda novamente, com TODOS os campos corretamente preenchidos conforme o schema.`;

    let repairResponse: ConverseCommandOutput;
    try {
      repairResponse = await callConverse(repairText, options);
    } catch (error) {
      return { ok: false, message: describeError(error, 'Erro ao chamar o Bedrock na tentativa de reparo') };
    }

    inputTokens += repairResponse.usage?.inputTokens ?? 0;
    outputTokens += repairResponse.usage?.outputTokens ?? 0;
    parsed = parseInsights(readOutput(repairResponse));

    if (!parsed.ok && repairResponse.stopReason === 'max_tokens') {
      return {
        ok: false,
        message: 'A análise gerada ficou grande demais para ser concluída, mesmo após uma nova tentativa mais objetiva.',
      };
    }
  }

  if (!parsed.ok) {
    return { ok: false, message: `Não foi possível obter uma análise válida do modelo: ${parsed.message}` };
  }

  return { ok: true, result: { insights: parsed.value, modelId: options.modelId, inputTokens, outputTokens } };
}

/**
 * Roda o Guardrail sobre o TEXTO EM PROSA da analise ja validada, o texto que
 * vai aparecer na tela do usuario (ver plan.md secao 2.6). Nasceu quando a
 * saida vinha em bloco `toolUse`, que o `guardrailConfig` do Converse nao
 * avalia; com a saida estruturada ela vem em texto, mas como JSON, e esta
 * chamada continua avaliando a prosa sem a sintaxe em volta.
 */
export async function applyOutputGuardrail(
  insights: Insights,
  guardrailId: string,
  guardrailVersion: string,
): Promise<{ blocked: boolean }> {
  const proseText = [
    insights.resumo,
    ...insights.destaques.map((d) => `${d.metrica}: ${d.valor} — ${d.comparacao}`),
    ...insights.pontosDeAtencao.map((p) => `${p.titulo}. ${p.descricao}`),
    ...insights.padroes.map((p) => `${p.titulo}. ${p.descricao} ${p.evidencia}`),
    ...insights.sugestoes.map((s) => `${s.titulo}. ${s.acao} ${s.porque}`),
    ...insights.perguntasParaOMedico,
    insights.limitacoes,
  ].join('\n');

  const response = await client.send(
    new ApplyGuardrailCommand({
      guardrailIdentifier: guardrailId,
      guardrailVersion,
      source: 'OUTPUT',
      content: [{ text: { text: proseText } }],
    }),
  );

  return { blocked: response.action === 'GUARDRAIL_INTERVENED' };
}

function describeError(error: unknown, prefix: string): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${detail}`;
}

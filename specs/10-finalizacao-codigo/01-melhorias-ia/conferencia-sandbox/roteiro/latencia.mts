// DS16.3 = A: isola o que pesa na latencia da chamada do chat. Mesma primeira
// chamada (prompt de sistema, contexto do dia, as 17 ferramentas, saida
// estruturada, effort e guardrail), em variantes alternadas no mesmo intervalo,
// medindo o `latencyMs` que o proprio Bedrock devolve.
// Uso: BEDROCK_MODEL_ID, BEDROCK_GUARDRAIL_ID e BEDROCK_GUARDRAIL_VERSION no
// ambiente (os do Lambda do chat), AWS_USE_FIPS_ENDPOINT=true; VOLTAS e PAUSA_MS opcionais.
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { toStructuredOutputSchema } from '../../../../../amplify/functions/extract-document-data/extractionSchema.ts';
import { SYSTEM_PROMPT } from '../../../../../amplify/functions/chat-assistant/chatPrompt.ts';
import { schemaDaResposta } from '../../../../../amplify/functions/chat-assistant/chatSchema.ts';
import { montarContextoDeHoje } from '../../../../../amplify/functions/chat-assistant/contextoDeHoje.ts';
import { CHAT_TOOLS } from '../../../../../amplify/functions/chat-assistant/tools/index.ts';

const client = new BedrockRuntimeClient({ region: 'us-east-1', maxAttempts: 1 });
const PERGUNTA = 'preciso fazer mamografia?';
// ~15 mil tokens de texto, no lugar das saidas de ferramenta dos turnos lentos.
const RECHEIO = 'Recomendação da fonte para o grupo: rastreamento com periodicidade definida pela fonte. '.repeat(1500);

const ferramentas = {
  tools: CHAT_TOOLS.map((t) => ({
    toolSpec: { name: t.name, description: t.description, inputSchema: { json: toStructuredOutputSchema(t.inputSchema) } },
  })),
};
const saida = { output_config: { effort: 'low', format: { type: 'json_schema', schema: schemaDaResposta() } } };
const guardrail = {
  guardrailIdentifier: process.env.BEDROCK_GUARDRAIL_ID!,
  guardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION!,
  trace: 'disabled' as const,
};
const sistema = [{ text: SYSTEM_PROMPT }, { text: montarContextoDeHoje(new Date()) }];
const fala = (texto: string) => [{ role: 'user' as const, content: [{ text: texto }] }];

const VARIANTES: Record<string, () => object> = {
  completa: () => ({ system: sistema, messages: fala(PERGUNTA), toolConfig: ferramentas, additionalModelRequestFields: saida, guardrailConfig: guardrail }),
  sem_saida_estruturada: () => ({ system: sistema, messages: fala(PERGUNTA), toolConfig: ferramentas, guardrailConfig: guardrail }),
  sem_ferramentas: () => ({ system: sistema, messages: fala(PERGUNTA), additionalModelRequestFields: saida, guardrailConfig: guardrail }),
  sem_guardrail: () => ({ system: sistema, messages: fala(PERGUNTA), toolConfig: ferramentas, additionalModelRequestFields: saida }),
  entrada_grande: () => ({ system: sistema, messages: fala(`${RECHEIO}\n\n${PERGUNTA}`), toolConfig: ferramentas, additionalModelRequestFields: saida, guardrailConfig: guardrail }),
  minima: () => ({ messages: fala(PERGUNTA) }),
  // DS16.3 = B: os pontos de cache no fim das ferramentas e do prompt, como no laco.
  com_cache: () => ({
    system: [sistema[0], { cachePoint: { type: 'default' } }, sistema[1]],
    messages: fala(PERGUNTA),
    toolConfig: { tools: [...ferramentas.tools, { cachePoint: { type: 'default' } }] },
    additionalModelRequestFields: saida,
    guardrailConfig: guardrail,
  }),
};
// SO=com_cache,completa roda so essas variantes.
const so = process.env.SO?.split(',');

const voltas = Number(process.env.VOLTAS ?? 3);
const pausa = Number(process.env.PAUSA_MS ?? 7000);
for (let v = 1; v <= voltas; v++) {
  for (const [nome, montar] of Object.entries(VARIANTES).filter(([n]) => !so || so.includes(n))) {
    const inicio = Date.now();
    try {
      const r: any = await client.send(
        new ConverseCommand({ modelId: process.env.BEDROCK_MODEL_ID!, inferenceConfig: { maxTokens: 16000 }, ...(montar() as any) }),
      );
      console.log(JSON.stringify({ volta: v, nome, latencyMs: r.metrics?.latencyMs, totalMs: Date.now() - inicio, entrada: r.usage?.inputTokens, cacheLido: r.usage?.cacheReadInputTokens, cacheGravado: r.usage?.cacheWriteInputTokens, saida: r.usage?.outputTokens, stop: r.stopReason }));
    } catch (e: any) {
      console.log(JSON.stringify({ volta: v, nome, erro: e?.name, totalMs: Date.now() - inicio }));
    }
    await new Promise((ok) => setTimeout(ok, pausa));
  }
}

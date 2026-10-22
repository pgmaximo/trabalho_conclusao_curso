// Roda o handler do chat localmente (mesmo codigo do Lambda) contra o sandbox,
// registrando as ferramentas que o modelo chamou e o tamanho de cada saida.
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

export type Rastro = { ferramentas: { nome: string; input: unknown; bytes: number; tokensAprox: number }[]; logs: string[] };
let rastro: Rastro = { ferramentas: [], logs: [] };

const enviarOriginal = BedrockRuntimeClient.prototype.send;
BedrockRuntimeClient.prototype.send = async function (this: unknown, cmd: any, ...resto: any[]) {
  // Os toolResult chegam na requisicao seguinte; casa por toolUseId.
  for (const m of cmd?.input?.messages ?? []) {
    for (const b of m.content ?? []) {
      if (b.toolResult) {
        const f = rastro.ferramentas.find((x: any) => x.id === b.toolResult.toolUseId) as any;
        if (f && !f.bytes) {
          const s = JSON.stringify(b.toolResult.content);
          f.bytes = s.length;
          f.tokensAprox = Math.round(s.length / 3.5);
        }
      }
    }
  }
  if (cmd?.input?.guardrailConfig) cmd.input.guardrailConfig.trace = 'enabled';
  // EXPERIMENTO_ZACAO: o campo da acao depois de "texto" na ordem alfabetica.
  const fmt = cmd?.input?.additionalModelRequestFields?.output_config?.format?.schema;
  if (process.env.EXPERIMENTO_ZACAO && fmt?.properties?.acao) {
    fmt.properties.zacao = fmt.properties.acao; delete fmt.properties.acao;
    const a = fmt.properties.zacao.properties ? fmt.properties.zacao : fmt.properties.zacao.anyOf?.find((x: any) => x.properties);
    if (process.env.EXPERIMENTO_TIPO && a?.properties?.tipo) {
      a.properties._tipo = a.properties.tipo; delete a.properties.tipo;
      a.required = (a.required ?? []).map((k: string) => (k === 'tipo' ? '_tipo' : k));
    }
  }
  const r: any = await (enviarOriginal as any).call(this, cmd, ...resto);
  if (r?.stopReason === 'guardrail_intervened') rastro.logs.push('GUARDRAIL ' + JSON.stringify(r.trace?.guardrail ?? null));
  for (const b of r?.output?.message?.content ?? []) {
    if (typeof b.text === 'string') rastro.logs.push('BRUTO ' + b.text);
    if (process.env.EXPERIMENTO_ZACAO && typeof b.text === 'string') b.text = b.text.replace('"zacao"', '"acao"').replace('"_tipo"', '"tipo"');
    if (b.toolUse) rastro.ferramentas.push({ id: b.toolUse.toolUseId, nome: b.toolUse.name, input: b.toolUse.input, bytes: 0, tokensAprox: 0 } as any);
  }
  return r;
};

const logOriginal = console.info;
console.info = (...a: unknown[]) => { rastro.logs.push(a.map(String).join(' ')); };
console.warn = console.info;
console.error = (...a: unknown[]) => { rastro.logs.push('ERRO ' + a.map((x: any) => (x?.name ? `${x.name}: ${x.message}` : String(x))).join(' ')); };

const { handler } = await import('../../../../../amplify/functions/chat-assistant/handler.ts');

export async function perguntarLocal(token: string, corpo: Record<string, unknown>) {
  rastro = { ferramentas: [], logs: [] };
  const t0 = Date.now();
  const r = await handler({
    requestContext: { http: { method: 'POST' } },
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  } as any);
  const resposta = JSON.parse(r.body ?? '{}');
  return { status: r.statusCode, ms: Date.now() - t0, ...resposta, rastro: { ferramentas: rastro.ferramentas.map(({ id, ...f }: any) => f), logs: rastro.logs } };
}
export { logOriginal };

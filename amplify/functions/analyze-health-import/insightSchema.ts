import { z } from 'zod';

// Schema da saida esperada do Bedrock (tool `registrar_analise`, ver
// insightPrompt.ts). Usado tanto para VALIDAR a resposta do modelo quanto
// (via zodToToolInputSchema) para GERAR o JSON Schema da propria tool -- uma
// fonte de verdade so, para o schema nunca divergir da validacao.
//
// `severidade` deliberadamente NAO tem um nivel "grave"/"alta": o proprio
// vocabulario disponivel para o modelo nao permite soar como diagnostico
// definitivo (regra 4 da constituicao), o que torna essa regra estrutural em
// vez de so uma instrucao no system prompt.

const destaqueSchema = z.object({
  metrica: z.string().min(1).max(80),
  valor: z.string().min(1).max(80),
  comparacao: z.string().min(1).max(200),
  tom: z.enum(['positivo', 'neutro', 'atencao']),
});

const pontoDeAtencaoSchema = z.object({
  titulo: z.string().min(1).max(120),
  descricao: z.string().min(1).max(500),
  severidade: z.enum(['informativo', 'atencao']),
  metricas: z.array(z.string().max(80)).max(6),
});

const padraoSchema = z.object({
  titulo: z.string().min(1).max(120),
  descricao: z.string().min(1).max(500),
  evidencia: z.string().min(1).max(300),
  confianca: z.enum(['baixa', 'media', 'alta']),
});

const sugestaoSchema = z.object({
  titulo: z.string().min(1).max(120),
  acao: z.string().min(1).max(300),
  porque: z.string().min(1).max(300),
  esforco: z.enum(['baixo', 'medio', 'alto']),
});

export const insightsSchema = z.object({
  resumo: z.string().min(1).max(600),
  destaques: z.array(destaqueSchema).max(4),
  pontosDeAtencao: z.array(pontoDeAtencaoSchema).max(4),
  padroes: z.array(padraoSchema).max(3),
  sugestoes: z.array(sugestaoSchema).max(4),
  perguntasParaOMedico: z.array(z.string().min(1).max(200)).max(3),
  limitacoes: z.string().min(1).max(500),
});

export type Insights = z.infer<typeof insightsSchema>;

export type ParseInsightsResult = { ok: true; value: Insights } | { ok: false; message: string };

/** Valida o JSON bruto devolvido pelo Bedrock. Nunca lanca -- devolve um resultado tipado. */
export function parseInsights(raw: unknown): ParseInsightsResult {
  const result = insightsSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, value: result.data };
  }

  const message = result.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  return { ok: false, message: message || 'Formato de resposta inválido.' };
}

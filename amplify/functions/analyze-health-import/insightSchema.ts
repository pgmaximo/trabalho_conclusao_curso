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

// Limites de caracteres — usados tanto pelo schema zod (validacao) quanto por
// `truncateInsightsShape` (normalizacao antes de validar, ver abaixo). Uma
// unica fonte de verdade evita os dois se desalinharem.
export const FIELD_LIMITS = {
  metrica: 80,
  valor: 80,
  comparacao: 200,
  tituloAtencao: 120,
  descricaoAtencao: 700,
  metricaItem: 80,
  tituloPadrao: 120,
  descricaoPadrao: 700,
  evidencia: 300,
  tituloSugestao: 120,
  acao: 300,
  porque: 300,
  resumo: 600,
  // 200 se provou baixo demais na pratica: perguntas clinicas genuinamente
  // uteis ("minha media de X, considerando Y, e motivo de preocupacao dado
  // Z?") passam facilmente disso -- 2 das 3 perguntas de uma analise real
  // vieram cortadas com "…" no meio da frase.
  pergunta: 350,
  // O campo que de fato estourou com o export real do usuario (7,7 anos de
  // historico, cobertura bem desigual entre metricas): mesmo depois de subir
  // de 500 para 900, uma analise real ainda veio com 893 caracteres (na
  // borda) e outra estourou os 900 e foi cortada com "…" -- 900 ainda nao
  // dava espaco de sobra para listar as ressalvas de um periodo tao longo e
  // heterogeneo.
  limitacoes: 1400,
} as const;

const destaqueSchema = z.object({
  metrica: z.string().min(1).max(FIELD_LIMITS.metrica),
  valor: z.string().min(1).max(FIELD_LIMITS.valor),
  comparacao: z.string().min(1).max(FIELD_LIMITS.comparacao),
  tom: z.enum(['positivo', 'neutro', 'atencao']),
});

const pontoDeAtencaoSchema = z.object({
  titulo: z.string().min(1).max(FIELD_LIMITS.tituloAtencao),
  descricao: z.string().min(1).max(FIELD_LIMITS.descricaoAtencao),
  severidade: z.enum(['informativo', 'atencao']),
  metricas: z.array(z.string().max(FIELD_LIMITS.metricaItem)).max(6),
});

const padraoSchema = z.object({
  titulo: z.string().min(1).max(FIELD_LIMITS.tituloPadrao),
  descricao: z.string().min(1).max(FIELD_LIMITS.descricaoPadrao),
  evidencia: z.string().min(1).max(FIELD_LIMITS.evidencia),
  confianca: z.enum(['baixa', 'media', 'alta']),
});

const sugestaoSchema = z.object({
  titulo: z.string().min(1).max(FIELD_LIMITS.tituloSugestao),
  acao: z.string().min(1).max(FIELD_LIMITS.acao),
  porque: z.string().min(1).max(FIELD_LIMITS.porque),
  esforco: z.enum(['baixo', 'medio', 'alto']),
});

export const insightsSchema = z.object({
  resumo: z.string().min(1).max(FIELD_LIMITS.resumo),
  destaques: z.array(destaqueSchema).max(4),
  pontosDeAtencao: z.array(pontoDeAtencaoSchema).max(4),
  padroes: z.array(padraoSchema).max(3),
  sugestoes: z.array(sugestaoSchema).max(4),
  perguntasParaOMedico: z.array(z.string().min(1).max(FIELD_LIMITS.pergunta)).max(3),
  limitacoes: z.string().min(1).max(FIELD_LIMITS.limitacoes),
});

export type Insights = z.infer<typeof insightsSchema>;

export type ParseInsightsResult = { ok: true; value: Insights } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Corta uma string que passou do limite, preferindo cortar num espaço (nunca
 * no meio de uma palavra) e sinalizando o corte com "…". NUNCA inventa ou
 * completa texto — só encurta o que o próprio modelo já escreveu, por isso
 * não conta como "inventar um insight" (regra 4 da constituição).
 */
function truncateString(value: unknown, max: number): unknown {
  if (typeof value !== 'string' || value.length <= max) return value;

  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

function truncateStringArray(value: unknown, max: number): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => truncateString(item, max));
}

function truncateObjectFields(value: unknown, limits: Record<string, number>): unknown {
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = { ...value };
  for (const [field, max] of Object.entries(limits)) {
    if (field in result) result[field] = truncateString(result[field], max);
  }
  return result;
}

function truncateArrayOfObjects(value: unknown, limits: Record<string, number>): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => truncateObjectFields(item, limits));
}

/**
 * Normaliza a resposta bruta do Bedrock ANTES de validar: só corta campos de
 * texto que excedem o limite (ver FIELD_LIMITS). Não mexe em nada além disso
 * — campo faltando, enum inválido ou array grande demais continuam sendo
 * erros estruturais que `parseInsights` rejeita normalmente (e acionam a
 * tentativa de reparo em bedrockClient.ts), porque esses SIM exigiriam
 * inventar ou remover conteúdo, não apenas encurtar o que já existe.
 */
export function truncateInsightsShape(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  return {
    ...raw,
    resumo: truncateString(raw.resumo, FIELD_LIMITS.resumo),
    destaques: truncateArrayOfObjects(raw.destaques, {
      metrica: FIELD_LIMITS.metrica,
      valor: FIELD_LIMITS.valor,
      comparacao: FIELD_LIMITS.comparacao,
    }),
    pontosDeAtencao: Array.isArray(raw.pontosDeAtencao)
      ? raw.pontosDeAtencao.map((item) => {
          const truncated = truncateObjectFields(item, {
            titulo: FIELD_LIMITS.tituloAtencao,
            descricao: FIELD_LIMITS.descricaoAtencao,
          });
          if (!isRecord(truncated)) return truncated;
          return { ...truncated, metricas: truncateStringArray(truncated.metricas, FIELD_LIMITS.metricaItem) };
        })
      : raw.pontosDeAtencao,
    padroes: truncateArrayOfObjects(raw.padroes, {
      titulo: FIELD_LIMITS.tituloPadrao,
      descricao: FIELD_LIMITS.descricaoPadrao,
      evidencia: FIELD_LIMITS.evidencia,
    }),
    sugestoes: truncateArrayOfObjects(raw.sugestoes, {
      titulo: FIELD_LIMITS.tituloSugestao,
      acao: FIELD_LIMITS.acao,
      porque: FIELD_LIMITS.porque,
    }),
    perguntasParaOMedico: truncateStringArray(raw.perguntasParaOMedico, FIELD_LIMITS.pergunta),
    limitacoes: truncateString(raw.limitacoes, FIELD_LIMITS.limitacoes),
  };
}

/** Valida o JSON bruto devolvido pelo Bedrock. Nunca lanca -- devolve um resultado tipado. */
export function parseInsights(raw: unknown): ParseInsightsResult {
  const result = insightsSchema.safeParse(truncateInsightsShape(raw));
  if (result.success) {
    return { ok: true, value: result.data };
  }

  const message = result.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  return { ok: false, message: message || 'Formato de resposta inválido.' };
}

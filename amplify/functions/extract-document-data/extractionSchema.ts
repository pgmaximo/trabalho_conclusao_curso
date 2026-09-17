/**
 * Resumo do arquivo:
 * Uma fonte de verdade so para duas coisas que nunca podem divergir: o JSON
 * Schema da tool que o modelo e obrigado a chamar, e a validacao da resposta
 * que ele devolveu. Mesmo metodo de insightSchema.ts.
 *
 * A regra estrutural: o vocabulario que o modelo pode escolher NAO contem
 * nada que soe como leitura clinica. Nao ha campo de gravidade, de situacao,
 * de "alterado". Ha numero, unidade, faixa e origem. Um modelo nao pode dizer
 * o que nao lhe foi dado onde dizer (regra 4 da constituicao, D11).
 */
import type { DocumentType } from '@smithy/types';
import { z } from 'zod';

/**
 * TODO numero chega como TEXTO, inclusive os limites da faixa. O modelo
 * TRANSCREVE o que esta no papel; quem converte para numero e o parseDecimal
 * da tarefa 2b, sob teste. Pedir ao modelo que ja devolva numero devolveria a
 * virgula decimal para dentro do problema (D23).
 */
const numeroComoTexto = z.string().min(1).max(40);

export const rawLabResultSchema = z
  .object({
    /** O nome exatamente como o laboratorio escreveu. Nao normalizar aqui. */
    analyteLabel: z.string().min(1).max(160),
    rawValue: numeroComoTexto,
    rawUnit: z.string().max(40).nullable(),
    rawReferenceLow: z.string().max(40).nullable(),
    rawReferenceHigh: z.string().max(40).nullable(),
    /** ISO, da LINHA (D24). Vazio e resposta legitima: quem decide a reserva
     *  e o orquestrador, com a data do formulario e um aviso -- nunca o
     *  modelo com uma data inventada. */
    collectedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    /** O rotulo do momento como o laudo escreveu: "jejum", "120 minutos",
     *  "manha" (D22). */
    collectionMoment: z.string().max(60).nullable(),
    sourcePage: z.number().int().min(1).max(500).nullable(),
    confidence: z.number().min(0).max(1),
    /**
     * Codigo LOINC escolhido pelo modelo entre os candidatos do prompt.
     * Deliberadamente SEM regex de formato: um codigo malformado deve derrubar
     * UMA linha para revisao (tarefa 5), nao a extracao inteira do documento.
     * Validar formato aqui trocaria uma perda pequena por uma grande.
     */
    analyteCodeGuess: z.string().max(20).nullable(),
  })
  .strict();

export const rawPrescriptionSchema = z
  .object({
    medicationLabel: z.string().min(1).max(160),
    dose: z.string().max(40).nullable(),
    unit: z.string().max(40).nullable(),
    frequency: z.string().max(80).nullable(),
    duration: z.string().max(80).nullable(),
    rawText: z.string().max(400),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const extractionSchema = z
  .object({
    documentKind: z.enum(['exam', 'prescription']),
    labResults: z.array(rawLabResultSchema).max(120),
    prescriptionItems: z.array(rawPrescriptionSchema).max(40),
    /** Em pt-BR, do que o modelo nao conseguiu ler. Lista vazia e normal. */
    warnings: z.array(z.string().max(300)).max(20),
  })
  .strict();

export type RawLabResult = z.infer<typeof rawLabResultSchema>;
export type RawPrescriptionItem = z.infer<typeof rawPrescriptionSchema>;
export type RawExtraction = z.infer<typeof extractionSchema>;

export type ParseExtractionResult =
  | { ok: true; value: RawExtraction }
  | { ok: false; message: string };

/**
 * Valida o que o modelo devolveu. NUNCA lanca -- devolve resultado tipado,
 * como parseInsights faz, porque quem chama precisa distinguir "formato
 * errado" (tentativa de reparo) de "excecao" (falha).
 */
export function parseExtraction(raw: unknown): ParseExtractionResult {
  const result = extractionSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };

  const message = result.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  return { ok: false, message: message || 'Formato de resposta inválido.' };
}

/**
 * Gera o JSON Schema da tool a partir do MESMO objeto zod usado na validacao.
 * O cast para DocumentType e so para bater com o tipo JSON generico que o SDK
 * do Bedrock espera em `inputSchema.json` -- mesmo motivo escrito em
 * insightPrompt.ts.
 */
export function zodToToolInputSchema(schema: z.ZodType): DocumentType {
  return z.toJSONSchema(schema) as unknown as DocumentType;
}

import { z } from 'zod';
import type { Tool } from '@aws-sdk/client-bedrock-runtime';
import type { DocumentType } from '@smithy/types';
import { insightsSchema } from './insightSchema';
import type { AnalysisSummary } from './summaryBuilder';

export const ANALYSIS_TOOL_NAME = 'registrar_analise';

/**
 * JSON Schema da tool, derivado do MESMO schema zod usado para validar a
 * resposta (insightSchema.ts) -- uma fonte de verdade so, para a tool nunca
 * divergir da validacao (zod 4 tem z.toJSONSchema() nativo). O cast para
 * `Record<string, unknown>` e so para bater com o tipo `DocumentType`
 * (JSON generico) que o SDK do Bedrock espera em `inputSchema.json` --
 * o tipo super especifico que o zod infere para o schema nao se encaixa
 * estruturalmente no union `Tool` do SDK sem essa anotacao explicita.
 */
export const ANALYSIS_TOOL_SPEC: Tool = {
  toolSpec: {
    name: ANALYSIS_TOOL_NAME,
    description:
      'Registra a analise estruturada dos dados de saude do usuario, com resumo, destaques, pontos de atencao, padroes, sugestoes e limitacoes.',
    inputSchema: {
      json: z.toJSONSchema(insightsSchema) as unknown as DocumentType,
    },
  },
};

export const SYSTEM_PROMPT = `Você é um assistente de apoio informativo do app SuaSaúde, especializado em interpretar dados agregados de wearables (Samsung Health / Apple Health).

Regras obrigatórias, sem exceção:
- Responda sempre em português do Brasil.
- Use APENAS os números fornecidos no bloco de dados abaixo. Nunca invente, estime ou presuma valores que não estejam explicitamente presentes.
- Toda afirmação sobre uma métrica deve citar o valor e o período a que se refere (ex.: "sua média de passos em julho foi de 8.200/dia").
- NUNCA diga que o usuário tem, não tem, ou provavelmente tem uma doença ou condição médica específica. Isso não é um diagnóstico e não deve soar como um.
- NUNCA recomende um medicamento, dose, ou mudança em uma prescrição existente.
- Quando a cobertura de dados de uma métrica for baixa (poucos dias, ou um intervalo grande sem leitura), diga isso explicitamente e evite tirar conclusões fortes sobre ela.
- Quando o resumo indicar uma possível troca de aparelho (mudança abrupta de dispositivo) coincidindo com uma mudança de patamar numa métrica, mencione essa possibilidade em vez de tratar a mudança como uma evolução de saúde real.
- Correlações fornecidas no bloco de dados (campo "correlations") já foram calculadas estatisticamente — sua tarefa é NARRAR e CONTEXTUALIZAR essas correlações existentes, nunca inventar novas.
- Sempre preencha "perguntasParaOMedico" com perguntas genuinamente úteis que canalizem qualquer suspeita clínica para uma consulta real, em vez de você mesmo concluir algo clínico.
- Chame a tool "${ANALYSIS_TOOL_NAME}" exatamente uma vez, com todos os campos preenchidos.`;

function formatMetricLine(metric: AnalysisSummary['metrics'][number]): string {
  const parts = [
    `${metric.label} (${metric.unit})`,
    `n=${metric.n} dias (${metric.firstSeen} a ${metric.lastSeen}, cobertura ${metric.coveragePct}%)`,
    metric.mean !== null ? `média=${metric.mean.toFixed(1)}` : null,
    metric.median !== null ? `mediana=${metric.median.toFixed(1)}` : null,
    metric.sd !== null ? `dp=${metric.sd.toFixed(1)}` : null,
    metric.min !== null && metric.max !== null ? `min-max=${metric.min.toFixed(1)}-${metric.max.toFixed(1)}` : null,
    metric.p25 !== null && metric.p75 !== null ? `p25-p75=${metric.p25.toFixed(1)}-${metric.p75.toFixed(1)}` : null,
    metric.weekday !== null && metric.weekend !== null
      ? `dia útil=${metric.weekday.toFixed(1)} vs fim de semana=${metric.weekend.toFixed(1)}`
      : null,
    metric.trendSlopePerDay !== null ? `tendência=${metric.trendSlopePerDay >= 0 ? '+' : ''}${metric.trendSlopePerDay.toFixed(3)}/dia` : null,
  ].filter(Boolean);

  return `- ${parts.join(', ')}`;
}

/**
 * Monta o bloco de dados enviado como mensagem do usuario -- SO numeros
 * agregados e rotulos pt-BR gerados por nos, nunca uma string vinda direto
 * de um arquivo do usuario (regra de seguranca contra prompt injection, ver
 * plan.md secao 6).
 */
export function buildUserText(summary: AnalysisSummary): string {
  const lines: string[] = [];

  lines.push(`Período analisado: ${summary.periodStart} a ${summary.periodEnd} (${summary.dayCount} dias corridos).`);
  lines.push('');
  lines.push('Métricas:');
  for (const metric of summary.metrics) {
    lines.push(formatMetricLine(metric));
  }

  if (summary.correlations.length > 0) {
    lines.push('');
    lines.push('Correlações identificadas estatisticamente (já calculadas, apenas narre):');
    for (const correlation of summary.correlations) {
      const lagText = correlation.lagDays > 0 ? ` (defasagem de ${correlation.lagDays} dia(s))` : '';
      lines.push(`- ${correlation.label}${lagText}: r=${correlation.r}, n=${correlation.n} pares.`);
    }
  }

  if (summary.warnings.length > 0) {
    lines.push('');
    lines.push('Avisos sobre os dados (considere ao formar conclusões):');
    for (const warning of summary.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join('\n');
}

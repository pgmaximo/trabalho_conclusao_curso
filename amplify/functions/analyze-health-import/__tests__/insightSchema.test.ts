import { insightsSchema, parseInsights } from '../insightSchema';

function validInsights() {
  return {
    resumo: 'Resumo de teste com pelo menos algum conteúdo.',
    destaques: [{ metrica: 'Passos', valor: '8.200/dia', comparacao: 'acima da média do período', tom: 'positivo' }],
    pontosDeAtencao: [
      { titulo: 'Sono irregular', descricao: 'Horário de dormir variou bastante.', severidade: 'atencao', metricas: ['sleepMinutes'] },
    ],
    padroes: [
      { titulo: 'Sono e recuperação', descricao: 'Noites mais longas coincidem com maior recuperação física.', evidencia: 'r=0.42, n=30', confianca: 'media' },
    ],
    sugestoes: [{ titulo: 'Rotina de sono', acao: 'Tentar dormir no mesmo horário', porque: 'Reduz variabilidade', esforco: 'baixo' }],
    perguntasParaOMedico: ['Minha variabilidade de sono é motivo de preocupação?'],
    limitacoes: 'Cobertura de sono limitada a 40% dos dias no período.',
  };
}

describe('parseInsights', () => {
  it('accepts a well-formed response', () => {
    const result = parseInsights(validInsights());
    expect(result.ok).toBe(true);
  });

  it('rejects a response missing a required field', () => {
    const { limitacoes, ...rest } = validInsights();
    void limitacoes;
    const result = parseInsights(rest);
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid enum value (severidade fora do vocabulario permitido)', () => {
    const insights = validInsights();
    insights.pontosDeAtencao[0].severidade = 'grave';
    const result = parseInsights(insights);
    expect(result.ok).toBe(false);
  });

  it('rejects a "destaques" array larger than the allowed maximum', () => {
    const insights = validInsights();
    insights.destaques = Array.from({ length: 5 }, () => insights.destaques[0]!);
    const result = parseInsights(insights);
    expect(result.ok).toBe(false);
  });

  it('never throws on completely malformed input', () => {
    expect(() => parseInsights(null)).not.toThrow();
    expect(() => parseInsights('a string')).not.toThrow();
    expect(() => parseInsights(42)).not.toThrow();
    expect(parseInsights(null).ok).toBe(false);
  });

  it('rejects severidade values that sound like a clinical diagnosis vocabulary (structural constraint)', () => {
    // O proprio schema so aceita 'informativo'|'atencao' -- nunca 'grave'/'critico'/'urgente'.
    const shape = insightsSchema.shape.pontosDeAtencao.element.shape.severidade;
    expect(shape.options).toEqual(['informativo', 'atencao']);
  });
});

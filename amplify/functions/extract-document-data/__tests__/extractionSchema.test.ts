import { ANALYTE_CATALOG } from '../analyteCatalog';
import {
  extractionSchema,
  parseExtraction,
  toStructuredOutputSchema,
  zodToToolInputSchema,
} from '../extractionSchema';

// D27: nenhum codigo LOINC digitado a mao, nem como exemplo em teste. O codigo
// sai do catalogo gerado a partir do extrato oficial, buscado pelo rotulo em
// portugues. Aqui o schema so confere a FORMA do campo, entao um digito
// trocado num literal passaria por todas as asercoes deste arquivo.
const codigoDe = (rotulo: string): string => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado.code;
};

// Todo numero chega do modelo como TEXTO, inclusive os limites da faixa. O
// modelo transcreve o que esta no papel; quem converte para numero e o
// parseDecimal da tarefa 2b, sob teste. Antes da revisao de 2026-09-16 a faixa
// chegava ja tipada como numero e o valor como texto — assimetria sem
// justificativa, e que escondia o problema da virgula decimal (D23).
const linhaValida = {
  analyteLabel: '25-OH-Vitamina D',
  rawValue: '32,5',
  rawUnit: 'ng/mL',
  rawReferenceLow: '30',
  rawReferenceHigh: '100',
  collectedAt: '2026-03-12',
  collectionMoment: null,
  sourcePage: 2,
  confidence: 0.94,
  analyteCodeGuess: codigoDe('Vitamina D (25-OH)'),
};

describe('extractionSchema', () => {
  it('aceita uma extracao bem formada', () => {
    const result = parseExtraction({
      documentKind: 'exam',
      labResults: [linhaValida],
      prescriptionItems: [],
      warnings: [],
    });
    expect(result.ok).toBe(true);
  });

  it('aceita extracao sem nenhuma linha -- documento em prosa nao e erro', () => {
    const result = parseExtraction({
      documentKind: 'exam',
      labResults: [],
      prescriptionItems: [],
      warnings: ['Laudo descritivo, sem valores numericos.'],
    });
    expect(result.ok).toBe(true);
  });

  it('rejeita confianca fora de 0 a 1', () => {
    const result = parseExtraction({
      documentKind: 'exam',
      labResults: [{ ...linhaValida, confidence: 1.4 }],
      prescriptionItems: [],
      warnings: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejeita campo de interpretacao clinica que o modelo tente acrescentar', () => {
    const result = parseExtraction({
      documentKind: 'exam',
      labResults: [{ ...linhaValida, situacao: 'alterado' }],
      prescriptionItems: [],
      warnings: [],
    });
    expect(result.ok).toBe(false);
  });

  it('aceita o sinal de censura que laudo brasileiro usa em TSH, PSA e beta-HCG', () => {
    const tsh = {
      ...linhaValida,
      analyteCodeGuess: codigoDe('TSH'),
      analyteLabel: 'TSH',
      rawValue: '<0,01',
      rawUnit: 'uUI/mL',
    };
    const result = parseExtraction({
      documentKind: 'exam',
      labResults: [tsh],
      prescriptionItems: [],
      warnings: [],
    });
    expect(result.ok).toBe(true);
  });

  it('aceita o mesmo analito duas vezes quando os momentos de coleta diferem', () => {
    const jejum = {
      ...linhaValida,
      analyteCodeGuess: codigoDe('Glicose'),
      analyteLabel: 'Glicose',
      rawValue: '92',
      rawUnit: 'mg/dL',
      collectionMoment: 'jejum',
    };
    const apos = { ...jejum, rawValue: '128', collectionMoment: '120 minutos' };
    const result = parseExtraction({
      documentKind: 'exam',
      labResults: [jejum, apos],
      prescriptionItems: [],
      warnings: [],
    });
    expect(result.ok).toBe(true);
  });

  it('aceita linha sem data de coleta -- a reserva e a data do formulario, decidida fora do schema', () => {
    const result = parseExtraction({
      documentKind: 'exam',
      labResults: [{ ...linhaValida, collectedAt: null }],
      prescriptionItems: [],
      warnings: [],
    });
    expect(result.ok).toBe(true);
  });

  it('gera o schema da tool a partir do mesmo objeto zod', () => {
    const json = zodToToolInputSchema(extractionSchema) as unknown as {
      type: string;
      required: string[];
    };
    expect(json.type).toBe('object');
    expect(json.required).toEqual(expect.arrayContaining(['documentKind', 'labResults']));
  });

  it('nunca lanca -- devolve resultado tipado mesmo com lixo', () => {
    expect(() => parseExtraction(null)).not.toThrow();
    expect(parseExtraction(null).ok).toBe(false);
  });
});

describe('toStructuredOutputSchema', () => {
  // Medido contra o Bedrock, nao suposto: o `output_config` recusa `maxItems`
  // em array e `minimum`/`maximum` em number e integer, nomeando o campo.
  // Todo o resto do nosso schema passa -- minItems, minLength, maxLength,
  // pattern, nullable, enum e additionalProperties aninhado.
  //
  // A limpeza vale SO para o que vai ao modelo. O objeto zod continua com os
  // limites e continua sendo quem valida a resposta: o modelo nao e informado
  // do teto, e a validacao o aplica mesmo assim.
  const json = toStructuredOutputSchema(extractionSchema) as unknown as Record<string, unknown>;
  const texto = JSON.stringify(json);

  it('tira maxItems, que o Bedrock recusa em array', () => {
    expect(texto).not.toContain('maxItems');
  });

  it('tira minimum e maximum, que o Bedrock recusa em number e integer', () => {
    expect(texto).not.toContain('"minimum"');
    expect(texto).not.toContain('"maximum"');
  });

  it('preserva o que o Bedrock aceita e o schema precisa', () => {
    expect(texto).toContain('additionalProperties');
    expect(texto).toContain('maxLength');
    expect(texto).toContain('pattern');
    expect(json.type).toBe('object');
    expect(json.required).toEqual(expect.arrayContaining(['documentKind', 'labResults']));
  });

  it('nao altera o objeto zod, que continua aplicando o teto na validacao', () => {
    const cheio = {
      documentKind: 'exam',
      labResults: Array.from({ length: 121 }, () => linhaValida),
      prescriptionItems: [],
      warnings: [],
    };
    expect(parseExtraction(cheio).ok).toBe(false);
  });
});

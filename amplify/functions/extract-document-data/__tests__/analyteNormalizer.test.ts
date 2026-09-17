import { normalizeLabResult, CONFIDENCE_THRESHOLD } from '../analyteNormalizer';

// 62292-8 = "25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum
// or Plasma", ng/mL. E a SOMA D3+D2, que e o que o laboratorio brasileiro
// reporta, na variante de massa. Conferido no arquivo oficial, nao de memoria:
// uma versao anterior deste plano trazia 14635-7, que e a D3 sozinha e em
// nmol/L -- codigo LOINC valido, mas o errado para nos. Ver
// estudos-ia/05-vocabularios/loinc/loinc-analitos-suasaude.csv.
const vitaminaD = {
  analyteLabel: '25-OH-Vitamina D',
  rawValue: '32,5',
  rawUnit: 'ng/mL',
  rawReferenceLow: '30',
  rawReferenceHigh: '100',
  collectedAt: '2026-03-12',
  collectionMoment: null,
  sourcePage: 2,
  confidence: 0.94,
  analyteCodeGuess: '62292-8',
};

describe('normalizeLabResult', () => {
  it('le a virgula decimal do laudo brasileiro sem perder a casa', () => {
    const linha = normalizeLabResult(vitaminaD, CONFIDENCE_THRESHOLD);
    expect(linha.value).toBeCloseTo(32.5, 2);
    expect(linha.reviewStatus).toBe('AUTO');
  });

  it('preserva o sinal de censura e nao o trata como medida', () => {
    const tsh = {
      ...vitaminaD,
      analyteCodeGuess: '3016-3',
      analyteLabel: 'TSH',
      rawValue: '<0,01',
      rawUnit: 'uUI/mL',
      rawReferenceLow: '0,4',
      rawReferenceHigh: '4,3',
    };
    const linha = normalizeLabResult(tsh, CONFIDENCE_THRESHOLD);
    expect(linha.valueQualifier).toBe('<');
    expect(linha.value).toBeCloseTo(0.01, 4);
    expect(linha.rawValue).toBe('<0,01');
  });

  it('manda para revisao quando o numero nao pode ser lido, sem chutar', () => {
    const linha = normalizeLabResult(
      { ...vitaminaD, rawValue: 'nao reagente' },
      CONFIDENCE_THRESHOLD,
    );
    expect(linha.reviewStatus).toBe('PENDENTE_DE_REVISAO');
    // O que importa tanto quanto o estado: NENHUM numero foi inventado.
    expect(linha.value).toBeNull();
    expect(linha.rawValue).toBe('nao reagente');
  });

  it('preserva o momento da coleta como o laudo escreveu', () => {
    const linha = normalizeLabResult(
      {
        ...vitaminaD,
        analyteCodeGuess: '2345-7',
        analyteLabel: 'Glicose',
        rawValue: '92',
        rawUnit: 'mg/dL',
        collectionMoment: 'jejum',
      },
      CONFIDENCE_THRESHOLD,
    );
    expect(linha.collectionMoment).toBe('jejum');
  });

  it('converte valor e faixa na mesma operacao', () => {
    // Canonico brasileiro e ng/mL, entao um laudo em nmol/L converte para ng/mL
    const emNmol = {
      ...vitaminaD,
      rawValue: '79,87',
      rawUnit: 'nmol/L',
      rawReferenceLow: '74,9',
      rawReferenceHigh: '249,6',
    };
    const linha = normalizeLabResult(emNmol, CONFIDENCE_THRESHOLD);
    expect(linha.value).toBeCloseTo(32, 1);
    expect(linha.referenceLow).toBeCloseTo(30, 1);
    expect(linha.referenceHigh).toBeCloseTo(100, 1);
    expect(linha.unit).toBe('ng/mL');
  });

  it('preserva valor e unidade brutos para rastreabilidade', () => {
    const linha = normalizeLabResult(
      { ...vitaminaD, rawValue: '79,87', rawUnit: 'nmol/L' },
      CONFIDENCE_THRESHOLD,
    );
    expect(linha.rawValue).toBe('79,87');
    expect(linha.rawUnit).toBe('nmol/L');
  });

  it('manda para revisao quando a confianca fica abaixo do limiar', () => {
    const linha = normalizeLabResult({ ...vitaminaD, confidence: 0.4 }, CONFIDENCE_THRESHOLD);
    expect(linha.reviewStatus).toBe('PENDENTE_DE_REVISAO');
  });

  it('qualificador preenchido NAO manda para revisao -- e leitura certa, nao duvidosa', () => {
    const tsh = {
      ...vitaminaD,
      analyteCodeGuess: '3016-3',
      analyteLabel: 'TSH',
      rawValue: '<0,01',
      rawUnit: 'uUI/mL',
      rawReferenceLow: '0,4',
      rawReferenceHigh: '4,3',
    };
    expect(normalizeLabResult(tsh, CONFIDENCE_THRESHOLD).reviewStatus).toBe('AUTO');
  });

  it('manda para revisao quando a unidade nao pode ser convertida, sem chutar', () => {
    const linha = normalizeLabResult(
      { ...vitaminaD, rawUnit: 'unidade inventada' },
      CONFIDENCE_THRESHOLD,
    );
    expect(linha.reviewStatus).toBe('PENDENTE_DE_REVISAO');
    expect(linha.value).toBeNull();
    expect(linha.rawValue).toBe('32,5');
  });

  // --- D32: analito fora do catalogo -------------------------------------
  //
  // Ate o fim do Bloco B, linha fora do catalogo ia para revisao e nao era
  // gravada. A D32 reverteu isso: o papel do usuario tem 45 valores e a tela
  // precisa mostrar os 45. O caso abaixo era um teste de "vai para revisao",
  // e foi reescrito de proposito -- a mudanca de comportamento e a decisao,
  // nao um teste quebrado.

  // O laudo real do Delboni trouxe quatro analitos fora da cobertura de 79
  // codigos. Zinco e um deles.
  const zinco = {
    ...vitaminaD,
    analyteLabel: 'Zinco Sanguíneo',
    analyteCodeGuess: null,
    rawValue: '85',
    rawUnit: 'µg/dL',
    rawReferenceLow: '70',
    rawReferenceHigh: '120',
  };

  it('analito fora do catalogo e GRAVADO, com codigo local (D32)', () => {
    const linha = normalizeLabResult(zinco, CONFIDENCE_THRESHOLD);
    expect(linha.analyteCode).toBe('X-ZINCO-SANGUINEO');
    expect(linha.value).toBeCloseTo(85, 4);
    expect(linha.reviewStatus).toBe('AUTO');
  });

  it('linha de codigo local fica na unidade do papel, sem converter nada', () => {
    const linha = normalizeLabResult(zinco, CONFIDENCE_THRESHOLD);
    // Sem catalogo nao ha unidade canonica nem massa molar. O valor NAO pode
    // ser mexido: converter sem massa molar seria inventar um numero.
    expect(linha.unit).toBe('ug/dL');
    expect(linha.rawUnit).toBe('µg/dL');
    expect(linha.referenceLow).toBeCloseTo(70, 4);
    expect(linha.referenceHigh).toBeCloseTo(120, 4);
  });

  it('o palpite de codigo do modelo nunca vira analyteCode se nao existir', () => {
    // Um codigo inventado gravado como se fosse LOINC e pior do que nenhum:
    // ele promete comparacao entre laboratorios que nao existe, e pode ate
    // colidir com o codigo real de outro analito.
    const linha = normalizeLabResult(
      { ...zinco, analyteCodeGuess: '99999-9' },
      CONFIDENCE_THRESHOLD,
    );
    expect(linha.analyteCode).toBe('X-ZINCO-SANGUINEO');
  });

  it('confianca baixa ainda manda para revisao, mesmo com codigo local', () => {
    const linha = normalizeLabResult({ ...zinco, confidence: 0.4 }, CONFIDENCE_THRESHOLD);
    expect(linha.reviewStatus).toBe('PENDENTE_DE_REVISAO');
    expect(linha.analyteCode).toBe('X-ZINCO-SANGUINEO');
    // O valor CONTINUA preenchido, como na linha de catalogo: confianca baixa
    // e duvida sobre a leitura, nao leitura impossivel. Quem apaga o valor e
    // o caso em que o numero nao pode ser lido (D29). A tela mostra o numero
    // ao lado do que estava no papel e pede conferencia.
    expect(linha.value).toBeCloseTo(85, 4);
  });

  it('linha ilegivel fora do catalogo ainda leva codigo local, para nao colidir', () => {
    // O id deterministico da tarefa 6 usa o codigo. Duas linhas em revisao com
    // codigo vazio gerariam o MESMO id, e uma sobrescreveria a outra sem
    // levantar erro -- a colisao que a D32 veio fechar.
    const a = normalizeLabResult({ ...zinco, rawValue: 'nao reagente' }, CONFIDENCE_THRESHOLD);
    const b = normalizeLabResult(
      { ...zinco, analyteLabel: 'SHBG', rawValue: 'nao reagente' },
      CONFIDENCE_THRESHOLD,
    );
    expect(a.analyteCode).toBe('X-ZINCO-SANGUINEO');
    expect(b.analyteCode).toBe('X-SHBG');
    expect(a.reviewStatus).toBe('PENDENTE_DE_REVISAO');
  });

  it('rotulo que nao identifica nada fica sem codigo, e nao inventa um', () => {
    const linha = normalizeLabResult({ ...zinco, analyteLabel: '—' }, CONFIDENCE_THRESHOLD);
    expect(linha.analyteCode).toBe('');
    expect(linha.reviewStatus).toBe('PENDENTE_DE_REVISAO');
  });

  it('faixa ausente e normal; faixa ilegivel e revisao -- nao sao a mesma coisa', () => {
    const semFaixa = normalizeLabResult(
      { ...vitaminaD, rawReferenceLow: null, rawReferenceHigh: null },
      CONFIDENCE_THRESHOLD,
    );
    expect(semFaixa.reviewStatus).toBe('AUTO');
    expect(semFaixa.referenceLow).toBeNull();

    const faixaIlegivel = normalizeLabResult(
      { ...vitaminaD, rawReferenceLow: 'ver observacao' },
      CONFIDENCE_THRESHOLD,
    );
    expect(faixaIlegivel.reviewStatus).toBe('PENDENTE_DE_REVISAO');
  });

  it('nunca devolve valor com faixa em escala diferente', () => {
    const linha = normalizeLabResult(
      { ...vitaminaD, rawValue: '79,87', rawUnit: 'nmol/L' },
      CONFIDENCE_THRESHOLD,
    );
    const faixaConvertida = linha.referenceLow !== null && linha.referenceLow < 60;
    expect(faixaConvertida).toBe(true);
  });
});

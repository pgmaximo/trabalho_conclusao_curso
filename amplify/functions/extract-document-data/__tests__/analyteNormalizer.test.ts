import { ANALYTE_CATALOG, findAnalyteByCode } from '../analyteCatalog';
import { normalizeLabResult, CONFIDENCE_THRESHOLD } from '../analyteNormalizer';

// Uma versao anterior deste plano trazia, para a vitamina D, o codigo 14635-7
// -- a D3 sozinha e em nmol/L, codigo LOINC valido mas o errado para nos, que
// precisamos da SOMA D3+D2 na variante de massa. Ao lado dele havia um
// comentario dizendo "conferido no arquivo oficial". O comentario estava
// errado junto com o codigo, e foi por isso que ninguem viu.
//
// Dai a D27: o teste nao digita codigo nenhum. Ele conhece o rotulo em
// portugues, e o codigo sai do catalogo gerado a partir do extrato oficial
// (estudos-ia/05-vocabularios/loinc/loinc-analitos-suasaude.csv). Se o extrato
// mudar, este teste passa a usar o codigo novo sem ninguem reescrever nada --
// e se ele mudar errado, e o teste de deriva do catalogo que acusa.
const codigoDe = (rotulo: string): string => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado.code;
};

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
  analyteCodeGuess: codigoDe('Vitamina D (25-OH)'),
};

describe('normalizeLabResult', () => {
  it('le a virgula decimal do laudo brasileiro sem perder a casa', () => {
    const linha = normalizeLabResult(vitaminaD, CONFIDENCE_THRESHOLD);
    expect(linha.value).toBeCloseTo(32.5, 2);
    expect(linha.reviewStatus).toBe('AUTO');
  });

  it('aceita faixa de UM LADO SO, sem mandar a linha para revisao (F3)', () => {
    // O laudo do Delboni escreve a faixa do HDL em prosa: "Superior a 40
    // mg/dL". Ela CABE no esquema de hoje -- um limite preenchido, o outro
    // vazio --, e a tela ja sabe escrever "acima de 40". O que faltava era a
    // instrucao no prompt; este teste fixa que o normalizador aceita o que o
    // prompt passou a pedir, e que ausente continua diferente de ilegivel.
    const hdl = {
      ...vitaminaD,
      analyteCodeGuess: codigoDe('HDL'),
      analyteLabel: 'HDL',
      rawValue: '52',
      rawUnit: 'mg/dL',
      rawReferenceLow: '40',
      rawReferenceHigh: null,
    };

    const linha = normalizeLabResult(hdl, CONFIDENCE_THRESHOLD);

    expect(linha.referenceLow).toBeCloseTo(40, 2);
    expect(linha.referenceHigh).toBeNull();
    expect(linha.reviewStatus).toBe('AUTO');
  });

  it('a faixa em TEXTO atravessa a normalizacao intacta, e nunca e convertida (F1)', () => {
    // O valor converte de nmol/L para ng/mL; a faixa em texto NAO, porque
    // texto nao tem escala. Ela e a faixa na unidade do papel, e e a tela que
    // mostra as duas coisas lado a lado -- converter o numero e "converter" a
    // frase seria inventar um laudo que nao existe.
    const tabela =
      'Deficiencia: menor que 20 ng/mL; Insuficiencia: 20 a 29 ng/mL; Suficiencia: 30 a 60 ng/mL';

    const linha = normalizeLabResult(
      {
        ...vitaminaD,
        rawValue: '79,87',
        rawUnit: 'nmol/L',
        rawReferenceLow: null,
        rawReferenceHigh: null,
        rawReferenceText: tabela,
      },
      CONFIDENCE_THRESHOLD,
    );

    expect(linha.value).toBeCloseTo(32.0, 1);
    expect(linha.rawReferenceText).toBe(tabela);
    expect(linha.referenceLow).toBeNull();
    expect(linha.referenceHigh).toBeNull();
    expect(linha.reviewStatus).toBe('AUTO');
  });

  it('a faixa em texto sobrevive a linha que vai para revisao (F1)', () => {
    // Mesma razao do rawValue: o texto e o que estava no papel, e o papel nao
    // muda porque a leitura do numero falhou. Quem revisa precisa dele.
    const linha = normalizeLabResult(
      {
        ...vitaminaD,
        rawValue: 'nao reagente',
        rawReferenceText: 'Nao reagente',
      },
      CONFIDENCE_THRESHOLD,
    );

    expect(linha.reviewStatus).toBe('PENDENTE_DE_REVISAO');
    expect(linha.value).toBeNull();
    expect(linha.rawReferenceText).toBe('Nao reagente');
  });

  it('preserva o sinal de censura e nao o trata como medida', () => {
    const tsh = {
      ...vitaminaD,
      analyteCodeGuess: codigoDe('TSH'),
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
        analyteCodeGuess: codigoDe('Glicose'),
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
      analyteCodeGuess: codigoDe('TSH'),
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
    //
    // Este e o UNICO literal com forma de codigo LOINC em todo o projeto fora
    // do catalogo gerado, e esta registrado como excecao em
    // __tests__/codigosLoincNaoDigitados.test.ts. Ele nao e um codigo do
    // LOINC: e um codigo INVENTADO, e a asercao abaixo mantem isso verdadeiro
    // mesmo se a cobertura do catalogo crescer um dia.
    const INVENTADO = '99999-9';
    expect(findAnalyteByCode(INVENTADO)).toBeNull();

    const linha = normalizeLabResult(
      { ...zinco, analyteCodeGuess: INVENTADO },
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
